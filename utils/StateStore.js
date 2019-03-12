
import * as encoding from 'lib0/encoding.js'
import * as decoding from 'lib0/decoding.js'

/**
 * @typedef {Map<number, number>} StateMap
 */

/**
 * Read StateMap from Decoder and return as Map
 *
 * @param {decoding.Decoder} decoder
 * @return {StateMap}
 */
export const readStateMap = decoder => {
  const ss = new Map()
  const ssLength = decoding.readUint32(decoder)
  for (let i = 0; i < ssLength; i++) {
    const user = decoding.readVarUint(decoder)
    const clock = decoding.readVarUint(decoder)
    ss.set(user, clock)
  }
  return ss
}

/**
 * Write StateMap to Encoder
 *
 * @param {encoding.Encoder} encoder
 * @param {StateMap} state
 */
export const writeStateMap = (encoder, state) => {
  // write as fixed-size number to stay consistent with the other encode functions.
  // => anytime we write the number of objects that follow, encode as fixed-size number.
  encoding.writeUint32(encoder, state.size)
  state.forEach((clock, user) => {
    encoding.writeVarUint(encoder, user)
    encoding.writeVarUint(encoder, clock)
  })
}

/**
 * Read a StateMap from Decoder and return it as string.
 *
 * @param {decoding.Decoder} decoder
 * @return {string}
 */
export const stringifyStateMap = decoder => {
  let s = 'State Set: '
  readStateMap(decoder).forEach((clock, user) => {
    s += `(${user}: ${clock}), `
  })
  return s
}