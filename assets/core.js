document.addEventListener('DOMContentLoaded', () => {
    // --- Firebase Configuration (for best-movies-ug) ---
    const firebaseConfig = {
        apiKey: "AIzaSyCozaGjxZ3CLFiGjnzatKtStDHgoH71wk4",
        authDomain: "best-movies-ug-4d6d6.firebaseapp.com",
        projectId: "best-movies-ug-4d6d6",
        storageBucket: "best-movies-ug-4d6d6.appspot.com",
        messagingSenderId: "583499166737",
        appId: "1:583499166737:web:8fe01624b46b8e063f6db0",
        measurementId: "G-340GWH52KT"
    };

    try {
        const app = !firebase.apps.length ? firebase.initializeApp(firebaseConfig) : firebase.app();
        window.db = firebase.firestore(app);
        window.auth = firebase.auth(app);
    } catch (error) {
        console.error("Critical error initializing Firebase:", error);
        document.body.innerHTML = "<h1>Error: Application could not start.</h1>";
        return;
    }

    const adminPanel = document.getElementById('adminPanel');
    const adminEmailDisplay = document.getElementById('adminEmailDisplay');

    // --- SIMPLIFIED CORE AUTHENTICATION ---
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            // The user is logged in. The security rules will handle if they are an admin or not.
            // We just show the panel.
            if (adminPanel) adminPanel.style.display = 'flex';
            if (adminEmailDisplay) adminEmailDisplay.textContent = `Logged in as: ${user.email}`;
        } else {
            // No user is logged in, redirect to the login page.
            window.location.href = 'login.html';
        }
    });

    // --- Shared UI Functionality (Unchanged) ---
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

    const currentPage = window.location.pathname.split("/").pop();
    const menuLinks = document.querySelectorAll('#mainMenu a');
    menuLinks.forEach(link => {
        if (link.getAttribute('href') === currentPage) {
            link.classList.add('active');
        }
    });
});