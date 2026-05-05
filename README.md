# Yjs Protocols

> Binary encoding protocols for *syncing*, *awareness*, and *auth*.

This package implements the wire formats used by Yjs network providers. The
formats themselves are documented in [PROTOCOL.md](./PROTOCOL.md); this README
covers the JavaScript API.

```sh
npm install @y/protocols
```

## Modules

| Import path             | Purpose                                              |
|-------------------------|------------------------------------------------------|
| `@y/protocols/sync`     | Reconcile a Yjs document between two peers.          |
| `@y/protocols/awareness`| Propagate ephemeral per-client state (presence).     |
| `@y/protocols/auth`     | Encode authorization errors (e.g. permission denied).|

## Sync

```js
import * as syncProtocol from '@y/protocols/sync'
import * as encoding from 'lib0/encoding'
import * as decoding from 'lib0/decoding'

// Outgoing handshake
const encoder = encoding.createEncoder()
syncProtocol.writeSyncStep1(encoder, ydoc)
send(encoding.toUint8Array(encoder))

// Incoming message
const decoder = decoding.createDecoder(buffer)
const replyEncoder = encoding.createEncoder()
syncProtocol.readSyncMessage(decoder, replyEncoder, ydoc, transactionOrigin)
if (encoding.length(replyEncoder) > 0) {
  send(encoding.toUint8Array(replyEncoder))
}
```

| Function                                                     | Description |
|--------------------------------------------------------------|-------------|
| `writeSyncStep1(encoder, doc)`                               | Writes a `SyncStep1` containing the document's state vector. |
| `writeSyncStep2(encoder, doc, [stateVector])`                | Writes a `SyncStep2` containing all updates the remote is missing. |
| `writeUpdate(encoder, update)`                               | Writes a document `Update`. Pass the payload received from `doc.on('update', ...)`. |
| `readSyncMessage(decoder, encoder, doc, origin, [onError])`  | Reads any sync message and applies it. May write a reply to `encoder` (e.g. `SyncStep2` in response to `SyncStep1`). Returns the message type. |

See [PROTOCOL.md §3](./PROTOCOL.md#3-sync-protocol) for the handshake.

## Awareness

The awareness protocol manages user status (who is online?) and propagates
ephemeral state such as cursor location, username, or color. Each client owns
exactly one entry in a shared `Map<clientID, state>`; a client whose state has
not been refreshed for 30 seconds is dropped locally.

```js
import * as awarenessProtocol from '@y/protocols/awareness'

const awareness = new awarenessProtocol.Awareness(ydoc)

awareness.setLocalStateField('user', { name: 'Ada', color: '#f0a' })

awareness.on('change', ({ added, updated, removed }) => {
  // re-render remote cursors
})
```

### `class Awareness extends ObservableV2`

| Member                                | Description |
|---------------------------------------|-------------|
| `clientID: number`                    | Unique identifier of this client (mirrors `doc.clientID`). |
| `getLocalState(): object \| null`     | Returns the local awareness state. |
| `setLocalState(state)`                | Replaces the local state. Pass `null` to mark this client offline. |
| `setLocalStateField(field, value)`    | Updates a single field of the local state. No-op if the local state is `null`. |
| `getStates(): Map<number, object>`    | Returns all known states (local and remote), keyed by `clientID`. |
| `on('change', handler)`               | Fires when the *content* of any state changes. Handler: `({ added, updated, removed }, origin) => void`. |
| `on('update', handler)`               | Fires on every received update, even if the state is unchanged (useful for liveness). Same handler signature as `change`. |
| `destroy()`                           | Marks the local client offline and stops the heartbeat. |

### Encode / apply

| Function                                                      | Description |
|---------------------------------------------------------------|-------------|
| `encodeAwarenessUpdate(awareness, clientIDs, [states])`       | Encodes the entries for the given clients into a buffer. |
| `applyAwarenessUpdate(awareness, update, origin)`             | Applies a remote update. |
| `removeAwarenessStates(awareness, clientIDs, origin)`         | Marks clients as offline locally and emits change events. |
| `modifyAwarenessUpdate(update, fn)`                           | Re-encodes an update with each entry's `state` rewritten by `fn`. Useful for servers that want to enforce identity. |

See [PROTOCOL.md §4](./PROTOCOL.md#4-awareness-protocol) for semantics.

## Auth

```js
import * as authProtocol from '@y/protocols/auth'

authProtocol.writePermissionDenied(encoder, 'read-only document')
authProtocol.readAuthMessage(decoder, ydoc, (doc, reason) => {
  console.warn('permission denied:', reason)
})
```

## License

[The MIT License](./LICENSE) © Kevin Jahns
