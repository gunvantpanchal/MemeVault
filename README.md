# Blipboard 🔊

A fast, beautiful soundboard built with **Next.js 16** (App Router) and **Firebase**.
Tap a pad or press its hotkey to fire a sound. A live waveform reacts to whatever's
playing, search and categories filter the board, and an upload screen lets you add
your own clips.

It runs with **zero configuration** — the board ships with built-in sounds
synthesized in the browser, so `npm run dev` just works. Add your Firebase keys and
the board switches to your own uploaded library automatically.

---

## Quick start

Requires **Node.js 20.9+** (Next.js 16 needs Node 20+).

```bash
npm install
npm run dev
```

Open http://localhost:3000. You'll see the demo board immediately.

To open in VS Code: `code .` from this folder (or File → Open Folder).

---

## Connect your own sounds (Firebase)

This is optional. Do it when you want real audio files and a working upload screen.

1. Create a project at https://console.firebase.google.com
2. Add a **Web app** to the project (the `</>` icon). Copy the config values.
3. In the console, enable:
   - **Firestore Database** (Build → Firestore Database → Create)
   - **Storage** (Build → Storage → Get started)
4. Copy `.env.local.example` to `.env.local` and paste your values:

   ```bash
   cp .env.local.example .env.local
   ```

   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-app
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-app.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1234567890
   NEXT_PUBLIC_FIREBASE_APP_ID=1:1234567890:web:abc123
   ```

5. Restart the dev server. The board now reads from Firestore, and `/upload` saves
   real files. Empty board? That's expected — head to **Add sound**.

### Data model

Each sound is one document in the `sounds` collection:

| field         | type      | example                    |
| ------------- | --------- | -------------------------- |
| `name`        | string    | `"Victory horn"`           |
| `category`    | string    | `"Memes"`                  |
| `hotkey`      | string    | `"A"` (single character)   |
| `dur`         | string    | `"0:02"`                   |
| `url`         | string    | Storage download URL       |
| `storagePath` | string    | `sounds/169...-horn.mp3`   |
| `plays`       | number    | `0`                        |
| `createdAt`   | timestamp | server timestamp           |

### Security rules (important)

By default the board is **public read** but you should lock down **writes** so
random visitors can't upload. The simplest version — public read, no public
write (you upload via the Firebase console or after adding Auth):

**Firestore** (Rules tab):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /sounds/{id} {
      allow read: if true;
      allow write: if false; // tighten: require request.auth != null once you add Auth
    }
  }
}
```

**Storage** (Rules tab):

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /sounds/{file} {
      allow read: if true;
      allow write: if false; // tighten with Auth when ready
    }
  }
}
```

To let the in-app upload form write, add Firebase **Authentication**, sign in,
and change the write rules to `if request.auth != null`. (Auth wiring isn't
included here — say the word and it's a small addition.)

---

## Where to get sounds you can actually use

Host audio you own or that's licensed for reuse:

- **Freesound.org** — filter by CC0 (no attribution required)
- **Pixabay** and **Mixkit** — free, commercial use OK
- **Zapsplat** — huge library (free tier asks for a credit line)
- Your own recordings / voice memos

Don't pull clips off other soundboard sites — most of those are third-party
copyrighted audio the site itself doesn't have the right to redistribute.

---

## Project structure

```
app/
  layout.js          fonts + global shell
  page.js            the board
  upload/page.js     the upload screen
  globals.css        theme tokens, keyframes
components/
  Soundboard.jsx     board UI, hotkeys, visualizer, Firestore loader
  UploadForm.jsx     drag-drop upload to Storage + Firestore
lib/
  audio.js           shared Web Audio engine (master gain + analyser)
  synths.js          built-in synth sounds (the zero-config demo)
  firebase.js        optional Firebase init
```

## Swapping the demo for real audio

You don't have to do anything — once Firestore has documents, `Soundboard.jsx`
loads those instead of the synth demo. The same audio engine (`lib/audio.js`)
plays both: synths via `playSynth()`, files via `playUrl()`, both routed through
the master gain so the visualizer keeps working.

## Deploy

Push to GitHub and import into **Vercel**. Add the same `NEXT_PUBLIC_FIREBASE_*`
variables in the Vercel project's Environment Variables. That's it.

---

Built as a starting point — extend it with Auth, playlists, favorites, or a
trending feed. Have fun. 🎛️
# MemeVault
