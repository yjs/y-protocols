/**
 * @module sync-protocol
 */

import * as encoding from 'lib0/encoding.js'
import * as decoding from 'lib0/decoding.js'
import * as Y from 'yjs'

/**
 * @typedef {Map<number, number>} StateMap
 */

/**
 * Core Yjs defines three message types:
 * • YjsSyncStep1: Includes the State Set of the sending client. When received, the client should reply with YjsSyncStep2.
 * • YjsSyncStep2: Includes all missing structs and the complete delete set. When received, the the client is assured that
 *   it received all information from the remote client.
 *
 * In a peer-to-peer network, you may want to introduce a SyncDone message type. Both parties should initiate the connection
 * with SyncStep1. When a client received SyncStep2, it should reply with SyncDone. When the local client received both
 * SyncStep2 and SyncDone, it is assured that it is synced to the remote client.
 *
 * In a client-server model, you want to handle this differently: The client should initiate the connection with SyncStep1.
 * When the server receives SyncStep1, it should reply with SyncStep2 immediately followed by SyncStep1. The client replies
 * with SyncStep2 when it receives SyncStep1. Optionally the server may send a SyncDone after it received SyncStep2, so the
 * client knows that the sync is finished.  There are two reasons for this more elaborated sync model: 1. This protocol can
 * easily be implemented on top of http and websockets. 2. The server shoul only reply to requests, and not initiate them.
 * Therefore it is necesarry that the client initiates the sync.
 *
 * Construction of a message:
 * [messageType : varUint, message definition..]
 *
 * Note: A message does not include information about the room name. This must to be handled by the upper layer protocol!
 *
 * stringify[messageType] stringifies a message definition (messageType is already read from the bufffer)
 */

export const messageYjsSyncStep1 = 0
export const messageYjsSyncStep2 = 1
export const messageYjsUpdate = 2

/**
 * Read SyncStep1 and return it as a readable string.
 *
 * @param {decoding.Decoder} decoder
 * @return {string}
 */
export const stringifySyncStep1 = (decoder) => {
  let s = 'SyncStep1: '
  const len = decoding.readUint32(decoder)
  for (let i = 0; i < len; i++) {
    const user = decoding.readVarUint(decoder)
    const clock = decoding.readVarUint(decoder)
    s += `(${user}:${clock})`
  }
  return s
}

/**
 * Create a sync step 1 message based on the state of the current shared document.
 *
 * @param {encoding.Encoder} encoder
 * @param {Y.StructStore} store
 */
export const writeSyncStep1 = (encoder, store) => {
  encoding.writeVarUint(encoder, messageYjsSyncStep1)
  Y.writeStates(encoder, store)
}

/**
 * @param {encoding.Encoder} encoder
 * @param {Y.StructStore} store
 * @param {Map<number, number>} sm
 */
export const writeSyncStep2 = (encoder, store, sm) => {
  encoding.writeVarUint(encoder, messageYjsSyncStep2)
  Y.writeModel(encoder, store, sm)
}

/**
 * Read SyncStep1 message and reply with SyncStep2.
 *
 * @param {decoding.Decoder} decoder The reply to the received message
 * @param {encoding.Encoder} encoder The received message
 * @param {Y.StructStore} store
 */
export const readSyncStep1 = (decoder, encoder, store) =>
  writeSyncStep2(encoder, store, Y.readStatesAsMap(decoder))

/**
 * Read and apply Structs and then DeleteStore to a y instance.
 *
 * @param {decoding.Decoder} decoder
 * @param {Y.Transaction} transaction
 * @param {Y.StructStore} store
 */
export const readSyncStep2 = Y.readModel

/**
 * @param {encoding.Encoder} encoder
 * @param {encoding.Encoder} update
 */
export const writeUpdate = (encoder, update) => {
  encoding.writeVarUint(encoder, messageYjsUpdate)
  encoding.writeBinaryEncoder(encoder, update)
}

export const readUpdate = Y.readModel

/**
 * @param {decoding.Decoder} decoder A message received from another client
 * @param {encoding.Encoder} encoder The reply message. Will not be sent if empty.
 * @param {Y.Y} y
 * @param {any} origin
 */
export const readSyncMessage = (decoder, encoder, y, origin) => {
  const messageType = decoding.readVarUint(decoder)
  switch (messageType) {
    case messageYjsSyncStep1:
      readSyncStep1(decoder, encoder, y.store)
      break
    case messageYjsSyncStep2:
      // @ts-ignore
      y.transact(transaction => readSyncStep2(decoder, transaction, y.store), origin)
      break
    case messageYjsUpdate:
      // @ts-ignore
      y.transact(transaction => readUpdate(decoder, transaction, y.store), origin)
      break
    default:
      throw new Error('Unknown message type')
  }
  return messageType
}
