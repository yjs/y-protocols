import * as Y from "yjs"; // eslint-disable-line
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";

/**
 * @param {encoding.Encoder} encoder
 * @param {number} code
 * @param {string} message
 */
export const writeError = (encoder, code, message) => {
    encoding.writeVarUint(encoder, code);
    encoding.writeVarString(encoder, message);
};

/**
 * @callback ErrorHandler
 * @param {any} y
 * @param {number} code
 * @param {string} message
 */

/**
 *
 * @param {decoding.Decoder} decoder
 * @param {Y.Doc} y
 * @param {ErrorHandler} errorHandler
 */
export const readError = (decoder, y, errorHandler) => {
    errorHandler(
        y,
        decoding.readVarUint(decoder),
        decoding.readVarString(decoder)
    );
};
