import {
  ref, set, get, update, remove, onValue, onDisconnect,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-database.js";
import { db } from "./firebase-init.js";
import { getState, setState } from "./state.js";
import { generateRoomCode } from "./utils/id.js";
import { saveLastRoom, saveLastName, clearLastRoom } from "./utils/storage.js";
import { ROUND_DURATION_MS } from "./game.js";

const MAX_CODE_ATTEMPTS = 5;
let subscribedRoomId = null;
let unsubscribers = [];

export function getRoomIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const room = params.get("room");
  return room ? room.toUpperCase() : null;
}

export function setRoomInUrl(roomId) {
  const url = new URL(window.location.href);
  url.searchParams.set("room", roomId);
  window.history.replaceState({}, "", url);
}

function clearRoomFromUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete("room");
  window.history.replaceState({}, "", url);
}

export async function createRoom(name) {
  const { uid } = getState();

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const roomId = generateRoomCode();
    try {
      // First-writer-wins per security rules: claims the room code, or fails on collision.
      await set(ref(db, `rooms/${roomId}/public/host`), uid);
    } catch {
      continue;
    }
    await update(ref(db, `rooms/${roomId}/public`), {
      createdAt: Date.now(),
      phase: "lobby",
      roundNumber: 0,
      roundDurationMs: ROUND_DURATION_MS,
    });
    await joinRoom(roomId, name);
    return roomId;
  }
  throw new Error("COULD_NOT_CREATE_ROOM");
}

export async function joinRoom(roomId, name) {
  const { uid } = getState();
  saveLastName(name);

  const publicSnap = await get(ref(db, `rooms/${roomId}/public`));
  if (!publicSnap.exists()) {
    throw new Error("ROOM_NOT_FOUND");
  }
  const publicData = publicSnap.val();

  const playerRef = ref(db, `rooms/${roomId}/players/${uid}`);
  const existingSnap = await get(playerRef);
  if (!existingSnap.exists() && publicData.phase !== "lobby") {
    throw new Error("ROOM_IN_PROGRESS");
  }

  await set(playerRef, {
    name,
    joinedAt: existingSnap.exists() ? existingSnap.val().joinedAt : Date.now(),
    online: true,
  });
  onDisconnect(ref(db, `rooms/${roomId}/players/${uid}/online`)).set(false);

  saveLastRoom(roomId);
  setRoomInUrl(roomId);
  setState({ roomId, name, isHost: publicData.host === uid });
  subscribeToRoom(roomId);
  return roomId;
}

export async function leaveRoom() {
  const { roomId, uid } = getState();
  if (!roomId) return;

  try {
    await onDisconnect(ref(db, `rooms/${roomId}/players/${uid}/online`)).cancel();
    await remove(ref(db, `rooms/${roomId}/players/${uid}`));
  } catch {
    // Best-effort — still reset the local view even if the write fails (e.g. offline).
  }

  unsubscribeFromRoom();
  clearLastRoom();
  clearRoomFromUrl();

  setState({
    roomId: null,
    isHost: false,
    phase: "landing",
    public: null,
    players: {},
    mySecret: null,
    insiderUid: null,
    votes: {},
  });
}

function unsubscribeFromRoom() {
  unsubscribers.forEach((unsub) => unsub());
  unsubscribers = [];
  subscribedRoomId = null;
}

export function subscribeToRoom(roomId) {
  if (subscribedRoomId === roomId) return; // already listening to this room
  if (subscribedRoomId !== null) unsubscribeFromRoom(); // switched rooms in the same tab
  subscribedRoomId = roomId;

  const { uid } = getState();
  const ignoreDenied = () => {};

  unsubscribers.push(onValue(ref(db, `rooms/${roomId}/public`), (snap) => {
    const publicData = snap.val() || {};
    setState({
      public: publicData,
      phase: publicData.phase || "lobby",
      isHost: publicData.host === uid,
    });
  }));

  unsubscribers.push(onValue(ref(db, `rooms/${roomId}/players`), (snap) => {
    setState({ players: snap.val() || {} });
  }));

  unsubscribers.push(onValue(ref(db, `rooms/${roomId}/secrets/${uid}`), (snap) => {
    setState({ mySecret: snap.val() || null });
  }, ignoreDenied));

  // Denied by rules until phase === 'results' (or unless we're the host) — expected, not an error.
  unsubscribers.push(onValue(ref(db, `rooms/${roomId}/reveal/insiderUid`), (snap) => {
    setState({ insiderUid: snap.val() || null });
  }, ignoreDenied));

  unsubscribers.push(onValue(ref(db, `rooms/${roomId}/votes`), (snap) => {
    setState({ votes: snap.val() || {} });
  }, ignoreDenied));
}
