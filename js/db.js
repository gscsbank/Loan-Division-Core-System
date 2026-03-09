// js/db.js
// Initialize Dexie database
const db = new Dexie('BankSystemDB');

// Define database schema
db.version(5).stores({
    officers: '++id, name, designation, contact, photo',
    fuelLogs: '++id, officerId, date, vehicleNo, startMileage, endMileage, liters, cost, photo',
    savings: '++id, officerId, date, collectionDate, accountNo, name, amount, type',
    customerActions: '++id, accountNo, date, time, action, officer, detail, photo, status',
    customers: '++id, accountNo, name, NIC, address, phone, loanType, loanAmount, interestRate, status, photo',
    schoolSavings: '++id, schoolName, date, accountNo, name, amount, collector',
    events: '++id, title, date, status',
    recovery: '++id, accountNo, name, loanType, interestRate, amount, status, lastActionDate',
    loanReports: '++id, date, applicantName, nic, phone',
    postLoanReports: '++id, date, applicantName, nic, phone',
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
