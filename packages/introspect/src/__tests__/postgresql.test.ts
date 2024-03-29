import runInDocker from '@jaune-sql/run-in-docker/lib/postgresql'
import { readFile, readJSON, pathExists, writeJSON } from 'fs-extra'
import globby from 'globby'
import { resolve, basename } from 'path'
import { Client } from 'pg'
import { test } from 'tap'

import introspect from '../postgresql'

globby
  .sync(resolve(__dirname, 'data/*.postgres.sql'), {})
  .forEach((inputPath) => {
    const name = basename(inputPath)
    const outputPath = inputPath + 'introspection'

    test(name, async (tap) => {
      const fixture = await readFile(inputPath, 'utf-8')

      const schema = await runInDocker(async (cfg) => {
        const client = new Client(cfg)
        await client.connect()

        await client.query(fixture)

        const schema = await introspect(client.query.bind(client))

        await client.end()

        return schema
      })

      const exists = await pathExists(outputPath)

      if (!exists) {
        await writeJSON(outputPath, schema, { spaces: 2 })
        tap.skip(`write snapshot: ${name}`)
      } else {
        const expected = await readJSON(outputPath)
        tap.deepEqual(schema, expected)
      }

      tap.end()
    })
  })
