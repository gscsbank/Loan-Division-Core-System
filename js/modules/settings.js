// js/modules/settings.js

document.addEventListener('DOMContentLoaded', () => {

    const btnExport = document.getElementById('btn-export-db');
    const btnImport = document.getElementById('btn-import-db');
    const fileImport = document.getElementById('file-import-db');
    const btnReset = document.getElementById('btn-reset-db');

    if (btnExport) {
        btnExport.addEventListener('click', async () => {
            try {
                // Ensure db.js exposes exportDatabase
                if (typeof window.exportDatabase === 'function') {
                    await window.exportDatabase();
                } else {
                    window.showAlert('Error', 'Export function not available.', 'error');
                }
            } catch (e) {
                console.error("Export error", e);
                window.showAlert('Error', 'Failed to export database.', 'error');
            }
        });
    }

    if (btnImport) {
        btnImport.addEventListener('click', () => {
            fileImport.click();
        });
    }

    if (fileImport) {
        fileImport.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const confirmed = await window.showConfirm(
                'Import Backup',
                'Importing a backup will merge or overwrite current data. Continue?',
                'Yes, import',
                'question'
            );

            if (confirmed) {
                try {
                    if (typeof window.importDatabase === 'function') {
                        await window.importDatabase(file);
                        // Reload app to reflect new data
                        await Swal.fire({
                            title: 'Success',
                            text: 'Database restored successfully. The application will now reload.',
                            icon: 'success',
                            confirmButtonColor: '#1a56db'
                        });
                        window.location.reload();
                    } else {
                        window.showAlert('Error', 'Import function not available.', 'error');
                    }
                } catch (error) {
                    console.error("Import error", error);
                    window.showAlert('Error', 'Failed to import database. See console for details.', 'error');
                }
            }

            // reset file input
            fileImport.value = '';
        });
    }

    if (btnReset) {
        btnReset.addEventListener('click', async () => {
            const confirmed = await window.showConfirm(
                'DANGER ZONE',
                'This will permanently delete ALL data in the system. Make sure you have exported a backup first.\n\nAre you absolutely sure?',
                'Yes, Wipe Everything',
                'warning'
            );

            if (confirmed) {
                const { value: confirmText } = await Swal.fire({
                    title: 'Type DELETE to confirm',
                    input: 'text',
                    inputPlaceholder: 'Type DELETE here...',
                    showCancelButton: true,
                    confirmButtonColor: '#d33',
                    cancelButtonColor: '#64748b',
                    confirmButtonText: 'Confirm Wiping',
                    inputValidator: (value) => {
                        if (value !== 'DELETE') {
                            return 'You must type DELETE exactly'
                        }
                    }
                });

                if (confirmText === 'DELETE') {
                    try {
                        await db.delete();
                        await Swal.fire({
                            title: 'System Reset',
                            text: 'Database wiped successfully. The application will now restart.',
                            icon: 'success',
                            confirmButtonColor: '#1a56db'
                        });
                        window.location.reload();
                    } catch (e) {
                        console.error("Failed to delete DB:", e);
                        window.showAlert('Error', 'Could not delete database.', 'error');
                    }
                }
            }
        });
    }

    // --- Authentication Settings ---
    const authForm = document.getElementById('settings-auth-form');
    const oldPassInput = document.getElementById('settings-old-pass');
    const newPassInput = document.getElementById('settings-new-pass');
    const authMsg = document.getElementById('settings-auth-msg');

    if (authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const oldPass = oldPassInput.value;
            const newPass = newPassInput.value;

            try {
                if (typeof window.changeAdminPassword === 'function') {
                    await window.changeAdminPassword(oldPass, newPass);
                    authMsg.textContent = 'Password updated successfully!';
                    authMsg.className = 'text-xs font-bold text-center text-emerald-600 mt-2 block animate__animated animate__fadeIn';
                    authMsg.classList.remove('hidden');
                    authForm.reset();
                    setTimeout(() => authMsg.classList.add('hidden'), 3000);
                } else {
                    throw new Error('Auth module not loaded');
                }
            } catch (err) {
                authMsg.textContent = err.message || 'Failed to update password';
                authMsg.className = 'text-xs font-bold text-center text-red-500 mt-2 block animate__animated animate__shakeX';
                authMsg.classList.remove('hidden');
            }
        });
    }
});
