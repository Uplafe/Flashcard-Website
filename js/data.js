// ════════════════════════════════════════════════════
//  FlashForge — Data Layer
//  Firebase (Firestore + Auth) with localStorage fallback
//  Replace firebaseConfig below with your own project.
// ════════════════════════════════════════════════════

// ── Firebase Config ──────────────────────────────────
// 1. Go to https://console.firebase.google.com
// 2. Create a project → Web app → copy the config below
// 3. Enable Authentication (Email/Password + Google)
// 4. Enable Firestore → start in production mode
// 5. Set Firestore rules (see README.md for recommended rules)
const FIREBASE_CONFIG = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID"
};

// ── Detect if Firebase is configured ─────────────────
const FIREBASE_ENABLED = FIREBASE_CONFIG.apiKey !== "YOUR_API_KEY";

let db = null, auth = null, firebase_app = null;

// ── Initialize Firebase ───────────────────────────────
async function initFirebase() {
  if (!FIREBASE_ENABLED) return false;
  try {
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
    const { getFirestore, collection, doc, setDoc, getDoc, getDocs, deleteDoc, query, where, orderBy, limit, serverTimestamp }
      = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut,
            onAuthStateChanged, updateProfile, GoogleAuthProvider, signInWithPopup }
      = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');

    firebase_app = initializeApp(FIREBASE_CONFIG);
    db   = getFirestore(firebase_app);
    auth = getAuth(firebase_app);

    // Expose helpers globally
    window._fb = {
      db, auth,
      collection, doc, setDoc, getDoc, getDocs, deleteDoc,
      query, where, orderBy, limit, serverTimestamp,
      signInWithEmailAndPassword, createUserWithEmailAndPassword,
      signOut, onAuthStateChanged, updateProfile,
      GoogleAuthProvider, signInWithPopup
    };
    return true;
  } catch (err) {
    console.warn('Firebase init failed, using localStorage:', err);
    return false;
  }
}

// ── Auth ──────────────────────────────────────────────
const Auth = {
  _user: null,
  _listeners: [],

  onAuthChange(cb) {
    this._listeners.push(cb);
    if (FIREBASE_ENABLED && window._fb?.auth) {
      window._fb.onAuthStateChanged(window._fb.auth, u => {
        this._user = u;
        cb(u);
      });
    } else {
      // LocalStorage auth
      const stored = localStorage.getItem('ff-user');
      const user = stored ? JSON.parse(stored) : null;
      this._user = user;
      cb(user);
    }
  },

  async signUp(email, password, displayName) {
    if (FIREBASE_ENABLED && window._fb) {
      const cred = await window._fb.createUserWithEmailAndPassword(window._fb.auth, email, password);
      await window._fb.updateProfile(cred.user, { displayName });
      return cred.user;
    } else {
      // LocalStorage fallback
      const users = JSON.parse(localStorage.getItem('ff-users') || '{}');
      if (users[email]) throw new Error('Email already in use');
      const user = { uid: 'local_' + Date.now(), email, displayName, photoURL: null };
      users[email] = { ...user, password };
      localStorage.setItem('ff-users', JSON.stringify(users));
      localStorage.setItem('ff-user', JSON.stringify(user));
      this._user = user;
      this._listeners.forEach(cb => cb(user));
      return user;
    }
  },

  async signIn(email, password) {
    if (FIREBASE_ENABLED && window._fb) {
      const cred = await window._fb.signInWithEmailAndPassword(window._fb.auth, email, password);
      return cred.user;
    } else {
      const users = JSON.parse(localStorage.getItem('ff-users') || '{}');
      const u = users[email];
      if (!u || u.password !== password) throw new Error('Invalid email or password');
      const user = { uid: u.uid, email: u.email, displayName: u.displayName, photoURL: null };
      localStorage.setItem('ff-user', JSON.stringify(user));
      this._user = user;
      this._listeners.forEach(cb => cb(user));
      return user;
    }
  },

  async signInGoogle() {
    if (FIREBASE_ENABLED && window._fb) {
      const provider = new window._fb.GoogleAuthProvider();
      const result = await window._fb.signInWithPopup(window._fb.auth, provider);
      return result.user;
    } else {
      throw new Error('Google sign-in requires Firebase. Configure Firebase to use this feature.');
    }
  },

  async signOut() {
    if (FIREBASE_ENABLED && window._fb) {
      await window._fb.signOut(window._fb.auth);
    } else {
      localStorage.removeItem('ff-user');
      this._user = null;
      this._listeners.forEach(cb => cb(null));
    }
  },

  current() { return this._user; }
};

