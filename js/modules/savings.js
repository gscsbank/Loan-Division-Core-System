// js/modules/savings.js

document.addEventListener('DOMContentLoaded', () => {

    const btnNewLog = document.getElementById('btn-new-savings-log');
    const modalSavingsLog = document.getElementById('modal-savings-log');
    const formSavingsLog = document.getElementById('form-savings-log');
    const modalCloseBtns = document.querySelectorAll('.savings-modal-close');

    const logIdInput = document.getElementById('savings-log-id');
    const inputDate = document.getElementById('savings-date');
    const inputOfficer = document.getElementById('savings-officer-name');
    const inputMonth = document.getElementById('savings-target-month');
    const inputCollection = document.getElementById('savings-collection');

    const yearFilter = document.getElementById('savings-year-filter');
    const yearLabel = document.getElementById('savings-year-label');
    const btnPrintSavings = document.getElementById('btn-print-savings-report');
    const emptyState = document.getElementById('savings-empty-state');
    const dashSavingsTotal = document.getElementById('dash-savings-total');

    const ctxMonthly = document.getElementById('savingsMonthlyChart');
    const ctxComparison = document.getElementById('savingsComparisonChart');
    let monthlyChartInstance = null;
    let comparisonChartInstance = null;

    const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const MONTH_KEYS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];

    const today = new Date();

    // Populate year filter (last 5 years)
    function populateYearFilter() {
        if (!yearFilter) return;
        const currentYear = today.getFullYear();
        yearFilter.innerHTML = '';
        for (let y = currentYear; y >= currentYear - 5; y--) {
            const opt = document.createElement('option');
            opt.value = y;
            opt.innerText = y;
            yearFilter.appendChild(opt);
        }
        yearFilter.value = currentYear;
        if (yearLabel) yearLabel.innerText = currentYear;
    }

    populateYearFilter();
    if (inputMonth) inputMonth.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    if (inputDate) inputDate.valueAsDate = new Date();

    if (yearFilter) yearFilter.addEventListener('change', () => {
        if (yearLabel) yearLabel.innerText = yearFilter.value;
        loadAndRender();
    });

    if (btnNewLog) btnNewLog.addEventListener('click', () => { logIdInput.value = ''; openModal(); });
    modalCloseBtns.forEach(btn => btn.addEventListener('click', closeModal));
    if (formSavingsLog) formSavingsLog.addEventListener('submit', handleFormSubmit);
    if (btnPrintSavings) btnPrintSavings.addEventListener('click', handleSavingsPrint);

    document.addEventListener('moduleSwitched', (e) => {
        if (e.detail.target === 'savings' || e.detail.target === 'dashboard') {
            loadAndRender();
        }
    });

    loadAndRender();

    function openModal() {
        modalSavingsLog.classList.remove('hidden');
        modalSavingsLog.classList.add('flex');
    }

    function closeModal() {
        modalSavingsLog.classList.add('hidden');
        modalSavingsLog.classList.remove('flex');
        formSavingsLog.reset();
        logIdInput.value = '';
        inputDate.valueAsDate = new Date();
        inputMonth.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    }

    async function handleFormSubmit(e) {
        e.preventDefault();
        const id = logIdInput.value;
        const collection = parseFloat(inputCollection.value) || 0;
        try {
            const data = {
                date: inputDate.value,
                officerName: inputOfficer.value.trim(),
                month: inputMonth.value,
                collectionTotal: collection
            };
            if (id) {
                await db.savings.update(parseInt(id), data);
            } else {
                await db.savings.add(data);
            }
            window.showToast(id ? 'Log updated successfully' : 'Collection saved successfully');
            closeModal();
            loadAndRender();

            // Proactively push to cloud
            if (window.SyncManager && window.SyncManager.pushLocalToCloud) {
                window.SyncManager.pushLocalToCloud();
            }
        } catch (error) {
            console.error("Failed to save savings log:", error);
            window.showAlert('Error', 'Error saving savings log: ' + error.message, 'error');
        }
    }

    async function loadAndRender() {
        try {
            const allLogs = await db.savings.orderBy('month').toArray();
            const selectedYear = yearFilter ? parseInt(yearFilter.value) : today.getFullYear();
            const yearLogs = allLogs.filter(log => log.month && log.month.startsWith(selectedYear.toString()));

            await renderPivotTable(yearLogs, selectedYear);
            await updateCharts(yearLogs, selectedYear);

            // Dashboard total (current month)
            const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
            const currentMonthLogs = allLogs.filter(log => log.month === currentMonthStr);
            const total = currentMonthLogs.reduce((sum, log) => sum + log.collectionTotal, 0);
            if (dashSavingsTotal) dashSavingsTotal.innerText = total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        } catch (error) {
            console.error("Failed to load savings logs:", error);
        }
    }

    async function getOfficers() {
        // Try to get from db.settings first
        try {
            const settingsData = await db.settings.get('bank_field_officers');
            if (settingsData && settingsData.value) return settingsData.value;
        } catch (e) { }

        const stored = localStorage.getItem('bank_field_officers');
        return stored ? JSON.parse(stored) : [];
    }

    async function renderPivotTable(logs, year) {
        const pivotHead = document.getElementById('savings-pivot-head');
        const pivotBody = document.getElementById('savings-pivot-body');
        const pivotFoot = document.getElementById('savings-pivot-foot');
        if (!pivotHead || !pivotBody || !pivotFoot) return;

        // Build pivot: { month: { officerName: total } }
        const pivot = {};
        MONTH_KEYS.forEach(mk => { pivot[mk] = {}; });

        logs.forEach(log => {
            const mk = log.month.split('-')[1];
            if (!pivot[mk]) pivot[mk] = {};
            if (!pivot[mk][log.officerName]) pivot[mk][log.officerName] = 0;
            pivot[mk][log.officerName] += log.collectionTotal;
        });

        // Get officers that have at least one entry this year
        const allOfficers = await getOfficers();
        const activeOfficers = allOfficers.length > 0 ? allOfficers :
            [...new Set(logs.map(l => l.officerName))].sort();

        const hasData = logs.length > 0;
        if (emptyState) emptyState.classList.toggle('hidden', hasData);

        // Header row
        pivotHead.innerHTML = `
            <tr>
                <th class="px-6 py-4 text-left text-slate-600 font-semibold border-b border-slate-200 whitespace-nowrap w-[25%]">Month</th>
                <th class="px-6 py-4 text-center text-primary font-semibold border-b border-slate-200 bg-blue-50" colspan="${activeOfficers.length}">Field Officer</th>
                <th class="px-6 py-4 text-right text-slate-700 font-bold border-b border-slate-200 whitespace-nowrap w-[25%]">Field Saving Total</th>
                <th class="px-6 py-4 text-center border-b border-slate-200 print-hide w-12"></th>
            </tr>
            <tr>
                <th class="px-6 py-2 text-left text-slate-500 text-xs font-medium border-b border-slate-100"></th>
                ${activeOfficers.map(o => `<th class="px-6 py-2 text-center text-slate-600 text-xs font-semibold border-b border-slate-100 bg-blue-50/50">${o}</th>`).join('')}
                <th class="px-6 py-2 border-b border-slate-100"></th>
                <th class="px-6 py-2 border-b border-slate-100 print-hide"></th>
            </tr>
        `;

        // Body rows
        let annualOfficerTotals = {};
        activeOfficers.forEach(o => { annualOfficerTotals[o] = 0; });
        let grandTotal = 0;

        pivotBody.innerHTML = MONTH_KEYS.map((mk, idx) => {
            const monthName = MONTHS[idx];
            const rowTotal = activeOfficers.reduce((s, o) => s + (pivot[mk][o] || 0), 0);
            grandTotal += rowTotal;
            activeOfficers.forEach(o => { annualOfficerTotals[o] += (pivot[mk][o] || 0); });

            const isEven = idx % 2 === 0;
            const bg = isEven ? 'bg-white' : 'bg-slate-50/30';

            const cells = activeOfficers.map(o => {
                const val = pivot[mk][o] || 0;
                const display = val > 0 ? val.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '';
                return `<td class="px-6 py-3 text-right text-slate-700 font-mono text-sm">${display}</td>`;
            }).join('');

            const totalDisplay = rowTotal > 0 ? rowTotal.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '';
            const editBtns = activeOfficers.map(o => {
                const logEntry = logs.find(l => l.month === `${year}-${mk}` && l.officerName === o);
                if (logEntry) {
                    return `<button onclick="window.editSavingsLog(${logEntry.id})" class="text-slate-400 hover:text-primary transition-colors" title="Edit ${o}"><i class="ph ph-pencil-simple text-sm"></i></button>`;
                }
                return '';
            }).join('');

            return `
                <tr class="${bg} hover:bg-blue-50/30 transition-colors">
                    <td class="px-6 py-3 font-semibold text-slate-700 whitespace-nowrap">${monthName}</td>
                    ${cells}
                    <td class="px-6 py-3 text-right font-bold text-blue-700 font-mono text-sm whitespace-nowrap">${totalDisplay}</td>
                    <td class="px-6 py-3 text-center print-hide">
                        <div class="flex gap-1 justify-center">${editBtns}</div>
                    </td>
                </tr>
            `;
        }).join('');

        // Footer totals row
        const officerTotalCells = activeOfficers.map(o => {
            const t = annualOfficerTotals[o];
            return `<td class="px-6 py-4 text-right text-slate-800 font-bold font-mono text-sm border-t-2 border-slate-300">${t > 0 ? t.toLocaleString('en-US', { minimumFractionDigits: 2 }) : ''}</td>`;
        }).join('');

        pivotFoot.innerHTML = `
            <tr class="bg-slate-100">
                <td class="px-6 py-4 font-bold text-slate-800 text-sm border-t-2 border-slate-300">Annual Field Saving Collection Total</td>
                ${officerTotalCells}
                <td class="px-6 py-4 text-right font-bold text-blue-800 font-mono border-t-2 border-slate-300 text-sm">${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td class="px-6 py-4 border-t-2 border-slate-300 print-hide"></td>
            </tr>
        `;
    }

    async function updateCharts(logs, year) {
        // Monthly totals bar chart
        const monthlyTotals = MONTH_KEYS.map(mk => {
            return logs.filter(l => l.month === `${year}-${mk}`)
                .reduce((s, l) => s + l.collectionTotal, 0);
        });

        if (ctxMonthly) {
            if (monthlyChartInstance) monthlyChartInstance.destroy();
            monthlyChartInstance = new Chart(ctxMonthly, {
                type: 'bar',
                data: {
                    labels: MONTHS.map(m => m.slice(0, 3)),
                    datasets: [{
                        label: 'Field Saving Total (Rs.)',
                        data: monthlyTotals,
                        backgroundColor: '#3b82f6',
                        borderRadius: 5
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }, tooltip: {
                            callbacks: { label: ctx => 'Rs. ' + ctx.parsed.y.toLocaleString() }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true, grid: { color: '#e2e8f0' }, ticks: {
                                callback: v => 'Rs. ' + (v / 1000000).toFixed(1) + 'M'
                            }
                        },
                        x: { grid: { display: false } }
                    }
                }
            });
        }

        // Officer-wise grouped bar chart
        const officers = (await getOfficers()).length > 0 ? await getOfficers() :
            [...new Set(logs.map(l => l.officerName))].sort();

        const colors = ['#1e3a5f', '#64748b', '#94a3b8', '#3b82f6', '#8b5cf6', '#f59e0b'];
        const datasets = officers.map((officer, i) => ({
            label: officer,
            data: MONTH_KEYS.map(mk =>
                logs.filter(l => l.month === `${year}-${mk}` && l.officerName === officer)
                    .reduce((s, l) => s + l.collectionTotal, 0)
            ),
            backgroundColor: colors[i % colors.length],
            borderRadius: 4
        }));

        if (ctxComparison) {
            if (comparisonChartInstance) comparisonChartInstance.destroy();
            comparisonChartInstance = new Chart(ctxComparison, {
                type: 'bar',
                data: {
                    labels: MONTHS.map(m => m.slice(0, 3)),
                    datasets
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'top' }, tooltip: {
                            callbacks: { label: ctx => ctx.dataset.label + ': Rs. ' + ctx.parsed.y.toLocaleString() }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true, stacked: false, grid: { color: '#e2e8f0' }, ticks: {
                                callback: v => 'Rs. ' + (v / 1000000).toFixed(1) + 'M'
                            }
                        },
                        x: { grid: { display: false } }
                    }
                }
            });
        }
    }

    window.editSavingsLog = async (id) => {
        try {
            const log = await db.savings.get(id);
            if (log) {
                logIdInput.value = log.id;
                inputDate.value = log.date;
                inputOfficer.value = log.officerName;
                inputMonth.value = log.month;
                inputCollection.value = log.collectionTotal;
                openModal();
            }
        } catch (e) { console.error(e); }
    };

    window.deleteSaving = async (id) => {
        try {
            if (await window.showConfirm("Delete Entry?", "This action cannot be undone.")) {
                await db.savings.delete(id);
                if (window.SyncManager && window.SyncManager.deleteFromCloud) {
                    await window.SyncManager.deleteFromCloud('savings', id);
                }
                window.showToast("Entry deleted successfully");
                loadAndRender();
            }
        } catch (e) { console.error(e); }
    };

    // ---- PRINT REPORT ----
    async function handleSavingsPrint() {
        const selectedYear = yearFilter ? parseInt(yearFilter.value) : today.getFullYear();
        const printBuffer = document.getElementById('print-report-buffer');
        if (!printBuffer) return;

        const allLogs = await db.savings.toArray();
        const yearLogs = allLogs.filter(log => log.month && log.month.startsWith(selectedYear.toString()));

        const officers = (await getOfficers()).length > 0 ? await getOfficers() :
            [...new Set(yearLogs.map(l => l.officerName))].sort();

        // Build pivot
        const pivot = {};
        MONTH_KEYS.forEach(mk => { pivot[mk] = {}; });
        yearLogs.forEach(log => {
            const mk = log.month.split('-')[1];
            if (!pivot[mk]) pivot[mk] = {};
            if (!pivot[mk][log.officerName]) pivot[mk][log.officerName] = 0;
            pivot[mk][log.officerName] += log.collectionTotal;
        });

        let annualTotals = {};
        officers.forEach(o => { annualTotals[o] = 0; });
        let grandTotal = 0;

        const bodyRows = MONTH_KEYS.map((mk, idx) => {
            const rowTotal = officers.reduce((s, o) => s + (pivot[mk][o] || 0), 0);
            grandTotal += rowTotal;
            officers.forEach(o => { annualTotals[o] += (pivot[mk][o] || 0); });
            const rowBg = idx % 2 === 0 ? '#ffffff' : '#f8f9fa';
            const cells = officers.map(o => {
                const val = pivot[mk][o] || 0;
                return `<td style="border: none; border-bottom: 1px solid #eee; padding: 10px 20px; text-align: right; font-size: 11px; color: #000; font-family: 'Courier New', monospace;">${val > 0 ? val.toLocaleString('en-US', { minimumFractionDigits: 2 }) : ''}</td>`;
            }).join('');

            return `
                <tr style="background-color: ${rowBg};">
                    <td style="border: none; border-bottom: 1px solid #eee; padding: 10px 20px; font-size: 12px; font-weight: 600; color: #000;">${MONTHS[idx]}</td>
                    ${cells}
                    <td style="border: none; border-bottom: 1px solid #eee; padding: 10px 20px; text-align: right; font-size: 12px; font-weight: 600; color: #1a56db; font-family: 'Courier New', monospace;">${rowTotal > 0 ? rowTotal.toLocaleString('en-US', { minimumFractionDigits: 2 }) : ''}</td>
                </tr>`;
        }).join('');

        const footerCells = officers.map(o =>
            `<td style="border: none; border-top: 2px solid #000; padding: 15px 20px; text-align: right; font-size: 11px; font-weight: 700; font-family: 'Courier New', monospace;">${annualTotals[o] > 0 ? annualTotals[o].toLocaleString('en-US', { minimumFractionDigits: 2 }) : ''}</td>`
        ).join('');

        const officerColHeaders = officers.map(o =>
            `<th style="border: none; border-bottom: 1px solid #444; padding: 12px 20px; text-align: right; font-size: 9px; font-weight: 400; text-transform: uppercase; letter-spacing: 1px; background: #1a1a1a; color: #fff;">${o}</th>`
        ).join('');

        let reportHTML = `
            <div style="width: 210mm; min-height: 297mm; margin: auto; padding: 40px 50px; font-family: 'Arial', 'Helvetica', sans-serif; color: #000; background: #fff; box-sizing: border-box;">
                <div style="text-align: center; margin-bottom: 28px; padding-bottom: 20px;">
                    <h1 style="font-size: 22px; font-weight: 700; text-transform: uppercase; letter-spacing: 3px; margin: 0 0 4px 0;">GALAPITIYAGAMA SANASA BANK</h1>
                    <h2 style="font-size: 12px; font-weight: 500; color: #444; letter-spacing: 2px; text-transform: uppercase; margin: 0 0 6px 0;">GALAPITIYAGAMA SANASA COOPERATIVE SOCIETY</h2>
                    <div style="display: inline-block; border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 6px 40px;">
                        <span style="font-size: 11px; font-weight: 600; letter-spacing: 3px; text-transform: uppercase;">Field Savings Progress - ${selectedYear}</span>
                    </div>
                </div>

                <div style="margin-bottom: 40px;">
                    <table style="width: 100%; border-collapse: collapse; border: none; table-layout: fixed;">
                        <thead>
                            <tr style="background-color: #1a1a1a; color: #fff;">
                                <th style="border: none; border-bottom: 1px solid #444; padding: 12px 20px; text-align: left; font-size: 9px; font-weight: 400; text-transform: uppercase; letter-spacing: 1px; background: #1a1a1a; width: 25%;">Month</th>
                                ${officerColHeaders}
                                <th style="border: none; border-bottom: 1px solid #444; padding: 12px 20px; text-align: right; font-size: 9px; font-weight: 400; text-transform: uppercase; letter-spacing: 1px; background: #1a1a1a; width: 20%;">Field Saving Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${bodyRows}
                        </tbody>
                        <tfoot>
                            <tr style="background-color: #f0f0f0;">
                                <td style="border: none; border-top: 2px solid #000; padding: 15px 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; line-height: 1.4;">Annual Field Saving Collection Total</td>
                                ${footerCells}
                                <td style="border: none; border-top: 2px solid #000; padding: 15px 20px; text-align: right; font-size: 13px; font-weight: 700; color: #1a56db; font-family: 'Courier New', monospace;">${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <!-- Official Signatures -->
                <div style="margin-top: 60px; display: flex; justify-content: space-between; gap: 40px; padding: 0 10px; margin-bottom: 60px;">
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

                <div style="position: fixed; bottom: 30px; left: 50px; right: 50px; border-top: 1px solid #ccc; padding-top: 10px;">
                    <div style="text-align: center; font-size: 10px; font-weight: 400; text-transform: uppercase; letter-spacing: 4px; color: #555;">
                        Generated by Iraasoft Solution
                    </div>
                </div>
            </div>
        `;

        printBuffer.innerHTML = reportHTML;
        document.body.classList.add('is-printing-report');
        window.print();
        setTimeout(() => {
            document.body.classList.remove('is-printing-report');
            printBuffer.innerHTML = '';
        }, 500);
    }
});
