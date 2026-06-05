/* ========================================
   TMS - Firebase Configuration
   ======================================== */
window.TMS = window.TMS || {};

TMS.Firebase = (() => {
  const firebaseConfig = {
    apiKey: "AIzaSyD3YkBZFUI3eGcT7aeUPD3vinQd00t3m7I",
    authDomain: "travel-go-app-80ab1.firebaseapp.com",
    projectId: "travel-go-app-80ab1",
    storageBucket: "travel-go-app-80ab1.firebasestorage.app",
    messagingSenderId: "78038988466",
    appId: "1:78038988466:web:ea857c09d05262b729fbab",
    measurementId: "G-LERVNRH01H"
  };

  let db = null;

  function init() {
    if (!window.firebase) {
      console.error('Firebase SDK not loaded!');
      return null;
    }
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    db = firebase.firestore();
    
    // Sign in anonymously to bypass "request.auth != null" restrictions for all tenants
    if (firebase.auth) {
      firebase.auth().signInAnonymously().catch(err => {
        console.warn('Firebase anonymous auth failed:', err);
      });
    }
    
    try {
      db.enablePersistence().catch(err => {
        if (err.code == 'failed-precondition') {
          console.warn('Firebase persistence failed: Multiple tabs open');
        } else if (err.code == 'unimplemented') {
          console.warn('Firebase persistence not supported in this browser');
        }
      });
    } catch(e) {
      console.warn('Could not enable Firebase persistence:', e);
    }
    
    return db;
  }

  return { init, getDB: () => db };
})();
