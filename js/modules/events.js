// js/modules/events.js

document.addEventListener('DOMContentLoaded', () => {

    const formEvent = document.getElementById('form-event-proposal');
    const tbodyEvents = document.getElementById('events-tbody');
    const emptyStateEvents = document.getElementById('events-empty-state');
    const eventIdInput = document.getElementById('event-id');

    const statusMap = {
        'Pending': 'bg-yellow-100 text-yellow-800',
        'Manager Approved': 'bg-blue-100 text-blue-800',
        'Board Approved': 'bg-emerald-100 text-emerald-800',
        'Rejected': 'bg-red-100 text-red-800'
    };

    document.addEventListener('moduleSwitched', (e) => {
        if (e.detail.target === 'events') {
            loadEvents();
        }
    });

    if (formEvent) {
        formEvent.addEventListener('submit', handleEventSubmit);
    }

    async function handleEventSubmit(e) {
        e.preventDefault();

        const id = eventIdInput.value;
        const title = document.getElementById('event-title').value.trim();
        const date = document.getElementById('event-date').value;
        const description = document.getElementById('event-desc').value.trim();

        try {
            if (id) {
                const existing = await db.events.get(parseInt(id));
                await db.events.update(parseInt(id), {
                    title,
                    date,
                    description,
                    status: existing.status
                });
            } else {
                await db.events.add({
                    title,
                    date,
                    description,
                    status: 'Pending'
                });
            }

            formEvent.reset();
            eventIdInput.value = '';
            loadEvents();
            window.showToast(id ? 'Proposal updated successfully' : 'Proposal drafted successfully');
        } catch (error) {
            console.error("Failed to save event:", error);
            window.showAlert('Error', 'Error saving proposal.', 'error');
        }
    }

    async function loadEvents() {
        if (!tbodyEvents) return;

        try {
            const allEvents = await db.events.reverse().toArray();

            tbodyEvents.innerHTML = '';

            if (allEvents.length === 0) {
                emptyStateEvents.classList.remove('hidden');
                return;
            }

            emptyStateEvents.classList.add('hidden');

            allEvents.forEach(evt => {
                const tr = document.createElement('tr');
                tr.className = 'hover:bg-slate-50/50 transition-colors bg-white group';

                const dateStr = new Date(evt.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                const statusTheme = statusMap[evt.status] || 'bg-slate-100 text-slate-800';

                tr.innerHTML = `
                    <td class="px-5 py-4 border-b border-slate-100 border-r border-slate-50 relative">
                        <div class="absolute left-0 top-0 bottom-0 w-1 ${statusTheme.split(' ')[0].replace('bg-', 'bg-')} opacity-50"></div>
                        <h5 class="font-bold text-slate-800 mb-1 ml-2">${evt.title}</h5>
                        <div class="flex items-center text-xs text-slate-500 mb-2 ml-2">
                             <i class="ph ph-calendar-blank mr-1"></i> ${dateStr}
                        </div>
                        <p class="text-sm text-slate-600 line-clamp-2 ml-2">${evt.description}</p>
                    </td>
                    <td class="px-5 py-4 border-b border-slate-100 text-center align-middle border-r border-slate-50">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${statusTheme}">
                            ${evt.status}
                        </span>
                    </td>
                    <td class="px-5 py-4 border-b border-slate-100 align-middle">
                        <div class="flex flex-col space-y-2 lg:flex-row lg:space-y-0 lg:space-x-2 justify-center print-hide mb-2">
                            ${evt.status === 'Pending' ? `<button onclick="window.updateEventStatus(${evt.id}, 'Manager Approved')" class="px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-xs font-bold transition-colors w-full lg:w-auto">Approve (Mgr)</button>` : ''}
                            ${evt.status === 'Manager Approved' ? `<button onclick="window.updateEventStatus(${evt.id}, 'Board Approved')" class="px-3 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-xs font-bold transition-colors w-full lg:w-auto">Approve (Board)</button>` : ''}
                            ${(evt.status !== 'Rejected' && evt.status !== 'Board Approved') ? `<button onclick="window.updateEventStatus(${evt.id}, 'Rejected')" class="px-3 py-1 bg-red-50 text-red-700 hover:bg-red-100 rounded text-xs font-bold transition-colors w-full lg:w-auto">Reject</button>` : ''}
                            <button onclick="window.generateEventPDF(${evt.id})" class="px-3 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded text-xs font-bold transition-colors w-full lg:w-auto flex items-center justify-center"><i class="ph ph-printer mr-1"></i> Print</button>
                        </div>
                        <div class="flex justify-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity border-t border-slate-100 pt-2 print-hide">
                            <button class="text-slate-400 hover:text-primary transition-colors p-1" onclick="window.editEvent(${evt.id})" title="Edit"><i class="ph ph-pencil-simple text-lg"></i></button>
                            <button class="text-slate-400 hover:text-red-500 transition-colors p-1" onclick="window.deleteEvent(${evt.id})" title="Delete"><i class="ph ph-trash text-lg"></i></button>
                        </div>
                    </td>
                `;
                tbodyEvents.appendChild(tr);
            });
        } catch (e) {
            console.error("Failed to load events", e);
        }
    }

    window.updateEventStatus = async (id, newStatus) => {
        const confirmed = await window.showConfirm(
            'Update Status',
            `Are you sure you want to mark this proposal as \"${newStatus}\"?`,
            'Yes, update',
            'question'
        );
        if (confirmed) {
            try {
                await db.events.update(id, { status: newStatus });
                window.showToast('Status updated');
                loadEvents();
            } catch (e) {
                console.error(e);
            }
        }
    };

    window.editEvent = async function (id) {
        try {
            const evt = await db.events.get(id);
            if (evt) {
                eventIdInput.value = evt.id;
                document.getElementById('event-title').value = evt.title;
                document.getElementById('event-date').value = evt.date;
                document.getElementById('event-desc').value = evt.description;
                document.getElementById('event-title').focus();
            }
        } catch (e) {
            console.error(e);
        }
    };

    window.generateEventPDF = async function (id) {
        try {
            const evt = await db.events.get(id);
            if (!evt) return;

            const printBuffer = document.getElementById('print-report-buffer');
            if (!printBuffer) return;

            const dateStr = new Date(evt.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

            const reportHTML = `
                <div class="pdf-container" style="width: 210mm; min-height: 297mm; margin: auto; padding: 30mm 20mm; font-family: 'Arial', sans-serif; background: white; box-sizing: border-box;">
                    <style>
                        .tbl-layout { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                        .tbl-layout th, .tbl-layout td { border: 1px solid #ddd; padding: 12px; font-size: 13px; color: #333; }
                        .tbl-layout th { background: #f8f9fa; font-weight: bold; text-align: left; width: 30%; }
                        .header-box { text-align: center; border-bottom: 3px solid #1e3a5f; padding-bottom: 20px; margin-bottom: 30px; }
                        .section-title { background: #1e3a5f; color: white; padding: 8px 15px; font-weight: bold; font-size: 14px; margin: 25px 0 15px 0; text-transform: uppercase; }
                        .sign-section { margin-top: 60px; display: flex; justify-content: space-between; }
                        .sign-box { width: 45%; text-align: center; }
                        .sign-line { border-top: 2px dotted #999; margin-top: 50px; padding-top: 5px; font-size: 11px; font-weight: bold; text-transform: uppercase; }
                    </style>

                    <div class="header-box">
                        <h1 style="margin: 0; font-size: 24px; color: #1e3a5f; letter-spacing: 2px;">GALAPITIYAGAMA SANASA BANK</h1>
                        <p style="margin: 5px 0 0 0; font-size: 14px; font-weight: bold; color: #444;">EVENT & PROJECT PROPOSAL REPORT</p>
                    </div>

                    <div class="section-title">01. Proposal Information</div>
                    <table class="tbl-layout">
                        <tr><th>Proposal Title</th><td>${evt.title}</td></tr>
                        <tr><th>Proposed Date</th><td>${dateStr}</td></tr>
                        <tr><th>Current Status</th><td><strong>${evt.status}</strong></td></tr>
                    </table>

                    <div class="section-title">02. Description & Budget Details</div>
                    <div style="border: 1px solid #ddd; padding: 20px; font-size: 13px; line-height: 1.6; min-height: 200px; color: #333; white-space: pre-wrap;">${evt.description}</div>

                    <div class="sign-section">
                        <div class="sign-box">
                            <div class="sign-line">Manager's Approval</div>
                            <div style="font-size: 10px; color: #777; margin-top: 2px;">(Signature / Date)</div>
                        </div>
                        <div class="sign-box">
                            <div class="sign-line">Chairman's Approval</div>
                            <div style="font-size: 10px; color: #777; margin-top: 2px;">(Signature / Date)</div>
                        </div>
                    </div>

                    <div style="position: fixed; bottom: 20mm; left: 0; right: 0; text-align: center; font-size: 10px; color: #aaa; border-top: 1px solid #eee; padding-top: 10px; margin: 0 20mm;">
                        Generated by Sanasa Bank Core System | Internal Workflow Document
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
        } catch (e) {
            console.error("Failed to generate Event PDF", e);
        }
    };
});
