// js/modules/schools.js

document.addEventListener('DOMContentLoaded', () => {

    const formStudent = document.getElementById('form-school-student');
    const tbodyStudents = document.getElementById('schools-tbody');
    const emptyStateStudents = document.getElementById('schools-empty-state');
    const filterSchool = document.getElementById('filter-school-name');
    const filterSearch = document.getElementById('filter-student-search');
    const studentIdInput = document.getElementById('student-id');

    const msgSchoolSelector = document.getElementById('msg-school-selector');
    const msgGradeSelector = document.getElementById('msg-grade-selector');
    const msgText = document.getElementById('msg-text');
    const btnSendMsg = document.getElementById('btn-send-whatsapp');

    document.addEventListener('moduleSwitched', (e) => {
        if (e.detail.target === 'schools') {
            loadStudentSelects();
            loadStudents();
        }
    });

    if (formStudent) {
        formStudent.addEventListener('submit', handleAddStudent);
    }

    if (filterSchool) {
        filterSchool.addEventListener('change', loadStudents);
    }

    if (filterSearch) {
        filterSearch.addEventListener('input', loadStudents);
    }

    if (btnSendMsg) {
        btnSendMsg.addEventListener('click', handleSendMessages);
    }

    async function handleAddStudent(e) {
        e.preventDefault();

        const id = studentIdInput.value;
        const schoolName = document.getElementById('student-school').value.trim();
        const studentName = document.getElementById('student-name').value.trim();
        const accountNo = document.getElementById('student-account').value.trim();
        const contactNumber = document.getElementById('student-contact').value.trim();
        const grade = document.getElementById('student-grade').value.trim();

        let cleanedPhone = contactNumber.replace(/\D/g, "");
        if (cleanedPhone.startsWith("0")) {
            cleanedPhone = "94" + cleanedPhone.substring(1);
        } else if (!cleanedPhone.startsWith("94") && cleanedPhone.length === 9) {
            cleanedPhone = "94" + cleanedPhone;
        }

        try {
            const data = {
                schoolName,
                studentName,
                accountNo,
                contactNumber: cleanedPhone,
                grade
            };

            if (id) {
                await db.schoolSavings.update(parseInt(id), data);
            } else {
                await db.schoolSavings.add(data);
            }

            formStudent.reset();
            studentIdInput.value = '';
            loadStudentSelects();
            loadStudents();

            loadStudents();

            window.showToast(id ? 'Student updated successfully' : 'Student added successfully');
        } catch (error) {
            console.error("Failed to save student:", error);
            window.showAlert('Error', 'Error saving student.', 'error');
        }
    }

    async function loadStudents() {
        if (!tbodyStudents) return;

        try {
            const allStudents = await db.schoolSavings.toArray();
            const filterSchooolVal = filterSchool.value;
            const searchVal = filterSearch ? filterSearch.value.toLowerCase().trim() : '';

            const filtered = allStudents.filter(s => {
                const matchSchool = !filterSchooolVal || s.schoolName === filterSchooolVal;
                const matchSearch = !searchVal ||
                    s.studentName.toLowerCase().includes(searchVal) ||
                    s.accountNo.toLowerCase().includes(searchVal) ||
                    s.schoolName.toLowerCase().includes(searchVal);
                return matchSchool && matchSearch;
            });

            tbodyStudents.innerHTML = '';

            if (filtered.length === 0) {
                emptyStateStudents.classList.remove('hidden');
                return;
            }

            emptyStateStudents.classList.add('hidden');

            filtered.forEach(student => {
                const tr = document.createElement('tr');
                tr.className = 'hover:bg-slate-50/50 transition-colors group';

                tr.innerHTML = `
                    <td class="px-5 py-3 border-b border-slate-100 font-medium text-slate-800">${student.studentName}</td>
                    <td class="px-5 py-3 border-b border-slate-100 text-slate-600">${student.schoolName}</td>
                    <td class="px-5 py-3 border-b border-slate-100 text-center"><span class="bg-indigo-50 text-indigo-700 font-bold px-2 rounded">Gr ${student.grade}</span></td>
                    <td class="px-5 py-3 border-b border-slate-100 font-mono text-slate-600">${student.accountNo}</td>
                    <td class="px-5 py-3 border-b border-slate-100 text-slate-600">
                        <div class="flex items-center space-x-2">
                            <span>+${student.contactNumber}</span>
                            <div class="flex space-x-1">
                                <a href="https://wa.me/${student.contactNumber}" target="_blank" class="text-green-500 hover:text-green-600 transition-colors" title="WhatsApp"><i class="ph-bold ph-whatsapp-logo"></i></a>
                                <a href="sms:+${student.contactNumber}" class="text-blue-500 hover:text-blue-600 transition-colors" title="SMS"><i class="ph-bold ph-chat-centered-text"></i></a>
                            </div>
                        </div>
                    </td>
                    <td class="px-5 py-3 border-b border-slate-100 text-center print-hide">
                        <div class="flex justify-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button class="text-slate-400 hover:text-primary transition-colors p-1" onclick="window.editStudent(${student.id})" title="Edit"><i class="ph ph-pencil-simple text-lg"></i></button>
                            <button class="text-slate-400 hover:text-red-500 transition-colors p-1" onclick="window.deleteStudent(${student.id})" title="Delete"><i class="ph ph-trash text-lg"></i></button>
                        </div>
                    </td>
                `;
                tbodyStudents.appendChild(tr);
            });
        } catch (e) {
            console.error(e);
        }
    }

    async function loadStudentSelects() {
        try {
            const allStudents = await db.schoolSavings.toArray();
            const schools = [...new Set(allStudents.map(s => s.schoolName))].sort();

            if (filterSchool) {
                const currentFilter = filterSchool.value;
                filterSchool.innerHTML = '<option value="">All Schools</option>';
                schools.forEach(s => {
                    const opt = document.createElement('option');
                    opt.value = s;
                    opt.innerText = s;
                    filterSchool.appendChild(opt);
                });
                filterSchool.value = currentFilter;
            }

            if (msgSchoolSelector) {
                const currentMsgSchool = msgSchoolSelector.value;
                msgSchoolSelector.innerHTML = '<option value="All">All Schools</option>';
                schools.forEach(s => {
                    const opt = document.createElement('option');
                    opt.value = s;
                    opt.innerText = s;
                    msgSchoolSelector.appendChild(opt);
                });
                msgSchoolSelector.value = currentMsgSchool;
            }
        } catch (e) {
            console.error(e);
        }
    }

    window.editStudent = async function (id) {
        try {
            const student = await db.schoolSavings.get(id);
            if (student) {
                studentIdInput.value = student.id;
                document.getElementById('student-school').value = student.schoolName;
                document.getElementById('student-name').value = student.studentName;
                document.getElementById('student-account').value = student.accountNo;
                document.getElementById('student-contact').value = student.contactNumber;
                document.getElementById('student-grade').value = student.grade;
                document.getElementById('student-school').focus();
            }
        } catch (e) {
            console.error(e);
        }
    };

    window.deleteStudent = async function (id) {
        const confirmed = await window.showConfirm(
            'Remove Student',
            'Are you sure you want to remove this student profile?',
            'Yes, remove'
        );
        if (confirmed) {
            try {
                await db.schoolSavings.delete(id);
                if (window.SyncManager && window.SyncManager.deleteFromCloud) {
                    await window.SyncManager.deleteFromCloud('schoolSavings', id);
                }
                loadStudentSelects();
                loadStudents();
                window.showToast('Profile removed');
            } catch (e) {
                console.error(e);
            }
        }
    };

    // Bulk Messaging Logic
    // WhatsApp web/app natively handles one click -> one chat. 
    // "Bulk" via standard free WA link opens chats one by one, or using a comma separated list on Android.
    // For standard WA API via web, we can loop to open links, but browsers block popups.
    // The closest standard approach is opening a generic wa.me link for the first person, or just generating a list of links.
    // Here we will generate a comma-separated list of numbers for copy-paste to a broadcast list, OR auto-open the first one.
    // A robust "Next-Level" way without real backend: Generates quick links to click for sequential sending.

    async function handleSendMessages() {
        const message = msgText.value.trim();
        if (!message) {
            window.showAlert('Validation', 'Please enter a message to send.', 'warning');
            return;
        }

        const school = msgSchoolSelector.value;
        const grade = msgGradeSelector.value;

        try {
            const allStudents = await db.schoolSavings.toArray();
            const targets = allStudents.filter(s => {
                const matchSchool = (school === "All" || s.schoolName === school);
                const matchGrade = (grade === "All" || s.grade === grade);
                return matchSchool && matchGrade;
            });

            if (targets.length === 0) {
                window.showAlert('No Targets', 'No students match the selected criteria.', 'info');
                return;
            }

            // We generate an interface displaying the targets with individual "Send" buttons.
            // Opening 50 tabs automatically is blocked by browsers.

            const encodedMsg = encodeURIComponent(message);
            const method = document.querySelector('input[name="msg-method"]:checked').value;
            const isSMS = method === 'sms';

            // Extract all numbers for bulk feature
            const allNumbers = targets.map(t => t.contactNumber).join(', ');

            // Build interface for targets
            let html = `
                <div class="mt-4 border-t border-slate-200 pt-4 animate__animated animate__fadeIn">
                    <div class="flex justify-between items-center mb-3">
                        <h5 class="text-sm font-bold text-slate-800">Recipients Ready (${targets.length})</h5>
                        <button onclick="window.copyAllNumbers('${allNumbers}')" class="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded font-bold transition-colors">
                            <i class="ph ph-copy mr-1"></i> Copy All Numbers
                        </button>
                    </div>
                    <p class="text-[10px] text-slate-500 mb-4">Click to send to each parent via ${isSMS ? 'SMS' : 'WhatsApp'}:</p>
                    <div class="max-h-60 overflow-y-auto custom-scrollbar space-y-2 pr-1">
            `;

            targets.forEach(t => {
                const link = isSMS ? `sms:+${t.contactNumber}?body=${encodedMsg}` : `https://wa.me/${t.contactNumber}?text=${encodedMsg}`;
                const btnClass = isSMS ? 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/20' : 'bg-green-500 hover:bg-green-600 shadow-green-500/20';
                const icon = isSMS ? 'ph-chat-centered-text' : 'ph-whatsapp-logo';

                html += `
                    <div class="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors">
                        <div class="flex flex-col">
                            <span class="text-xs font-bold text-slate-700 leading-tight">${t.studentName}</span>
                            <span class="text-[10px] text-slate-500">Gr ${t.grade} • +${t.contactNumber}</span>
                        </div>
                        <a href="${link}" target="_blank" class="${btnClass} text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md flex items-center">
                            <i class="ph-bold ${icon} mr-1"></i> Send
                        </a>
                    </div>
                `;
            });

            html += `</div></div>`;

            // Append it to the form area
            let container = document.getElementById('msg-results-container');
            if (!container) {
                container = document.createElement('div');
                container.id = 'msg-results-container';
                btnSendMsg.parentNode.appendChild(container);
            }
            container.innerHTML = html;

        } catch (e) {
            console.error(e);
        }
    }

    window.copyAllNumbers = function (numbers) {
        navigator.clipboard.writeText(numbers).then(() => {
            window.showToast('All numbers copied to clipboard');
        }).catch(err => {
            console.error('Failed to copy: ', err);
            window.showAlert('Copy Error', 'Could not copy numbers automatically.', 'error');
        });
    };
});
