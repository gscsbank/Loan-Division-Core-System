// js/modules/sync.js
/**
 * Sync Module: Manages data mirroring between Dexie.js (local) and Firebase Firestore (cloud).
 * This ensures "log in from any device" and "data save" requirements.
 */

window.SyncManager = {
    collections: ['customers', 'recovery', 'savings', 'officers', 'fuelLogs', 'schoolSavings', 'events', 'customerActions', 'loanReports', 'postLoanReports', 'settings'],
    isEnabled: false,

    init: async function () {
        if (!window.fs) {
            console.warn("Sync disabled: Firestore not initialized.");
            return;
        }
        this.isEnabled = true;

        // Start listening for auth changes to trigger sync
        firebase.auth().onAuthStateChanged(user => {
            const badge = document.getElementById('sync-status-badge');
            if (user) {
                console.log("Sync active for user:", user.uid);
                if (badge) {
                    badge.innerHTML = '<i class="ph-bold ph-cloud-check mr-1"></i> Cloud Active';
                    badge.classList.remove('text-red-400');
                    badge.classList.add('text-emerald-400');
                }
                this.startSyncLoop();
                this.listenForCloudUpdates();
            } else {
                console.log("Sync paused: User logged out.");
                if (badge) {
                    badge.innerHTML = '<i class="ph-bold ph-cloud-slash mr-1"></i> Local Mode';
                    badge.classList.remove('text-emerald-400');
                    badge.classList.add('text-red-400');
                }
            }
        });
    },

    /**
     * Periodically pushes local changes to the cloud
     */
    startSyncLoop: function () {
        // Run every 30 seconds for background sync
        setInterval(() => this.pushLocalToCloud(), 30000);
        // Also run immediately
        this.pushLocalToCloud();
    },

    pushLocalToCloud: async function () {
        if (!this.isEnabled || !window.auth || !firebase.auth().currentUser) return;
        const uid = firebase.auth().currentUser.uid;
        console.log("Starting cloud push for UID:", uid);

        for (const table of this.collections) {
            try {
                const data = await db[table].toArray();
                if (data.length === 0) continue;

                // Batch push to Firestore (Firestore limit is 500 per batch)
                const batchSize = 400;
                for (let i = 0; i < data.length; i += batchSize) {
                    const batch = fs.batch();
                    const chunk = data.slice(i, i + batchSize);

                    chunk.forEach(item => {
                        // Handle both 'id' (auto-inc) and 'key' (settings)
                        const rawId = item.id || item.key || Math.random().toString(36).substr(2, 9);
                        const docId = rawId.toString();
                        const docRef = fs.collection('users').doc(uid).collection(table).doc(docId);

                        // Clean data for Firestore (remove any undefined values)
                        const cleanData = JSON.parse(JSON.stringify(item));
                        batch.set(docRef, {
                            ...cleanData,
                            lastSync: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    });

                    await batch.commit();
                }
                console.log(`✓ Table ${table} synchronized (${data.length} items)`);
            } catch (err) {
                console.error(`✗ Sync push error for ${table}:`, err.message);
                if (err.message.includes("permission-denied")) {
                    console.error("Critical: Firestore Security Rules are blocking the sync. Please check rules.");
                }
            }
        }
    },

    /**
     * Listens for changes in the cloud and pulls them to local Dexie
     */
    listenForCloudUpdates: function () {
        if (!this.isEnabled || !firebase.auth().currentUser) return;
        const uid = firebase.auth().currentUser.uid;

        this.collections.forEach(table => {
            fs.collection('users').doc(uid).collection(table)
                .onSnapshot(snapshot => {
                    snapshot.docChanges().forEach(async change => {
                        const cloudData = change.doc.data();
                        const localId = parseInt(change.doc.id);

                        if (change.type === "added" || change.type === "modified") {
                            // Check versioning/timestamp before overwriting local (Simple overwrite for now)
                            await db[table].put({ ...cloudData, id: isNaN(localId) ? change.doc.id : localId });
                        }

                        if (change.type === "removed") {
                            await db[table].delete(localId);
                        }
                    });
                });
        });
    }
};

// Global helper for manual sync
window.syncData = () => window.SyncManager.pushLocalToCloud();

// Auto-init Sync if Firebase is present
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => window.SyncManager.init(), 2000);
});
