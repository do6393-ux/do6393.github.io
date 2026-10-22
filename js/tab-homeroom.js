import { db, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from './firebase-config.js';

let students = [];

export function initHomeroomTab(currentUser) {
    if (!currentUser) return;

    onSnapshot(query(collection(db, "homeroom_contacts"), orderBy("number", "asc")), (snapshot) => {
        students = [];
        snapshot.forEach(d => students.push({ id: d.id, ...d.data() }));
        renderContacts();
    });

    // 🎯 1. 여러 명 일괄 붙여넣기 모달 열기/닫기
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

    // 🎯 2. 여러 명 일괄 붙여넣기 저장 로직 (이 알고리즘이 핵심입니다!)
    document.getElementById('saveBulkPasteBtn')?.addEventListener('click', async () => {
        const rawText = document.getElementById('bulkPasteTextarea').value;
        if (!rawText.trim()) return alert("입력된 데이터가 없습니다.");

        const lines = rawText.split('\n');
        let importCount = 0;

        for (let line of lines) {
            line = line.trim();
            if (!line) continue; // 빈 줄 스킵

            // 탭(\t) 또는 다중 공백으로 열 분해
            const cols = line.split(/\t+/); 
            // 탭 분해가 안 되었다면 스페이스 한 칸 이상으로 시도
            const finalCols = cols.length > 1 ? cols : line.split(/\s{2,}/); 
            // 그것도 안 되면 그냥 일반 띄어쓰기로 분해
            const rowData = finalCols.length > 1 ? finalCols : line.split(/\s+/);

            if (rowData.length < 2) continue; // 데이터가 부족한 줄(제목 등) 무시

            const num = Number(rowData[0]);
            const name = String(rowData[1] || "").trim();

            if (isNaN(num) || !name) continue; // 첫 칸이 숫자(번호)가 아니거나 이름이 없으면 스킵

            // 순서: [번호(0)] [이름(1)] [집전화(2)-무시] [학생(3)] [학부모1(4)] [학부모2(5)-옵션]
            // 데이터가 밀렸거나 집전화가 공란이어도 3, 4, 5번 인덱스를 유연하게 포착합니다.
            let sPhone = "";
            let pPhone1 = "";
            let pPhone2 = "";

            if (rowData.length >= 4) {
                // 인덱스 2는 집전화이므로 무조건 생략. 인덱스 3을 학생 폰으로 취급
                sPhone = String(rowData[3] || "").trim();
            }
            if (rowData.length >= 5) {
                pPhone1 = String(rowData[4] || "").trim();
            }
            if (rowData.length >= 6) {
                pPhone2 = String(rowData[5] || "").trim();
            }

            // 학부모 2 번호가 존재한다면 학부모 1 번호 뒤에 가독성 있게 덧붙여서 한눈에 보이게 병합
            let finalParentPhone = pPhone1;
            if (pPhone2 && pPhone2 !== "없다") {
                finalParentPhone = pPhone1 ? `${pPhone1} / (학부모2) ${pPhone2}` : pPhone2;
            }

            const payload = {
                number: num,
                name: name,
                studentPhone: sPhone,
                parentPhone: finalParentPhone
            };

            // 기존에 같은 번호로 이미 등록된 학생 카드가 있다면 교체(오버라이트), 없으면 새 카드 생성
            const existing = students.find(s => s.number === num);
            try {
                if (existing) {
                    await updateDoc(doc(db, "homeroom_contacts", existing.id), payload);
                } else {
                    await addDoc(collection(db, "homeroom_contacts"), payload);
                }
                importCount++;
            } catch (err) {
                console.error("저장 실패 행: ", line, err);
            }
        }

        alert(`✅ 일괄 등록이 완료되었습니다!\n(성공: 총 ${importCount}명 반영됨)`);
        document.getElementById('bulkPasteModal').classList.add('hidden');
    });

    // 직접 추가 모달 열기/닫기
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
        // 전화번호가 병합되어 여러 개일 경우를 대비해 첫 번째 번호만 추출해서 연결
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
