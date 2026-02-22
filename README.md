# Peer Drop

> QR-authenticated P2P data transfer. Three files. Drop into any project.

A tiny vanilla JS library for peer-to-peer data transfer between two devices, authenticated via QR code. One device creates a session, the other scans to connect, data flows. No server, no accounts, no persistence.

## Quick Start

```javascript
import { PeerBridge } from 'https://cdn.jsdelivr.net/gh/msieur-gab/peer-drop@main/index.js';
```

Or import modules individually:

```javascript
import { PeerBridge } from './peer-bridge.js';
import './peer-qrcode.js';
import './peer-scanner.js';
```

## Modules

```
peer-drop/
  peer-bridge.js      — PeerJS connection manager (EventTarget)
  peer-qrcode.js      — <peer-qrcode> Web Component
  peer-scanner.js      — <peer-scanner> Web Component
  index.js             — Barrel import (loads all three)
```

## Usage

### Host — create a session, wait for connection

```javascript
const bridge = new PeerBridge();
const { sessionId } = bridge.host();

bridge.addEventListener('connected', () => { /* peer joined */ });
bridge.addEventListener('data', (e) => {
  console.log(e.detail.data);
});
```

### Sender — join and push data

```javascript
const bridge = new PeerBridge();
bridge.join(sessionId);

bridge.addEventListener('connected', () => {
  bridge.send({ name: 'Alice', payload: [1, 2, 3] });
});
```

### QR Code

```html
<peer-qrcode value="https://example.com/?session=PD-A3F7K2" size="200"></peer-qrcode>
```

Renders a `<canvas>` in shadow DOM. Style with `::part(canvas)`.

### Scanner

```html
<peer-scanner></peer-scanner>
```

Rear camera, frame-by-frame scanning. Call `.start()` / `.stop()` to control.

```javascript
scanner.addEventListener('scan-success', (e) => {
  const url = e.detail.data;
  const sessionId = PeerBridge.sessionFrom(url);
  bridge.join(sessionId);
});
```

## Connection Flow

```
HOST                                 SENDER
────                                 ──────
1. bridge.host()
   → session ID generated
2. <peer-qrcode> shows URL
   with ?session=PD-A3F7K2
                                     3. <peer-scanner> scans QR
                                     4. Extracts session from URL
                                     5. bridge.join(sessionId)
6. 'connected' fires                 6. 'connected' fires
                                     7. bridge.send(data)
8. 'data' fires
```

## API

### PeerBridge

| Method | Description |
|--------|-------------|
| `host(sessionId?)` | Create a session. Returns `{ sessionId }` |
| `join(sessionId)` | Connect to an existing session |
| `send(data)` | Send data to the connected peer |
| `disconnect(reason?)` | Close connection, keep session for retry |
| `destroy()` | Full teardown |
| `retry()` | Re-attempt a failed connection |

| Event | Detail |
|-------|--------|
| `ready` | `{ peerId, sessionId }` — signaling server connected |
| `connected` | `{ role }` — peer-to-peer link established |
| `disconnected` | `{ role, reason? }` — connection lost |
| `data` | `{ data }` — incoming data from peer |
| `error` | `{ type, message }` — something went wrong |

| Option | Default | Description |
|--------|---------|-------------|
| `debug` | `false` | Enable debug logging via `log` events |
| `keepAwake` | `false` | Request wake lock while connected |
| `connectionTimeout` | `null` | Timeout in ms before giving up |
| `heartbeatInterval` | `5000` | Ping interval in ms |
| `heartbeatTimeout` | `15000` | Max silence before disconnect |
| `prefix` | `'peer-drop'` | Peer ID prefix |

## Dependencies

All loaded via CDN — no npm install needed.

| Library | Purpose |
|---------|---------|
| [PeerJS](https://peerjs.com/) | WebRTC abstraction |
| [qrcode](https://github.com/soldair/node-qrcode) | QR code generation |
| [jsQR](https://github.com/cozmo/jsQR) | QR code scanning |

## Design Principles

- **Three files.** If it needs more, scope is wrong.
- **Zero config for the simple case.** `host()` and `join(id)` just works.
- **Unstyled by default.** Shadow DOM + `::part()` hooks. Each consumer styles it.
- **No state management.** Moves data, doesn't store or interpret it.
- **Fail loud.** Camera denied? Peer unreachable? Clear error events.
- **Works on localhost.** No HTTPS required for dev.
