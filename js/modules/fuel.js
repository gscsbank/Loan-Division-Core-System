// js/modules/fuel.js

document.addEventListener('DOMContentLoaded', () => {

    const btnNewLog = document.getElementById('btn-new-fuel-log');
    const modalFuelLog = document.getElementById('modal-fuel-log');
    const formFuelLog = document.getElementById('form-fuel-log');
    const modalCloseBtns = document.querySelectorAll('.fuel-modal-close');

    const logIdInput = document.getElementById('fuel-log-id');
    const inputDate = document.getElementById('fuel-date');
    const inputOfficer = document.getElementById('fuel-officer-name');
    const inputVehicleNo = document.getElementById('fuel-vehicle-no');
    const inputStart = document.getElementById('fuel-start-meter');
    const inputEnd = document.getElementById('fuel-end-meter');
    const inputRoute = document.getElementById('fuel-route');
    const displayTotalKM = document.getElementById('fuel-calc-total');

    const tbody = document.getElementById('fuel-logs-tbody');
    const emptyState = document.getElementById('fuel-empty-state');
    const monthFilter = document.getElementById('fuel-month-filter');
    const fuelPrintFilter = document.getElementById('fuel-print-filter');
    const btnPrintFuel = document.getElementById('btn-print-fuel-report');
    const totalKmEl = document.getElementById('fuel-total-summary');
    const dashFuelTotal = document.getElementById('dash-fuel-total');

    const today = new Date();
    if (monthFilter) monthFilter.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    if (inputDate) inputDate.valueAsDate = new Date();

    if (btnNewLog) {
        btnNewLog.addEventListener('click', () => {
            logIdInput.value = '';
            openModal();
        });
    }

    modalCloseBtns.forEach(btn => btn.addEventListener('click', closeModal));

    if (formFuelLog) formFuelLog.addEventListener('submit', handleFormSubmit);
    if (monthFilter) monthFilter.addEventListener('change', loadLogs);
    if (fuelPrintFilter) fuelPrintFilter.addEventListener('change', loadLogs);

    if (btnPrintFuel) {
        btnPrintFuel.addEventListener('click', handleFuelPrint);
    }

    [inputStart, inputEnd].forEach(input => {
        if (input) input.addEventListener('input', calculateDistance);
    });

    // Populate officer dropdown from localStorage
    function populateFuelPrintFilter() {
        const stored = localStorage.getItem('bank_field_officers');
        const officers = stored ? JSON.parse(stored) : [];
        if (fuelPrintFilter) {
            const currentVal = fuelPrintFilter.value;
            fuelPrintFilter.innerHTML = '<option value="" disabled>Select Officer</option>';
            officers.forEach(name => {
                const opt = document.createElement('option');
                opt.value = name;
                opt.innerText = name;
                fuelPrintFilter.appendChild(opt);
            });
            fuelPrintFilter.value = currentVal || '';
        }
    }

    populateFuelPrintFilter();

    // Re-populate if officers list changes (listen to storage events)
    window.addEventListener('storage', (e) => {
        if (e.key === 'bank_field_officers') populateFuelPrintFilter();
    });

    document.addEventListener('moduleSwitched', (e) => {
        if (e.detail.target === 'fuel' || e.detail.target === 'dashboard') {
            populateFuelPrintFilter();
            loadLogs();
        }
    });

    loadLogs();

    function calculateDistance() {
        const start = parseFloat(inputStart.value) || 0;
        const end = parseFloat(inputEnd.value) || 0;
        const total = Math.max(0, end - start);
        displayTotalKM.innerText = total.toFixed(1) + ' KM';
    }

    function openModal() {
        modalFuelLog.classList.remove('hidden');
        modalFuelLog.classList.add('flex');
    }

    function closeModal() {
        modalFuelLog.classList.add('hidden');
        modalFuelLog.classList.remove('flex');
        formFuelLog.reset();
        logIdInput.value = '';
        inputDate.valueAsDate = new Date();
        displayTotalKM.innerText = '0 KM';
    }

    async function handleFormSubmit(e) {
        e.preventDefault();

        const id = logIdInput.value;
        const start = parseFloat(inputStart.value) || 0;
        const end = parseFloat(inputEnd.value) || 0;
        const totalDist = Math.max(0, end - start);

        if (totalDist === 0) {
            window.showAlert('Invalid Reading', 'End meter must be greater than Start meter.', 'warning');
            return;
        }

        try {
            const data = {
                date: inputDate.value,
                officerName: inputOfficer.value.trim(),
                vehicleNo: (inputVehicleNo ? inputVehicleNo.value.trim().toUpperCase() : ''),
                startMeter: start,
                endMeter: end,
                totalDistance: totalDist,
                routeDesc: inputRoute.value.trim()
            };

            if (id) {
                await db.fuelLogs.update(parseInt(id), data);
            } else {
                await db.fuelLogs.put(data);
            }
            window.showToast(id ? 'Trip updated successfully' : 'Trip logged successfully');
            closeModal();
            loadLogs();
        } catch (error) {
            console.error("Failed to save fuel log:", error);
            window.showAlert('Error', 'Error saving log. Please try again.', 'error');
        }
    }

    async function loadLogs() {
        if (!monthFilter) return;
        const filterVal = monthFilter.value;
        if (!filterVal) return;

        const printFilterVal = fuelPrintFilter ? fuelPrintFilter.value : '';

        try {
            const allLogs = await db.fuelLogs.orderBy('date').reverse().toArray();
            let filteredLogs = allLogs.filter(log => log.date.startsWith(filterVal));

            if (printFilterVal) {
                filteredLogs = filteredLogs.filter(log => log.officerName === printFilterVal);
            }

            renderTable(filteredLogs);
            updateSummary(filteredLogs);

            const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
            if (filterVal === currentMonthStr && dashFuelTotal && !printFilterVal) {
                const total = filteredLogs.reduce((sum, log) => sum + log.totalDistance, 0);
                dashFuelTotal.innerText = total.toFixed(1);
            }
        } catch (error) {
            console.error("Failed to load fuel logs:", error);
        }
    }

    function renderTable(logs) {
        if (!tbody) return;
        tbody.innerHTML = '';

        if (logs.length === 0) {
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');

        logs.forEach(log => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-slate-50/50 transition-colors group';

            const dateFormatted = new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

            tr.innerHTML = `
                <td class="px-5 py-3 border-b border-slate-100 text-slate-700 whitespace-nowrap">${dateFormatted}</td>
                <td class="px-5 py-3 border-b border-slate-100 font-medium text-slate-800 whitespace-nowrap">${log.officerName}</td>
                <td class="px-5 py-3 border-b border-slate-100 text-slate-600 font-mono text-sm whitespace-nowrap">${log.vehicleNo || '-'}</td>
                <td class="px-5 py-3 border-b border-slate-100 text-slate-600 truncate max-w-xs" title="${log.routeDesc}">${log.routeDesc || '-'}</td>
                <td class="px-5 py-3 border-b border-slate-100 text-center text-slate-600 text-xs">${log.startMeter} &rarr; ${log.endMeter}</td>
                <td class="px-5 py-3 border-b border-slate-100 text-right font-bold text-orange-600 whitespace-nowrap">${log.totalDistance.toFixed(1)} KM</td>
                <td class="px-5 py-3 border-b border-slate-100 text-center print-hide">
                    <div class="flex justify-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onclick="window.editFuelLog(${log.id})" class="text-slate-400 hover:text-primary transition-colors" title="Edit"><i class="ph ph-pencil-simple text-lg"></i></button>
                        <button onclick="window.deleteFuelLog(${log.id})" class="text-slate-400 hover:text-red-500 transition-colors" title="Delete"><i class="ph ph-trash text-lg"></i></button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    window.editFuelLog = async (id) => {
        try {
            const log = await db.fuelLogs.get(id);
            if (log) {
                logIdInput.value = log.id;
                inputDate.value = log.date;
                inputOfficer.value = log.officerName;
                if (inputVehicleNo) inputVehicleNo.value = log.vehicleNo || '';
                inputStart.value = log.startMeter;
                inputEnd.value = log.endMeter;
                inputRoute.value = log.routeDesc;
                calculateDistance();
                openModal();
            }
        } catch (e) {
            console.error(e);
        }
    };

    window.deleteFuelLog = async (id) => {
        const confirmed = await window.showConfirm(
            'Delete Trip Log',
            'Are you sure you want to delete this trip log?',
            'Yes, delete'
        );
        if (confirmed) {
            try {
                await db.fuelLogs.delete(id);
                window.showToast('Log deleted');
                loadLogs();
            } catch (e) {
                console.error(e);
            }
        }
    };

    function updateSummary(logs) {
        if (!totalKmEl) return;
        const total = logs.reduce((sum, log) => sum + log.totalDistance, 0);
        totalKmEl.innerText = total.toFixed(1);
    }

    // ---- PRINT REPORT FUNCTION ----
    async function handleFuelPrint() {
        const officerName = fuelPrintFilter ? fuelPrintFilter.value : '';
        const monthFilterVal = monthFilter.value;

        if (!officerName) {
            window.showAlert('Select Officer', 'Please select a specific officer from the list first.', 'info');
            return;
        }

        const printBuffer = document.getElementById('print-report-buffer');
        if (!printBuffer) return;

        const allLogs = await db.fuelLogs.orderBy('date').reverse().toArray();
        const filteredLogs = allLogs.filter(log =>
            log.date.startsWith(monthFilterVal) && log.officerName === officerName
        );

        const totalKm = filteredLogs.reduce((sum, log) => sum + log.totalDistance, 0);
        const reportDate = new Date(monthFilterVal + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' });

        // Get vehicle numbers used (unique)
        const vehicleNos = [...new Set(filteredLogs.map(l => l.vehicleNo).filter(Boolean))].join(', ') || '-';

        let reportHTML = `
            <div style="width: 210mm; min-height: 297mm; margin: auto; padding: 40px 50px; font-family: 'Arial', 'Helvetica', sans-serif; color: #000; background: #fff; box-sizing: border-box;">

                <!-- Official Header -->
                <div style="text-align: center; margin-bottom: 28px; padding-bottom: 20px;">
                    <h1 style="font-size: 22px; font-weight: 700; text-transform: uppercase; letter-spacing: 3px; margin: 0 0 4px 0;">GALAPITIYAGAMA SANASA BANK</h1>
                    <h2 style="font-size: 13px; font-weight: 500; color: #444; letter-spacing: 2px; text-transform: uppercase; margin: 0 0 16px 0;">FIELD, LOAN AND PROMOTION DIVISION</h2>
                    <div style="display: inline-block; border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 6px 40px;">
                        <span style="font-size: 11px; font-weight: 600; letter-spacing: 3px; text-transform: uppercase;">Monthly Transport &amp; Fuel Report</span>
                    </div>
                </div>

                <!-- Document Header Info -->
                <div style="display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 12px;">
                    <div style="flex: 1;">
                        <span style="font-weight: 400; text-transform: uppercase; font-size: 10px; color: #666; letter-spacing: 1px;">Field Officer&nbsp;&nbsp;:&nbsp;&nbsp;</span>
                        <span style="font-weight: 600; font-size: 14px; border-bottom: 1.5px solid #aaa; padding-bottom: 2px;">${officerName}</span>
                    </div>
                    <div style="flex: 1; text-align: right;">
                        <span style="font-weight: 400; text-transform: uppercase; font-size: 10px; color: #666; letter-spacing: 1px;">Reporting Month&nbsp;&nbsp;:&nbsp;&nbsp;</span>
                        <span style="font-weight: 600; font-size: 15px; border-bottom: 1.5px solid #aaa; padding-bottom: 2px;">${reportDate.toUpperCase()}</span>
                    </div>
                </div>
                <div style="margin-bottom: 28px; font-size: 12px;">
                    <span style="font-weight: 400; text-transform: uppercase; font-size: 10px; color: #666; letter-spacing: 1px;">Vehicle No(s)&nbsp;&nbsp;:&nbsp;&nbsp;</span>
                    <span style="font-weight: 600; font-size: 13px; font-family: 'Courier New', monospace;">${vehicleNos}</span>
                </div>

                <!-- Data Table -->
                <div style="margin-bottom: 40px;">
                    <table style="width: 100%; border-collapse: collapse; border: none;">
                        <thead>
                            <tr style="background-color: #1a1a1a; color: #fff;">
                                <th style="border: none; border-bottom: 1px solid #333; padding: 10px 12px; text-align: left; font-size: 10px; font-weight: 400; text-transform: uppercase; letter-spacing: 1.5px; white-space: nowrap;">Date</th>
                                <th style="border: none; border-bottom: 1px solid #333; padding: 10px 12px; text-align: left; font-size: 10px; font-weight: 400; text-transform: uppercase; letter-spacing: 1.5px;">Vehicle No</th>
                                <th style="border: none; border-bottom: 1px solid #333; padding: 10px 12px; text-align: left; font-size: 10px; font-weight: 400; text-transform: uppercase; letter-spacing: 1.5px;">Route Description</th>
                                <th style="border: none; border-bottom: 1px solid #333; padding: 10px 12px; text-align: center; font-size: 10px; font-weight: 400; text-transform: uppercase; letter-spacing: 1.5px; white-space: nowrap;">Start KM</th>
                                <th style="border: none; border-bottom: 1px solid #333; padding: 10px 12px; text-align: center; font-size: 10px; font-weight: 400; text-transform: uppercase; letter-spacing: 1.5px; white-space: nowrap;">End KM</th>
                                <th style="border: none; border-bottom: 1px solid #333; padding: 10px 12px; text-align: right; font-size: 10px; font-weight: 400; text-transform: uppercase; letter-spacing: 1.5px; white-space: nowrap;">Distance</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        if (filteredLogs.length === 0) {
            reportHTML += `
                <tr>
                    <td colspan="6" style="border: none; border-bottom: 1px solid #eee; padding: 60px 12px; text-align: center; color: #aaa; font-style: italic; font-size: 12px;">
                        No transport records for the specified reporting period.
                    </td>
                </tr>
            `;
        } else {
            filteredLogs.forEach((log, idx) => {
                const d = new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                const rowBg = idx % 2 === 0 ? '#ffffff' : '#f8f9fa';
                reportHTML += `
                    <tr style="background-color: ${rowBg};">
                        <td style="border: none; border-bottom: 1px solid #eee; padding: 9px 12px; font-size: 12px; font-weight: 400; white-space: nowrap; color: #000;">${d}</td>
                        <td style="border: none; border-bottom: 1px solid #eee; padding: 9px 12px; font-size: 12px; font-weight: 400; font-family: 'Courier New', monospace; color: #000;">${log.vehicleNo || '-'}</td>
                        <td style="border: none; border-bottom: 1px solid #eee; padding: 9px 12px; font-size: 12px; font-weight: 400; color: #000;">${log.routeDesc || '-'}</td>
                        <td style="border: none; border-bottom: 1px solid #eee; padding: 9px 12px; font-size: 12px; font-weight: 400; text-align: center; font-family: 'Courier New', monospace; color: #000;">${log.startMeter.toFixed(1)}</td>
                        <td style="border: none; border-bottom: 1px solid #eee; padding: 9px 12px; font-size: 12px; font-weight: 400; text-align: center; font-family: 'Courier New', monospace; color: #000;">${log.endMeter.toFixed(1)}</td>
                        <td style="border: none; border-bottom: 1px solid #eee; padding: 9px 12px; font-size: 12px; font-weight: 400; text-align: right; color: #000;">${log.totalDistance.toFixed(1)} KM</td>
                    </tr>
                `;
            });
        }

        reportHTML += `
                        </tbody>
                        <tfoot>
                            <tr style="background-color: #1a1a1a; color: #fff;">
                                <td style="border: none; border-top: 1px solid #555; padding: 12px; font-size: 11px; font-weight: 700; text-align: right; text-transform: uppercase; letter-spacing: 2px;" colspan="5">Total Distance Travelled:</td>
                                <td style="border: none; border-top: 1px solid #555; padding: 12px; font-size: 18px; font-weight: 400; text-align: right;">${totalKm.toFixed(1)} KM</td>
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

                <!-- Footer -->
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
