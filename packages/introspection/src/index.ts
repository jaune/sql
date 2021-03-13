export interface Migration {
  id: number
  hash: string
  name: string
}

export interface Table {
  name: string
  columns: Record<
    string,
    {
      name: string
      udt_name: string
      udt_schema: string
      pg_type_oid: number
      formatted_type: string
      column_default: null | string
      is_enum: boolean
      is_array: boolean
      is_nullable: boolean
      is_user_defined: boolean
      character_maximum_length: number | null
    }
  >
}

export interface Schema {
  name: string
  migrations: Array<Migration>
  tables: Record<string, Table>
  enums: Record<string, Array<string>>
}

export interface Introspection {
  schemas: Record<string, Schema>
}
