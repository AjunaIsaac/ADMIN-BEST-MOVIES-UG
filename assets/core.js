document.addEventListener('DOMContentLoaded', () => {
    // --- Firebase Configuration for the 'best-movies-ug' project ---
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
        db = firebase.firestore(app);
        auth = firebase.auth(app);
        // Make db and auth globally available for other scripts to use
        window.db = db;
        window.auth = auth;
    } catch (error) {
        console.error("Critical error initializing Firebase:", error);
        document.body.innerHTML = "<h1>Error: Application could not start.</h1>";
        return;
    }

    // --- Core Authentication Check (Runs on EVERY page) ---
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            try {
                const userDoc = await db.collection('users').doc(user.uid).get();
                // Check if the user document exists and they have the admin flag
                if (userDoc.exists && userDoc.data().isAdmin === true) {
                    // --- User is a verified admin ---
                    
                    const adminPanel = document.getElementById('adminPanel');
                    const adminEmailDisplay = document.getElementById('adminEmailDisplay');

                    // 1. Show the main admin panel content
                    if (adminPanel) adminPanel.style.display = 'flex';
                    if (adminEmailDisplay) adminEmailDisplay.textContent = `Logged in as: ${user.email}`;

                    // --- Attach All Shared UI Event Listeners Here ---
                    // This guarantees they run only after the user is verified and the panel is visible.

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

                    // --- Highlight Active Menu Link & Add Mobile Close Behavior ---
                    const currentPage = window.location.pathname.split("/").pop();
                    const menuLinks = document.querySelectorAll('#mainMenu a');
                    menuLinks.forEach(link => {
                        if (link.getAttribute('href') === currentPage) {
                            link.classList.add('active');
                        }
                        // Add click listener to close menu on mobile after navigation
                        link.addEventListener('click', () => {
                            if (window.innerWidth < 769 && mainMenu) {
                                mainMenu.classList.remove('open');
                            }
                        });
                    });

                    // 2. Broadcast that everything is ready for page-specific scripts
                    console.log("Admin verified. Firing adminReady event.");
                    document.dispatchEvent(new Event('adminReady'));

                } else {
                    // User is logged in but is not an admin.
                    await auth.signOut();
                    window.location.href = 'login.html';
                }
            } catch (error) {
                console.error("Error verifying admin status:", error);
                await auth.signOut();
                window.location.href = 'login.html';
            }
        } else {
            // No user is logged in. Redirect to the login page.
            if (!window.location.pathname.includes('login.html')) {
                window.location.href = 'login.html';
            }
        }
    });
});