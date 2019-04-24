/**
 * @module awareness-protocol
 */

import * as Y from 'yjs'
import * as encoding from 'lib0/encoding.js'
import * as decoding from 'lib0/decoding.js'
import * as error from 'lib0/error.js'

const messageUsersStateChanged = 0

/**
 * This is just a template for a Yjs instance with awareness.
 * We do not really extend it.
 */
export class YWithAwareness extends Y.Y {
  constructor () {
    super()
    /**
     * @type {Object<string,Object>}
     */
    this._localAwarenessState = {}
    this.awareness = new Map()
    this.awarenessClock = new Map()
  }
  /**
   * @return {Object<string,Object>}
   */
  getLocalAwarenessInfo () {
    throw error.methodUnimplemented()
  }
  /**
   * @return {Map<string,Object<string,Object>>}
   */
  getAwarenessInfo () {
    throw error.methodUnimplemented()
  }
  /**
   * @param {string} field
   * @param {Object} value
   */
  setAwarenessField (field, value) {
    throw error.methodUnimplemented()
  }
}

/**
 * @typedef {Object} UserStateUpdate
 * @property {number} UserStateUpdate.clientID
 * @property {number} UserStateUpdate.clock
 * @property {Object} UserStateUpdate.state
 */

/**
 * @param {encoding.Encoder} encoder
 * @param {Array<UserStateUpdate>} stateUpdates
 */
export const writeUsersStateChange = (encoder, stateUpdates) => {
  const len = stateUpdates.length
  encoding.writeVarUint(encoder, messageUsersStateChanged)
  encoding.writeVarUint(encoder, len)
  for (let i = 0; i < len; i++) {
    const { clientID, state, clock } = stateUpdates[i]
    encoding.writeVarUint(encoder, clientID)
    encoding.writeVarUint(encoder, clock)
    encoding.writeVarString(encoder, JSON.stringify(state))
  }
}

/**
 * @param {decoding.Decoder} decoder
 * @param {YWithAwareness} y
 */
export const readUsersStateChange = (decoder, y) => {
  const added = []
  const updated = []
  const removed = []
  const len = decoding.readVarUint(decoder)
  for (let i = 0; i < len; i++) {
    const clientID = decoding.readVarUint(decoder)
    const clock = decoding.readVarUint(decoder)
    const state = JSON.parse(decoding.readVarString(decoder))
    const uClock = y.awarenessClock.get(clientID) || 0
    y.awarenessClock.set(clientID, clock)
    if (state === null) {
      // only write if clock increases. cannot overwrite
      if (y.awareness.has(clientID) && uClock < clock) {
        y.awareness.delete(clientID)
        removed.push(clientID)
      }
    } else if (uClock <= clock) { // allow to overwrite (e.g. when client was on, then offline)
      if (y.awareness.has(clientID)) {
        updated.push(clientID)
      } else {
        added.push(clientID)
      }
      y.awareness.set(clientID, state)
      y.awarenessClock.set(clientID, clock)
    }
  }
  if (added.length > 0 || updated.length > 0 || removed.length > 0) {
    // @ts-ignore We know emit is defined
    y.emit('awareness', [{
      added, updated, removed
    }])
  }
}

/**
 * @param {decoding.Decoder} decoder
 * @param {encoding.Encoder} encoder
 * @return {Array<UserStateUpdate>}
 */
export const forwardUsersStateChange = (decoder, encoder) => {
  const len = decoding.readVarUint(decoder)
  const updates = []
  encoding.writeVarUint(encoder, messageUsersStateChanged)
  encoding.writeVarUint(encoder, len)
  for (let i = 0; i < len; i++) {
    const clientID = decoding.readVarUint(decoder)
    const clock = decoding.readVarUint(decoder)
    const state = decoding.readVarString(decoder)
    encoding.writeVarUint(encoder, clientID)
    encoding.writeVarUint(encoder, clock)
    encoding.writeVarString(encoder, state)
    updates.push({ clientID, state: JSON.parse(state), clock })
  }
  return updates
}

/**
 * @param {decoding.Decoder} decoder
 * @param {YWithAwareness} y
 */
export const readAwarenessMessage = (decoder, y) => {
  switch (decoding.readVarUint(decoder)) {
    case messageUsersStateChanged:
      readUsersStateChange(decoder, y)
      break
  }
}

/**
 * @typedef {Object} UserState
 * @property {number} UserState.clientID
 * @property {any} UserState.state
 * @property {number} UserState.clock
 */

/**
 * @param {decoding.Decoder} decoder
 * @param {encoding.Encoder} encoder
 * @return {Array<UserState>} Array of state updates
 */
export const forwardAwarenessMessage = (decoder, encoder) => {
  /**
   * @type {Array<UserState>}
   */
  let s = []
  switch (decoding.readVarUint(decoder)) {
    case messageUsersStateChanged:
      s = forwardUsersStateChange(decoder, encoder)
  }
  return s
}
