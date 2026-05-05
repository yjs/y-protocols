# y-protocols Specification

Binary wire formats for synchronizing Yjs documents and exchanging ephemeral
awareness state.

The key words MUST, SHOULD, and MAY are to be interpreted as in
[RFC 2119](https://datatracker.ietf.org/doc/html/rfc2119).

## 1. Conventions

- A *buffer* is a byte array (`Uint8Array`).
- `•` denotes concatenation: `[1, 2] = [1] • [2]`.
- All integers are unsigned. `length(b)` is the size of buffer `b` in bytes.
- Reference encoders/decoders live in
  [lib0/encoding](https://github.com/dmonad/lib0/blob/main/encoding.js) and
  [lib0/decoding](https://github.com/dmonad/lib0/blob/main/decoding.js).

## 2. Primitive encodings

| Type            | Definition |
|-----------------|------------|
| `varUint(n)`    | LEB128-style encoding of a 53-bit unsigned integer. Each byte carries 7 payload bits, least-significant first; the high bit signals continuation. 1–8 bytes. |
| `varBuffer(b)`  | `varUint(length(b)) • b` |
| `utf8(s)`       | UTF-8 encoding of string `s`. |
| `varString(s)`  | `varBuffer(utf8(s))` |
| `json(o)`       | `varString(JSON.stringify(o))` |

## 3. Sync protocol

The sync protocol reconciles a Yjs document between two peers by exchanging
state vectors and updates. See
[Yjs / Document Updates](https://docs.yjs.dev/api/document-updates).

### 3.1 Message types

| Name        | ID  |
|-------------|-----|
| `SyncStep1` | `0` |
| `SyncStep2` | `1` |
| `Update`    | `2` |

### 3.2 Encoding

| Message     | Encoding                                  |
|-------------|-------------------------------------------|
| `SyncStep1` | `varUint(0) • varBuffer(stateVector)`     |
| `SyncStep2` | `varUint(1) • varBuffer(documentUpdate)`  |
| `Update`    | `varUint(2) • varBuffer(documentUpdate)`  |

- `stateVector` is the output of `Y.encodeStateVector(doc)`.
- For `SyncStep2`, `documentUpdate` is `Y.encodeStateAsUpdate(doc, stateVector)`,
  i.e. the updates the remote peer is missing relative to the received state
  vector.
- For `Update`, `documentUpdate` is the payload emitted by
  `doc.on('update', ...)`. The receiver applies it with `Y.applyUpdate`.

### 3.3 Handshake

Each peer:

1. Sends `SyncStep1` containing its local state vector.
2. On receiving `SyncStep1`, replies with `SyncStep2` containing the missing
   updates.
3. After receiving `SyncStep2`, the local document is up to date with respect
   to the snapshot the remote sent.
4. Subsequent local changes MUST be propagated as `Update` messages.

In a peer-to-peer topology, both peers send `SyncStep1` upon connecting.

In a client–server topology, the client initiates with `SyncStep1`. The server
replies with `SyncStep2` immediately followed by its own `SyncStep1`. The
server SHOULD NOT initiate the handshake.

## 4. Awareness protocol

The awareness protocol propagates ephemeral, per-client state (presence, cursor
position, etc.) using a state-based CRDT.

### 4.1 Semantics

Each peer maintains, for every known client, the tuple
`(state: object | null, clock: uint, lastUpdated: timestamp)`.

- A client is identified by its `clientID` and MUST only modify its own entry.
- An incoming entry is applied iff its `clock` is strictly greater than the
  locally known `clock` for that client.
- `state = null` marks the client as offline.
- A client whose entry has not been refreshed for `30` seconds MUST be removed
  locally. Each client SHOULD therefore re-broadcast its own state at least
  every `15` seconds.
- Before disconnecting, a client SHOULD broadcast `state = null` with an
  incremented `clock`.

### 4.2 Encoding

```
awarenessUpdate(entries) :=
    varUint(length(entries))
  • for each entry e:
        varUint(e.clientID) • varUint(e.clock) • json(e.state)
```

A peer MAY include any subset of its known entries in a single update, including
just its own.

## 5. Composite messages

`y-protocols` defines two sub-protocols that a transport layer may multiplex
under a single top-level message type. Higher IDs are reserved for application
extensions.

| Name                | ID  |
|---------------------|-----|
| `SyncProtocol`      | `0` |
| `AwarenessProtocol` | `1` |

```
message := varUint(messageType) • payload
```

Examples:

- Sync step 1 over the wire: `varUint(0) • SyncStep1`
- Awareness update over the wire: `varUint(1) • awarenessUpdate(entries)`

### 5.1 Reference dispatch

```js
import * as decoding from 'lib0/decoding'
import * as encoding from 'lib0/encoding'
import * as sync from 'y-protocols/sync'
import * as awareness from 'y-protocols/awareness'

const SyncProtocol = 0
const AwarenessProtocol = 1

function readMessage (buffer, ydoc, awarenessInstance) {
  const decoder = decoding.createDecoder(buffer)
  const encoder = encoding.createEncoder()
  const messageType = decoding.readVarUint(decoder)

  switch (messageType) {
    case SyncProtocol:
      sync.readSyncMessage(decoder, encoder, ydoc, null)
      break
    case AwarenessProtocol:
      awareness.applyAwarenessUpdate(
        awarenessInstance,
        decoding.readVarUint8Array(decoder),
        null
      )
      break
    default:
      throw new Error(`Unknown message type: ${messageType}`)
  }

  // Some handlers (e.g. SyncStep1) write a reply.
  if (encoding.length(encoder) > 0) {
    provider.send(encoding.toUint8Array(encoder))
  }
}
```

## 6. Read-only enforcement

Yjs has no built-in concept of read-only peers; a server MAY enforce it by
inspecting the first two bytes of an incoming message.

| Prefix    | Meaning                              | Action for read-only peer |
|-----------|--------------------------------------|---------------------------|
| `00 00 …` | Sync `SyncStep1` (state vector)      | accept                    |
| `00 01 …` | Sync `SyncStep2` (document state)    | reject                    |
| `00 02 …` | Sync `Update` (document update)      | reject                    |
| `01 …`    | Awareness update                     | accept, or reject to disable awareness |

Awareness payloads are not authenticated by this protocol; a malicious peer can
claim arbitrary cursor or presence data. Authoritative identity MUST be
enforced at a higher layer if required.
