import { isRight } from 'fp-ts/lib/Either'
import * as t from 'io-ts'

import { Introspection } from './index'

const tColumn = t.type({
  name: t.string,
  udt_name: t.string,
  udt_schema: t.string,
  pg_type_oid: t.number,
  formatted_type: t.string,
  column_default: t.union([t.null, t.string]),
  is_enum: t.boolean,
  is_array: t.boolean,
  is_nullable: t.boolean,
  is_user_defined: t.boolean,
  character_maximum_length: t.union([t.null, t.number]),
})

const tTable = t.type({
  name: t.string,
  columns: t.record(t.string, tColumn),
})

const tMigration = t.type({
  id: t.number,
  hash: t.string,
  name: t.string,
})

const tSchema = t.type({
  name: t.string,
  migrations: t.array(tMigration),
  tables: t.record(t.string, tTable),
  enums: t.record(t.string, t.array(t.string)),
})

const tIntrospection = t.type({
  schemas: t.record(t.string, tSchema),
})

const decode = (data: any): Introspection | null => {
  const decoded = tIntrospection.decode(data)

  if (isRight(decoded)) {
    return decoded.right
  }

  return null
}

export default decode
