import { getState } from "../state.js";
import { markWordGuessed, markTimedOut } from "../game.js";
import { serverNow, formatCountdown } from "../utils/timer.js";
import { playSuccess } from "../audio.js";

let initialized = false;
let intervalId = null;
let timeoutTriggered = false;

export function init() {
  if (initialized) return;
  initialized = true;
  const btn = document.getElementById("btn-word-guessed");
  btn.addEventListener("click", async () => {
    const { roomId } = getState();
    btn.disabled = true;
    try {
      await markWordGuessed(roomId);
      playSuccess();
    } finally {
      btn.disabled = false;
    }
  });
}

export function render(state) {
  if (state.phase !== "guessing") {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    timeoutTriggered = false;
    document.getElementById("preround-overlay").hidden = true;
    return;
  }

  if (!intervalId) {
    timeoutTriggered = false;
    intervalId = setInterval(() => tick(), 250);
    tick();
  }
}

function tick() {
  const state = getState();
  const timer = state.public?.timer;
  const countdownEl = document.getElementById("countdown");
  const overlay = document.getElementById("preround-overlay");
  const overlayNumber = document.getElementById("preround-number");

  if (!timer) {
    countdownEl.textContent = "--:--";
    overlay.hidden = true;
    return;
  }

  // Lead-in: the timer hasn't actually started yet — every client shows the same big
  // full-screen number, counting down from the shared startAt timestamp (not a host-only view).
  const msUntilStart = timer.startAt - serverNow();
  if (msUntilStart > 0) {
    overlay.hidden = false;
    overlayNumber.textContent = Math.ceil(msUntilStart / 1000);
    countdownEl.textContent = formatCountdown(timer.durationMs);
    return;
  }
  overlay.hidden = true;

  const remaining = timer.startAt + timer.durationMs - serverNow();
  countdownEl.textContent = formatCountdown(remaining);

  if (remaining <= 0 && !timeoutTriggered) {
    timeoutTriggered = true;
    markTimedOut(state.roomId).catch(() => {
      // Another client may have already flipped the phase — harmless.
    });
  }
}
