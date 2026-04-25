# ⚡ FlashForge

A beautiful, open-source flashcard study platform. Create, study, export, and share flashcard decks — for free, forever.

**[Live Demo →](#)** | **[GitHub Pages Deploy ↓](#deploying-to-github-pages)**

---

## ✦ Features

- 🃏 **Rich Flashcards** — text + image support on both sides
- 🧠 **Study Mode** — flip cards, mark known/missed, track session progress
- 📄 **PDF Export** — landscape A4, question page + answer page per card
- 💾 **JSON Export/Import** — portable backup you can re-import anytime
- 🔐 **User Accounts** — email/password + Google sign-in via Firebase
- 🌍 **Public & Private Decks** — publish to community or keep private
- 🌙 **Dark & Light Theme** — toggle with one click
- ⌨️ **Keyboard Shortcuts** — Space, arrow keys, R, S for study mode
- 📱 **Responsive** — works on mobile, tablet, and desktop
- 🐙 **GitHub Pages ready** — no server needed

---

## 🚀 Quick Start

No build step required. Just open `index.html` in a browser — or deploy to GitHub Pages.

**Works immediately with local storage** (no Firebase needed).  
To enable cloud sync + Google sign-in, follow the Firebase setup below.

---

## 🔥 Firebase Setup (optional but recommended)

### Step 1 — Create a Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project** → give it a name → Continue
3. Disable Google Analytics if you don't need it → Create project

### Step 2 — Add a Web App

1. In your project, click the **</>** (Web) icon
2. Register your app with a name (e.g. "FlashForge")
3. Copy the `firebaseConfig` object shown

### Step 3 — Enable Authentication

1. Firebase Console → **Authentication** → Get started
2. **Sign-in method** tab → Enable:
   - ✅ Email/Password
   - ✅ Google (add your support email)

### Step 4 — Enable Firestore

1. Firebase Console → **Firestore Database** → Create database
2. Choose **Start in production mode** → Select a region close to your users
3. Click Done

### Step 5 — Set Firestore Security Rules

In Firestore → **Rules** tab, replace the default rules with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /decks/{deckId} {
      // Anyone can read public decks
      allow read: if resource.data.isPublic == true;

      // Authenticated users can read their own decks
      allow read: if request.auth != null && resource.data.uid == request.auth.uid;

      // Authenticated users can create decks they own
      allow create: if request.auth != null && request.resource.data.uid == request.auth.uid;

      // Users can only update/delete their own decks
      allow update, delete: if request.auth != null && resource.data.uid == request.auth.uid;
    }
  }
}
```

Click **Publish**.

### Step 6 — Paste your config

Open `js/data.js` and replace the `FIREBASE_CONFIG` object:

```javascript
const FIREBASE_CONFIG = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID"
};
```

That's it! Firebase is now active.

---

## 🐙 Deploying to GitHub Pages

1. Create a new GitHub repository (can be public or private)
2. Push all files to the `main` branch
3. Go to repo **Settings** → **Pages**
4. Source: **Deploy from a branch** → Branch: `main` / `/ (root)`
5. Click Save → Your site will be live at `https://yourusername.github.io/your-repo-name/`

> **If using Firebase with GitHub Pages:** Go to Firebase Console → Authentication → Settings → Authorized domains → Add your `yourusername.github.io` domain.

---

## 📁 File Structure

```
flashcards-pro/
├── index.html        ← Landing page
├── app.html          ← My Decks dashboard
├── create.html       ← Create / Edit deck
├── study.html        ← Study mode
├── explore.html      ← Public deck browser
├── about.html        ← About + Firebase setup guide
├── terms.html        ← Terms of service
├── css/
│   └── styles.css    ← Full design system (dark/light themes)
└── js/
    ├── theme.js      ← Theme toggle + toast + modal utilities
    └── data.js       ← Firebase + localStorage data layer + PDF/JSON export
```

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` or `F` | Flip card |
| `→` (after flip) | Mark as Known |
| `←` (after flip) | Mark as Missed |
| `→` (before flip) | Next card |
| `←` (before flip) | Previous card |
| `R` | Restart session |
| `S` | Shuffle cards |
| `Ctrl+Enter` | Add card (in editor) |

---

## 🎨 Theming

All colors are CSS variables in `css/styles.css`. Switch themes by toggling `[data-theme="dark"]` / `[data-theme="light"]` on the `<html>` element. To customize the accent color, change `--accent` in `:root`.

---

## 📄 PDF Export Details

- **Format:** A4 Landscape (297mm × 210mm)
- **Cover page:** Deck title, description, card count, export date
- **Per card:** Question page (purple gradient) + Answer page (teal gradient)
- **Font:** Helvetica (embedded)
- **Library:** [jsPDF](https://github.com/parallax/jsPDF) loaded from CDN on demand

---

## 💾 JSON Format

Exported JSON format (for re-import compatibility):

```json
{
  "id": "deck_1234567890",
  "title": "My Deck Title",
  "description": "Optional description",
  "tag": "Science",
  "isPublic": false,
  "color": "purple",
  "cards": [
    {
      "question": "What is the powerhouse of the cell?",
      "answer": "The mitochondria",
      "questionImage": null,
      "answerImage": null
    }
  ]
}
```

---

## 📝 License

MIT — free to use, modify, and distribute.

---

Built with ⚡ — no frameworks, no build step, just the web platform.
