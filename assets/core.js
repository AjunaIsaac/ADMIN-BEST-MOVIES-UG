document.addEventListener('DOMContentLoaded', () => {
    // --- Firebase Configuration ---
    const firebaseConfig = {
      apiKey: "AIzaSyAn2vbkT9yjyWtJzNSHgRureco5gEjYd_Q",
      authDomain: "stream-zone-movies-a83c1.firebaseapp.com",
      projectId: "stream-zone-movies-a83c1",
      storageBucket: "stream-zone-movies-a83c1.appspot.com",
      messagingSenderId: "148342664213",
      appId: "1:148342664213:web:56df2549cc480df7cf721c"
    };

    // Initialize Firebase and export db/auth for other scripts to use
    try {
        const app = !firebase.apps.length ? firebase.initializeApp(firebaseConfig) : firebase.app();
        
        // --- Initialize and Activate App Check ---
        try {
            const appCheck = firebase.appCheck(app);
            appCheck.activate(
                '6LfFvcUrAAAAAH6JzBwpbxJqzHTJ8qA_rzSe5OMP', // Your reCAPTCHA v3 Site KEY
                true // isTokenAutoRefreshEnabled
            );
            console.log("App Check initialized on admin page.");
        } catch(e) {
            console.error("App Check failed to initialize on admin page", e);
        }
        
        window.db = firebase.firestore(app);
        window.auth = firebase.auth(app);
    } catch (error) {
        console.error("Critical error initializing Firebase:", error);
        document.body.innerHTML = "<h1>Error: Application could not start.</h1>";
        return;
    }

    const adminPanel = document.getElementById('adminPanel');
    const adminEmailDisplay = document.getElementById('adminEmailDisplay');

    // --- Core Authentication Check (Runs on EVERY page) ---
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            // User is logged in, now check if they are an admin
            try {
                const userDoc = await db.collection('users').doc(user.uid).get();
                if (userDoc.exists && userDoc.data().isAdmin === true) {
                    // User is an admin, show the page content
                    if (adminPanel) adminPanel.style.display = 'flex';
                    if (adminEmailDisplay) adminEmailDisplay.textContent = `Logged in as: ${user.email}`;

                    // ✅✅✅ NEW LINE ADDED HERE ✅✅✅
                    // Broadcast an event that the admin is verified and ready.
                    document.dispatchEvent(new Event('adminReady'));

                } else {
                    // Not an admin, log out and redirect to login
                    await auth.signOut();
                    window.location.href = 'login.html';
                }
            } catch (error) {
                console.error("Error verifying admin status:", error);
                await auth.signOut();
                window.location.href = 'login.html';
            }
        } else {
            // No user is logged in, redirect to the login page
            // (but don't redirect if we are already on the login page)
            if (window.location.pathname.indexOf('login.html') === -1) {
                window.location.href = 'login.html';
            }
        }
    });

    // --- Shared UI Functionality ---
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            auth.signOut();
        });
    }

    const menuToggleBtn = document.getElementById('menuToggleBtn');
    const mainMenu = document.getElementById('mainMenu');
    if (menuToggleBtn && mainMenu) {
        menuToggleBtn.addEventListener('click', () => {
            mainMenu.classList.toggle('open');
        });
    }

    // --- Highlight Active Menu Link ---
    const currentPage = window.location.pathname.split("/").pop();
    const menuLinks = document.querySelectorAll('#mainMenu a');
    menuLinks.forEach(link => {
        if (link.getAttribute('href') === currentPage) {
            link.classList.add('active');
        }
    });
});