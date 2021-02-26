import { Statement, parse } from 'pgsql-ast-parser'

interface Config {
  defaultSchema?: string
}

const parseQuery = (query: string, cfg?: Config) => {
  const { defaultSchema } = {
    defaultSchema: 'public',
    ...cfg,
  }

  const ast: Statement[] = parse(query)

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
          kind: 'ref',
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
  })

  return {
    columns,
  }
}

export default parseQuery
