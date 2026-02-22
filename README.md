# Peer Drop

> QR-authenticated P2P data transfer. Three files. Drop into any project.

A thin abstraction over [PeerJS](https://peerjs.com/) (WebRTC) that handles the plumbing of connecting two devices via QR code. One device creates a session, the other scans to connect, data flows. No server, no accounts, no persistence.

Connections are 1:1 (one host, one sender) and bidirectional — both sides can send and receive data once connected.

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

### Disconnect with reason

Pass a reason string to `disconnect()` — it's delivered to the remote peer before closing.

```javascript
// Sender side
bridge.disconnect('User logged out');

// Host side — receives the reason
bridge.addEventListener('disconnected', (e) => {
  console.log(e.detail.reason); // 'User logged out'
});
```

If the connection drops unexpectedly (network loss, heartbeat timeout), `reason` will reflect the cause (e.g. `'heartbeat-timeout'`).

### URL helpers

```javascript
// Generate a session URL from any base URL
const link = bridge.sessionUrl('https://example.com/client.html');
// → 'https://example.com/client.html?session=PD-A3F7K2'

// Extract session ID from a URL
const id = PeerBridge.sessionFrom('https://example.com/client.html?session=PD-A3F7K2');
// → 'PD-A3F7K2'
```

### Debug mode

Add `?debug` to the page URL. The bridge emits `log` events you can display:

```javascript
const bridge = new PeerBridge({ debug: true });
bridge.addEventListener('log', (e) => console.log(e.detail.message));
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
| `send(data)` | Send data to the connected peer. Works from both sides |
| `disconnect(reason?)` | Close connection, deliver reason to remote peer |
| `destroy()` | Full teardown — connection + session gone |
| `retry()` | Re-attempt a failed connection on the same session |
| `sessionUrl(baseUrl)` | Build a URL with the session ID as query param |
| `PeerBridge.sessionFrom(url)` | Static — extract session ID from a URL |

| Property | Description |
|----------|-------------|
| `sessionId` | Current session ID |
| `connected` | `true` if the data channel is open |

| Event | Detail |
|-------|--------|
| `ready` | `{ peerId, sessionId }` — signaling server connected |
| `connected` | `{ role }` — peer-to-peer link established |
| `disconnected` | `{ role, reason? }` — connection closed or lost |
| `data` | `{ data }` — incoming data from peer |
| `error` | `{ type, message }` — something went wrong |
| `log` | `{ message }` — debug info (only when `debug: true`) |

| Option | Default | Description |
|--------|---------|-------------|
| `debug` | `false` | Enable debug logging via `log` events |
| `keepAwake` | `false` | Request screen wake lock while connected |
| `connectionTimeout` | `null` | Timeout in ms before giving up |
| `heartbeatInterval` | `5000` | Ping interval in ms (host → sender) |
| `heartbeatTimeout` | `15000` | Max silence before auto-disconnect |
| `prefix` | `'peer-drop'` | Peer ID prefix on the signaling server |

## How it works

Peer Drop is a thin wrapper around [PeerJS](https://peerjs.com/), which itself abstracts WebRTC. The signaling (how peers find each other) goes through PeerJS's free cloud server. Once connected, data flows directly between devices — no server relay needed for most network configurations.

PeerJS includes built-in STUN and TURN servers for NAT traversal, so connections work across different networks (e.g. desktop on WiFi, phone on cellular).

## Dependencies

All loaded via CDN — no npm install needed.

| Library | Purpose |
|---------|---------|
| [PeerJS](https://peerjs.com/) | WebRTC abstraction + signaling |
| [qrcode](https://github.com/soldair/node-qrcode) | QR code generation |
| [jsQR](https://github.com/cozmo/jsQR) | QR code scanning |

## Design Principles

- **Three files.** If it needs more, scope is wrong.
- **Zero config for the simple case.** `host()` and `join(id)` just works.
- **Unstyled by default.** Shadow DOM + `::part()` hooks. Each consumer styles it.
- **No state management.** Moves data, doesn't store or interpret it.
- **Fail loud.** Camera denied? Peer unreachable? Clear error events.
- **Works on localhost.** No HTTPS required for dev.
