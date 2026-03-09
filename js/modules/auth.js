// js/modules/auth.js

document.addEventListener('DOMContentLoaded', async () => {
    const loginOverlay = document.getElementById('login-overlay');
    const loginForm = document.getElementById('login-form');
    const loginPassword = document.getElementById('login-password');
    const loginError = document.getElementById('login-error');

    // --- Clock Logic ---
    function updateClock() {
        const now = new Date();
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        const dayName = days[now.getDay()];
        const monthName = months[now.getMonth()];
        const date = now.getDate();
        const year = now.getFullYear();

        const hours = now.getHours();
        const minutes = now.getMinutes();
        const seconds = now.getSeconds();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;

        const timeStr = `${displayHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} ${ampm}`;
        const dateStr = `${dayName}, ${monthName} ${date}, ${year}`;

        if (document.getElementById('header-date')) document.getElementById('header-date').textContent = dateStr;
        if (document.getElementById('header-time')) document.getElementById('header-time').textContent = timeStr;
    }

    setInterval(updateClock, 1000);
    updateClock();

    // --- Auth Logic ---

    // Check if password exists, otherwise set default
    let storedPassword = await db.settings.get('admin_password');
    if (!storedPassword) {
        await db.settings.put({ key: 'admin_password', value: 'admin123' });
        storedPassword = { value: 'admin123' };
    }

    // Check session
    const session = sessionStorage.getItem('isLoggedIn');
    if (session === 'true') {
        loginOverlay.classList.add('hidden');
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const entered = loginPassword.value;

        // Firebase Auth Scenario
        if (window.auth && window.firebaseConfig.apiKey !== "YOUR_API_KEY") {
            try {
                // We use a fixed email for the admin login to simplify (or anonymous auth)
                const email = "admin@gscs.bank";
                await firebase.auth().signInWithEmailAndPassword(email, entered);
                sessionStorage.setItem('isLoggedIn', 'true');
                hideLogin();
                // Trigger data sync after successful Firebase login
                if (window.syncData) window.syncData();
            } catch (err) {
                console.error("Firebase Login Error:", err);
                // Attempt local fallback if Firebase fails but is configured (offline mode)
                localAuth(entered);
            }
        } else {
            // Local-Only Scenario (No Firebase Configured)
            localAuth(entered);
        }
    });

    async function localAuth(entered) {
        const current = await db.settings.get('admin_password');
        if (entered === current.value) {
            sessionStorage.setItem('isLoggedIn', 'true');
            hideLogin();
            // Trigger data sync after successful local login (if Firebase is not configured)
            if (!window.auth || window.firebaseConfig.apiKey === "YOUR_API_KEY") {
                if (window.syncData) window.syncData();
            }
        } else {
            showError();
        }
    }

    function hideLogin() {
        loginOverlay.classList.add('animate__fadeOut');
        setTimeout(() => {
            loginOverlay.classList.add('hidden');
        }, 500);
    }

    function showError() {
        loginError.classList.remove('hidden');
        loginPassword.classList.add('border-red-500');
        setTimeout(() => {
            loginError.classList.add('hidden');
            loginPassword.classList.remove('border-red-500');
        }, 3000);
    }

    // Global Logout
    window.logout = () => {
        sessionStorage.removeItem('isLoggedIn');
        // If Firebase is configured, sign out from Firebase as well
        if (window.auth && window.firebaseConfig.apiKey !== "YOUR_API_KEY") {
            firebase.auth().signOut().then(() => {
                console.log("Firebase user signed out.");
                location.reload();
            }).catch((error) => {
                console.error("Error signing out from Firebase:", error);
                location.reload(); // Reload even if Firebase sign out fails
            });
        } else {
            location.reload();
        }
    };

    // Global Change Password
    window.changeAdminPassword = async (oldPass, newPass) => {
        const current = await db.settings.get('admin_password');
        if (oldPass !== current.value) {
            throw new Error('Current password incorrect');
        }
        await db.settings.put({ key: 'admin_password', value: newPass });
        return true;
    };
});
