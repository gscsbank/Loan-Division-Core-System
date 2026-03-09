// js/modules/post-loans.js
document.addEventListener('DOMContentLoaded', () => {
    const formPostLoan = document.getElementById('form-post-loan-inspection');
    const tbody = document.getElementById('post-loans-tbody');
    const emptyState = document.getElementById('post-loans-empty-state');
    const idInput = document.getElementById('post-loan-id');

    // Trigger load when view is activated
    document.addEventListener('moduleSwitched', (e) => {
        if (e.detail.target === 'post-loans') {
            loadPostLoans();
        }
    });

    if (formPostLoan) {
        formPostLoan.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleFormSubmit();
        });
    }

    async function loadPostLoans() {
        if (!tbody) return;
        try {
            const records = await db.postLoanReports.orderBy('date').reverse().toArray();
            tbody.innerHTML = '';

            if (records.length === 0) {
                emptyState.classList.remove('hidden');
            } else {
                emptyState.classList.add('hidden');
                records.forEach(log => {
                    const row = document.createElement('tr');
                    row.className = 'hover:bg-slate-50 transition-colors cursor-pointer';
                    // Make row clickable to load data
                    row.addEventListener('click', (e) => {
                        if (!e.target.closest('button')) {
                            editPostLoan(log);
                        }
                    });

                    row.innerHTML = `
                        <td class="px-5 py-4 whitespace-nowrap text-slate-700 font-medium">${log.date}</td>
                        <td class="px-5 py-4 whitespace-nowrap text-slate-900 font-bold">${log.applicantName}</td>
                        <td class="px-5 py-4 whitespace-nowrap text-center print-hide">
                            <button class="btn-print text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 p-2 rounded-lg transition-colors mr-2" data-id="${log.id}" title="Print report"><i class="ph ph-printer text-lg"></i></button>
                            <button class="btn-delete text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition-colors" data-id="${log.id}" title="Delete"><i class="ph ph-trash text-lg"></i></button>
                        </td>
                    `;
                    tbody.appendChild(row);
                });

                // Attach Action Listeners
                document.querySelectorAll('.btn-print').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        const id = Number(e.currentTarget.getAttribute('data-id'));
                        await printPostLoan(id);
                    });
                });

                document.querySelectorAll('.btn-delete').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        const id = Number(e.currentTarget.getAttribute('data-id'));
                        if (await window.showConfirm("Delete Report?", "This action cannot be undone.")) {
                            await db.postLoanReports.delete(id);
                            window.showToast("Report deleted successfully");
                            loadPostLoans();
                            formPostLoan.reset();
                            idInput.value = '';
                        }
                    });
                });
            }
        } catch (error) {
            console.error("Failed to load post loan reports:", error);
        }
    }

    async function handleFormSubmit() {
        const id = idInput.value ? Number(idInput.value) : null;

        const data = {
            date: document.getElementById('plDate').value,
            accountNo: document.getElementById('plAccNo').value,
            applicantName: document.getElementById('plName').value,
            nic: document.getElementById('plNic').value,
            address: document.getElementById('plAddress').value,
            phone: document.getElementById('plPhone').value,
            loanAgreementNo: document.getElementById('plLoanAgreementNo').value,

            givenAmt: document.getElementById('plGivenAmt').value,
            installment: document.getElementById('plInstallment').value,
            loanPeriod: document.getElementById('plLoanPeriod').value,
            releaseDate: document.getElementById('plReleaseDate').value,

            incomeBefore: document.getElementById('plIncomeBefore').value,
            incomeNow: document.getElementById('plIncomeNow').value,
            expenseBefore: document.getElementById('plExpenseBefore').value,
            expenseNow: document.getElementById('plExpenseNow').value,
            profitBefore: document.getElementById('plProfitBefore').value,
            profitNow: document.getElementById('plProfitNow').value,

            bizGrowthTx: document.getElementById('plBizGrowthTx').value,
            bizGrowthCus: document.getElementById('plBizGrowthCus').value,
            bizGrowthEquip: document.getElementById('plBizGrowthEquip').value,
            bizGrowthChanges: document.getElementById('plBizGrowthChanges').value,

            useCorrect: document.getElementById('plUseCorrect').value,
            useDocs: document.getElementById('plUseDocs').value,
            useDesc: document.getElementById('plUseDesc').value,

            repayRegular: document.getElementById('plRepayRegular').value,
            repayIssues: document.getElementById('plRepayIssues').value,
            repayBalance: document.getElementById('plRepayBalance').value,
            repayDelayReason: document.getElementById('plRepayDelayReason').value,

            monDate: document.getElementById('plMonDate').value,
            monOfficer: document.getElementById('plMonOfficer').value,
            monSuccess: document.getElementById('plMonSuccess').value,
            monRisk: document.getElementById('plMonRisk').value,
            monNote: document.getElementById('plMonNote').value,

            recAdvise: document.getElementById('plRecAdvise').checked,
            recFinAdvise: document.getElementById('plRecFinAdvise').checked,
            recTraining: document.getElementById('plRecTraining').checked,
            recNewLoan: document.getElementById('plRecNewLoan').checked,
            recWarning: document.getElementById('plRecWarning').checked,
            recOther: document.getElementById('plRecOther').value,

            offName: document.getElementById('plOffName').value,
            offDesignation: document.getElementById('plOffDesignation').value,
            offDate: document.getElementById('plOffDate').value
        };

        try {
            if (id) {
                await db.postLoanReports.update(id, data);
            } else {
                await db.postLoanReports.add(data);
            }

            formPostLoan.reset();
            idInput.value = '';

            // Reload table
            await loadPostLoans();

            // Find id of the latest one if it was a new record
            let printId = id;
            if (!printId) {
                const latest = await db.postLoanReports.orderBy('id').last();
                printId = latest.id;
            }
            // Generate PDF Print View
            await printPostLoan(printId);

        } catch (error) {
            console.error("Failed to save report:", error);
            window.showToast("Error saving report", "error");
        }
    }

    function editPostLoan(log) {
        idInput.value = log.id;
        document.getElementById('plDate').value = log.date || '';
        document.getElementById('plAccNo').value = log.accountNo || '';
        document.getElementById('plName').value = log.applicantName || '';
        document.getElementById('plNic').value = log.nic || '';
        document.getElementById('plAddress').value = log.address || '';
        document.getElementById('plPhone').value = log.phone || '';
        document.getElementById('plLoanAgreementNo').value = log.loanAgreementNo || '';

        document.getElementById('plGivenAmt').value = log.givenAmt || '';
        document.getElementById('plInstallment').value = log.installment || '';
        document.getElementById('plLoanPeriod').value = log.loanPeriod || '';
        document.getElementById('plReleaseDate').value = log.releaseDate || '';

        document.getElementById('plIncomeBefore').value = log.incomeBefore || '';
        document.getElementById('plIncomeNow').value = log.incomeNow || '';
        document.getElementById('plExpenseBefore').value = log.expenseBefore || '';
        document.getElementById('plExpenseNow').value = log.expenseNow || '';
        document.getElementById('plProfitBefore').value = log.profitBefore || '';
        document.getElementById('plProfitNow').value = log.profitNow || '';

        document.getElementById('plBizGrowthTx').value = log.bizGrowthTx || '';
        document.getElementById('plBizGrowthCus').value = log.bizGrowthCus || '';
        document.getElementById('plBizGrowthEquip').value = log.bizGrowthEquip || '';
        document.getElementById('plBizGrowthChanges').value = log.bizGrowthChanges || '';

        document.getElementById('plUseCorrect').value = log.useCorrect || '';
        document.getElementById('plUseDocs').value = log.useDocs || '';
        document.getElementById('plUseDesc').value = log.useDesc || '';

        document.getElementById('plRepayRegular').value = log.repayRegular || '';
        document.getElementById('plRepayIssues').value = log.repayIssues || '';
        document.getElementById('plRepayBalance').value = log.repayBalance || '';
        document.getElementById('plRepayDelayReason').value = log.repayDelayReason || '';

        document.getElementById('plMonDate').value = log.monDate || '';
        document.getElementById('plMonOfficer').value = log.monOfficer || '';
        document.getElementById('plMonSuccess').value = log.monSuccess || '';
        document.getElementById('plMonRisk').value = log.monRisk || '';
        document.getElementById('plMonNote').value = log.monNote || '';

        document.getElementById('plRecAdvise').checked = log.recAdvise || false;
        document.getElementById('plRecFinAdvise').checked = log.recFinAdvise || false;
        document.getElementById('plRecTraining').checked = log.recTraining || false;
        document.getElementById('plRecNewLoan').checked = log.recNewLoan || false;
        document.getElementById('plRecWarning').checked = log.recWarning || false;
        document.getElementById('plRecOther').value = log.recOther || '';

        document.getElementById('plOffName').value = log.offName || '';
        document.getElementById('plOffDesignation').value = log.offDesignation || '';
        document.getElementById('plOffDate').value = log.offDate || '';

        window.scrollTo({ top: 0, behavior: 'smooth' });
        window.showToast("Record loaded for editing", "info");
    }

    async function printPostLoan(id) {
        try {
            const data = await db.postLoanReports.get(id);
            if (data) {
                generatePDF(data);
            }
        } catch (error) {
            console.error(error);
        }
    }

    function generatePDF(data) {
        const checkboxState = (isChecked) => isChecked ? 'X' : '';
        const inlineChoice = (selOption, target) => selOption === target ? '<span style="border:1px solid #000; padding: 0 4px; background: #e2e8f0; font-weight:bold;">' + target + '</span>' : target;

        const html = `
        <!DOCTYPE html>
        <html lang="si">
        <head>
            <title>ව්‍යාපාර ණය පසු විපරම් ආකෘති පත්‍රය - ${data.applicantName}</title>
            <style>
                /* A4 Standard Print Rules */
                @page {
                    size: A4 portrait;
                    margin: 15mm;
                }

                body { 
                    font-family: 'Arial', sans-serif; 
                    color: #111; 
                    line-height: 1.6; 
                    margin: 0; 
                    padding: 30px 0; 
                    font-size: 13px;
                    background-color: #525659; /* Chrome native PDF background */
                    display: flex;
                    justify-content: center;
                }
                
                /* Main Document Container */
                .print-container { 
                    width: 210mm;
                    min-height: 297mm;
                    margin: 0 auto;
                    background-color: white;
                    padding: 15mm;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.5);
                    box-sizing: border-box;
                }

                /* Formal Header Styling */
                .document-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                    margin-bottom: 20px;
                    padding-bottom: 15px;
                    border-bottom: 4px solid #111;
                    position: relative;
                }
                
                .document-header::after {
                    content: '';
                    position: absolute;
                    bottom: 3px;
                    left: 0;
                    right: 0;
                    height: 1px;
                    background-color: #111;
                }

                .header-left { flex: 1; }
                .header-left h1 {
                    font-size: 24px;
                    font-weight: 900;
                    margin: 0;
                    letter-spacing: 0.5px;
                    color: #000;
                    text-transform: uppercase;
                }
                .header-left p {
                    font-size: 13px;
                    color: #444;
                    margin: 4px 0 0 0;
                    font-weight: bold;
                }

                .header-right {
                    text-align: right;
                    color: #555;
                    font-size: 13px;
                    font-family: monospace;
                }

                /* Section Titles */
                h2 { 
                    font-size: 14px; 
                    font-weight: bold; 
                    margin-top: 15px; 
                    margin-bottom: 10px; 
                    background-color: #eceff1;
                    padding: 6px 10px;
                    border-left: 4px solid #334155;
                    color: #0f172a; 
                }

                /* Tables for Layout */
                table { width: 100%; border-collapse: collapse; margin-top: 5px; font-size: 13px; }
                td { padding: 4px 0; vertical-align: top; }
                .field-label { width: 45%; color: #333; font-weight: 600; }
                .field-value { font-weight: bold; color: #000; border-bottom: 1px dotted #888; padding-left: 5px; }

                /* Data Tables */
                .border-table { margin-top: 10px; margin-bottom: 10px; border: 1px solid #aaa; }
                .border-table th, .border-table td { border: 1px solid #aaa; padding: 6px 8px; }
                .border-table th { background-color: #f8fafc; text-align: left; font-weight: bold; color: #333; font-size: 12px; }

                /* Text Boxes */
                .box { 
                    padding: 8px 10px; 
                    border: 1px solid #bbb; 
                    min-height: 25px; 
                    font-weight: bold; 
                    background: #fdfdfd; 
                    margin-top: 4px; 
                    border-radius: 2px; 
                }

                .two-col {
                    display: flex;
                    gap: 30px;
                }
                .col { flex: 1; }

                /* Signatures */
                .signature-block { margin-top: 30px; text-align: center; }
                .signature-line { border-top: 1px dotted #000; display: inline-block; width: 200px; padding-top: 5px; margin-top: 40px; }
                
                @media print {
                    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    body { background-color: #fff; padding: 0; margin: 0; }
                    .print-container { box-shadow: none; margin: 0; padding: 0; width: 100%; max-width: 100%; min-height: auto; }
                    .page-break { page-break-before: always; }
                    .no-break { page-break-inside: avoid; }
                }
            </style>
        </head>
        <body>
        <div class="print-container">
            <div class="document-header">
                <div class="header-left">
                    <h1>ව්‍යාපාර ණය පසු විපරම් අයදුම්පත</h1>
                    <p>Galapitiyagama Sanasa Cooperative Society</p>
                </div>
                <div class="header-right">
                    <div>DATE: ${data.date || new Date().toLocaleDateString('en-CA')}</div>
                    <div>A/C NO: ${data.accountNo || '-'}</div>
                </div>
            </div>

            <div class="two-col">
                <!-- Left Column -->
                <div class="col">
                    <h2>1. අයදුම්කරු / ණයග්‍රාහක තොරතුරු</h2>
                    <table>
                        <tr><td class="field-label">නම :</td><td class="field-value">${data.applicantName || '-'}</td></tr>
                        <tr><td class="field-label">ජාතික හැඳුනුම්පත් අංකය :</td><td class="field-value">${data.nic || '-'}</td></tr>
                        <tr><td class="field-label">ලිපිනය :</td><td class="field-value">${data.address || '-'}</td></tr>
                        <tr><td class="field-label">දුරකථන අංකය :</td><td class="field-value">${data.phone || '-'}</td></tr>
                        <tr><td class="field-label">ණය ගිවිසුම් අංකය :</td><td class="field-value">${data.loanAgreementNo || '-'}</td></tr>
                    </table>

                    <h2>2. ණය විස්තර</h2>
                    <table>
                        <tr><td class="field-label">ලබාදුන් ණය මුදල :</td><td class="field-value">Rs. ${data.givenAmt ? Number(data.givenAmt).toLocaleString() : '-'}</td></tr>
                        <tr><td class="field-label">වාරික (Installment) :</td><td class="field-value">Rs. ${data.installment ? Number(data.installment).toLocaleString() : '-'}</td></tr>
                        <tr><td class="field-label">ණය ගිවිසුම් කාලය :</td><td class="field-value">${data.loanPeriod || '-'}</td></tr>
                        <tr><td class="field-label">මුදල් නිකුත් කළ දිනය :</td><td class="field-value">${data.releaseDate || '-'}</td></tr>
                    </table>

                    <h2>3. ව්‍යාපාරයේ වත්මන් තත්ත්වය</h2>
                    <table class="border-table">
                        <thead>
                            <tr><th>විස්තර</th><th>පෙර අගය (Rs.)</th><th>වත්මන් අගය (Rs.)</th></tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><b>මාසික ආදායම</b></td>
                                <td>${data.incomeBefore ? Number(data.incomeBefore).toLocaleString() : '-'}</td>
                                <td style="color:#047857; font-weight:bold;">${data.incomeNow ? Number(data.incomeNow).toLocaleString() : '-'}</td>
                            </tr>
                            <tr>
                                <td><b>මාසික වියදම</b></td>
                                <td>${data.expenseBefore ? Number(data.expenseBefore).toLocaleString() : '-'}</td>
                                <td style="color:#b91c1c; font-weight:bold;">${data.expenseNow ? Number(data.expenseNow).toLocaleString() : '-'}</td>
                            </tr>
                            <tr style="background:#f1f5f9;">
                                <td><b>මාසික ලාභය</b></td>
                                <td>${data.profitBefore ? Number(data.profitBefore).toLocaleString() : '-'}</td>
                                <td style="color:#1d4ed8; font-weight:bold;">${data.profitNow ? Number(data.profitNow).toLocaleString() : '-'}</td>
                            </tr>
                        </tbody>
                    </table>

                    <h2>4. ව්‍යාපාර වර්ධනය</h2>
                    <table>
                        <tr><td class="field-label" style="width: 70%;">ගනුදෙනු ප්‍රමාණය වැඩිවීද? :</td><td class="field-value" style="text-align: right;">${data.bizGrowthTx || '-'}</td></tr>
                        <tr><td class="field-label">නව පාරිභෝගිකයන් එක්වීද? :</td><td class="field-value" style="text-align: right;">${data.bizGrowthCus || '-'}</td></tr>
                        <tr><td class="field-label">උපකරණ / සේවාවන් වැඩිදියුණු වීද? :</td><td class="field-value" style="text-align: right;">${data.bizGrowthEquip || '-'}</td></tr>
                    </table>
                    <div style="margin-top: 10px;">
                        <span style="display: block; margin-bottom: 5px; color: #444; font-size:12px; font-weight:bold;">ව්‍යාපාර ස්ථානයේ වෙනස්කම් :</span>
                        <div class="box">${(data.bizGrowthChanges || '').replace(/\n/g, '<br>')}</div>
                    </div>

                    <h2>5. ණය මුදල් භාවිතය</h2>
                    <table>
                        <tr><td class="field-label" style="width: 70%;">මුදල් නිවැරදි අයුරින් භාවිතා කළාද? :</td><td class="field-value" style="text-align: right;">${data.useCorrect || '-'}</td></tr>
                        <tr><td class="field-label">මුදල් භාවිතය තහවුරු කළ ලේඛන :</td><td class="field-value" style="text-align: right;">${data.useDocs || '-'}</td></tr>
                    </table>
                    <div style="margin-top: 10px;">
                        <span style="display: block; margin-bottom: 5px; color: #444; font-size:12px; font-weight:bold;">මුදල් භාවිතයේ සංක්ෂිප්ත විස්තර :</span>
                        <div class="box">${(data.useDesc || '').replace(/\n/g, '<br>')}</div>
                    </div>
                </div>

                <!-- Right Column -->
                <div class="col">
                    <h2>6. ගෙවීම් පාරිභෝගික හැසිරීම</h2>
                    <table>
                        <tr><td class="field-label" style="width: 70%;">වාරික ගෙවීම් නිසි පරිදි සිදුවේද? :</td><td class="field-value" style="text-align: right;">${data.repayRegular || '-'}</td></tr>
                        <tr><td class="field-label">වාරික ගැටලු තිබේද? :</td><td class="field-value" style="text-align: right;">${data.repayIssues || '-'}</td></tr>
                        <tr><td class="field-label">ණය ශේෂය :</td><td class="field-value" style="text-align: right; color:#b91c1c;">Rs. ${data.repayBalance ? Number(data.repayBalance).toLocaleString() : '-'}</td></tr>
                    </table>
                    <div style="margin-top: 10px;">
                        <span style="display: block; margin-bottom: 5px; color: #444; font-size:12px; font-weight:bold;">ගෙවීම් පසුවීමේ හේතු (තිබේ නම්) :</span>
                        <div class="box">${(data.repayDelayReason || '').replace(/\n/g, '<br>')}</div>
                    </div>

                    <h2>7. පසු විපරම් සටහන් (Monitoring)</h2>
                    <table>
                        <tr><td class="field-label">පරීක්ෂා කළ දිනය :</td><td class="field-value">${data.monDate || '-'}</td></tr>
                        <tr><td class="field-label">පරීක්ෂා කළ නිලධාරියා :</td><td class="field-value">${data.monOfficer || '-'}</td></tr>
                        <tr><td class="field-label">ව්‍යාපාරයේ සාර්ථකත්වය :</td><td class="field-value">${data.monSuccess || '-'}</td></tr>
                        <tr><td class="field-label">ව්‍යාපාරයේ අවදානමක් තිබේද? :</td><td class="field-value">${data.monRisk || '-'}</td></tr>
                    </table>
                    <div style="margin-top: 10px;">
                        <span style="display: block; margin-bottom: 5px; color: #444; font-size:12px; font-weight:bold;">නිලධාරී සටහන :</span>
                        <div class="box" style="min-height: 50px;">${(data.monNote || '').replace(/\n/g, '<br>')}</div>
                    </div>

                    <h2>8. ක්‍රියාමාර්ග / නිර්දේශ</h2>
                    <div style="margin-top: 10px; font-size: 13px; line-height: 1.8;">
                        <p style="margin:0;"><b>${data.recAdvise ? '[✓]' : '[ ]'}</b> ණය ගෙවීම් සම්බන්ධ උපදෙස්</p>
                        <p style="margin:0;"><b>${data.recFinAdvise ? '[✓]' : '[ ]'}</b> අමතර මූල්‍ය උපදෙස් අවශ්‍යයි</p>
                        <p style="margin:0;"><b>${data.recTraining ? '[✓]' : '[ ]'}</b> ව්‍යාපාර පුහුණු වැඩසටහන් යොමු කිරීම</p>
                        <p style="margin:0;"><b>${data.recNewLoan ? '[✓]' : '[ ]'}</b> නැවත අනුමත කළ ව්‍යාපාරවලට ව්‍යාප්ති ණය</p>
                        <p style="margin:0;"><b>${data.recWarning ? '[✓]' : '[ ]'}</b> අවදානම් තත්ත්වයක් (විශේෂ නිරීක්ෂණය අවශ්‍යයි)</p>
                        <p style="margin-top:10px;"><b>අනෙකුත් :</b> <span style="border-bottom: 1px dotted #888; padding: 0 10px;">${data.recOther || '-'}</span></p>
                    </div>

                    <h2 style="margin-top: 25px;">9. නිලධාරියාගේ තොරතුරු</h2>
                    <table>
                        <tr><td class="field-label">නම :</td><td class="field-value">${data.offName || '-'}</td></tr>
                        <tr><td class="field-label">තනතුර :</td><td class="field-value">${data.offDesignation || '-'}</td></tr>
                        <tr><td class="field-label">දිනය :</td><td class="field-value">${data.offDate || '-'}</td></tr>
                    </table>
                    
                    <div class="signature-block">
                        <div class="signature-line">පරීක්ෂා කළ නිලධාරියාගේ අත්සන</div>
                    </div>
                </div>
            </div>

        </div>
        <script>
            window.onload = function() { window.print(); window.onafterprint = function(){ window.close(); } };
        </script>
        </body>
        </html>
        `;

        const printWin = window.open('', '_blank');
        if (printWin) {
            printWin.document.write(html);
            printWin.document.close();
        } else {
            alert('Please allow popups for this site to print the form.');
        }
    }
});
