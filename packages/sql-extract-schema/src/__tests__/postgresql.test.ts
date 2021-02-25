import { test } from 'tap'

import querySchema from '../postgresql'

interface Input {
  text: string
  values: Array<any>
}

test('nothingness', async (tap) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const query = async (input: Input) => {
    return {
      rows: [],
    }
  }

  await querySchema(query)

  tap.end()
})
