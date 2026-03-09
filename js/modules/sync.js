// js/modules/sync.js
/**
 * Sync Module: Manages data mirroring between Dexie.js (local) and Firebase Firestore (cloud).
 * This ensures "log in from any device" and "data save" requirements.
 */

window.SyncManager = {
    collections: ['customers', 'recovery', 'savings', 'officers', 'fuelLogs', 'schoolSavings', 'proposal', 'customerActions'],
    isEnabled: false,

    init: async function () {
        if (!window.fs) {
            console.warn("Sync disabled: Firestore not initialized.");
            return;
        }
        this.isEnabled = true;

        // Start listening for auth changes to trigger sync
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                console.log("Sync active for user:", user.uid);
                this.startSyncLoop();
                this.listenForCloudUpdates();
            } else {
                console.log("Sync paused: User logged out.");
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
        if (!this.isEnabled || !firebase.auth().currentUser) return;
        const uid = firebase.auth().currentUser.uid;

        for (const table of this.collections) {
            const data = await db[table].toArray();

            // Batch push to Firestore
            const batch = fs.batch();
            data.forEach(item => {
                // Ensure every item has a string ID for Firestore
                const docId = item.id ? item.id.toString() : Math.random().toString(36).substr(2, 9);
                const docRef = fs.collection('users').doc(uid).collection(table).doc(docId);
                batch.set(docRef, { ...item, lastSync: firebase.firestore.FieldValue.serverTimestamp() });
            });

            try {
                await batch.commit();
                // console.log(`Table ${table} pushed to cloud.`);
            } catch (err) {
                console.error(`Sync push error for ${table}:`, err);
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
