import { test } from 'tap'
import { readJSONSync } from 'fs-extra'
import { resolve } from 'path'

import parse, { Column } from '../postgresql'

const QUERIES = [
  {
    query: `SELECT lemme FROM lemmes WHERE lemme LIMIT 10`,
    expected: {
      columns: [
        {
          kind: 'ref',
          name: 'lemme',
          table: 'lemmes',
          schema: 'public',
          alias: undefined,
          type: 'character varying(128)',
        },
      ],
    },
  },
  {
    query: `SELECT id, lemme FROM lemmes WHERE lemme LIMIT 10`,
    expected: {
      columns: [
        {
          kind: 'ref',
          name: 'id',
          table: 'lemmes',
          schema: 'public',
          alias: undefined,
          type: 'integer',
        },
        {
          kind: 'ref',
          name: 'lemme',
          table: 'lemmes',
          schema: 'public',
          alias: undefined,
          type: 'character varying(128)',
        },
      ],
    },
  },
]

const sqlschema = readJSONSync(resolve(__dirname, './data/mots.postgres.sqlschema'))

const infer = (columns: Array<Column>, schema: any) => (
  columns.map((column) => {
    const t = schema.public.tables[column.table]
    const c = t.columns[column.name]
    let type = c.formatted_type

    if (type === 'character varying') {
      type = `${type}(${c.character_maximum_length})`
    }

    return {
      ...column,
      type,
    }
  })
)

QUERIES.forEach(({ query, expected }) => {
  test(`parse ${query}`, async (tap) => {
    const result = parse(query)

    const columns = infer(result.columns, sqlschema)

    tap.deepEqual({ columns }, expected)

    tap.end()
  })
})

test(`multiple statements unsupported`, async (tap) => {
  try {
    parse(`
      insert into my_table values (1, 'two');
      insert into my_table values (1, 'two');
    `)
  } catch {
    tap.pass()
  }

  tap.end()
})

test(`only SELECT is supported`, async (tap) => {
  try {
    parse(`insert into my_table values (1, 'two')`)
  } catch {
    tap.pass()
  }

  tap.end()
})
