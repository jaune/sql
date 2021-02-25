const sql = (strings: TemplateStringsArray, ...values: Array<any>) => ({
  text: String.raw(strings, ...values.map((_, i) => `$${i + 1}`)),
  values,
})

type QueryFunction = (input: {
  text: string
  values: Array<any>
}) => Promise<{ rows: Array<Record<string, any>> }>

interface Migration {
  id: number
  hash: string
  name: string
}

const getEnums = async (query: QueryFunction) => {
  const res = await query(sql`
		SELECT
			n.nspname AS schema,
			t.typname AS name,
			e.enumlabel AS value
		FROM
			pg_type t
			JOIN pg_enum e ON t.oid = e.enumtypid
			JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
		ORDER BY
			t.typname ASC,
			e.enumlabel ASC
	`)

  const enums: Record<string, Record<string, Array<string>>> = {}
  for (const row of res.rows) {
    const { schema, name, value } = row
    if (!enums[schema]) {
      enums[schema] = {}
    }

    if (!enums[schema][name]) {
      enums[schema][name] = []
    }

    enums[schema][name].push(value)
  }

  return enums
}

interface Table {
  name: string
  columns: Record<
    string,
    {
      name: string
      type: string
      is_array: boolean
      is_nullable: boolean
      is_user_defined: boolean
    }
  >
}

const getTables = async (query: QueryFunction) => {
  const res = await query(sql`
		SELECT
			c.table_schema AS schema,
			c.table_name AS table,
			c.column_name AS column,
			CASE
				WHEN c.data_type = 'ARRAY' THEN CASE
					WHEN e.data_type = 'USER-DEFINED' THEN e.udt_name
					ELSE e.data_type
				END
				WHEN c.data_type = 'USER-DEFINED' THEN c.udt_name
				ELSE c.data_type
			END AS type,
			CASE
				WHEN c.data_type = 'ARRAY' THEN true
				ELSE false
			END AS is_array,
			CASE
				WHEN c.is_nullable = 'YES' THEN true
				ELSE false
			END AS is_nullable,
			CASE
				WHEN c.data_type = 'ARRAY' THEN CASE
					WHEN e.data_type = 'USER-DEFINED' THEN true
					ELSE false
				END
				WHEN c.data_type = 'USER-DEFINED' THEN true
				ELSE false
			END AS is_user_defined
		FROM
			information_schema.columns c
			LEFT JOIN information_schema.element_types e ON (
				(c.table_catalog,  c.table_schema,  c.table_name, 'TABLE',        c.dtd_identifier) =
				(e.object_catalog, e.object_schema, e.object_name, e.object_type, e.collection_type_identifier)
			)
	`)

  const tables: Record<string, Record<string, Table>> = {}

  for (const row of res.rows) {
    const {
      schema,
      table,
      column,
      type,
      is_array,
      is_nullable,
      is_user_defined,
    } = row

    if (!tables[schema]) {
      tables[schema] = {}
    }

    if (!tables[schema][table]) {
      tables[schema][table] = {
        name: table,
        columns: {},
      }
    }

    tables[schema][table].columns[column] = {
      name: column,
      type,
      is_array,
      is_nullable,
      is_user_defined,
    }
  }

  return tables
}

const querySchema = async (query: QueryFunction) => {
  const tables = await getTables(query)
  const enums = await getEnums(query)

  const res = await query(sql`
		SELECT
      id,
      hash,
			name
		FROM
      migrations
		ORDER BY
      id ASC
  `)

  const migrations: Array<Migration> = []

  for (const row of res.rows) {
    migrations.push(row as Migration)
  }

  const result: Record<
    string,
    {
      migrations: Array<Migration>
      tables: Record<string, Table>
      enums: Record<string, Array<string>>
    }
  > = {}
  const schemas = Object.keys(tables)
  for (const schema of schemas) {
    result[schema] = {
      migrations,
      tables: tables[schema],
      enums: enums[schema] || {},
    }
  }

  return result
}

export default querySchema
