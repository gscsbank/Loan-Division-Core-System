// js/modules/recovery.js

document.addEventListener('DOMContentLoaded', () => {
    const recoveryTbody = document.getElementById('recovery-tbody');
    const recoverySearch = document.getElementById('recovery-search');
    const recoveryFilterStatus = document.getElementById('recovery-filter-status');
    const recoveryEmptyState = document.getElementById('recovery-empty-state');
    const formRecovery = document.getElementById('form-recovery');
    const modalRecovery = document.getElementById('modal-recovery');

    let statusChart = null;
    let categoryChart = null;

    // --- Initialization ---

    document.addEventListener('moduleSwitched', (e) => {
        if (e.detail.target === 'recovery') {
            loadRecoveryData();
        }
    });

    async function loadRecoveryData() {
        const cases = await db.recovery.toArray();
        renderStats(cases);
        renderCharts(cases);
        renderTable(cases);
    }

    // --- Logic & Rendering ---

    function renderStats(cases) {
        document.getElementById('stat-recovery-total').textContent = cases.length;
        document.getElementById('stat-recovery-high-risk').textContent = cases.filter(c => c.status === 'HIGH RISK').length;
        document.getElementById('stat-recovery-legal').textContent = cases.filter(c => c.status.includes('LEGAL')).length;
    }

    function renderCharts(cases) {
        // 1. Status Chart (Donut)
        const statusCtx = document.getElementById('recoveryStatusChart');
        if (statusCtx) {
            const statusCounts = {
                'NORMAL': 0,
                'HIGH RISK': 0,
                'LEGAL ACTION - COURTS': 0,
                'LEGAL ACTION - COOPERATIVE COMMISSIONER': 0,
                'LOAN CLOSED': 0
            };
            cases.forEach(c => { if (statusCounts[c.status] !== undefined) statusCounts[c.status]++; });

            if (statusChart) statusChart.destroy();
            statusChart = new Chart(statusCtx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(statusCounts),
                    datasets: [{
                        data: Object.values(statusCounts),
                        backgroundColor: [
                            '#ec4899', // Normal (Pink in LMRS donut)
                            '#f59e0b', // High Risk (Gold/Orange)
                            '#ef4444', // Legal Courts (Red)
                            '#a855f7', // Legal Comm (Purple)
                            '#10b981'  // Closed (Green)
                        ],
                        borderWidth: 0,
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 9, weight: 'bold' }, color: '#64748b' } }
                    },
                    cutout: '75%'
                }
            });
        }

        // 2. Categories (Bar)
        const categoryCtx = document.getElementById('recoveryCategoryChart');
        if (categoryCtx) {
            const catCounts = {};
            cases.forEach(c => { catCounts[c.loanType] = (catCounts[c.loanType] || 0) + 1; });

            if (categoryChart) categoryChart.destroy();
            categoryChart = new Chart(categoryCtx, {
                type: 'bar',
                data: {
                    labels: Object.keys(catCounts),
                    datasets: [{
                        label: 'Cases',
                        data: Object.values(catCounts),
                        backgroundColor: '#a855f7',
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { stepSize: 1, font: { size: 10 } } },
                        x: { grid: { display: false }, ticks: { font: { size: 10, weight: '600' } } }
                    },
                    plugins: { legend: { display: false } }
                }
            });
        }
    }

    async function renderTable(cases) {
        const searchTerm = recoverySearch.value.toLowerCase();
        const filterStatus = recoveryFilterStatus.value;

        const filtered = cases.filter(c => {
            const matchesSearch = c.accountNo.toLowerCase().includes(searchTerm) || c.name.toLowerCase().includes(searchTerm);
            const matchesStatus = !filterStatus || c.status === filterStatus;
            return matchesSearch && matchesStatus;
        });

        recoveryTbody.innerHTML = '';
        if (filtered.length === 0) {
            recoveryEmptyState.classList.remove('hidden');
        } else {
            recoveryEmptyState.classList.add('hidden');
            filtered.forEach((c, index) => {
                const row = document.createElement('tr');
                row.className = 'group hover:bg-slate-50/80 transition-colors';
                row.innerHTML = `
                    <td class="px-6 py-4 text-slate-400 font-medium">${index + 1}</td>
                    <td class="px-6 py-4">
                        <div class="font-bold text-slate-900">${c.accountNo}</div>
                    </td>
                    <td class="px-6 py-4">
                        <div class="text-slate-500 font-medium text-xs">L..${c.name}</div>
                        <div class="text-[10px] text-slate-400">${c.loanType} • ${c.interestRate}</div>
                    </td>
                    <td class="px-6 py-4 text-center">
                        <span class="px-4 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${getStatusClass(c.status)}">
                            ${c.status}
                        </span>
                    </td>
                    <td class="px-6 py-4 text-center print-hide">
                        <div class="flex items-center justify-center space-x-2">
                            <button onclick="window.deleteRecoveryCase(${c.id})" class="p-1 px-2 border border-red-100 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-all">
                                <i class="ph ph-trash"></i>
                            </button>
                            <button onclick="window.editRecoveryCase(${c.id})" class="p-1 px-2 border border-slate-100 bg-slate-50 text-blue-500 rounded-lg hover:bg-blue-100 transition-all">
                                <i class="ph ph-arrow-right"></i>
                            </button>
                        </div>
                    </td>
                `;
                recoveryTbody.appendChild(row);
            });
        }
    }

    function getStatusClass(status) {
        switch (status) {
            case 'NORMAL': return 'bg-[#dcfce7] text-[#15803d]';
            case 'HIGH RISK': return 'bg-[#fef3c7] text-[#d97706]';
            case 'LEGAL ACTION - COURTS': return 'bg-[#fee2e2] text-[#ef4444]';
            case 'LEGAL ACTION - COOPERATIVE COMMISSIONER': return 'bg-[#e0e7ff] text-[#4338ca]';
            case 'LOAN CLOSED': return 'bg-[#f1f5f9] text-[#64748b]';
            default: return 'bg-slate-100 text-slate-600';
        }
    }

    // --- Event Listeners ---

    recoverySearch.addEventListener('input', () => loadRecoveryData());
    recoveryFilterStatus.addEventListener('change', () => loadRecoveryData());

    formRecovery.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('recovery-id').value;
        const data = {
            accountNo: document.getElementById('rec-account').value,
            name: document.getElementById('rec-name').value,
            loanType: document.getElementById('rec-type').value,
            interestRate: document.getElementById('rec-int').value,
            amount: parseFloat(document.getElementById('rec-amount').value),
            status: document.getElementById('rec-status').value,
            lastActionDate: new Date().toISOString()
        };

        if (id) {
            await db.recovery.update(parseInt(id), data);
            showToast('Recovery case updated successfully!');
        } else {
            await db.recovery.add(data);
            showToast('Recovery case added successfully!');
        }

        window.closeRecoveryModal();
        loadRecoveryData();
    });

    // --- Global Window Helpers ---

    window.showAddRecoveryModal = () => {
        document.getElementById('modal-recovery-title').textContent = 'Add Recovery Customer';
        document.getElementById('recovery-id').value = '';
        formRecovery.reset();
        modalRecovery.classList.remove('hidden');
    };

    window.closeRecoveryModal = () => {
        modalRecovery.classList.add('hidden');
    };

    window.editRecoveryCase = async (id) => {
        const c = await db.recovery.get(id);
        if (c) {
            document.getElementById('modal-recovery-title').textContent = 'Edit Recovery Customer';
            document.getElementById('recovery-id').value = c.id;
            document.getElementById('rec-account').value = c.accountNo;
            document.getElementById('rec-name').value = c.name;
            document.getElementById('rec-type').value = c.loanType;
            document.getElementById('rec-int').value = c.interestRate;
            document.getElementById('rec-amount').value = c.amount;
            document.getElementById('rec-status').value = c.status;
            modalRecovery.classList.remove('hidden');
        }
    };

    window.deleteRecoveryCase = async (id) => {
        if (confirm('Are you sure you want to delete this recovery case?')) {
            await db.recovery.delete(id);
            showToast('Recovery case deleted.', 'warning');
            loadRecoveryData();
        }
    };
});
