/**
 * WebRTC DataChannel transport — shared signaling types.
 *
 * The WebRTC transport (`WebRtcServer` / `WebRtcClient`) cannot bring up a P2P connection on its
 * own — it needs an out-of-band channel that ferries SDP descriptions and ICE candidates between
 * the two peers before the DataChannel can open. Anything that can carry small JSON-shaped
 * messages reliably can be used: an in-process `EventEmitter`, a WebSocket, a long-poll endpoint,
 * a chat-room API — the choice is the application's.
 *
 * These interfaces describe the minimum shape the transport asks of that channel. The same
 * declarations are used on both the server and client side so signaling-server adapter code can be
 * written against a single type.
 */

/**
 * One signaling message exchanged between server and client during connection setup.
 *
 * - `kind: "offer"` — the offerer's session description (carries `sdp` + `sdp_type: "offer"`).
 * - `kind: "answer"` — the answerer's response session description (carries `sdp` + `sdp_type: "answer"`).
 * - `kind: "candidate"` — one ICE candidate (carries `candidate` + `mid`).
 *
 * `peer_id` identifies which remote peer this message is for / from — apps with multiple peers
 * route by it.
 */
export interface WebRtcSignalingMessage {
    kind: "offer" | "answer" | "candidate";
    peer_id: string;
    sdp?: string;
    sdp_type?: "offer" | "answer";
    candidate?: string;
    mid?: string;
}

/**
 * Application-provided signaling channel. The transport uses two operations:
 *
 * - `on_message(handler)` — called once at setup; the app must invoke `handler(msg)` whenever an
 *   inbound signaling message arrives for this peer.
 * - `send(msg)` — called when the transport produces an outbound signaling message; the app routes
 *   it to the matching remote peer.
 *
 * In the walkthrough smokes the channel is a paired in-process `EventEmitter`. Production usually
 * runs a small WebSocket signaling server with a peer-id directory.
 */
export interface WebRtcSignalingChannel {
    on_message(handler: (msg: WebRtcSignalingMessage) => void): void;
    send(msg: WebRtcSignalingMessage): void;
}
