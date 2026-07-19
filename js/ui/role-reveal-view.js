import { getState } from "../state.js";
import { startTimer } from "../game.js";

let initialized = false;

export function init() {
  if (initialized) return;
  initialized = true;
  document.getElementById("btn-start-timer").addEventListener("click", async () => {
    const { roomId } = getState();
    await startTimer(roomId);
  });
}

export function render(state) {
  if (state.phase !== "role-reveal") return;

  const card = document.getElementById("role-card");
  const btn = document.getElementById("btn-start-timer");
  const hint = document.getElementById("role-reveal-hint");

  if (!state.mySecret) {
    card.innerHTML = "<p>Waiting for your role...</p>";
    btn.hidden = true;
    return;
  }

  const { role, word } = state.mySecret;
  if (role === "master") {
    card.innerHTML = `<div class="role-badge role-master">Master</div><p>The secret word is:</p><p class="secret-word">${word}</p><p class="hint">You know the word — answer the group's yes/no questions honestly.</p>`;
  } else if (role === "insider") {
    card.innerHTML = `<div class="role-badge role-insider">Insider</div><p>The secret word is:</p><p class="secret-word">${word}</p><p class="hint">Blend in! Steer the group toward the word without revealing you already know it.</p>`;
  } else {
    card.innerHTML = `<div class="role-badge role-commoner">Commoner</div><p>You don't know the word.</p><p class="hint">Ask yes/no questions to figure it out together.</p>`;
  }

  if (state.isHost) {
    btn.hidden = false;
    hint.textContent = "When everyone has seen their role, start the timer.";
  } else {
    btn.hidden = true;
    hint.textContent = "Waiting for the host to start the timer...";
  }
}
