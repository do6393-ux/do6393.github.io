import { db, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from './firebase-config.js';

let students = [];

export function initHomeroomTab(currentUser) {
    if (!currentUser) return; // 보안 (로그인 안하면 작동안함)

    onSnapshot(query(collection(db, "homeroom_contacts"), orderBy("number", "asc")), (snapshot) => {
        students = [];
        snapshot.forEach(d => students.push({ id: d.id, ...d.data() }));
        renderContacts();
    });

    document.getElementById('openNewContactModalBtn')?.addEventListener('click', () => {
        document.getElementById('editContactId').value = '';
        document.getElementById('contactNumInput').value = '';
        document.getElementById('contactNameInput').value = '';
        document.getElementById('contactStudentPhone').value = '';
        document.getElementById('contactParentPhone').value = '';
        
        // 새 연락처 추가 모드로 팝업 띄우기
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
        container.innerHTML = `<div class="col-span-full text-center py-10 text-slate-400 font-bold">등록된 학생이 없습니다. 우측 상단의 '학생 추가'를 눌러주세요.</div>`;
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
        btnP.href = `tel:${st.parentPhone}`;
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
