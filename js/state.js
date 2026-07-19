const state = {
  uid: null,
  name: "",
  roomId: null,
  isHost: false,
  phase: "landing", // landing | lobby | role-reveal | guessing | voting | results
  public: null,
  players: {},
  mySecret: null,
  insiderUid: null,
  votes: {},
};

const listeners = new Set();

export function getState() {
  return state;
}

export function setState(patch) {
  Object.assign(state, patch);
  listeners.forEach((fn) => fn(state));
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
