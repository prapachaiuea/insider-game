# Insider (web)

A browser version of the party/social-deduction game **Insider** (originally by Oink Games), for playing with friends who don't own the physical card set. Static site + Firebase Realtime Database, deployable on GitHub Pages for free.

## How it works

1. One player creates a room and shares the link.
2. Everyone else opens the link and joins the lobby.
3. The host starts the game (4–8 players) — roles (Master / Insider / Commoner) and a secret word are assigned.
4. Everyone but the Commoners knows the word; the group asks yes/no questions out loud (voice call or in person — this site doesn't handle chat/voice) to guess it within 5 minutes.
5. If the word is guessed, everyone but the Master votes on who they think the Insider was.
6. Results are revealed, and the host can start another round with the same room without re-sharing the link.

## Known limitation: host trust

This app runs on Firebase's free plan with no server-side code (no Cloud Functions). When a round starts, **the host's own browser** shuffles the roles and picks the word, then writes each player's secret to a database path that Firebase Security Rules restrict to that player only. This means a technically savvy host could inspect their own browser's network traffic and see other players' roles before they're revealed.

For a casual game with friends this is an acceptable trade-off — it's no different from trusting whoever shuffles a physical deck — but it's not a cryptographically secure implementation, so don't use it for anything with real stakes.

## Setup

### 1. Create a Firebase project

1. Go to the [Firebase Console](https://console.firebase.google.com) and create a new project (free **Spark** plan is enough).
2. **Build → Authentication → Sign-in method** → enable **Anonymous**.
3. **Build → Realtime Database → Create Database** → pick a region → start in **locked mode**.
4. **Realtime Database → Rules** tab → paste the contents of [`firebase-rules.json`](firebase-rules.json) → **Publish**.
5. **Project settings → Add app → Web app (`</>`)** → copy the generated config object into [`firebase-config.js`](firebase-config.js), replacing the `REPLACE_ME` placeholders.
6. **Authentication → Settings → Authorized domains** → add `<your-github-username>.github.io` (needed once you deploy to Pages).

### 2. Run locally

No build step — just serve the folder statically (opening `index.html` directly via `file://` won't work because ES modules and fetch require an HTTP origin):

```bash
npx serve .
# or: python -m http.server 8080
```

Then open the printed URL. Open it in two different browser tabs/incognito windows to simulate two players.

### 3. Deploy to GitHub Pages

1. Push this repo to GitHub.
2. Repo **Settings → Pages** → Source: **Deploy from a branch** → Branch: `main` / `(root)` → Save.
3. Visit `https://<username>.github.io/<repo>/` after a minute or two.

## Verifying role secrecy

Before relying on this for game night, open the browser devtools **Network** (or Application → IndexedDB) tab on a non-host player's tab and confirm you cannot read another player's `secrets/{uid}` node — the Realtime Database should return a permission-denied error for any uid other than your own (or the host's).

## Project structure

```
index.html            single-page shell, one <section> per game phase
styles.css             all styling
firebase-config.js      your Firebase web app config (fill in after setup)
firebase-rules.json     Realtime Database security rules (paste into Firebase console)
words.json               secret word list
main.js                 entry point
js/
  firebase-init.js       Firebase app/auth/db init
  auth.js                 anonymous sign-in
  room.js                 create/join a room, live sync
  game.js                 role shuffle, word pick, phase transitions
  votes.js                cast a vote, tally + win-condition logic
  state.js                tiny local pub/sub store
  router.js               shows/hides the active phase's <section>
  ui/                      one render module per phase
  utils/                   room code generator, localStorage helpers, countdown timer
```

## Limitations / known edge cases

- No host migration: if the host closes their tab mid-game, phase transitions that require the host (start timer, reveal results, play again) stall until they return.
- Min/max player count (4–8) is enforced in the UI only, not by the database rules.
- Duplicate display names are allowed (players are identified by an anonymous auth ID, not their name).
