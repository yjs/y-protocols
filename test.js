import { runTests } from 'lib0/testing.js'
import * as log from 'lib0/logging.js'
import * as awareness from './awareness.test.js'

import { isBrowser, isNode } from 'lib0/environment.js'

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
