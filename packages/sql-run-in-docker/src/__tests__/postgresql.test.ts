import { test } from 'tap'

import runInDocker from '../postgresql'

test(`nothing`, { timeout: 2 * 60 * 1000 }, async (tap) => {
  await runInDocker(async () => {})

  tap.end()
})
