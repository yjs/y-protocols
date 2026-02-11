import * as Y from '@y/y'
import * as t from 'lib0/testing'
import * as awareness from './awareness.js'
import * as array from 'lib0/array'
import * as promise from 'lib0/promise'
import * as env from 'lib0/environment'

/**
 * @param {t.TestCase} tc
 */
export const testAwareness = tc => {
  const doc1 = new Y.Doc()
  doc1.clientID = 0
  const doc2 = new Y.Doc()
  doc2.clientID = 1
  const aw1 = new awareness.Awareness(doc1)
  const aw2 = new awareness.Awareness(doc2)
  aw1.on('update', /** @param {any} p */ ({ added, updated, removed }) => {
    const enc = awareness.encodeAwarenessUpdate(aw1, added.concat(updated).concat(removed))
    awareness.applyAwarenessUpdate(aw2, enc, 'custom')
  })
  let lastChangeLocal = /** @type {any} */ (null)
  aw1.on('change', /** @param {any} change */ change => {
    lastChangeLocal = change
  })
  let lastChange = /** @type {any} */ (null)
  aw2.on('change', /** @param {any} change */ change => {
    lastChange = change
  })
  aw1.setLocalState({ x: 3 })
  t.compare(aw2.getStates().get(0), { x: 3 })
  t.assert(/** @type {any} */ (aw2.meta.get(0)).clock === 1)
  t.compare(lastChange.added, [0])
  // When creating an Awareness instance, the the local client is already marked as available, so it is not updated.
  t.compare(lastChangeLocal, { added: [], updated: [0], removed: [] })

  // update state
  lastChange = null
  lastChangeLocal = null
  aw1.setLocalState({ x: 4 })
  t.compare(aw2.getStates().get(0), { x: 4 })
  t.compare(lastChangeLocal, { added: [], updated: [0], removed: [] })
  t.compare(lastChangeLocal, lastChange)

  lastChange = null
  lastChangeLocal = null
  aw1.setLocalState({ x: 4 })
  t.assert(lastChange === null)
  t.assert(/** @type {any} */ (aw2.meta.get(0)).clock === 3)
  t.compare(lastChangeLocal, lastChange)
  aw1.setLocalState(null)
  t.assert(lastChange.removed.length === 1)
  t.compare(aw1.getStates().get(0), undefined)
  t.compare(lastChangeLocal, lastChange)
}

const logMemoryUsed = (prefix = '') => {
  const heapUsed = process.memoryUsage().heapUsed
  console.log(`${prefix.length === 0 ? '' : `[${prefix}] `}Heap used: ${(heapUsed / 1024 / 1024).toFixed(2)} MB`)
  return heapUsed
}

/**
 * @param {t.TestCase} tc
 */
export const testMemoryLeaks = async tc => {
  const N = 100000
  const gc = global.gc
  t.skip(!env.isNode || gc == null)
  t.assert(gc)
  gc()
  const beforeMemory = logMemoryUsed('starting memory')
  let maxDiff = 0
  t.groupAsync('creating docs & awareness instances', async () => {
    const docs = array.unfold(N, () => new Y.Doc())
    const aws = docs.map((ydoc, i) => {
      const aw = new awareness.Awareness(ydoc)
      aw.setLocalState({ x: i })
      return aw
    })
    await promise.wait(300)
    const maxAllocMemory = logMemoryUsed('all allocated')
    maxDiff = maxAllocMemory - beforeMemory
    docs.forEach(doc => doc.destroy())
    docs.length = 0
    aws.length = 0
  })
  await promise.wait(300)
  gc()
  const afterMemory = logMemoryUsed('after deallocation')
  const diffMemory = afterMemory - beforeMemory
  t.assert(diffMemory < maxDiff * 0.2) // shrinks at least to 20% of memory used before (accounting for unrelated memory increases)
}
