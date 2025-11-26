// This event listener ensures no code runs until the HTML is fully loaded.
document.addEventListener('DOMContentLoaded', () => {
    
    // --- Firebase Configuration ---
    const firebaseConfig = {
      apiKey: "AIzaSyCozaGjxZ3CLFiGjnzatKtStDHgoH71wk4",
      authDomain: "best-movies-ug-4d6d6.firebaseapp.com",
      projectId: "best-movies-ug-4d6d6",
      storageBucket: "best-movies-ug-4d6d6.firebasestorage.app",
      messagingSenderId: "583499166737",
      appId: "1:583499166737:web:8fe01624b46b8e063f6db0",
      measurementId: "G-340GWH52KT"
    };

    let db, auth;
    try {
        const app = !firebase.apps.length ? firebase.initializeApp(firebaseConfig) : firebase.app();

        // ✅✅✅ START: INITIALIZE APP CHECK HERE ✅✅✅
        const appCheck = firebase.appCheck(app);
        appCheck.activate(
          new firebase.appCheck.ReCaptchaEnterpriseProvider('6LcbAhksAAAAAMODEm_XTJPyJRclPJwe4GAAYLAP'),
          true // Auto-refresh tokens
        );
        // ✅✅✅ END: APP CHECK INITIALIZATION ✅✅✅

        db = firebase.firestore(app);
        auth = firebase.auth(app);
        // Make db and auth globally available for other scripts
        window.db = db;
        window.auth = auth;

    } catch (error) {
        console.error("Critical error initializing Firebase:", error);
        document.body.innerHTML = "<h1>Error: Application could not start.</h1>";
        return;
    }

    // --- Get All UI Elements AFTER the DOM is ready ---
    const adminPanel = document.getElementById('adminPanel');
    const adminEmailDisplay = document.getElementById('adminEmailDisplay');
    const logoutBtn = document.getElementById('logoutBtn');
    const menuToggleBtn = document.getElementById('menuToggleBtn');
    const mainMenu = document.getElementById('mainMenu');
    const menuLinks = document.querySelectorAll('#mainMenu a');

    // --- Attach All Event Listeners AFTER the DOM is ready ---
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            auth.signOut();
        });
    }
    if (menuToggleBtn && mainMenu) {
        menuToggleBtn.addEventListener('click', () => {
            mainMenu.classList.toggle('open');
        });
    }

    // --- Core Authentication Check ---
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            try {
                // This Firestore call is now automatically protected by App Check
                const userDoc = await db.collection('users').doc(user.uid).get();
                if (userDoc.exists && userDoc.data().isAdmin === true) {
                    // All elements are guaranteed to exist now.
                    if (adminPanel) adminPanel.style.display = 'flex';
                    if (adminEmailDisplay) adminEmailDisplay.textContent = `Logged in as: ${user.email}`;
                    document.dispatchEvent(new Event('adminReady'));
                } else {
                    await auth.signOut();
                    window.location.href = 'login.html';
                }
            } catch (error) {
                console.error("Error verifying admin status:", error);
                // If the error is 'permission-denied', App Check is working!
                if (error.code === 'permission-denied') {
                    console.error("App Check failed. This device/browser might be blocked.");
                    alert("Security check failed. You cannot access the admin panel from this browser.");
                }
                await auth.signOut();
                window.location.href = 'login.html';
            }
        } else {
            if (!window.location.pathname.includes('login.html')) {
                window.location.href = 'login.html';
            }
        }
    });

    // --- Highlight Active Menu Link & Add Mobile Close Behavior ---
    const currentPage = window.location.pathname.split("/").pop();
    menuLinks.forEach(link => {
        if (link.getAttribute('href') === currentPage) {
            link.classList.add('active');
        }
        link.addEventListener('click', () => {
            if (window.innerWidth < 769 && mainMenu) {
                mainMenu.classList.remove('open');
            }
        });
    });
}); // This is the single, correct closing brace for 'DOMContentLoaded'