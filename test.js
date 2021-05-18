import { runTests } from 'lib0/testing'
import * as log from 'lib0/logging'
import * as awareness from './awareness.test.js'

import { isBrowser, isNode } from 'lib0/environment'

/* istanbul ignore if */
if (isBrowser) {
  log.createVConsole(document.body)
}

runTests({
  awareness
}).then(success => {
  /* istanbul ignore next */
  if (isNode) {
    process.exit(success ? 0 : 1)
  }
})
