import { test } from 'tap'

import parse from '../postgresql'

const QUERIES = [
  {
    query: `SELECT lemme FROM lemmes WHERE lemme LIMIT 10`,
    expectedResult: {
      columns: [
        {
          kind: 'ref',
          name: 'lemme',
          table: 'lemmes',
          schema: 'public',
          alias: undefined,
        },
      ],
    },
  },
  {
    query: `SELECT id, lemme FROM lemmes WHERE lemme LIMIT 10`,
    expectedResult: {
      columns: [
        {
          kind: 'ref',
          name: 'id',
          table: 'lemmes',
          schema: 'public',
          alias: undefined,
        },
        {
          kind: 'ref',
          name: 'lemme',
          table: 'lemmes',
          schema: 'public',
          alias: undefined,
        },
      ],
    },
  },
]

QUERIES.forEach(({ query, expectedResult }) => {
  test(`parse ${query}`, async (tap) => {
    const result = parse(query)

    tap.deepEqual(result, expectedResult)

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
