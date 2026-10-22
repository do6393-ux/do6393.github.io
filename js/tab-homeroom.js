import { db, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from './firebase-config.js';

let students = [];

export function initHomeroomTab(currentUser) {
    if (!currentUser) return;

    onSnapshot(query(collection(db, "homeroom_contacts"), orderBy("number", "asc")), (snapshot) => {
        students = [];
        snapshot.forEach(d => students.push({ id: d.id, ...d.data() }));
        renderContacts();
    });

    document.getElementById('openBulkPasteModalBtn')?.addEventListener('click', () => {
        document.getElementById('bulkPasteTextarea').value = '';
        document.getElementById('bulkPasteModal').classList.remove('hidden');
    });

    document.getElementById('closeBulkPasteModalBtn')?.addEventListener('click', () => {
        document.getElementById('bulkPasteModal').classList.add('hidden');
    });

    document.getElementById('cancelBulkPasteBtn')?.addEventListener('click', () => {
        document.getElementById('bulkPasteModal').classList.add('hidden');
    });

    // 🎯 다중 일괄 등록 파싱 알고리즘 완벽 교체
    document.getElementById('saveBulkPasteBtn')?.addEventListener('click', async () => {
        const rawText = document.getElementById('bulkPasteTextarea').value;
        if (!rawText.trim()) return alert("입력된 데이터가 없습니다.");

        let parsedStudents = [];

        // 1. 엑셀에서 복사하여 탭(Tab)이 존재하는 경우
        if (rawText.includes('\t')) {
            const lines = rawText.split('\n');
            for (let line of lines) {
                const rowData = line.trim().split(/\t+/);
                if (rowData.length < 2) continue;

                const num = Number(rowData[0]);
                const name = String(rowData[1] || "").trim();
                if (isNaN(num) || !name) continue;

                let sPhone = String(rowData[3] || "").trim();
                let pPhone1 = String(rowData[4] || "").trim();
                let pPhone2 = String(rowData[5] || "").trim();
                
                parsedStudents.push({ number: num, name, phones: [sPhone, pPhone1, pPhone2].filter(Boolean) });
            }
        } 
        // 2. 웹 브라우저 표 복사로 줄바꿈(Enter)만 존재하는 경우 (수직 파싱)
        else {
            const lines = rawText.split('\n').map(l => l.trim()).filter(l => l !== '');
            let current = null;

            for (let line of lines) {
                // 1~100 사이의 숫자이고 '010'처럼 0으로 시작하지 않으면 학생 번호로 인식
                if (!isNaN(line) && Number(line) > 0 && Number(line) <= 100 && !line.startsWith('0')) {
                    if (current) parsedStudents.push(current);
                    current = { number: Number(line), name: '', phones: [] };
                } else if (current) {
                    if (!current.name) {
                        current.name = line; 
                    } else {
                        current.phones.push(line); 
                    }
                }
            }
            if (current) parsedStudents.push(current);
        }

        if (parsedStudents.length === 0) return alert("파싱할 수 있는 데이터가 없습니다. 양식을 확인해주세요.");

        let importCount = 0;
        for (let st of parsedStudents) {
            let finalParentPhone = st.phones[1] || "";
            if (st.phones[2] && st.phones[2] !== "없다") {
                finalParentPhone = st.phones[1] ? `${st.phones[1]} / (학부모2) ${st.phones[2]}` : st.phones[2];
            }

            const payload = {
                number: st.number,
                name: st.name,
                studentPhone: st.phones[0] || "",
                parentPhone: finalParentPhone
            };

            const existing = students.find(s => s.number === st.number);
            try {
                if (existing) await updateDoc(doc(db, "homeroom_contacts", existing.id), payload);
                else await addDoc(collection(db, "homeroom_contacts"), payload);
                importCount++;
            } catch (err) { console.error("저장 실패", err); }
        }

        alert(`✅ 일괄 등록이 완료되었습니다!\n(성공: 총 ${importCount}명 반영됨)`);
        document.getElementById('bulkPasteModal').classList.add('hidden');
    });

    document.getElementById('openNewContactModalBtn')?.addEventListener('click', () => {
        document.getElementById('editContactId').value = '';
        document.getElementById('contactNumInput').value = '';
        document.getElementById('contactNameInput').value = '';
        document.getElementById('contactStudentPhone').value = '';
        document.getElementById('contactParentPhone').value = '';
        
        document.getElementById('contactModalNumber').textContent = "신규";
        document.getElementById('contactModalName').textContent = "학생 추가";
        document.getElementById('contactViewMode').classList.add('hidden');
        document.getElementById('contactEditMode').classList.remove('hidden');
        document.getElementById('contactModal').classList.remove('hidden');
    });

    document.getElementById('closeContactModalBtn')?.addEventListener('click', () => {
        document.getElementById('contactModal').classList.add('hidden');
    });

    document.getElementById('cancelContactEditBtn')?.addEventListener('click', () => {
        const id = document.getElementById('editContactId').value;
        if (id) {
            document.getElementById('contactEditMode').classList.add('hidden');
            document.getElementById('contactViewMode').classList.remove('hidden');
        } else {
            document.getElementById('contactModal').classList.add('hidden');
        }
    });

    document.getElementById('editContactModeBtn')?.addEventListener('click', () => {
        document.getElementById('contactViewMode').classList.add('hidden');
        document.getElementById('contactEditMode').classList.remove('hidden');
    });

    document.getElementById('deleteContactBtn')?.addEventListener('click', async () => {
        const id = document.getElementById('editContactId').value;
        if (id && confirm("이 학생 연락처를 완전히 삭제할까요?")) {
            await deleteDoc(doc(db, "homeroom_contacts", id));
            document.getElementById('contactModal').classList.add('hidden');
        }
    });

    document.getElementById('saveContactBtn')?.addEventListener('click', async () => {
        const num = Number(document.getElementById('contactNumInput').value);
        const name = document.getElementById('contactNameInput').value.trim();
        const sPhone = document.getElementById('contactStudentPhone').value.trim();
        const pPhone = document.getElementById('contactParentPhone').value.trim();
        
        if (!num || !name) return alert("번호와 이름을 모두 입력해주세요.");
        
        const payload = { number: num, name: name, studentPhone: sPhone, parentPhone: pPhone };
        const editId = document.getElementById('editContactId').value;
        
        try {
            if (editId) await updateDoc(doc(db, "homeroom_contacts", editId), payload);
            else await addDoc(collection(db, "homeroom_contacts"), payload);
            document.getElementById('contactModal').classList.add('hidden');
        } catch (e) { alert("저장 실패"); }
    });
}

function renderContacts() {
    const container = document.getElementById('contactGridContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (students.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center py-10 text-slate-400 font-bold">등록된 학생이 없습니다. 상단의 '여러 명 붙여넣기'나 '직접 추가'를 눌러주세요.</div>`;
        return;
    }

    students.forEach(st => {
        const card = document.createElement('div');
        card.className = "bg-white p-4 rounded-2xl shadow-sm border border-rose-100 hover:border-rose-300 hover:shadow-md cursor-pointer flex flex-col items-center text-center transition-all";
        card.innerHTML = `
            <div class="w-12 h-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center text-xl font-bold mb-3 border border-rose-100">${st.number}</div>
            <h4 class="font-bold text-slate-800 text-lg">${st.name}</h4>
        `;
        
        card.onclick = () => openContactModal(st);
        container.appendChild(card);
    });
}

function openContactModal(st) {
    document.getElementById('contactModalNumber').textContent = String(st.number).padStart(2, '0');
    document.getElementById('contactModalName').textContent = st.name;
    
    document.getElementById('editContactId').value = st.id;
    document.getElementById('contactNumInput').value = st.number;
    document.getElementById('contactNameInput').value = st.name;
    document.getElementById('contactStudentPhone').value = st.studentPhone || '';
    document.getElementById('contactParentPhone').value = st.parentPhone || '';

    const btnS = document.getElementById('callStudentBtn');
    const txtS = document.getElementById('callStudentText');
    if (st.studentPhone) {
        btnS.href = `tel:${st.studentPhone}`;
        btnS.className = "flex items-center justify-center gap-2 w-full bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold py-3.5 rounded-2xl transition-colors text-sm border border-sky-200 shadow-sm";
        txtS.textContent = `학생 본인 연결 (${st.studentPhone})`;
    } else {
        btnS.removeAttribute('href');
        btnS.className = "flex items-center justify-center gap-2 w-full bg-slate-50 text-slate-400 font-bold py-3.5 rounded-2xl cursor-not-allowed text-sm border border-slate-200";
        txtS.textContent = "학생 연락처 없음";
    }

    const btnP = document.getElementById('callParentBtn');
    const txtP = document.getElementById('callParentText');
    if (st.parentPhone) {
        const firstPhone = st.parentPhone.split('/')[0].replace('학부모1:', '').trim();
        btnP.href = `tel:${firstPhone}`;
        btnP.className = "flex items-center justify-center gap-2 w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold py-3.5 rounded-2xl transition-colors text-sm border border-emerald-200 shadow-sm";
        txtP.textContent = `학부모 연결 (${st.parentPhone})`;
    } else {
        btnP.removeAttribute('href');
        btnP.className = "flex items-center justify-center gap-2 w-full bg-slate-50 text-slate-400 font-bold py-3.5 rounded-2xl cursor-not-allowed text-sm border border-slate-200";
        txtP.textContent = "학부모 연락처 없음";
    }

    document.getElementById('contactEditMode').classList.add('hidden');
    document.getElementById('contactViewMode').classList.remove('hidden');
    document.getElementById('contactModal').classList.remove('hidden');
}
