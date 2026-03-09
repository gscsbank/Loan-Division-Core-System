// js/modules/officers.js

document.addEventListener('DOMContentLoaded', () => {

    const btnNewLog = document.getElementById('btn-new-officer-log');
    const modalOfficerLog = document.getElementById('modal-officer-log');
    const modalCloseBtns = document.querySelectorAll('.officer-modal-close');
    const formOfficerLog = document.getElementById('form-officer-log');
    const tbody = document.getElementById('officer-logs-tbody');
    const emptyState = document.getElementById('officer-empty-state');
    const monthFilter = document.getElementById('officer-month-filter');
    const officerPrintFilter = document.getElementById('officer-print-filter');
    const btnPrintOfficer = document.getElementById('btn-print-officer-report');

    const formAddOfficerName = document.getElementById('dash-form-add-officer');
    const newOfficerNameInput = document.getElementById('dash-new-officer-input');
    const officersListUl = document.getElementById('dash-officers-list-ul');

    // Global selects
    const logOfficerNameSelect = document.getElementById('log-officer-name');
    const fuelOfficerNameSelect = document.getElementById('fuel-officer-name');
    const savingsOfficerNameSelect = document.getElementById('savings-officer-name');
    const locOfficerNameSelect = document.getElementById('loc-officer');

    const logIdInput = document.getElementById('log-id');

    const totalAccEl = document.getElementById('officers-total-acc');
    const dashAccountsTotal = document.getElementById('dash-accounts-total');

    const today = new Date();
    monthFilter.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    document.getElementById('log-date').valueAsDate = new Date();

    btnNewLog.addEventListener('click', () => {
        logIdInput.value = '';
        openModal();
    });

    modalCloseBtns.forEach(btn => btn.addEventListener('click', closeModal));
    formOfficerLog.addEventListener('submit', handleFormSubmit);
    monthFilter.addEventListener('change', loadLogs);
    officerPrintFilter.addEventListener('change', loadLogs); // Also use as quick visual filter

    if (btnPrintOfficer) {
        btnPrintOfficer.addEventListener('click', handleOfficerPrint);
    }

    // --- Officer Names Management Logic ---
    async function getSavedOfficers() {
        // Try to get from db.settings first (Cloud synced)
        try {
            const settingsData = await db.settings.get('bank_field_officers');
            if (settingsData && settingsData.value && settingsData.value.length > 0) {
                return settingsData.value;
            }
        } catch (e) {
            console.error("Error reading from db.settings:", e);
        }

        // Fallback to localStorage
        const stored = localStorage.getItem('bank_field_officers');
        if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed && parsed.length > 0) {
                // Migrate to db.settings
                await db.settings.put({ key: 'bank_field_officers', value: parsed });
                return parsed;
            }
        }

        // Default officers
        const defaults = ['Kamal Perera', 'Sunil Shantha', 'Nimal Silva'];
        localStorage.setItem('bank_field_officers', JSON.stringify(defaults));
        await db.settings.put({ key: 'bank_field_officers', value: defaults });
        return defaults;
    }

    async function saveOfficers(officers) {
        localStorage.setItem('bank_field_officers', JSON.stringify(officers));
        await db.settings.put({ key: 'bank_field_officers', value: officers });
        // Trigger sync if possible
        if (window.SyncManager && window.SyncManager.pushLocalToCloud) {
            window.SyncManager.pushLocalToCloud();
        }
    }

    async function populateOfficerDropdowns() {
        const officers = await getSavedOfficers();

        const selectsToPopulate = [
            logOfficerNameSelect,
            fuelOfficerNameSelect,
            savingsOfficerNameSelect,
            locOfficerNameSelect
        ];

        selectsToPopulate.forEach(selectEl => {
            if (selectEl) {
                const currentValue = selectEl.value;
                selectEl.innerHTML = '';
                officers.forEach(name => {
                    const opt = document.createElement('option');
                    opt.value = name;
                    opt.innerText = name;
                    selectEl.appendChild(opt);
                });
                if (currentValue) selectEl.value = currentValue;
            }
        });

        if (officerPrintFilter) {
            const currentPrintFilter = officerPrintFilter.value;
            officerPrintFilter.innerHTML = '<option value="All">All Officers</option>';
            officers.forEach(name => {
                const opt = document.createElement('option');
                opt.value = name;
                opt.innerText = name;
                officerPrintFilter.appendChild(opt);
            });
            officerPrintFilter.value = currentPrintFilter || 'All';
        }
    }

    populateOfficerDropdowns();
    renderManageOfficersList(); // Initial render for dashboard widget

    async function renderManageOfficersList() {
        const officers = await getSavedOfficers();
        if (officersListUl) {
            officersListUl.innerHTML = '';
            if (officers.length === 0) {
                officersListUl.innerHTML = '<li class="p-3 text-center text-slate-500 text-sm">No officers added.</li>';
                return;
            }

            officers.forEach((name, index) => {
                const li = document.createElement('li');
                li.className = 'p-3 flex justify-between items-center hover:bg-slate-100 transition-colors border-b border-white last:border-0';
                li.innerHTML = `
                    <span class="font-medium text-slate-700">${name}</span>
                    <button type="button" data-index="${index}" class="delete-officer-btn text-slate-400 hover:text-red-500 transition-colors bg-white hover:bg-red-50 p-1.5 rounded-lg border border-slate-200 hover:border-red-200" title="Remove"><i class="ph ph-trash text-lg pointer-events-none"></i></button>
                `;
                officersListUl.appendChild(li);
            });
        }
    }

    // Event delegation for deleting dashboard field officers
    if (officersListUl) {
        officersListUl.addEventListener('click', async (e) => {
            const btn = e.target.closest('.delete-officer-btn');
            if (btn) {
                const index = parseInt(btn.getAttribute('data-index'), 10);
                const confirmed = await window.showConfirm(
                    'Remove Officer',
                    'Are you sure you want to remove this officer from the selection list?',
                    'Yes, remove'
                );
                if (confirmed) {
                    const officers = await getSavedOfficers();
                    officers.splice(index, 1);
                    await saveOfficers(officers);
                    await populateOfficerDropdowns();
                    await renderManageOfficersList();
                    window.showToast('Officer removed successfully');
                }
            }
        });
    }

    if (formAddOfficerName) {
        formAddOfficerName.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newName = newOfficerNameInput.value.trim();
            if (newName) {
                const officers = await getSavedOfficers();
                if (!officers.includes(newName)) {
                    officers.push(newName);
                    officers.sort();
                    await saveOfficers(officers);
                    await populateOfficerDropdowns();
                    await renderManageOfficersList();
                    window.showToast('Officer added successfully');
                } else {
                    window.showAlert('Error', 'Officer name already exists.', 'error');
                }
            }
            newOfficerNameInput.value = '';
        });
    }

    // ----------------------------------------

    document.addEventListener('moduleSwitched', (e) => {
        if (e.detail.target === 'officers' || e.detail.target === 'dashboard') {
            loadLogs();
        }
    });

    loadLogs();

    function openModal() {
        modalOfficerLog.classList.remove('hidden');
        modalOfficerLog.classList.add('flex');
    }

    function closeModal() {
        modalOfficerLog.classList.add('hidden');
        modalOfficerLog.classList.remove('flex');
        formOfficerLog.reset();
        logIdInput.value = '';
        document.getElementById('log-date').valueAsDate = new Date();
    }

    async function handleFormSubmit(e) {
        e.preventDefault();

        const id = logIdInput.value;
        const dateStr = document.getElementById('log-date').value;
        const nameSelect = document.getElementById('log-officer-name');
        const name = nameSelect ? nameSelect.value.trim() : "";
        const accountsInput = document.getElementById('log-accounts');
        const accounts = accountsInput ? parseInt(accountsInput.value, 10) : 0;
        const accountNumbers = document.getElementById('log-account-numbers').value.trim();

        if (!dateStr || !name) {
            window.showAlert('Missing Information', 'Please select a date and an officer name.', 'warning');
            return;
        }

        try {
            const data = {
                date: dateStr,
                name: name,
                newAccounts: isNaN(accounts) ? 0 : accounts,
                accountNumbers: accountNumbers
            };

            if (id) {
                // Update existing
                await db.officers.update(parseInt(id), data);
            } else {
                // Add new
                await db.officers.add(data);
            }
            window.showToast(id ? 'Log updated successfully' : 'Log saved successfully');
            closeModal();
            loadLogs();

            // Proactively push to cloud
            if (window.SyncManager && window.SyncManager.pushLocalToCloud) {
                window.SyncManager.pushLocalToCloud();
            }
        } catch (error) {
            console.error("Failed to save log:", error);
            window.showAlert('Error', 'Error saving log: ' + error.message, 'error');
        }
    }

    async function loadLogs() {
        const filterVal = monthFilter.value;
        const printFilterVal = officerPrintFilter ? officerPrintFilter.value : 'All';

        if (!filterVal) return;

        try {
            const allLogs = await db.officers.orderBy('date').reverse().toArray();
            let filteredLogs = allLogs.filter(log => log.date.startsWith(filterVal));

            // Apply Officer Filter if not 'All'
            if (printFilterVal !== 'All') {
                filteredLogs = filteredLogs.filter(log => log.name === printFilterVal);
            }

            renderTable(filteredLogs);
            updateSummary(filteredLogs);

            // Always update dashboard stats for the ACTUAL current month
            updateDashboardStats();
        } catch (error) {
            console.error("Failed to load logs:", error);
        }
    }

    async function updateDashboardStats() {
        try {
            const now = new Date();
            const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            const allLogs = await db.officers.toArray();
            const currentMonthLogs = allLogs.filter(log => log.date.startsWith(currentMonthStr));
            const totalAcc = currentMonthLogs.reduce((sum, log) => sum + log.newAccounts, 0);
            if (dashAccountsTotal) dashAccountsTotal.innerText = totalAcc;
        } catch (e) {
            console.error("Error updating dashboard accounts total:", e);
        }
    }

    function renderTable(logs) {
        tbody.innerHTML = '';
        if (logs.length === 0) {
            emptyState.classList.remove('hidden');
            return;
        }
        emptyState.classList.add('hidden');

        logs.forEach(log => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-slate-50/50 transition-colors group';

            const dateObj = new Date(log.date);
            const dateFormatted = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

            tr.innerHTML = `
                <td class="px-5 py-3 border-b border-slate-100 text-slate-700">${dateFormatted}</td>
                <td class="px-5 py-3 border-b border-slate-100 font-medium text-slate-800">
                    <div class="flex items-center">
                        <div class="h-8 w-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs mr-3">
                            ${log.name.charAt(0).toUpperCase()}
                        </div>
                        ${log.name}
                    </div>
                </td>
                <td class="px-5 py-3 border-b border-slate-100 text-center font-bold text-emerald-600">${log.newAccounts}</td>
                <td class="px-5 py-3 border-b border-slate-100 text-slate-600 font-mono text-sm max-w-xs truncate" title="${log.accountNumbers || 'N/A'}">
                    ${log.accountNumbers || '<span class="text-slate-400 italic">None</span>'}
                </td>
                <td class="px-5 py-3 border-b border-slate-100 text-center print-hide">
                    <div class="flex justify-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onclick="window.editOfficerLog(${log.id})" class="text-slate-400 hover:text-primary transition-colors" title="Edit"><i class="ph ph-pencil-simple text-lg"></i></button>
                        <button onclick="window.deleteOfficerLog(${log.id})" class="text-slate-400 hover:text-red-500 transition-colors" title="Delete"><i class="ph ph-trash text-lg"></i></button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Expose Global functions for inline onclick handlers
    window.editOfficerLog = async (id) => {
        try {
            const log = await db.officers.get(id);
            if (log) {
                logIdInput.value = log.id;
                document.getElementById('log-date').value = log.date;
                document.getElementById('log-officer-name').value = log.name;
                document.getElementById('log-accounts').value = log.newAccounts;
                document.getElementById('log-account-numbers').value = log.accountNumbers || '';
                openModal();
            }
        } catch (e) {
            console.error(e);
        }
    };

    window.deleteOfficerLog = async (id) => {
        if (await window.showConfirm("Delete Log?", "This action cannot be undone.")) {
            try {
                await db.officers.delete(id);
                if (window.SyncManager && window.SyncManager.deleteFromCloud) {
                    await window.SyncManager.deleteFromCloud('officers', id);
                }
                window.showToast("Log deleted successfully");
                loadLogs(); // Assuming loadLogs() is the correct function to refresh the list
            } catch (e) {
                console.error(e);
                window.showAlert('Error', 'Error deleting log: ' + e.message, 'error');
            }
        }
    };

    function updateSummary(logs) {
        const totalAcc = logs.reduce((sum, log) => sum + log.newAccounts, 0);
        totalAccEl.innerText = totalAcc;
    }

    function updateDashboard(currentMonthLogs) {
        const totalAcc = currentMonthLogs.reduce((sum, log) => sum + log.newAccounts, 0);
        if (dashAccountsTotal) dashAccountsTotal.innerText = totalAcc;
    }

    async function handleOfficerPrint() {
        const officerName = officerPrintFilter.value;
        const monthFilterVal = monthFilter.value;

        if (!officerName || officerName === '' || officerName === 'All') {
            window.showAlert('Please select a specific officer from the list first.', 'info');
            return;
        }

        const printBuffer = document.getElementById('print-report-buffer');
        if (!printBuffer) return;

        // 1. Fetch filtered logs for the report
        const allLogs = await db.officers.orderBy('date').reverse().toArray();
        const filteredLogs = allLogs.filter(log =>
            log.date.startsWith(monthFilterVal) && log.name === officerName
        );

        const totalAccounts = filteredLogs.reduce((sum, log) => sum + log.newAccounts, 0);
        const reportDate = new Date(monthFilterVal + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' });

        // 2. Build professional HTML for the report
        let reportHTML = `
            <div style="width: 210mm; min-height: 297mm; margin: auto; padding: 40px 50px; font-family: 'Arial', 'Helvetica', sans-serif; color: #000; background: #fff; box-sizing: border-box;">
                
                <!-- Official Header -->
                <div style="text-align: center; margin-bottom: 28px; padding-bottom: 20px;">
                    <h1 style="font-size: 22px; font-weight: 700; text-transform: uppercase; letter-spacing: 3px; margin: 0 0 4px 0;">GALAPITIYAGAMA SANASA BANK</h1>
                    <h2 style="font-size: 13px; font-weight: 500; color: #444; letter-spacing: 2px; text-transform: uppercase; margin: 0 0 16px 0;">FIELD, LOAN AND PROMOTION DIVISION</h2>
                    <div style="display: inline-block; border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 6px 40px;">
                        <span style="font-size: 11px; font-weight: 600; letter-spacing: 3px; text-transform: uppercase;">Daily Account Acquisition Report</span>
                    </div>
                </div>

                <!-- Document Header Info -->
                <div style="display: flex; justify-content: space-between; margin-bottom: 28px; font-size: 12px;">
                    <div style="flex: 1;">
                        <span style="font-weight: 400; text-transform: uppercase; font-size: 10px; color: #666; letter-spacing: 1px;">Field Officer&nbsp;&nbsp;:&nbsp;&nbsp;</span>
                        <span style="font-weight: 600; font-size: 14px; border-bottom: 1.5px solid #aaa; padding-bottom: 2px;">${officerName}</span>
                    </div>
                    <div style="flex: 1; text-align: right;">
                        <span style="font-weight: 400; text-transform: uppercase; font-size: 10px; color: #666; letter-spacing: 1px;">Reporting Month&nbsp;&nbsp;:&nbsp;&nbsp;</span>
                        <span style="font-weight: 600; font-size: 15px; border-bottom: 1.5px solid #aaa; padding-bottom: 2px;">${reportDate.toUpperCase()}</span>
                    </div>
                </div>

                <!-- Data Table -->
                <div style="margin-bottom: 40px;">
                    <table style="width: 100%; border-collapse: collapse; border: none;">
                        <thead>
                            <tr style="background-color: #1a1a1a; color: #fff;">
                                <th style="border: none; border-bottom: 1px solid #333; padding: 10px 14px; text-align: left; font-size: 10px; font-weight: 400; text-transform: uppercase; letter-spacing: 1.5px; white-space: nowrap;">Date of Activity</th>
                                <th style="border: none; border-bottom: 1px solid #333; padding: 10px 14px; text-align: center; font-size: 10px; font-weight: 400; text-transform: uppercase; letter-spacing: 1.5px; width: 110px;">New A/C Count</th>
                                <th style="border: none; border-bottom: 1px solid #333; padding: 10px 14px; text-align: left; font-size: 10px; font-weight: 400; text-transform: uppercase; letter-spacing: 1.5px;">Acquired Account Numbers</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        if (filteredLogs.length === 0) {
            reportHTML += `
                <tr>
                    <td colspan="3" style="border: 1.5px solid #000; padding: 60px 14px; text-align: center; color: #aaa; font-style: italic; font-size: 12px;">
                        No official transactions recorded for the specified reporting period.
                    </td>
                </tr>
            `;
        } else {
            filteredLogs.forEach((log, idx) => {
                const d = new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                const rowBg = idx % 2 === 0 ? '#ffffff' : '#f8f9fa';
                reportHTML += `
                    <tr style="background-color: ${rowBg};">
                        <td style="border: none; border-bottom: 1px solid #eee; padding: 9px 14px; font-size: 12px; font-weight: 400; white-space: nowrap; color: #000;">${d}</td>
                        <td style="border: none; border-bottom: 1px solid #eee; padding: 9px 14px; font-size: 14px; font-weight: 400; text-align: center; color: #000;">${log.newAccounts}</td>
                        <td style="border: none; border-bottom: 1px solid #eee; padding: 9px 14px; font-size: 12px; font-weight: 400; word-break: break-all; line-height: 1.6; color: #000;">${log.accountNumbers || '-'}</td>
                    </tr>
                `;
            });
        }

        reportHTML += `
                        </tbody>
                        <tfoot>
                            <tr style="background-color: #1a1a1a; color: #fff;">
                                <td style="border: none; border-top: 1px solid #555; padding: 12px 14px; font-size: 11px; font-weight: 700; text-align: right; text-transform: uppercase; letter-spacing: 2px;" colspan="1">Total Monthly Acquisition:</td>
                                <td style="border: none; border-top: 1px solid #555; padding: 12px 14px; font-size: 18px; font-weight: 400; text-align: center;">${totalAccounts}</td>
                                <td style="border: none; border-top: 1px solid #555; padding: 12px 14px; background-color: #333;"></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <!-- Official Signatures -->
                <div style="margin-top: 80px; display: flex; justify-content: space-between; gap: 40px; padding: 0 10px; margin-bottom: 60px;">
                    <div style="flex: 1; text-align: center;">
                        <div style="height: 70px; border-bottom: 2px dotted #999; margin-bottom: 8px;"></div>
                        <div style="font-size: 10px; font-weight: 500; text-transform: uppercase; letter-spacing: 2px; line-height: 2;">
                            FIELD OFFICER<br>
                            <span style="font-weight: 400; text-transform: none; font-style: italic; color: #777; font-size: 9px;">(Signature / Date)</span>
                        </div>
                    </div>
                    <div style="flex: 1; text-align: center;">
                        <div style="height: 70px; border-bottom: 2px dotted #999; margin-bottom: 8px;"></div>
                        <div style="font-size: 10px; font-weight: 500; text-transform: uppercase; letter-spacing: 2px; line-height: 2;">
                            CHECKING OFFICER<br>
                            <span style="font-weight: 400; text-transform: none; font-style: italic; color: #777; font-size: 9px;">(Signature / Date)</span>
                        </div>
                    </div>
                    <div style="flex: 1; text-align: center;">
                        <div style="height: 70px; border-bottom: 2px dotted #999; margin-bottom: 8px;"></div>
                        <div style="font-size: 10px; font-weight: 500; text-transform: uppercase; letter-spacing: 2px; line-height: 2;">
                            BANK MANAGER<br>
                            <span style="font-weight: 400; text-transform: none; font-style: italic; color: #777; font-size: 9px;">(Signature / Date)</span>
                        </div>
                    </div>
                </div>

                <!-- Dedicated Institutional Footer -->
                <div style="position: fixed; bottom: 30px; left: 50px; right: 50px; border-top: 1px solid #ccc; padding-top: 10px;">
                    <div style="text-align: center; font-size: 10px; font-weight: 400; text-transform: uppercase; letter-spacing: 4px; color: #555;">
                        Generated by Iraasoft Solution
                    </div>
                </div>
            </div>
        `;

        // 3. Populate buffer and print
        printBuffer.innerHTML = reportHTML;
        document.body.classList.add('is-printing-report');

        window.print();

        // 4. Cleanup
        setTimeout(() => {
            document.body.classList.remove('is-printing-report');
            printBuffer.innerHTML = '';
        }, 500);
    }
});