// ── Decks ─────────────────────────────────────────────
const Decks = {
  // Save or update a deck
  async save(deck) {
    const user = Auth.current();
    const deckData = {
      ...deck,
      uid: user?.uid || 'guest',
      updatedAt: Date.now(),
      createdAt: deck.createdAt || Date.now()
    };

    if (FIREBASE_ENABLED && window._fb && user) {
      const { db, doc, setDoc, serverTimestamp, collection } = window._fb;
      const id = deck.id || doc(collection(db, 'decks')).id;
      deckData.id = id;
      await setDoc(doc(db, 'decks', id), { ...deckData, updatedAt: serverTimestamp() });
      return deckData;
    } else {
      // LocalStorage
      const all = this._getLocal();
      const id = deck.id || 'deck_' + Date.now();
      deckData.id = id;
      all[id] = deckData;
      this._setLocal(all);
      return deckData;
    }
  },

  // Get all decks for current user
  async getMyDecks() {
    const user = Auth.current();
    if (FIREBASE_ENABLED && window._fb && user) {
      const { db, collection, query, where, orderBy, getDocs } = window._fb;
      const q = query(collection(db, 'decks'), where('uid', '==', user.uid), orderBy('updatedAt', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data());
    } else {
      const uid = user?.uid || 'guest';
      const all = this._getLocal();
      return Object.values(all)
        .filter(d => d.uid === uid)
        .sort((a, b) => b.updatedAt - a.updatedAt);
    }
  },

  // Get public decks (explore)
  async getPublicDecks(limitN = 50) {
    if (FIREBASE_ENABLED && window._fb) {
      const { db, collection, query, where, orderBy, limit, getDocs } = window._fb;
      const q = query(collection(db, 'decks'), where('isPublic', '==', true), orderBy('updatedAt', 'desc'), limit(limitN));
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data());
    } else {
      const all = this._getLocal();
      return Object.values(all)
        .filter(d => d.isPublic)
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, limitN);
    }
  },

  // Get single deck by ID
  async getById(id) {
    if (FIREBASE_ENABLED && window._fb) {
      const { db, doc, getDoc } = window._fb;
      const snap = await getDoc(doc(db, 'decks', id));
      return snap.exists() ? snap.data() : null;
    } else {
      const all = this._getLocal();
      return all[id] || null;
    }
  },

  // Delete a deck
  async delete(id) {
    const user = Auth.current();
    if (FIREBASE_ENABLED && window._fb && user) {
      const { db, doc, deleteDoc } = window._fb;
      await deleteDoc(doc(db, 'decks', id));
    } else {
      const all = this._getLocal();
      delete all[id];
      this._setLocal(all);
    }
  },

  // LocalStorage helpers
  _getLocal() {
    return JSON.parse(localStorage.getItem('ff-decks') || '{}');
  },
  _setLocal(data) {
    localStorage.setItem('ff-decks', JSON.stringify(data));
  }
};

// ── Export functions ──────────────────────────────────
function exportDeckJSON(deck) {
  const data = JSON.stringify(deck, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(deck.title || 'flashcards').replace(/\s+/g, '-')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function exportDeckPDF(deck) {
  // Dynamically load jsPDF
  if (!window.jspdf) {
    await new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = 297, H = 210;
  const cards = deck.cards || [];

  // Cover page
  doc.setFillColor(20, 25, 40);
  doc.rect(0, 0, W, H, 'F');
  doc.setTextColor(16, 217, 164);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('FLASHFORGE', W / 2, 60, { align: 'center' });
  doc.setTextColor(232, 240, 254);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  const titleLines = doc.splitTextToSize(deck.title || 'Flashcards', W - 60);
  doc.text(titleLines, W / 2, 90, { align: 'center' });
  if (deck.description) {
    doc.setFontSize(13);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(124, 135, 160);
    const descLines = doc.splitTextToSize(deck.description, W - 80);
    doc.text(descLines, W / 2, 118, { align: 'center' });
  }
  doc.setFontSize(10);
  doc.setTextColor(74, 85, 107);
  doc.text(`${cards.length} cards · Exported ${new Date().toLocaleDateString()}`, W / 2, H - 20, { align: 'center' });

  cards.forEach((card, i) => {
    // ── Question page ──
    doc.addPage('a4', 'landscape');
    doc.setFillColor(30, 42, 74);
    doc.rect(0, 0, W, H, 'F');
    // accent bar
    doc.setFillColor(108, 99, 255);
    doc.rect(0, 0, W, 5, 'F');
    // card number
    doc.setTextColor(108, 99, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`CARD ${i + 1} OF ${cards.length}`, 20, 20);
    // label
    doc.setTextColor(124, 135, 160);
    doc.setFontSize(10);
    doc.text('QUESTION', W / 2, 35, { align: 'center' });
    // question text
    doc.setTextColor(232, 240, 254);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    const qLines = doc.splitTextToSize(card.question || '', W - 60);
    doc.text(qLines, W / 2, H / 2 - (qLines.length * 8), { align: 'center' });
    // image if any
    if (card.questionImage) {
      try {
        doc.addImage(card.questionImage, 'JPEG', W / 2 - 40, H / 2 - 10, 80, 50, '', 'FAST');
      } catch(e) {}
    }
    // footer
    doc.setFontSize(8);
    doc.setTextColor(74, 85, 107);
    doc.text('flip for answer →', W - 20, H - 10, { align: 'right' });

    // ── Answer page ──
    doc.addPage('a4', 'landscape');
    doc.setFillColor(10, 30, 50);
    doc.rect(0, 0, W, H, 'F');
    doc.setFillColor(16, 217, 164);
    doc.rect(0, 0, W, 5, 'F');
    doc.setTextColor(16, 217, 164);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`CARD ${i + 1} OF ${cards.length}`, 20, 20);
    doc.setTextColor(124, 135, 160);
    doc.setFontSize(10);
    doc.text('ANSWER', W / 2, 35, { align: 'center' });
    doc.setTextColor(232, 240, 254);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    const aLines = doc.splitTextToSize(card.answer || '', W - 60);
    doc.text(aLines, W / 2, H / 2 - (aLines.length * 8), { align: 'center' });
    if (card.answerImage) {
      try {
        doc.addImage(card.answerImage, 'JPEG', W / 2 - 40, H / 2 - 10, 80, 50, '', 'FAST');
      } catch(e) {}
    }
    doc.setFontSize(8);
    doc.setTextColor(74, 85, 107);
    doc.text('← question', 20, H - 10);
  });

  doc.save(`${(deck.title || 'flashcards').replace(/\s+/g, '-')}.pdf`);
}

// ── Init on load ──────────────────────────────────────
initFirebase();
