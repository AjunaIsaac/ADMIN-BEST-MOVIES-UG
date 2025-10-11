document.addEventListener('DOMContentLoaded', () => {
    // --- Firebase Configuration for the new project ---
    const firebaseConfig = {
      apiKey: "AIzaSyAzgjVQ5iXpCx93EF5sGbpIPn5_8ouieu8",
      authDomain: "best-movies-ug.firebaseapp.com",
      projectId: "best-movies-ug",
      storageBucket: "best-movies-ug.appspot.com", // Corrected to appspot.com
      messagingSenderId: "569921014995",
      appId: "1:569921014995:web:c4e0c02679d4e67a33d826"
    };

    // Initialize Firebase and export db/auth for other scripts to use
    try {
        const app = !firebase.apps.length ? firebase.initializeApp(firebaseConfig) : firebase.app();
        
        // --- App Check section has been completely removed ---

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
            // User is logged in, now check if they are an admin in the database
            try {
                const userDoc = await db.collection('users').doc(user.uid).get();
                if (userDoc.exists && userDoc.data().isAdmin === true) {
                    // User is a verified admin, show the page content
                    if (adminPanel) adminPanel.style.display = 'flex';
                    if (adminEmailDisplay) adminEmailDisplay.textContent = `Logged in as: ${user.email}`;

                    // Broadcast an event that the admin is verified and ready.
                    // This tells other scripts on the page that it's safe to run.
                    document.dispatchEvent(new Event('adminReady'));

                } else {
                    // Logged in, but not an admin. Log out and redirect.
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
            // (but don't redirect if we are already on the login page to avoid a loop)
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
});document.addEventListener('DOMContentLoaded', () => {
    // --- Firebase Configuration for the new project ---
    const firebaseConfig = {
      apiKey: "AIzaSyAzgjVQ5iXpCx93EF5sGbpIPn5_8ouieu8",
      authDomain: "best-movies-ug.firebaseapp.com",
      projectId: "best-movies-ug",
      storageBucket: "best-movies-ug.appspot.com", // Corrected to appspot.com
      messagingSenderId: "569921014995",
      appId: "1:569921014995:web:c4e0c02679d4e67a33d826"
    };

    // Initialize Firebase and export db/auth for other scripts to use
    try {
        const app = !firebase.apps.length ? firebase.initializeApp(firebaseConfig) : firebase.app();
        
        // --- App Check section has been completely removed ---

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
            // User is logged in, now check if they are an admin in the database
            try {
                const userDoc = await db.collection('users').doc(user.uid).get();
                if (userDoc.exists && userDoc.data().isAdmin === true) {
                    // User is a verified admin, show the page content
                    if (adminPanel) adminPanel.style.display = 'flex';
                    if (adminEmailDisplay) adminEmailDisplay.textContent = `Logged in as: ${user.email}`;

                    // Broadcast an event that the admin is verified and ready.
                    // This tells other scripts on the page that it's safe to run.
                    document.dispatchEvent(new Event('adminReady'));

                } else {
                    // Logged in, but not an admin. Log out and redirect.
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
            // (but don't redirect if we are already on the login page to avoid a loop)
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