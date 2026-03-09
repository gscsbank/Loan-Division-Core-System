// js/db.js
// Initialize Dexie database
const db = new Dexie('BankSystemDB');

// Define database schema
db.version(6).stores({
    officers: '++id, name, date',
    fuelLogs: '++id, officerId, date, vehicleNo',
    savings: '++id, month, officerName, date',
    customerActions: '++id, accountNo, date',
    customers: '++id, accountNo, name, NIC',
    schoolSavings: '++id, schoolName, date, accountNo',
    events: '++id, title, date, status',
    recovery: '++id, accountNo, status',
    loanReports: '++id, date, applicantName, nic',
    postLoanReports: '++id, date, applicantName, nic',
    settings: 'key, value'
});

// Helper functions for Backup and Restore

/**
 * Exports the entire Dexie database to a JSON file and triggers a download.
 */
async function exportDatabase() {
    try {
        const data = {};
        for (const table of db.tables) {
            data[table.name] = await table.toArray();
        }
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        // Provided by FileSaver.js CDN in index.html
        saveAs(blob, `bank_system_backup_${new Date().toISOString().split('T')[0]}.json`);
        return true;
    } catch (error) {
        console.error("Database export failed:", error);
        return false;
    }
}

/**
 * Imports data from a parsed JSON object into the Dexie database.
 * Warning: This clears existing data.
 */
async function importDatabase(jsonString) {
    try {
        const data = JSON.parse(jsonString);
        await db.transaction('rw', db.tables, async () => {
            for (const table of db.tables) {
                if (data[table.name]) {
                    await table.clear(); // Clear existing
                    await table.bulkAdd(data[table.name]); // Add new
                }
            }
        });
        return true;
    } catch (error) {
        console.error("Database import failed:", error);
        return false;
    }
}
