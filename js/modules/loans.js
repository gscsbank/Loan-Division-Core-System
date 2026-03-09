// js/modules/loans.js

document.addEventListener('DOMContentLoaded', () => {

    const formLoan = document.getElementById('form-loan-inspection');
    let currentPhotosBase64 = [null, null, null, null, null];

    const logIdInput = document.getElementById('loan-id');
    const tbodyFollowup = document.getElementById('loans-tbody');
    const emptyState = document.getElementById('loans-empty-state');

    const inputDate = document.getElementById('loan-date');
    if (inputDate) inputDate.valueAsDate = new Date();

    for (let i = 1; i <= 5; i++) {
        const inputPhoto = document.getElementById(`loan-photo-${i}`);
        const photoPreview = document.getElementById(`loan-photo-preview-${i}`);

        if (inputPhoto && photoPreview) {
            inputPhoto.addEventListener('change', function (e) {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = function (event) {
                    currentPhotosBase64[i - 1] = event.target.result;
                    photoPreview.src = event.target.result;
                    photoPreview.classList.remove('hidden');
                };
                reader.readAsDataURL(file);
            });
        }
    }

    if (formLoan) {
        formLoan.addEventListener('submit', handleFormSubmit);
    }

    document.addEventListener('moduleSwitched', (e) => {
        if (e.detail.target === 'loans') {
            loadLoanReports();
        }
    });

    loadLoanReports();

    async function handleFormSubmit(e) {
        e.preventDefault();

        const id = logIdInput.value;
        const date = document.getElementById('loan-date').value;
        const applicantName = document.getElementById('loan-applicant').value.trim();
        const nic = document.getElementById('loan-nic').value.trim();
        const dob = document.getElementById('loan-dob').value;
        const address = document.getElementById('loan-address').value.trim();
        const phone = document.getElementById('loan-phone').value.trim();
        const maritalStatus = document.getElementById('loan-marital').value;

        const occupation = document.getElementById('loan-occupation').value.trim();
        const servicePeriod = document.getElementById('loan-service-period').value.trim();
        const workplace = document.getElementById('loan-workplace').value.trim();
        const income = parseFloat(document.getElementById('loan-income').value) || 0;
        const otherIncome = parseFloat(document.getElementById('loan-other-income').value) || 0;

        const loanType = document.getElementById('loan-type').value.trim();
        const amount = parseFloat(document.getElementById('loan-amount').value) || 0;
        const duration = document.getElementById('loan-duration').value.trim();
        const purpose = document.getElementById('loan-purpose').value.trim();

        const existingLoanDetails = document.getElementById('loan-existing-details').value.trim();
        const existingLoanAmt = parseFloat(document.getElementById('loan-existing-amt').value) || 0;
        const existingLoanInst2 = document.getElementById('loan-existing-inst2').value.trim();
        const existingLoanAmt2 = parseFloat(document.getElementById('loan-existing-amt2').value) || 0;
        const liabilities = parseFloat(document.getElementById('loan-liabilities').value) || 0;

        const bizRegNo = document.getElementById('biz-reg-no').value.trim();
        const bizName = document.getElementById('biz-name').value.trim();
        const bizAddress = document.getElementById('biz-address').value.trim();
        const bizGrossIncome = parseFloat(document.getElementById('biz-gross-income').value) || 0;
        const bizNature = document.getElementById('biz-nature').value.trim();

        const discTxLevel = document.getElementById('disc-tx-level').value.trim();
        const discIncomeGen = document.getElementById('disc-income-gen').value.trim();
        const discSuccessPotential = document.getElementById('disc-success-potential').value.trim();
        const discOfficerNote = document.getElementById('disc-officer-note').value.trim();
        const discOfficerName = document.getElementById('disc-officer-name').value.trim();
        const discDesignation = document.getElementById('disc-designation').value.trim();

        const mgrDate = document.getElementById('mgr-date').value;
        const mgrRecommendation = document.getElementById('mgr-recommendation').value.trim();

        const mgrDecApprove = document.getElementById('mgr-dec-approve').checked;
        const mgrDecReject = document.getElementById('mgr-dec-reject').checked;
        const mgrDecReview = document.getElementById('mgr-dec-review').checked;

        const colLand = document.getElementById('col-land').checked;
        const colVehicle = document.getElementById('col-vehicle').checked;
        const colGuarantor = document.getElementById('col-guarantor').checked;
        const colOther = document.getElementById('col-other').value.trim();
        const assets = document.getElementById('loan-assets').value.trim();

        const g1Name = document.getElementById('g1-name').value.trim();
        const g1Nic = document.getElementById('g1-nic').value.trim();
        const g1Address = document.getElementById('g1-address').value.trim();
        const g1Phone = document.getElementById('g1-phone').value.trim();

        const g2Name = document.getElementById('g2-name').value.trim();
        const g2Nic = document.getElementById('g2-nic').value.trim();
        const g2Address = document.getElementById('g2-address').value.trim();
        const g2Phone = document.getElementById('g2-phone').value.trim();

        const commonData = {
            date, applicantName, nic, dob, address, phone, maritalStatus,
            occupation, servicePeriod, workplace, income, otherIncome,
            loanType, amount, duration, purpose, existingLoanDetails, existingLoanAmt, existingLoanInst2, existingLoanAmt2, liabilities,
            bizRegNo, bizName, bizAddress, bizGrossIncome, bizNature,
            discTxLevel, discIncomeGen, discSuccessPotential, discOfficerNote, discOfficerName, discDesignation,
            mgrDate, mgrRecommendation, mgrDecApprove, mgrDecReject, mgrDecReview,
            colLand, colVehicle, colGuarantor, colOther, assets,
            g1Name, g1Nic, g1Address, g1Phone,
            g2Name, g2Nic, g2Address, g2Phone,
        };

        try {
            let reportData;

            if (id) {
                const existingLog = await db.loanReports.get(parseInt(id));
                let mergedPhotos = [...currentPhotosBase64];

                // Fallback for legacy single-photo string format
                if (existingLog.photos && typeof existingLog.photos === 'string' && !mergedPhotos[0]) {
                    mergedPhotos[0] = existingLog.photos;
                } else if (existingLog.photos && Array.isArray(existingLog.photos)) {
                    for (let i = 0; i < 5; i++) {
                        if (!mergedPhotos[i]) mergedPhotos[i] = existingLog.photos[i];
                    }
                }

                reportData = {
                    ...commonData,
                    photos: mergedPhotos,
                    postVisits: existingLog.postVisits || []
                };
                await db.loanReports.update(parseInt(id), reportData);
            } else {
                reportData = {
                    ...commonData,
                    photos: [...currentPhotosBase64],
                    postVisits: []
                };
                await db.loanReports.add(reportData);
            }

            generatePDF(reportData);

            formLoan.reset();
            logIdInput.value = '';
            if (inputDate) inputDate.valueAsDate = new Date();
            for (let i = 1; i <= 5; i++) {
                const preview = document.getElementById(`loan-photo-preview-${i}`);
                if (preview) {
                    preview.src = '';
                    preview.classList.add('hidden');
                }
            }
            currentPhotosBase64 = [null, null, null, null, null];

            loadLoanReports();

            window.showAlert('Success', id ? 'Inspection updated and PDF regenerated!' : 'Inspection saved and PDF generated!', 'success');
        } catch (error) {
            console.error("Failed to save loan inspection:", error);
            window.showAlert('Error', 'Error saving record.', 'error');
        }
    }

    function generatePDF(data) {

        let printWindow = window.open('', '_blank');

        const template = `
            <!DOCTYPE html>
            <html lang="si">
            <head>
                <title>ණය පෙර විපරම් අයදුම්පත - ${data.applicantName}</title>
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
                        margin-bottom: 30px;
                        padding-bottom: 20px;
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

                    .header-left {
                        flex: 1;
                    }

                    .header-left h1 {
                        font-size: 28px;
                        font-weight: 900;
                        margin: 0;
                        letter-spacing: 0.5px;
                        color: #000;
                        text-transform: uppercase;
                    }
                    
                    .header-left p {
                        font-size: 15px;
                        color: #444;
                        margin: 6px 0 0 0;
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
                        font-size: 15px; 
                        font-weight: bold; 
                        margin-top: 25px; 
                        margin-bottom: 12px; 
                        background-color: #f4f4f5;
                        padding: 6px 10px;
                        border-left: 4px solid #333;
                        color: #111; 
                    }

                    /* Tables for Layout */
                    table { width: 100%; border-collapse: collapse; margin-top: 5px; font-size: 13px; }
                    td { padding: 4px 0; vertical-align: top; }
                    .field-label { width: 45%; color: #333; font-weight: 600; }
                    .field-value { font-weight: bold; color: #000; border-bottom: 1px dotted #888; padding-left: 5px; }

                    /* Data Tables */
                    .border-table { margin-top: 10px; margin-bottom: 10px; border: 1px solid #aaa; }
                    .border-table th, .border-table td { border: 1px solid #aaa; padding: 6px 8px; }
                    .border-table th { background-color: #f1f5f9; text-align: left; font-weight: bold; color: #333; font-size: 12px; }

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

                    /* Signatures */
                    .signature-block { margin-top: 40px; text-align: center; }
                    .signature-line { border-top: 1px dotted #000; display: inline-block; width: 220px; padding-top: 5px; margin-top: 50px; }
                    
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
                        <h1>ණය පෙර විපරම් අයදුම්පත</h1>
                        <p>Galapitiyagama Sanasa Cooperative Society</p>
                    </div>
                    <div class="header-right">
                        <div>REF NO: <script>document.write(Math.floor(100000 + Math.random() * 900000))</script></div>
                        <div>DATE: ${new Date().toLocaleDateString('en-CA')}</div>
                    </div>
                </div>

                <h2>1. අයදුම්කරුගේ පෞද්ගලික තොරතුරු (Applicant Info)</h2>
                <table>
                    <tr><td class="field-label">සම්පූර්ණ නම (Full Name) :</td><td class="field-value">${data.applicantName}</td></tr>
                    <tr><td class="field-label">ජාතික හැඳුනුම්පත් අංකය (NIC) :</td><td class="field-value">${data.nic}</td></tr>
                    <tr><td class="field-label">උපන් දිනය (DOB) :</td><td class="field-value">${data.dob}</td></tr>
                    <tr><td class="field-label">ලිපිනය (Address) :</td><td class="field-value">${data.address}</td></tr>
                    <tr><td class="field-label">දුරකථන අංකය (Phone) :</td><td class="field-value">${data.phone}</td></tr>
                    <tr><td class="field-label">විවාහක තත්ත්වය (Marital Status) :</td><td class="field-value">${data.maritalStatus}</td></tr>
                </table>

                <h2>2. වෘත්තීය හා ආදායම් තොරතුරු</h2>
                <table>
                    <tr><td class="field-label">වෘත්තිය / රැකියාව (Occupation) :</td><td class="field-value">${data.occupation}</td></tr>
                    <tr><td class="field-label">සේවා ස්ථානය / ව්‍යාපාර නාමය (Workplace) :</td><td class="field-value">${data.workplace}</td></tr>
                    <tr><td class="field-label">සේවා කාලය (Service Period) :</td><td class="field-value">${data.servicePeriod}</td></tr>
                    <tr><td class="field-label">මාසික ආදායම (Monthly Income) :</td><td class="field-value">Rs. ${data.income.toLocaleString()}</td></tr>
                    <tr><td class="field-label">වෙනත් ආදායම් (Other Income) :</td><td class="field-value">Rs. ${data.otherIncome.toLocaleString()}</td></tr>
                </table>

                <h2>3. ඉල්ලුම් කරන ණය පිළිබඳ තොරතුරු</h2>
                <table>
                    <tr><td class="field-label">ඉල්ලුම් කරන දිනය (Date) :</td><td class="field-value">${data.date}</td></tr>
                    <tr><td class="field-label">ණය වර්ගය (Loan Type) :</td><td class="field-value">${data.loanType}</td></tr>
                    <tr><td class="field-label">ඉල්ලුම් කරන මුදල (Amount) :</td><td class="field-value">Rs. ${data.amount.toLocaleString()}</td></tr>
                    <tr><td class="field-label">අපේක්ෂිත ගෙවීම් කාලය (Duration) :</td><td class="field-value">${data.duration}</td></tr>
                </table>
                <div style="margin-top: 15px;">
                    <span style="display: block; margin-bottom: 5px; color: #444;">ණය ලබාගැනීමේ අරමුණ (Purpose) :</span>
                    <div class="box">${(data.purpose || '').replace(/\n/g, '<br>')}</div>
                </div>

                <div class="page-break">
                    <h2>4. දැනට පවතින ණය තොරතුරු</h2>
                    <table class="border-table">
                        <thead>
                            <tr style="background-color: #f0f0f0;">
                                <th style="padding: 8px; text-align: left;">ආයතනය සහ වෙනත් විස්තර</th>
                                <th style="padding: 8px; text-align: right;">ණය මුදල (Rs.)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="padding: 8px;"><b>${data.existingLoanDetails || 'නැත'}</b></td>
                                <td style="padding: 8px; text-align: right;"><b>${data.existingLoanAmt ? 'Rs. ' + data.existingLoanAmt.toLocaleString() : '-'}</b></td>
                            </tr>
                            ${data.existingLoanInst2 ? `
                            <tr>
                                <td style="padding: 8px;"><b>${data.existingLoanInst2}</b></td>
                                <td style="padding: 8px; text-align: right;"><b>Rs. ${data.existingLoanAmt2.toLocaleString()}</b></td>
                            </tr>
                            ` : ''}
                            <tr style="background-color: #fafafa;">
                                <td style="padding: 8px; text-align: right;"><b>මුළු මාසික ණය වාරික අගය (Liabilities):</b></td>
                                <td style="padding: 8px; text-align: right; color: #b91c1c;"><b>Rs. ${data.liabilities.toLocaleString()}</b></td>
                            </tr>
                        </tbody>
                    </table>

                    <h2 class="no-break mt-6">5. ඇප / සුරක්ෂිතතා තොරතුරු</h2>
                    <div class="no-break" style="margin-top: 10px;">
                        <p style="margin-bottom: 15px; background: #f8fafc; padding: 10px; border: 1px solid #ccc;">ඇප වර්ගය : 
                            <b>${data.colLand ? '[✓] ඉඩම් ' : '[ ] ඉඩම් '}</b> &nbsp;&nbsp;&nbsp;&nbsp;
                            <b>${data.colVehicle ? '[✓] වාහන ' : '[ ] වාහන '}</b> &nbsp;&nbsp;&nbsp;&nbsp;
                            <b>${data.colGuarantor ? '[✓] ඇපකරු ' : '[ ] ඇපකරු '}</b> &nbsp;&nbsp;&nbsp;&nbsp;
                            <b>${data.colOther ? `[✓] වෙනත්: ${data.colOther}` : ''}</b>
                        </p>
                        <span style="display: block; margin-bottom: 5px; color: #444;">විස්තර (Assets Details) :</span>
                        <div class="box">${(data.assets || '').replace(/\n/g, '<br>')}</div>
                    </div>

                    <h2 class="no-break mt-6">6. ඇපකරුවන්ගේ තොරතුරු</h2>
                    <table class="no-break" style="margin-top: 10px;">
                        <tr>
                            <td style="width: 50%; padding-right: 20px;">
                                <h3 style="font-size: 15px; font-weight: bold; margin-bottom: 10px; text-decoration: underline; color: #333;">ඇපකරු 01</h3>
                                <table style="margin-top:0;">
                                    <tr><td class="field-label" style="width: 30%;">නම :</td><td class="field-value">${data.g1Name || '-'}</td></tr>
                                    <tr><td class="field-label">NIC :</td><td class="field-value">${data.g1Nic || '-'}</td></tr>
                                    <tr><td class="field-label">ලිපිනය :</td><td class="field-value">${data.g1Address || '-'}</td></tr>
                                    <tr><td class="field-label">දුරකථන :</td><td class="field-value">${data.g1Phone || '-'}</td></tr>
                                </table>
                            </td>
                            <td style="width: 50%; padding-left: 20px;">
                                <h3 style="font-size: 15px; font-weight: bold; margin-bottom: 10px; text-decoration: underline; color: #333;">ඇපකරු 02</h3>
                                <table style="margin-top:0;">
                                    <tr><td class="field-label" style="width: 30%;">නම :</td><td class="field-value">${data.g2Name || '-'}</td></tr>
                                    <tr><td class="field-label">NIC :</td><td class="field-value">${data.g2Nic || '-'}</td></tr>
                                    <tr><td class="field-label">ලිපිනය :</td><td class="field-value">${data.g2Address || '-'}</td></tr>
                                    <tr><td class="field-label">දුරකථන :</td><td class="field-value">${data.g2Phone || '-'}</td></tr>
                                </table>
                            </td>
                        </tr>
                    </table>

                    ${data.bizName || data.bizRegNo ? `
                    <h2 class="no-break mt-6">7. ව්‍යාපාර තොරතුරු (ව්‍යාපාරයක් පවතීනම්)</h2>
                    <table class="no-break">
                        <tr><td class="field-label">ලියාපදිංචි අංකය (Reg No) :</td><td class="field-value">${data.bizRegNo}</td></tr>
                        <tr><td class="field-label">ව්‍යාපාරයේ නම (Business Name) :</td><td class="field-value">${data.bizName}</td></tr>
                        <tr><td class="field-label">ලිපිනය (Address) :</td><td class="field-value">${data.bizAddress}</td></tr>
                        <tr><td class="field-label">මාසික දළ ආදායම (Gross Income) :</td><td class="field-value">Rs. ${data.bizGrossIncome ? data.bizGrossIncome.toLocaleString() : '0'}</td></tr>
                        <tr><td class="field-label">ව්‍යාපාරයේ ස්වභාවය (Nature) :</td><td class="field-value">${data.bizNature}</td></tr>
                    </table>
                    ` : ''}

                    <div class="page-break"></div>

                    <h2 class="no-break mt-6">8. සාකච්ඡා සටහන් (Discussion Notes)</h2>
                    <table class="no-break">
                        <tr><td class="field-label">පාරිභෝගික ගනුදෙනු මට්ටම :</td><td class="field-value">${data.discTxLevel || '&nbsp;'}</td></tr>
                        <tr><td class="field-label">ආදායම් සැබෑ බව :</td><td class="field-value">${data.discIncomeGen || '&nbsp;'}</td></tr>
                        <tr><td class="field-label">ව්‍යාපාරයේ සාර්ථකත්ව හැකියාව :</td><td class="field-value">${data.discSuccessPotential || '&nbsp;'}</td></tr>
                    </table>
                    <div class="no-break" style="margin-top: 15px;">
                        <span style="display: block; margin-bottom: 5px; color: #444;">නිලධාරී සටහන (Officer's Note) :</span>
                        <div class="box">${(data.discOfficerNote || '').replace(/\n/g, '<br>') || '<br><br>'}</div>
                    </div>
                    <table class="no-break" style="margin-top: 20px;">
                        <tr>
                            <td style="width: 50%;">නිලධාරියාගේ නම : <b>${data.discOfficerName || '&nbsp;'}</b></td>
                            <td>තනතුර : <b>${data.discDesignation || '&nbsp;'}</b></td>
                        </tr>
                        <tr>
                            <td colspan="2" class="signature-block">
                                <span class="signature-line">අත්සන (Signature)</span>
                            </td>
                        </tr>
                    </table>

                    <div class="no-break mt-6">
                        <h2>9. කළමනාකරුගේ නිර්දේශය (Manager's Recommendation)</h2>
                        <table>
                            <tr><td class="field-label" style="width: 20%;">දිනය (Date) : </td><td class="field-value">${data.mgrDate || '&nbsp;'}</td></tr>
                            <tr>
                                <td colspan="2" style="padding: 15px 0;">
                                    <span style="display: block; margin-bottom: 5px; color: #444;">නිර්දේශය (Recommendation) :</span>
                                    <div class="box" style="min-height: 80px;">${(data.mgrRecommendation || '').replace(/\n/g, '<br>') || '<br><br><br><br>'}</div>
                                </td>
                            </tr>
                            <tr>
                                <td colspan="2" style="padding: 15px 0; background: #f8fafc; border: 1px solid #ccc; text-align: center;">
                                    <b>${data.mgrDecApprove ? '[✓]' : '[ ]'}</b> අනුමතයි (Approved) &nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;&nbsp;
                                    <b>${data.mgrDecReject ? '[✓]' : '[ ]'}</b> ප්‍රතික්ෂේපිතයි (Rejected) &nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;&nbsp;
                                    <b>${data.mgrDecReview ? '[✓]' : '[ ]'}</b> වැඩි විමසිල්ලක් අවශ්‍යයි (Review)
                                </td>
                            </tr>
                            <tr>
                                <td colspan="2" class="signature-block">
                                    <span class="signature-line">අත්සන (Signature)</span>
                                </td>
                            </tr>
                        </table>
                    </div>

                </div>

                ${(() => {
                let photoArray = [];
                if (Array.isArray(data.photos)) photoArray = data.photos.filter(p => p !== null && p !== '');
                else if (typeof data.photos === 'string' && data.photos !== '') photoArray = [data.photos];

                if (photoArray.length > 0) {
                    let html = '';
                    for (let i = 0; i < photoArray.length; i += 3) {
                        let chunk = photoArray.slice(i, i + 3);
                        html += '<div class="page-break" style="text-align: center;">';
                        html += `<h2>ඡායාරූප (Attached Photos)${i === 0 ? '' : ' - පිටුව ' + (Math.floor(i / 3) + 1)}</h2>`;
                        html += '<div style="display: flex; flex-direction: column; gap: 15px; align-items: center; margin-top: 15px;">';
                        chunk.forEach(photo => {
                            html += `<img src="${photo}" style="max-width: 100%; max-height: 75mm; object-fit: contain; border: 1px solid #ccc; padding: 4px; border-radius: 4px;" />`;
                        });
                        html += '</div></div>';
                    }
                    return html;
                }
                return '';
            })()}
            </div>
            <script>
                window.onload = function() { window.print(); window.onafterprint = function(){ window.close(); } };
            </script>
            </body>
            </html>
        `;

        printWindow.document.write(template);
        printWindow.document.close();
    }

    async function loadLoanReports() {
        if (!tbodyFollowup) return;

        try {
            const reports = await db.loanReports.orderBy('date').reverse().toArray();

            tbodyFollowup.innerHTML = '';
            if (reports.length === 0) {
                emptyState.classList.remove('hidden');
                return;
            }

            emptyState.classList.add('hidden');

            reports.forEach(report => {
                const tr = document.createElement('tr');
                tr.className = 'hover:bg-slate-50/50 transition-colors cursor-pointer group';
                tr.onclick = (e) => {
                    // Prevent row click if clicking edit/delete buttons
                    if (!e.target.closest('.action-btn')) {
                        openFollowupModal(report.id);
                    }
                };

                const formattedDate = new Date(report.date).toLocaleDateString();
                const net = report.income - report.liabilities;
                const statusColor = net > 0 ? 'text-emerald-600' : 'text-red-600';
                const visitsCount = report.postVisits ? report.postVisits.length : 0;

                tr.innerHTML = `
                    <td class="px-5 py-3 border-b border-slate-100 text-slate-700">${formattedDate}</td>
                    <td class="px-5 py-3 border-b border-slate-100 font-medium text-slate-800">${report.applicantName}</td>
                    <td class="px-5 py-3 border-b border-slate-100 text-right font-medium ${statusColor}">Rs. ${net.toLocaleString()}</td>
                    <td class="px-5 py-3 border-b border-slate-100 text-center text-slate-600"><span class="bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full text-xs font-bold">${visitsCount} Visits</span></td>
                    <td class="px-5 py-3 border-b border-slate-100 text-center print-hide">
                        <div class="flex justify-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button class="action-btn text-primary hover:bg-blue-50 p-2 rounded transition-colors" onclick="event.stopPropagation(); window.regeneratePDF(${report.id});" title="Re-download PDF">
                                <i class="ph ph-download-simple text-lg"></i>
                            </button>
                            <button class="action-btn text-slate-400 hover:text-primary transition-colors p-2" onclick="event.stopPropagation(); window.editLoanInspection(${report.id})" title="Edit"><i class="ph ph-pencil-simple text-lg"></i></button>
                            <button class="action-btn text-slate-400 hover:text-red-500 transition-colors p-2" onclick="event.stopPropagation(); window.deleteLoanInspection(${report.id})" title="Delete"><i class="ph ph-trash text-lg"></i></button>
                        </div>
                    </td>
                `;
                tbodyFollowup.appendChild(tr);
            });

        } catch (error) {
            console.error("Failed to load loan reports:", error);
        }
    }

    window.editLoanInspection = async (id) => {
        try {
            const log = await db.loanReports.get(id);
            if (log) {
                logIdInput.value = log.id;
                document.getElementById('loan-date').value = log.date;
                document.getElementById('loan-applicant').value = log.applicantName;
                document.getElementById('loan-nic').value = log.nic || '';
                document.getElementById('loan-dob').value = log.dob || '';
                document.getElementById('loan-address').value = log.address || '';
                document.getElementById('loan-phone').value = log.phone || '';
                if (log.maritalStatus) document.getElementById('loan-marital').value = log.maritalStatus;

                document.getElementById('loan-occupation').value = log.occupation || '';
                document.getElementById('loan-service-period').value = log.servicePeriod || '';
                document.getElementById('loan-workplace').value = log.workplace || '';
                document.getElementById('loan-income').value = log.income;
                document.getElementById('loan-other-income').value = log.otherIncome || 0;

                document.getElementById('loan-type').value = log.loanType || '';
                document.getElementById('loan-amount').value = log.amount || '';
                document.getElementById('loan-duration').value = log.duration || '';
                document.getElementById('loan-purpose').value = log.purpose || '';

                document.getElementById('loan-existing-details').value = log.existingLoanDetails || '';
                document.getElementById('loan-existing-amt').value = log.existingLoanAmt || '';
                document.getElementById('loan-existing-inst2').value = log.existingLoanInst2 || '';
                document.getElementById('loan-existing-amt2').value = log.existingLoanAmt2 || '';
                document.getElementById('loan-liabilities').value = log.liabilities;

                document.getElementById('biz-reg-no').value = log.bizRegNo || '';
                document.getElementById('biz-name').value = log.bizName || '';
                document.getElementById('biz-address').value = log.bizAddress || '';
                document.getElementById('biz-gross-income').value = log.bizGrossIncome || '';
                document.getElementById('biz-nature').value = log.bizNature || '';

                document.getElementById('disc-tx-level').value = log.discTxLevel || '';
                document.getElementById('disc-income-gen').value = log.discIncomeGen || '';
                document.getElementById('disc-success-potential').value = log.discSuccessPotential || '';
                document.getElementById('disc-officer-note').value = log.discOfficerNote || '';
                document.getElementById('disc-officer-name').value = log.discOfficerName || '';
                document.getElementById('disc-designation').value = log.discDesignation || '';

                document.getElementById('mgr-date').value = log.mgrDate || '';
                document.getElementById('mgr-recommendation').value = log.mgrRecommendation || '';

                document.getElementById('mgr-dec-approve').checked = !!log.mgrDecApprove;
                document.getElementById('mgr-dec-reject').checked = !!log.mgrDecReject;
                document.getElementById('mgr-dec-review').checked = !!log.mgrDecReview;

                document.getElementById('col-land').checked = !!log.colLand;
                document.getElementById('col-vehicle').checked = !!log.colVehicle;
                document.getElementById('col-guarantor').checked = !!log.colGuarantor;
                document.getElementById('col-other').value = log.colOther || '';
                document.getElementById('loan-assets').value = log.assets;

                document.getElementById('g1-name').value = log.g1Name || '';
                document.getElementById('g1-nic').value = log.g1Nic || '';
                document.getElementById('g1-address').value = log.g1Address || '';
                document.getElementById('g1-phone').value = log.g1Phone || '';

                document.getElementById('g2-name').value = log.g2Name || '';
                document.getElementById('g2-nic').value = log.g2Nic || '';
                document.getElementById('g2-address').value = log.g2Address || '';
                document.getElementById('g2-phone').value = log.g2Phone || '';

                currentPhotosBase64 = [null, null, null, null, null];
                for (let i = 1; i <= 5; i++) {
                    const preview = document.getElementById(`loan-photo-preview-${i}`);
                    if (preview) {
                        preview.src = '';
                        preview.classList.add('hidden');
                    }
                }

                if (log.photos) {
                    if (Array.isArray(log.photos)) {
                        for (let i = 0; i < 5; i++) {
                            const preview = document.getElementById(`loan-photo-preview-${i + 1}`);
                            if (log.photos[i] && preview) {
                                preview.src = log.photos[i];
                                preview.classList.remove('hidden');
                                currentPhotosBase64[i] = log.photos[i];
                            }
                        }
                    } else if (typeof log.photos === 'string') {
                        // Legacy single photo wrapper
                        const preview = document.getElementById(`loan-photo-preview-1`);
                        if (preview) {
                            preview.src = log.photos;
                            preview.classList.remove('hidden');
                            currentPhotosBase64[0] = log.photos;
                        }
                    }
                }
                document.getElementById('loan-applicant').focus();
            }
        } catch (e) {
            console.error(e);
        }
    };

    window.deleteLoanInspection = async (id) => {
        const confirmed = await window.showConfirm(
            'Delete Report',
            'Are you sure you want to delete this loan inspection?',
            'Yes, delete'
        );
        if (confirmed) {
            try {
                await db.loanReports.delete(id);
                if (window.SyncManager && window.SyncManager.deleteFromCloud) {
                    await window.SyncManager.deleteFromCloud('loanReports', id);
                }
                window.showToast('Inspection deleted');
                loadLoanReports();
            } catch (e) {
                console.error(e);
            }
        }
    };

    // Expose regenerate PDF to global scope for the inline onclick handler
    window.regeneratePDF = async function (id) {
        try {
            const report = await db.loanReports.get(id);
            if (report) {
                generatePDF(report);
            }
        } catch (e) {
            console.error(e);
        }
    };

    // Follow Up Modal Logic
    const followupModal = document.getElementById('modal-post-loan');
    const followupCloseBtns = document.querySelectorAll('.post-loan-close');
    const followupForm = document.getElementById('form-post-loan');
    const followupContainer = document.getElementById('post-visits-list');

    let activeReportId = null;

    if (followupCloseBtns) {
        followupCloseBtns.forEach(btn => btn.addEventListener('click', closeFollowupModal));
    }

    if (followupForm) {
        followupForm.addEventListener('submit', handleFollowupSubmit);
    }

    async function openFollowupModal(id) {
        activeReportId = id;
        try {
            const report = await db.loanReports.get(id);
            document.getElementById('post-loan-applicant-title').innerText = `Applicant: ${report.applicantName}`;

            // Render past visits
            renderPostVisits(report.postVisits || []);

            followupModal.classList.remove('hidden');
            followupModal.classList.add('flex');
            document.getElementById('followup-date').valueAsDate = new Date();
        } catch (e) {
            console.error(e);
        }
    }

    function closeFollowupModal() {
        followupModal.classList.add('hidden');
        followupModal.classList.remove('flex');
        followupForm.reset();
        activeReportId = null;
    }

    function renderPostVisits(visits) {
        followupContainer.innerHTML = '';
        if (visits.length === 0) {
            followupContainer.innerHTML = '<p class="text-xs text-slate-400 italic">No post-visits recorded yet.</p>';
            return;
        }

        visits.forEach(v => {
            const div = document.createElement('div');
            div.className = 'bg-slate-50 p-3 rounded border border-slate-100 mb-2';
            div.innerHTML = `
                <div class="flex justify-between items-center mb-1">
                    <span class="text-xs font-bold text-slate-700"><i class="ph ph-calendar-blank mr-1"></i>${v.date}</span>
                    <span class="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">${v.status}</span>
                </div>
                <p class="text-xs text-slate-600">${v.note}</p>
            `;
            followupContainer.appendChild(div);
        });
    }

    async function handleFollowupSubmit(e) {
        e.preventDefault();
        if (!activeReportId) return;

        const date = document.getElementById('followup-date').value;
        const status = document.getElementById('followup-status').value;
        const note = document.getElementById('followup-note').value.trim();

        try {
            const report = await db.loanReports.get(activeReportId);
            if (!report.postVisits) report.postVisits = [];

            report.postVisits.push({ date, status, note });

            await db.loanReports.put(report);

            // Refresh modal view
            renderPostVisits(report.postVisits);
            followupForm.reset();
            document.getElementById('followup-date').valueAsDate = new Date();

            // Refresh background table to update count
            loadLoanReports();

        } catch (error) {
            console.error("Failed to save follow-up", error);
        }
    }
});
