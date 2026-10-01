// Socket.io-client singleton — one connection shared across the app
import { io } from "socket.io-client";
import { getGuestId } from "./client";

const BASE = import.meta.env.VITE_API_BASE_URL;
let _socket = null;

// Get or create the socket (does not auto-connect).
// The server identifies the player from these handshake credentials, not from event payloads:
// signed-in users send their Cognito id token, guests send their random per-tab id.
export function getSocket(guestName) {
  if (!_socket) {
    _socket = io(BASE, {
      transports: ["websocket", "polling"],
      autoConnect: false,
      auth: cb => {
        const token = localStorage.getItem("arco_id_token");
        cb(token ? { token } : { guestId: getGuestId(), guestName });
      },
    });
  }
  return _socket;
}

// Disconnect and destroy — call on component unmount
export function destroySocket() {
  if (_socket) {
    _socket.disconnect();
    _socket = null;
  }
}

// Persist session for reconnect — keyed per user so windows with different accounts don't collide
export function saveSession(roomCode, userId) {
  localStorage.setItem(`arco_bs_session_${userId}`, JSON.stringify({ roomCode }));
}

export function loadSession(userId) {
  try { return JSON.parse(localStorage.getItem(`arco_bs_session_${userId}`)); }
  catch { return null; }
}

export function clearSession(userId) {
  localStorage.removeItem(`arco_bs_session_${userId}`);
}
