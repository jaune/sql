import runInDocker from '@jaunelacouleur/sql-run-in-docker/lib/postgresql'
import { readFile, readJSON } from 'fs-extra'
import { resolve } from 'path'
import { Client } from 'pg'
import { test } from 'tap'

import querySchema from '../postgresql'

test('openstreetmap', async (tap) => {
  const fixture = await readFile(
    resolve(__dirname, 'data/openstreetmap.postgres.sql'),
    'utf-8'
  )
  const expected = await readJSON(
    resolve(__dirname, 'data/openstreetmap.postgres.sqlschema')
  )

  await runInDocker(async (cfg) => {
    const client = new Client(cfg)
    await client.connect()

    await client.query(fixture)

    const schema = await querySchema(client.query.bind(client))

    // await writeJSON(resolve(__dirname, 'data/openstreetmap.postgres.sqlschema'), schema, { spaces: 2 })

    tap.deepEqual(schema, expected)

    await client.end()
  })

  tap.end()
})

test('schemats', async (tap) => {
  const fixture = await readFile(
    resolve(__dirname, 'data/schemats.postgres.sql'),
    'utf-8'
  )
  const expected = await readJSON(
    resolve(__dirname, 'data/schemats.postgres.sqlschema')
  )

  await runInDocker(async (cfg) => {
    const client = new Client(cfg)
    await client.connect()

    await client.query(fixture)

    const schema = await querySchema(client.query.bind(client))

    // await writeJSON(resolve(__dirname, 'data/schemats.postgres.sqlschema'), schema, { spaces: 2 })

    tap.deepEqual(schema, expected)

    await client.end()
  })

  tap.end()
})
