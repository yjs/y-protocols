# Yjs Protocols
> Binary encoding protocols for *syncing*, *awareness*, and *history inforamtion*

This API is unstable and subject to change.

## API

### Awareness Protocoll

```js
import * as awarenessProtocol from 'y-protocols/awareness.js'
```

#### awarenessProtocol.Awareness Class

The Awareness class implements a simple network agnostic protocol to propagate awareness information like cursor, username, or status. Each client can update its own local state and listen to state changes of remote clients.

```js
const awareness = new awarenessProtocol.Awareness()
```

<dl>
  <b><code>getLocalState():Object&lt;string,any&gt;|null</code></b>
  <dd>Get the local awareness state.</dd>
  <b><code>setLocalState(Object&lt;string,any&gt;|null)</code></b>
  <dd>Set/Update the local awareness state. Set `null` to mark the local client as offline.</dd>
  <b><code>setLocalStateField(string, any)</code></b>
  <dd>Only update a single field on the local awareness object. Does not do anything if the local state is not set.</dd>
  <b><code>getStates():Map&lt;number,Object&lt;string,any&gt;&gt;</code></b>
  <dd>Get all client awareness states (remote and local). Maps from clientID to awareness state.</dd>
  <b><code>on('change', ({ added: Array&lt;number&gt;, updated: Array&lt;number&gt; removed: Array&lt;number&gt; }, [transactionOrigin:any]) => ..)</code></b>
  <dd>Listen to remote and local changes on the awareness instance.</dd>
</dl>


### License

[The MIT License](./LICENSE) © Kevin Jahns

