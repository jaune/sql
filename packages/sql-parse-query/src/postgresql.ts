import { Statement, parse as parseAST } from 'pgsql-ast-parser'

interface Introspection {
  schemas: Record<string, {
    name: string
    tables: Record<string, {
      name: string
      columns: Record<string, {
        name: string
        formatted_type: string
        character_maximum_length?: number
      }>
    }>
  }>
}

interface Config {
  defaultSchema?: string
}

enum QueryKind {
  SELECT = 'select'
}

enum ColumnKind {
  REF = 'ref'
}

export interface Column {
  kind: ColumnKind,
  alias: string | undefined,
  name: string,
  schema: string,
  table: string,
}

export enum TypeKind {
  CHARACTER_VARYING = 'character varying',
  INTEGER = 'integer',
}

interface CharacterVaryingType {
  kind: TypeKind.CHARACTER_VARYING
  length: number | undefined
}

interface IntegerType {
  kind: TypeKind.INTEGER
}

type Type = CharacterVaryingType | IntegerType

interface InferredColumn extends Column {
  type: Type
}

interface ParsedQuery {
  kind: QueryKind,
  columns: Array<Column>
}

interface InferredQuery {
  kind: QueryKind,
  columns: Array<InferredColumn>
}

export const parse = (query: string, cfg?: Config): ParsedQuery => {
  const { defaultSchema } = {
    defaultSchema: 'public',
    ...cfg,
  }

  const ast: Statement[] = parseAST(query)

  if (ast.length > 1) {
    throw new Error('multiple statements unsupported')
  }

  const statement = ast[0]

  if (statement.type !== 'select') {
    throw new Error(`statement of type '${statement.type}' unsupported`)
  }

  const tables =
    statement.from?.map((from) => {
      switch (from.type) {
        case 'table':
          return {
            alias: from.alias,
            name: from.name,
            schema: from.schema || defaultSchema,
          }
        default:
          throw new Error(`from expression of type '${from.type}' unsupported`)
      }
    }) || []

  const tablesWithoutAlias = tables.filter((table) => !table.alias)

  const columns = statement.columns?.map((column) => {
    const alias = column.alias?.name
    const expr = column.expr

    switch (expr.type) {
      case 'ref': {
        const schema = expr.table?.schema || defaultSchema
        const table =
          expr.table?.name ||
          tablesWithoutAlias.find((t) => t.schema === schema)?.name

        if (!table) {
          throw new Error(`Unable to find table for column '${expr.name}'`)
        }

        return {
          kind: ColumnKind.REF,
          alias,
          name: expr.name,
          schema,
          table,
        }
      }
      default:
        throw new Error(
          `column expression of type '${column.expr.type}' unsupported`
        )
    }
  }) || []

  return {
    kind: QueryKind.SELECT,
    columns,
  }
}

export const infer = (introspection: Introspection, query: ParsedQuery): InferredQuery => {
  return {
    ...query,
    columns: query.columns.map((column): InferredColumn => {
      const t = introspection.schemas[column.schema].tables[column.table]
      const c = t.columns[column.name]

      switch (c.formatted_type) {
        case 'character varying':
          return {
            ...column,
            type: {
              kind: TypeKind.CHARACTER_VARYING,
              length: c.character_maximum_length,
            }
          }
        case 'integer':
          return {
            ...column,
            type: {
              kind: TypeKind.INTEGER,
            }
          }
        default:
          throw new Error(`Unsupported type ${c.formatted_type}`);
      }
    })
  }
}
