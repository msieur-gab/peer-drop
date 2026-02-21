# Peer Drop — Project Brief

> Reusable QR-authenticated P2P data transfer. Drop into any project.

---

## What This Is

A tiny vanilla JS library for peer-to-peer data transfer between two devices, authenticated via QR code. Website generates a session, phone scans to connect, data flows. No server, no accounts, no persistence on the receiving side.

---

## Why It Exists

Multiple projects (Vrooom, Cypher/Nexus, future ones) need the same pattern: a stateless display (website/kiosk) paired with a phone that holds the data. Each project reimplements PeerJS + QR + scanner from scratch. This library extracts the common plumbing so each project only wires its own data flow.

---

## Modules

```
peer-drop/
  peer-bridge.js      — PeerJS wrapper (EventTarget)
  peer-qrcode.js      — <peer-qrcode> Web Component
  peer-scanner.js      — <peer-scanner> Web Component
```

### peer-bridge.js — Connection manager

```js
import { PeerBridge } from './peer-bridge.js';
const bridge = new PeerBridge();

// Website (host) — create session, wait for phone
const { sessionId } = bridge.host();
bridge.addEventListener('connected', () => { /* phone joined */ });
bridge.addEventListener('data', (e) => { /* e.detail */ });

// Phone (sender) — connect and push data
bridge.join(sessionId);
bridge.send({ badges: [...], profile: {...} });
```

- Session ID: short random string (e.g. `PD-A3F7K2`)
- Peer ID: `peer-drop-${sessionId}` (deterministic — phone can find host)
- Heartbeat: configurable interval (default 5s), timeout emits `disconnected`
- Events: `connected`, `disconnected`, `data`, `error`
- Cleanup: `bridge.destroy()`

### <peer-qrcode> — QR code generator

```html
<peer-qrcode value="https://example.com/?session=PD-A3F7K2" size="200"></peer-qrcode>
```

- Renders `<canvas>` in shadow DOM
- Attributes: `value`, `size`, `error-correction`
- CSS parts: `::part(canvas)`
- Dependency: `qrcode` via CDN

### <peer-scanner> — QR code scanner

```html
<peer-scanner></peer-scanner>
```

- Rear camera, frame-by-frame jsQR scanning
- Emits `scan-success` with `{ detail: { data } }`
- Emits `scan-error` for permission denied, etc.
- Methods: `start()`, `stop()`
- CSS parts: `::part(video)`, `::part(overlay)`
- Dependency: `jsQR` via CDN

---

## Connection Flow

```
WEBSITE (host)                       PHONE (sender)
──────────────                       ──────────────
1. bridge.host()
   → PeerJS peer created
   → session ID generated
2. <peer-qrcode> shows URL
   with ?session=PD-A3F7K2
                                     3. <peer-scanner> scans QR
                                     4. Extracts session ID from URL
                                     5. bridge.join(sessionId)
6. 'connected' fires                 6. 'connected' fires
                                     7. bridge.send(data)
8. 'data' fires
   → render received data
```

---

## Dependencies (all CDN, no npm)

| Library | Import | Purpose |
|---------|--------|---------|
| PeerJS 1.x | `https://esm.sh/peerjs@1` | WebRTC abstraction |
| qrcode 1.x | `https://esm.sh/qrcode@1` | QR code generation |
| jsQR 1.x | `https://esm.sh/jsqr@1` | QR code scanning |

---

## Prior Art: ~/cypher/

The pattern already works in Cypher/Nexus. Key files to reference:

| File | Extract |
|------|---------|
| `shared/services/peer-service.js` | PeerJS wrapper, heartbeat, EventTarget |
| `shared/components/nexus-qrcode.js` | QR generation (Lit — rewrite as vanilla) |
| `shared/components/nexus-scanner.js` | Camera + jsQR (Lit — rewrite as vanilla) |

**Keep:** peer ID convention, heartbeat, EventTarget, camera `facingMode: 'environment'`, grayscale for jsQR, session ID in URL param.

**Drop:** Lit, cyberpunk theming, Cypher protocol constants, boot sequence, connection-manager wrapper.

---

## First Consumer: Vrooom

Phone app has badge data in IndexedDB. Parent opens print page on laptop. Scans QR on laptop screen with phone. Badge collection + profile flows to laptop. Laptop renders printable badge sheet. No cloud, no upload.

Vrooom-specific wiring stays in Vrooom — peer-drop just moves the bytes.

---

## Design Principles

- **Three files max.** If it needs more, scope is wrong.
- **Zero config for the simple case.** `host()` and `join(id)` with no options just works.
- **Unstyled by default.** Shadow DOM + `::part()` hooks. Each consumer styles it.
- **No state management.** Moves data, doesn't store or interpret it.
- **Fail loud.** Camera denied? Peer unreachable? Clear error events, human-readable.
- **Works on localhost.** PeerJS public signaling server, no HTTPS required for dev.

---

## Implementation Order

1. `peer-bridge.js` — host/join/send/destroy + events
2. `<peer-qrcode>` — render QR from value attribute
3. `<peer-scanner>` — camera scanner emitting scan-success
4. Integration test: two browser tabs, host + join, data flows
5. Wire into Vrooom `print.html` as first consumer

---

## Open Questions

- **Bidirectional or one-way?** Library should support both, but one-way push (phone → website) should be dead simple.
- **Reconnection:** Auto-reconnect on disconnect? Or emit `disconnected` and let consumer decide? Leaning toward the latter.
- **BarcodeDetector API:** Native in modern browsers — could replace jsQR on supported browsers. Worth the added complexity?
- **Session URL format:** Just `?session=ID`? Or a full deep-link with protocol hints?
