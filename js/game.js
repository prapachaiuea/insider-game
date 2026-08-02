import { ref, update } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-database.js";
import { db } from "./firebase-init.js";
import { getState } from "./state.js";

export const MIN_PLAYERS = 4;
export const MAX_PLAYERS = 8;
export const ROUND_DURATION_MS = 5 * 60 * 1000;

let wordsCache = null;
async function loadWords() {
  if (wordsCache) return wordsCache;
  const res = await fetch(new URL("../words.json", import.meta.url));
  wordsCache = await res.json();
  return wordsCache;
}

function shuffle(array) {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Host-only: shuffles roles + picks a word entirely client-side (no trusted server on the
// free Firebase plan). Known trust limitation — documented in README.md.
export async function startRound(roomId) {
  const { players, public: pub } = getState();
  const uids = Object.keys(players);
  if (uids.length < MIN_PLAYERS) throw new Error("NOT_ENOUGH_PLAYERS");
  if (uids.length > MAX_PLAYERS) throw new Error("TOO_MANY_PLAYERS");

  const wordList = await loadWords();
  const word = wordList[Math.floor(Math.random() * wordList.length)];
  const shuffled = shuffle(uids);
  const masterUid = shuffled[0];
  const insiderUid = shuffled[1];

  const updates = {};
  uids.forEach((uid) => {
    const role = uid === masterUid ? "master" : uid === insiderUid ? "insider" : "commoner";
    updates[`rooms/${roomId}/secrets/${uid}`] = {
      role,
      word: role === "commoner" ? null : word,
    };
    updates[`rooms/${roomId}/votes/${uid}`] = null; // clear any stale vote from a prior round
  });

  updates[`rooms/${roomId}/reveal/insiderUid`] = insiderUid;
  updates[`rooms/${roomId}/public/guess`] = { wordGuessed: false, guessedBy: null, guessedAt: null };
  updates[`rooms/${roomId}/public/timer`] = null;
  updates[`rooms/${roomId}/public/roundNumber`] = (pub?.roundNumber || 0) + 1;
  updates[`rooms/${roomId}/public/phase`] = "role-reveal";

  await update(ref(db), updates);
}

export async function setRoundDuration(roomId, durationMs) {
  await update(ref(db, `rooms/${roomId}/public`), { roundDurationMs: durationMs });
}

// Lead-in before the real timer starts, so every player sees the same synchronized
// full-screen 3-2-1 countdown (guessing-view.js) instead of the clock just appearing already
// running.
const PREROUND_COUNTDOWN_MS = 3000;

export async function startTimer(roomId) {
  const { public: pub } = getState();
  const durationMs = pub?.roundDurationMs || ROUND_DURATION_MS;
  await update(ref(db, `rooms/${roomId}/public`), {
    timer: { startAt: Date.now() + PREROUND_COUNTDOWN_MS, durationMs },
    phase: "guessing",
  });
}

// Two sequential single-path writes, not one atomic multi-path update: each write is then
// validated against a clean prior state, avoiding ambiguity in how RTDB rules see sibling
// fields that change in the very same multi-path update.
export async function markWordGuessed(roomId) {
  const { uid } = getState();
  await update(ref(db, `rooms/${roomId}/public/guess`), {
    wordGuessed: true,
    guessedBy: uid,
    guessedAt: Date.now(),
  });
  await update(ref(db, `rooms/${roomId}/public`), { phase: "voting" });
}

export async function markTimedOut(roomId) {
  await update(ref(db, `rooms/${roomId}/public`), { phase: "results" });
}

export async function revealResults(roomId) {
  await update(ref(db, `rooms/${roomId}/public`), { phase: "results" });
}

export async function backToLobby(roomId) {
  const { players } = getState();
  const updates = {};
  Object.keys(players).forEach((uid) => {
    updates[`rooms/${roomId}/votes/${uid}`] = null;
  });
  updates[`rooms/${roomId}/public/guess`] = null;
  updates[`rooms/${roomId}/public/timer`] = null;
  updates[`rooms/${roomId}/public/phase`] = "lobby";
  await update(ref(db), updates);
}
