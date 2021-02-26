import isCI from 'is-ci'
import { test } from 'tap'

import runInDocker from '../postgresql'

test(`nothing`, { skip: isCI, timeout: 2 * 60 * 1000 }, async (tap) => {
  await runInDocker(async () => {})

  tap.end()
})
