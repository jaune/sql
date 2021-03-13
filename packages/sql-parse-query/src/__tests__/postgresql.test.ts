import { test } from 'tap'
import { readJSONSync } from 'fs-extra'
import { resolve } from 'path'

import { parse, infer, TypeKind } from '../postgresql'

const QUERIES = [
  {
    query: `SELECT lemme FROM lemmes WHERE lemme LIMIT 10`,
    expected: {
      kind: 'select',
      columns: [
        {
          kind: 'ref',
          name: 'lemme',
          table: 'lemmes',
          schema: 'public',
          alias: undefined,
          type: {
            kind: TypeKind.CHARACTER_VARYING,
            length: 128,
          },
        },
      ],
    },
  },
  {
    query: `SELECT lemme AS l FROM lemmes WHERE lemme LIMIT 10`,
    expected: {
      kind: 'select',
      columns: [
        {
          kind: 'ref',
          name: 'lemme',
          table: 'lemmes',
          schema: 'public',
          alias: 'l',
          type: {
            kind: TypeKind.CHARACTER_VARYING,
            length: 128,
          },
        },
      ],
    },
  },
  {
    query: `SELECT id, lemme FROM lemmes WHERE lemme LIMIT 10`,
    expected: {
      kind: 'select',
      columns: [
        {
          kind: 'ref',
          name: 'id',
          table: 'lemmes',
          schema: 'public',
          alias: undefined,
          type: {
            kind: TypeKind.INTEGER,
          },
        },
        {
          kind: 'ref',
          name: 'lemme',
          table: 'lemmes',
          schema: 'public',
          alias: undefined,
          type: {
            kind: TypeKind.CHARACTER_VARYING,
            length: 128,
          },
        },
      ],
    },
  },
]

const sqlintrospection = readJSONSync(resolve(__dirname, './data/mots.postgres.sqlintrospection'))

QUERIES.forEach(({ query, expected }) => {
  test(`parse ${query}`, async (tap) => {
    const parsed = parse(query)

    const inferred = infer(sqlintrospection, parsed)

    tap.deepEqual(inferred, expected)

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
