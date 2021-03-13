import { test } from 'tap'

import decode from '../decode'

test('null', (t) => {
  try {
    decode(null)

  }
  catch (error) {
    t.pass()
  }
  t.end()
})


test('{}', (t) => {
  try {
    decode({})
  }
  catch (error) {
    t.pass()
  }
  t.end()
})
