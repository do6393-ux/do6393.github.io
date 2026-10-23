import { db, auth, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from './firebase-config.js';

let students = [];

document.addEventListener('DOMContentLoaded', () => {

    document.getElementById('deleteAllContactsBtn')?.addEventListener('click', async () => {
        if (!auth.currentUser) return alert("교사 로그인이 필요합니다.");
        if (students.length === 0) return alert("삭제할 연락처가 없습니다.");
        
        const count = students.length;
        const answer = prompt(`⚠️ 경고: 등록된 ${count}명의 연락처를 모두 삭제하시겠습니까?\n진행하시려면 아래 입력창에 '삭제합니다' 라고 입력해주세요.`);
        
        if (answer === '삭제합니다') {
            try {
                await Promise.all(students.map(st => deleteDoc(doc(db, "homeroom_contacts", st.id))));
                alert("✅ 전체 삭제가 안전하게 완료되었습니다.");
            } catch (e) {
                alert("삭제 처리 중 오류가 발생했습니다.");
            }
        } else if (answer !== null) {
            alert("입력한 문구가 일치하지 않아 전체 삭제가 취소되었습니다.");
        }
    });

    document.getElementById('openBulkPasteModalBtn')?.addEventListener('click', () => {
        document.getElementById('bulkPasteTextarea').value = '';
        document.getElementById('bulkPasteModal').classList.remove('hidden');
    });
    document.getElementById('closeBulkPasteModalBtn')?.addEventListener('click', () => document.getElementById('bulkPasteModal').classList.add('hidden'));
    document.getElementById('cancelBulkPasteBtn')?.addEventListener('click', () => document.getElementById('bulkPasteModal').classList.add('hidden'));

    document.getElementById('saveBulkPasteBtn')?.addEventListener('click', async () => {
        if (!auth.currentUser) return alert("교사 로그인이 필요합니다.");
        const rawText = document.getElementById('bulkPasteTextarea').value;
        if (!rawText.trim()) return alert("입력된 데이터가 없습니다.");

        let parsedStudents = [];

        if (!rawText.includes('\t')) {
            const lines = rawText.split('\n').map(l => l.trim()).filter(l => l !== '');
            let current = null;

            for (let line of lines) {
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
        } else {
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

        if (parsedStudents.length === 0) return alert("파싱할 수 있는 데이터가 없습니다. 양식을 확인해주세요.");

        let importCount = 0;
        for (let st of parsedStudents) {
            const payload = {
                number: st.number,
                name: st.name,
                studentPhone: st.phones[0] || "",
                parentPhone1: st.phones[1] || "",
                parentPhone2: st.phones[2] || ""
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
        document.getElementById('contactParent2Phone').value = '';
        
        document.getElementById('contactModalNumber').textContent = "신규";
        document.getElementById('contactModalName').textContent = "학생 추가";
        document.getElementById('contactViewMode').classList.add('hidden');
        document.getElementById('contactEditMode').classList.remove('hidden');
        document.getElementById('contactModal').classList.remove('hidden');
    });

    document.getElementById('closeContactModalBtn')?.addEventListener('click', () => document.getElementById('contactModal').classList.add('hidden'));
    
    document.getElementById('cancelContactEditBtn')?.addEventListener('click', () => {
        if (document.getElementById('editContactId').value) {
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
        if (id && confirm("이 학생 연락처를 개별 삭제할까요?")) {
            await deleteDoc(doc(db, "homeroom_contacts", id));
            document.getElementById('contactModal').classList.add('hidden');
        }
    });

    document.getElementById('saveContactBtn')?.addEventListener('click', async () => {
        if (!auth.currentUser) return alert("교사 로그인이 필요합니다.");
        const num = Number(document.getElementById('contactNumInput').value);
        const name = document.getElementById('contactNameInput').value.trim();
        const sPhone = document.getElementById('contactStudentPhone').value.trim();
        const pPhone1 = document.getElementById('contactParentPhone').value.trim();
        const pPhone2 = document.getElementById('contactParent2Phone').value.trim();
        
        if (!num || !name) return alert("번호와 이름을 모두 입력해주세요.");
        
        const payload = { number: num, name: name, studentPhone: sPhone, parentPhone1: pPhone1, parentPhone2: pPhone2 };
        const editId = document.getElementById('editContactId').value;
        
        try {
            if (editId) await updateDoc(doc(db, "homeroom_contacts", editId), payload);
            else await addDoc(collection(db, "homeroom_contacts"), payload);
            document.getElementById('contactModal').classList.add('hidden');
        } catch (e) { alert("저장 실패"); }
    });
});

export function initHomeroomTab(currentUser) {
    if (!currentUser) return;

    onSnapshot(query(collection(db, "homeroom_contacts"), orderBy("number", "asc")), (snapshot) => {
        students = [];
        snapshot.forEach(d => students.push({ id: d.id, ...d.data() }));
        renderContacts();
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
        // 🎯 모바일 4열에 맞춰 카드의 상하좌우 패딩과 아이콘 크기를 아담하게 줄임
        card.className = "bg-white py-3 px-1 rounded-xl shadow-sm border border-rose-100 hover:border-rose-300 hover:shadow-md cursor-pointer flex flex-col items-center text-center transition-all";
        card.innerHTML = `
            <div class="w-9 h-9 sm:w-10 sm:h-10 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center text-sm sm:text-base font-bold mb-1.5 border border-rose-100 shadow-sm">${st.number}</div>
            <h4 class="font-bold text-slate-800 text-[11px] sm:text-xs w-full truncate px-1" title="${st.name}">${st.name}</h4>
        `;
        
        card.onclick = () => openContactModal(st);
        container.appendChild(card);
    });
}

function openContactModal(st) {
    document.getElementById('contactModalNumber').textContent = String(st.number).padStart(2, '0');
    document.getElementById('contactModalName').textContent = st.name;
    
    const p1 = st.parentPhone1 || ''; 
    const p2 = st.parentPhone2 || '';

    document.getElementById('editContactId').value = st.id;
    document.getElementById('contactNumInput').value = st.number;
    document.getElementById('contactNameInput').value = st.name;
    document.getElementById('contactStudentPhone').value = st.studentPhone || '';
    document.getElementById('contactParentPhone').value = p1;
    document.getElementById('contactParent2Phone').value = p2;

    const btnS = document.getElementById('callStudentBtn');
    const txtS = document.getElementById('callStudentText');
    if (st.studentPhone) {
        btnS.href = `tel:${st.studentPhone}`;
        btnS.className = "flex items-center justify-center gap-2 w-full bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold py-3.5 rounded-2xl transition-colors text-sm border border-sky-200 shadow-sm";
        txtS.textContent = `학생 본인 연결`;
    } else {
        btnS.removeAttribute('href');
        btnS.className = "flex items-center justify-center gap-2 w-full bg-slate-50 text-slate-400 font-bold py-3.5 rounded-2xl cursor-not-allowed text-sm border border-slate-200";
        txtS.textContent = "학생 연락처 없음";
    }

    const btnP1 = document.getElementById('callParentBtn');
    const txtP1 = document.getElementById('callParentText');
    if (p1) {
        btnP1.href = `tel:${p1}`;
        btnP1.className = "flex items-center justify-center gap-1.5 w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold py-3.5 rounded-2xl transition-colors text-xs sm:text-sm border border-emerald-200 shadow-sm";
        txtP1.textContent = `학부모 1 연결`;
    } else {
        btnP1.removeAttribute('href');
        btnP1.className = "flex items-center justify-center gap-1.5 w-full bg-slate-50 text-slate-400 font-bold py-3.5 rounded-2xl cursor-not-allowed text-xs sm:text-sm border border-slate-200";
        txtP1.textContent = "학부모 1 없음";
    }

    const btnP2 = document.getElementById('callParent2Btn');
    const txtP2 = document.getElementById('callParent2Text');
    if (p2 && p2 !== '없다') {
        btnP2.href = `tel:${p2}`;
        btnP2.className = "flex items-center justify-center gap-1.5 w-full bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold py-3.5 rounded-2xl transition-colors text-xs sm:text-sm border border-amber-200 shadow-sm";
        txtP2.textContent = `학부모 2 연결`;
    } else {
        btnP2.removeAttribute('href');
        btnP2.className = "flex items-center justify-center gap-1.5 w-full bg-slate-50 text-slate-400 font-bold py-3.5 rounded-2xl cursor-not-allowed text-xs sm:text-sm border border-slate-200";
        txtP2.textContent = "학부모 2 없음";
    }

    document.getElementById('contactEditMode').classList.add('hidden');
    document.getElementById('contactViewMode').classList.remove('hidden');
    document.getElementById('contactModal').classList.remove('hidden');
}
