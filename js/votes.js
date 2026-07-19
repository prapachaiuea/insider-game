import { ref, set } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-database.js";
import { db } from "./firebase-init.js";
import { getState } from "./state.js";

export async function castVote(roomId, votedFor) {
  const { uid } = getState();
  await set(ref(db, `rooms/${roomId}/votes/${uid}`), {
    votedFor,
    votedAt: Date.now(),
  });
}

// Insider is "caught" if their vote count equals the max vote count — ties favor the group,
// not the insider. Zero votes cast (e.g. mass disconnect) defaults to the insider winning:
// no evidence, no conviction.
export function computeResult(votes, insiderUid, allPlayerUids) {
  const tally = {};
  allPlayerUids.forEach((uid) => {
    tally[uid] = 0;
  });

  const castVotes = Object.values(votes || {});
  castVotes.forEach((v) => {
    tally[v.votedFor] = (tally[v.votedFor] || 0) + 1;
  });

  if (castVotes.length === 0) {
    return { winner: "insider", tally, maxVotes: 0 };
  }

  const maxVotes = Math.max(...Object.values(tally));
  const insiderVotes = tally[insiderUid] || 0;
  const caught = maxVotes > 0 && insiderVotes === maxVotes;

  return { winner: caught ? "group" : "insider", tally, maxVotes };
}
