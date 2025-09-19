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

    // Initialize Firebase and export db/auth for other scripts to use
    try {
        const app = !firebase.apps.length ? firebase.initializeApp(firebaseConfig) : firebase.app();
        
        // --- App Check section has been removed ---

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
            window.location.href = 'login.html';
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