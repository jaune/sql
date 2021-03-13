import { Introspection, Migration, Table, Schema } from '@jaune-sql/introspection'

type QueryFunction = (input: {
  text: string
  values: Array<any>
}) => Promise<{ rows: Array<Record<string, any>> }>

const sql = (strings: TemplateStringsArray, ...values: Array<any>) => ({
  text: String.raw(strings, ...values.map((_, i) => `$${i + 1}`)),
  values,
})

const getEnums = async (query: QueryFunction) => {
  const res = await query(sql`
    SELECT
    	t.oid AS oid,
      n.nspname AS schema,
      t.typname AS name,
      e.enumlabel AS value,
      e.enumsortorder AS order
    FROM
      pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
    ORDER BY
      t.oid ASC,
      e.enumsortorder ASC
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

  Object.values(enums).forEach((enums) => {
    for (const key in enums) {
      enums[key].sort()
    }
  })

  return enums
}

const queryColumns = async (query: QueryFunction) => {
  const res = await query(sql`
    SELECT
      c.table_schema AS schema,
      c.table_name AS table,
      c.column_name AS column,
      c.column_default AS column_default,
      c.udt_name AS udt_name,
      c.udt_schema AS udt_schema,
      c.character_maximum_length AS character_maximum_length,
      pg_type.oid AS pg_type_oid,
      format_type(pg_type.oid, null) AS formatted_type,
      CASE
        WHEN c.data_type = 'USER-DEFINED' THEN true
				ELSE false
			END AS is_user_defined,
      CASE
        WHEN c.data_type = 'ARRAY' THEN true
				ELSE false
			END AS is_array,
      CASE
        WHEN c.is_nullable = 'YES' THEN true
        ELSE false
      END AS is_nullable,
      CASE
        WHEN pg_type.typtype = 'e' THEN true
        ELSE false
      END AS is_enum
    FROM
      information_schema.columns c
    LEFT JOIN
      pg_namespace ON pg_namespace.nspname = c.udt_schema
    LEFT JOIN
      pg_type ON
        pg_type.typnamespace = pg_namespace.oid
        AND
        pg_type.typname = c.udt_name
    WHERE c.table_schema = 'public'
  `)

  const tables: Record<string, Record<string, Table>> = {}

  for (const row of res.rows) {
    const {
      schema,
      table,
      column,
      column_default,
      udt_name,
      udt_schema,
      pg_type_oid,
      formatted_type,
      character_maximum_length,
      is_enum,
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
      udt_name,
      udt_schema,
      pg_type_oid,
      formatted_type,
      column_default,
      is_enum,
      is_array,
      is_nullable,
      is_user_defined,
      character_maximum_length,
    }
  }

  return tables
}

const introspect = async (query: QueryFunction): Promise<Introspection> => {
  const tables = await queryColumns(query)
  const enums = await getEnums(query)

  const migrations: Array<Migration> = []

  // const res = await query(sql`
  //   SELECT
  //     id,
  //     hash,
  //     name
  //   FROM
  //     migrations
  //   ORDER BY
  //     id ASC
  // `)

  // for (const row of res.rows) {
  //   migrations.push(row as Migration)
  // }

  const schemas: Record<string, Schema> = {}

  for (const schemaName of Object.keys(tables)) {
    schemas[schemaName] = {
      name: schemaName,
      migrations,
      tables: tables[schemaName],
      enums: enums[schemaName] || {},
    }
  }

  return {
    schemas,
  }
}

export default introspect
