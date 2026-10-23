import { db, doc, getDoc, setDoc, deleteDoc, onSnapshot } from './firebase-config.js';

export let homeroomState = {
    userId: "default_teacher",
    grade: 1,
    classNum: 7,
    contacts: [],
    excludedStudentNums: new Set(),
    seatingSeats: [], // 30석
    antiPairs: [],
    cleaningData: Array(6).fill().map(() => Array(5).fill(null)), // 6구역 x 5조
    currentCleaningSlot: null
};

const cleaningAreas = [
    "교실 쓸기 - 창",
    "교실 쓸기 - 중앙",
    "교실 쓸기 - 복도",
    "컴퓨터실 - 창문쪽",
    "컴퓨터실 - 복도쪽",
    "교탁 및 칠판"
];

let seatingHwpxBlob = null;
let cleaningHwpxBlob = null;

let unsubCleaning = null;
let unsubContacts = null;
let unsubAnti = null;

export async function initHomeroomTab(currentUser) {
    // 🎯 1. currentUser가 없어도 함수가 튕기지 않고 모든 이벤트 리스너를 정상 등록하도록 방어
    if (currentUser) {
        homeroomState.userId = currentUser.uid || currentUser.email || "default_teacher";
    } else {
        homeroomState.userId = localStorage.getItem('user_id') || "default_teacher";
    }

    // 🎯 2. NaN 방지 안전 숫자 파싱
    const savedG = parseInt(localStorage.getItem('office_grade'), 10);
    const savedC = parseInt(localStorage.getItem('office_class'), 10);
    homeroomState.grade = !isNaN(savedG) && savedG > 0 ? savedG : 1;
    homeroomState.classNum = !isNaN(savedC) && savedC > 0 ? savedC : 7;

    // 헤더 타이틀 및 서브탭 이벤트 즉시 연결 (탭 클릭 무조건 작동)
    updateHomeroomHeaders();
    setupSubTabs();
    setupContactsModule();
    setupSeatingModule();
    setupCleaningModule();

    // 3. 로컬 데이터 즉시 1차 렌더링 후 실시간 DB 동기화
    loadLocalFallbackData();
    initRealtimeHomeroomSync();
}

// 🎯 4. main.js에서 호출하는 학급 변경 업데이트 함수 (NaN 완벽 방어)
export function updateHomeroomClass(gradeOrObj, classNum) {
    let g, c;
    if (typeof gradeOrObj === 'object' && gradeOrObj !== null) {
        g = gradeOrObj.grade || gradeOrObj.selectedGrade;
        c = gradeOrObj.classNum || gradeOrObj.class || gradeOrObj.selectedClassNum;
    } else {
        g = gradeOrObj;
        c = classNum;
    }

    const parsedG = parseInt(g, 10);
    const parsedC = parseInt(c, 10);

    homeroomState.grade = !isNaN(parsedG) && parsedG > 0 ? parsedG : (parseInt(localStorage.getItem('office_grade'), 10) || 1);
    homeroomState.classNum = !isNaN(parsedC) && parsedC > 0 ? parsedC : (parseInt(localStorage.getItem('office_class'), 10) || 7);

    localStorage.setItem('office_grade', homeroomState.grade);
    localStorage.setItem('office_class', homeroomState.classNum);

    updateHomeroomHeaders();
    loadLocalFallbackData();
    initRealtimeHomeroomSync();
}

function updateHomeroomHeaders() {
    const titleContacts = document.getElementById('homeroomTitleContacts');
    const titleCleaning = document.getElementById('homeroomTitleCleaning');
    if (titleContacts) titleContacts.textContent = `${homeroomState.grade}학년 ${homeroomState.classNum}반 비상연락망`; if (titleCleaning) titleCleaning.textContent = `${homeroomState.grade}학년 ${homeroomState.classNum}반 청소 구역`; }  function loadLocalFallbackData() { const userClassKey = `${homeroomState.userId}_${homeroomState.grade}_${homeroomState.classNum}`;
    const legacyKey = `${homeroomState.grade}_${homeroomState.classNum}`;

    // 연락처 로컬 캐시 로드
    const localContacts = localStorage.getItem(`contacts_${userClassKey}`) \vert{}\vert{} localStorage.getItem(`contacts_${legacyKey}`);
    if (localContacts) {
        try { homeroomState.contacts = JSON.parse(localContacts); } catch(e){}
    }
    renderContactGrid();
    renderExcludeStudentList();

    // 청소 구역 로컬 캐시 로드
    const localCleaning = localStorage.getItem(`cleaning_grid_${userClassKey}`) \vert{}\vert{} localStorage.getItem(`cleaning_grid_${legacyKey}`);
    if (localCleaning) {
        try { homeroomState.cleaningData = JSON.parse(localCleaning); } catch(e){}
    }
    renderCleaningGrid();

    // 기피 조합 로컬 캐시 로드
    const localAnti = localStorage.getItem(`anti_pairs_${userClassKey}`) \vert{}\vert{} localStorage.getItem(`anti_pairs_${legacyKey}`);
    if (localAnti) {
        try { homeroomState.antiPairs = JSON.parse(localAnti); } catch(e){}
    }

    initSeatingGrid();
}

/* ==========================================================================
   0. 서브탭 전환 로직 (자리 바꾸기 / 청소 구역 / 비상연락망)
   ========================================================================== */
function setupSubTabs() {
    const tabContacts = document.getElementById('homeroomSubTabContacts');
    const tabSeating = document.getElementById('homeroomSubTabSeating');
    const tabCleaning = document.getElementById('homeroomSubTabCleaning');

    const secContacts = document.getElementById('homeroomSectionContacts');
    const secSeating = document.getElementById('homeroomSectionSeating');
    const secCleaning = document.getElementById('homeroomSectionCleaning');

    const switchTab = (activeTab, activeSec, activeColor) => {
        [tabContacts, tabSeating, tabCleaning].forEach(t => {
            if (t) t.className = "px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-800 rounded-xl transition-all";
        });
        [secContacts, secSeating, secCleaning].forEach(s => s?.classList.add('hidden'));

        if (activeTab) {
            activeTab.className = `px-4 py-2 text-sm font-bold bg-white ${activeColor} rounded-xl shadow-sm transition-all`;
        }
        if (activeSec) {
            activeSec.classList.remove('hidden');
        }
    };

    tabContacts?.addEventListener('click', () => switchTab(tabContacts, secContacts, 'text-rose-600'));
    tabSeating?.addEventListener('click', () => switchTab(tabSeating, secSeating, 'text-indigo-600'));
    tabCleaning?.addEventListener('click', () => switchTab(tabCleaning, secCleaning, 'text-emerald-600'));
}

/* ==========================================================================
   1. 실시간 데이터베이스 연동 (onSnapshot)
   ========================================================================== */
function initRealtimeHomeroomSync() {
    const userClassKey = `${homeroomState.userId}_${homeroomState.grade}_${homeroomState.classNum}`; const legacyKey = `${homeroomState.grade}_${homeroomState.classNum}`;  if (unsubCleaning) unsubCleaning(); if (unsubContacts) unsubContacts(); if (unsubAnti) unsubAnti();  // 청소 구역 실시간 리스너 try { const cleanRef = doc(db, "homeroom_cleaning", userClassKey); unsubCleaning = onSnapshot(cleanRef, (snap) => { if (snap.exists() && snap.data().grid) { homeroomState.cleaningData = snap.data().grid; localStorage.setItem(`cleaning_grid_${userClassKey}`, JSON.stringify(homeroomState.cleaningData));
                renderCleaningGrid();
            } else {
                getDoc(doc(db, "homeroom_cleaning", legacyKey)).then(lSnap => {
                    if (lSnap.exists() && lSnap.data().grid) {
                        homeroomState.cleaningData = lSnap.data().grid;
                        renderCleaningGrid();
                    }
                }).catch(() => {});
            }
        }, (err) => console.warn("청소구역 동기화 주의:", err));
    } catch(e) {}

    // 비상연락망 실시간 리스너
    try {
        const contactRef = doc(db, "homeroom_contacts", userClassKey);
        unsubContacts = onSnapshot(contactRef, (snap) => {
            if (snap.exists() && snap.data().list) {
                homeroomState.contacts = snap.data().list;
                localStorage.setItem(`contacts_${userClassKey}`, JSON.stringify(homeroomState.contacts)); renderContactGrid(); renderExcludeStudentList(); } else { getDoc(doc(db, "homeroom_contacts", legacyKey)).then(lSnap => { if (lSnap.exists() && lSnap.data().list) { homeroomState.contacts = lSnap.data().list; renderContactGrid(); renderExcludeStudentList(); } }).catch(() => {}); } }, (err) => console.warn("연락망 동기화 주의:", err)); } catch(e) {}  // 기피 조합 실시간 리스너 try { const antiRef = doc(db, "homeroom_anti_pairs", userClassKey); unsubAnti = onSnapshot(antiRef, (snap) => { if (snap.exists() && snap.data().pairs) { homeroomState.antiPairs = snap.data().pairs; localStorage.setItem(`anti_pairs_${userClassKey}`, JSON.stringify(homeroomState.antiPairs));
            }
        }, (err) => console.warn("기피조합 동기화 주의:", err));
    } catch(e) {}
}

/* ==========================================================================
   2. 청소 구역 모듈 (학생 번호/이름 표시 + 실시간 저장)
   ========================================================================== */
function setupCleaningModule() {
    const modal = document.getElementById('cleaningStudentSelectModal');
    const closeBtn = document.getElementById('closeCleaningSelectModalBtn');

    closeBtn?.addEventListener('click', () => modal?.classList.add('hidden'));

    // 위로 교대
    document.getElementById('rotateCleaningUpBtn')?.addEventListener('click', () => {
        const newGrid = Array(6).fill().map(() => Array(5).fill(null));
        for (let r = 0; r < 6; r++) {
            const prevR = (r - 1 + 6) % 6;
            for (let c = 0; c < 5; c++) {
                newGrid[prevR][c] = homeroomState.cleaningData[r][c];
            }
        }
        homeroomState.cleaningData = newGrid;
        renderCleaningGrid();
        saveCleaningData();
    });

    // 아래로 교대
    document.getElementById('rotateCleaningDownBtn')?.addEventListener('click', () => {
        const newGrid = Array(6).fill().map(() => Array(5).fill(null));
        for (let r = 0; r < 6; r++) {
            const nextR = (r + 1) % 6;
            for (let c = 0; c < 5; c++) {
                newGrid[nextR][c] = homeroomState.cleaningData[r][c];
            }
        }
        homeroomState.cleaningData = newGrid;
        renderCleaningGrid();
        saveCleaningData();
    });

    const hwpxInput = document.getElementById('cleaningHwpxTemplateInput');
    const hwpxBtn = document.getElementById('downloadCleaningHwpxBtn');
    hwpxInput?.addEventListener('change', () => {
        if (hwpxInput.files.length > 0) {
            cleaningHwpxBlob = hwpxInput.files[0];
            hwpxBtn?.classList.remove('hidden');
            alert("✅ 청소 구역 HWPX 양식이 등록되었습니다.");
        }
    });

    hwpxBtn?.addEventListener('click', downloadCleaningHwpx);
}

function renderCleaningGrid() {
    const tbody = document.getElementById('cleaningGridBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    for (let r = 0; r < 6; r++) {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50 transition-colors";

        let html = `<td class="py-3.5 px-3 border-r border-slate-200 font-bold bg-slate-50 text-slate-700 text-xs sm:text-sm whitespace-nowrap">${cleaningAreas[r]}</td>`;

        for (let c = 0; c < 5; c++) {
            const student = homeroomState.cleaningData[r][c];

            if (student && student.name) {
                // 배정된 학생: 번호 + 이름 배지
                html += `
                    <td class="p-1.5 border-r border-slate-200 align-middle">
                        <div class="group relative flex items-center justify-between px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-xl font-bold shadow-sm transition-all select-none">
                            <div class="flex items-center gap-1.5 overflow-hidden cursor-pointer flex-1" onclick="window.openCleaningSelectModal(${r},${c})">
                                <span class="bg-emerald-200 text-emerald-800 text-[11px] font-extrabold px-1.5 py-0.5 rounded">${student.num}번</span>
                                <span class="text-xs truncate font-extrabold text-slate-800">${student.name}</span>
                            </div>
                            <button type="button" class="text-slate-400 hover:text-rose-500 p-1 rounded-md transition-colors ml-1" title="배정 해제" onclick="window.clearCleaningSlot(${r},${c})">
                                <i class="fa-solid fa-xmark text-xs pointer-events-none"></i>
                            </button>
                        </div>
                    </td>
                `;
            } else {
                // 미배정: + 배정 버튼
                html += `
                    <td class="p-1.5 border-r border-slate-200 align-middle">
                        <button type="button" onclick="window.openCleaningSelectModal(${r},${c})" class="w-full py-2.5 border-2 border-dashed border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 hover:text-emerald-700 text-slate-300 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1">
                            <i class="fa-solid fa-plus text-[10px]"></i> 배정
                        </button>
                    </td>
                `;
            }
        }
        tr.innerHTML = html;
        tbody.appendChild(tr);
    }
}

window.openCleaningSelectModal = function(row, col) {
    homeroomState.currentCleaningSlot = { row, col };
    const modal = document.getElementById('cleaningStudentSelectModal');
    const container = document.getElementById('cleaningStudentList');
    if (!container || !modal) return;

    container.innerHTML = '';

    const clearBtn = document.createElement('button');
    clearBtn.className = "col-span-full py-2 px-3 mb-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm";
    clearBtn.innerHTML = `<i class="fa-solid fa-trash-can"></i> 이 자리 비우기 (배정 해제)`;
    clearBtn.onclick = () => {
        window.clearCleaningSlot(row, col);
        modal.classList.add('hidden');
    };
    container.appendChild(clearBtn);

    const list = homeroomState.contacts.length > 0 
        ? homeroomState.contacts 
        : Array.from({ length: 30 }, (_, i) => ({ num: i + 1, name: `${i + 1}번 학생` }));

    list.forEach(s => {
        const btn = document.createElement('button');
        btn.className = "p-2 rounded-xl border text-center font-bold transition-all hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-800 border-slate-200 text-slate-700 bg-white shadow-sm flex flex-col items-center justify-center gap-0.5";
        btn.innerHTML = `
            <span class="text-[10px] text-slate-400 font-semibold">${s.num}번</span>
            <span class="text-xs font-bold text-slate-800">${s.name}</span>
        `;
        btn.onclick = () => {
            homeroomState.cleaningData[row][col] = { num: s.num, name: s.name };
            renderCleaningGrid();
            modal.classList.add('hidden');
            saveCleaningData();
        };
        container.appendChild(btn);
    });

    modal.classList.remove('hidden');
};

window.clearCleaningSlot = function(row, col) {
    homeroomState.cleaningData[row][col] = null;
    renderCleaningGrid();
    saveCleaningData();
};

async function saveCleaningData() {
    const userClassKey = `${homeroomState.userId}_${homeroomState.grade}_${homeroomState.classNum}`; localStorage.setItem(`cleaning_grid_${userClassKey}`, JSON.stringify(homeroomState.cleaningData));

    try {
        await setDoc(doc(db, "homeroom_cleaning", userClassKey), {
            userId: homeroomState.userId,
            grade: homeroomState.grade,
            classNum: homeroomState.classNum,
            grid: homeroomState.cleaningData,
            updatedAt: new Date().toISOString()
        });
    } catch (e) {
        console.warn("청소구역 저장 에러:", e);
    }
}

async function downloadCleaningHwpx() {
    if (!cleaningHwpxBlob) return alert("등록된 HWPX 양식이 없습니다.");
    try {
        const zip = await JSZip.loadAsync(cleaningHwpxBlob);
        let sectionXml = await zip.file("Contents/section0.xml")?.async("string");
        if (!sectionXml) return alert("HWPX 문서 구조를 읽을 수 없습니다.");

        for (let r = 0; r < 6; r++) {
            for (let c = 0; c < 5; c++) {
                const tag = `{{C_${r+1}_${c+1}}}`;
                const item = homeroomState.cleaningData[r][c];
                const text = item ? `${item.num}번 ${item.name}` : "";
                sectionXml = sectionXml.replaceAll(tag, text);
            }
        }

        zip.file("Contents/section0.xml", sectionXml);
        const outBlob = await zip.generateAsync({ type: "blob" });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(outBlob);
        a.download = `${homeroomState.grade}학년_${homeroomState.classNum}반_청소구역.hwpx`;
        a.click();
    } catch(e) {
        alert("HWPX 다운로드 중 오류가 발생했습니다.");
    }
}

/* ==========================================================================
   3. 비상연락망 모듈
   ========================================================================== */
function setupContactsModule() {
    const contactModal = document.getElementById('contactModal');
    const bulkModal = document.getElementById('bulkPasteModal');

    document.getElementById('closeContactModalBtn')?.addEventListener('click', () => contactModal?.classList.add('hidden'));
    document.getElementById('openNewContactModalBtn')?.addEventListener('click', () => openContactEditMode(null));

    document.getElementById('deleteAllContactsBtn')?.addEventListener('click', async () => {
        if (!confirm("정말 모든 학생 연락처를 삭제하시겠습니까?")) return;
        homeroomState.contacts = [];
        renderContactGrid();
        renderExcludeStudentList();

        const userClassKey = `${homeroomState.userId}_${homeroomState.grade}_${homeroomState.classNum}`; localStorage.removeItem(`contacts_${userClassKey}`);
        try {
            await deleteDoc(doc(db, "homeroom_contacts", userClassKey));
        } catch (e) {}
    });

    document.getElementById('openBulkPasteModalBtn')?.addEventListener('click', () => {
        document.getElementById('bulkPasteTextarea').value = '';
        bulkModal?.classList.remove('hidden');
    });
    document.getElementById('closeBulkPasteModalBtn')?.addEventListener('click', () => bulkModal?.classList.add('hidden'));
    document.getElementById('cancelBulkPasteBtn')?.addEventListener('click', () => bulkModal?.classList.add('hidden'));

    document.getElementById('saveBulkPasteBtn')?.addEventListener('click', async () => {
        const text = document.getElementById('bulkPasteTextarea').value;
        if (!text.trim()) return alert("데이터를 입력해주세요.");

        const lines = text.split('\n');
        const parsed = [];

        lines.forEach((line, idx) => {
            const raw = line.trim();
            if (!raw) return;

            const tokens = raw.split(/[\t\s]+/).filter(Boolean);
            if (tokens.length < 2) return;

            let num = parseInt(tokens[0], 10);
            let name = tokens[1];
            let studentPhone = "";
            let parent1 = "";
            let parent2 = "";

            if (isNaN(num)) {
                num = idx + 1;
                name = tokens[0];
            }

            const phoneMatches = raw.match(/01[0-9]-?[0-9]{3,4}-?[0-9]{4}/g) || [];
            if (phoneMatches.length >= 1) studentPhone = phoneMatches[0];
            if (phoneMatches.length >= 2) parent1 = phoneMatches[1];
            if (phoneMatches.length >= 3) parent2 = phoneMatches[2];

            parsed.push({
                id: `st_${Date.now()}_${idx}`,
                num: num,
                name: name,
                phone: studentPhone,
                parentPhone: parent1,
                parent2Phone: parent2
            });
        });

        if (parsed.length === 0) return alert("유효한 학생 데이터를 찾지 못했습니다.");

        parsed.sort((a, b) => a.num - b.num);
        homeroomState.contacts = parsed;

        renderContactGrid();
        renderExcludeStudentList();
        bulkModal?.classList.add('hidden');

        const userClassKey = `${homeroomState.userId}_${homeroomState.grade}_${homeroomState.classNum}`; localStorage.setItem(`contacts_${userClassKey}`, JSON.stringify(parsed));
        try {
            await setDoc(doc(db, "homeroom_contacts", userClassKey), {
                userId: homeroomState.userId,
                grade: homeroomState.grade,
                classNum: homeroomState.classNum,
                list: parsed,
                updatedAt: new Date().toISOString()
            });
        } catch (e) {}

        alert(`✅ 총 ${parsed.length}명의 학생 연락처가 등록되었습니다.`); });  document.getElementById('editContactModeBtn')?.addEventListener('click', () => { const id = document.getElementById('editContactId').value; const target = homeroomState.contacts.find(c => c.id === id); if (target) openContactEditMode(target); });  document.getElementById('cancelContactEditBtn')?.addEventListener('click', () => { document.getElementById('contactEditMode')?.classList.add('hidden'); document.getElementById('contactViewMode')?.classList.remove('hidden'); });  document.getElementById('saveContactBtn')?.addEventListener('click', async () => { const id = document.getElementById('editContactId').value; const num = Number(document.getElementById('contactNumInput').value); const name = document.getElementById('contactNameInput').value.trim(); const phone = document.getElementById('contactStudentPhone').value.trim(); const p1Input = document.getElementById('contactParentPhone'); const p2Input = document.getElementById('contactParent2Phone'); const parentPhone = p1Input ? p1Input.value.trim() : ""; const parent2Phone = p2Input ? p2Input.value.trim() : "";  if (!name) return alert("학생 이름을 입력해주세요.");  if (id) { const idx = homeroomState.contacts.findIndex(c => c.id === id); if (idx !== -1) { homeroomState.contacts[idx] = { id, num, name, phone, parentPhone, parent2Phone }; } } else { homeroomState.contacts.push({ id: `st_${Date.now()}`,
                num: num || homeroomState.contacts.length + 1,
                name,
                phone,
                parentPhone,
                parent2Phone
            });
        }

        homeroomState.contacts.sort((a, b) => a.num - b.num);
        renderContactGrid();
        renderExcludeStudentList();
        contactModal?.classList.add('hidden');

        const userClassKey = `${homeroomState.userId}_${homeroomState.grade}_${homeroomState.classNum}`; localStorage.setItem(`contacts_${userClassKey}`, JSON.stringify(homeroomState.contacts));
        try {
            await setDoc(doc(db, "homeroom_contacts", userClassKey), {
                userId: homeroomState.userId,
                grade: homeroomState.grade,
                classNum: homeroomState.classNum,
                list: homeroomState.contacts,
                updatedAt: new Date().toISOString()
            });
        } catch (e) {}
    });

    document.getElementById('deleteContactBtn')?.addEventListener('click', async () => {
        const id = document.getElementById('editContactId').value;
        if (!confirm("이 연락처를 삭제하시겠습니까?")) return;

        homeroomState.contacts = homeroomState.contacts.filter(c => c.id !== id);
        renderContactGrid();
        renderExcludeStudentList();
        contactModal?.classList.add('hidden');

        const userClassKey = `${homeroomState.userId}_${homeroomState.grade}_${homeroomState.classNum}`; localStorage.setItem(`contacts_${userClassKey}`, JSON.stringify(homeroomState.contacts));
        try {
            await setDoc(doc(db, "homeroom_contacts", userClassKey), {
                userId: homeroomState.userId,
                grade: homeroomState.grade,
                classNum: homeroomState.classNum,
                list: homeroomState.contacts,
                updatedAt: new Date().toISOString()
            });
        } catch (e) {}
    });
}

function renderContactGrid() {
    const container = document.getElementById('contactGridContainer');
    if (!container) return;
    container.innerHTML = '';

    if (homeroomState.contacts.length === 0) {
        container.innerHTML = `<div class="col-span-full py-12 text-center text-slate-400 font-bold bg-white rounded-3xl border border-dashed border-slate-200">등록된 연락처가 없습니다. 우측 상단의 버튼을 통해 등록해보세요.</div>`;
        return;
    }

    homeroomState.contacts.forEach(c => {
        const card = document.createElement('div');
        card.className = "bg-white border border-slate-200 hover:border-rose-300 rounded-2xl p-2.5 flex flex-col items-center justify-center gap-1 shadow-sm hover:shadow transition-all cursor-pointer group";
        card.innerHTML = `
            <span class="text-[11px] font-extrabold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full">${c.num}번</span>
            <span class="text-xs font-bold text-slate-800 group-hover:text-rose-600 transition-colors">${c.name}</span>
        `;
        card.onclick = () => openContactViewMode(c);
        container.appendChild(card);
    });
}

function openContactViewMode(contact) {
    const modal = document.getElementById('contactModal');
    document.getElementById('contactViewMode')?.classList.remove('hidden');
    document.getElementById('contactEditMode')?.classList.add('hidden');

    document.getElementById('editContactId').value = contact.id;
    document.getElementById('contactModalNumber').textContent = `${contact.num}번`; document.getElementById('contactModalName').textContent = contact.name;  const btnStd = document.getElementById('callStudentBtn'); const btnP1 = document.getElementById('callParentBtn'); const btnP2 = document.getElementById('callParent2Btn');  if (btnStd) { btnStd.href = contact.phone ? `tel:${contact.phone}` : "#";
        btnStd.className = contact.phone 
            ? "flex items-center justify-center gap-2 w-full bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold py-3 rounded-2xl transition-colors text-sm border border-sky-200 shadow-sm"
            : "flex items-center justify-center gap-2 w-full bg-slate-50 text-slate-300 font-bold py-3 rounded-2xl pointer-events-none border border-slate-100 text-sm";
    }

    if (btnP1) {
        btnP1.href = contact.parentPhone ? `tel:${contact.parentPhone}` : "#"; btnP1.className = contact.parentPhone ? "flex items-center justify-center gap-1.5 w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold py-3 rounded-2xl transition-colors text-xs border border-emerald-200 shadow-sm" : "flex items-center justify-center gap-1.5 w-full bg-slate-50 text-slate-300 font-bold py-3 rounded-2xl pointer-events-none border border-slate-100 text-xs"; }  if (btnP2) { btnP2.href = contact.parent2Phone ? `tel:${contact.parent2Phone}` : "#";
        btnP2.className = contact.parent2Phone 
            ? "flex items-center justify-center gap-1.5 w-full bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold py-3 rounded-2xl transition-colors text-xs border border-amber-200 shadow-sm"
            : "flex items-center justify-center gap-1.5 w-full bg-slate-50 text-slate-300 font-bold py-3 rounded-2xl pointer-events-none border border-slate-100 text-xs";
    }

    modal?.classList.remove('hidden');
}

function openContactEditMode(contact) {
    const modal = document.getElementById('contactModal');
    document.getElementById('contactViewMode')?.classList.add('hidden');
    document.getElementById('contactEditMode')?.classList.remove('hidden');

    document.getElementById('editContactId').value = contact ? contact.id : '';
    document.getElementById('contactNumInput').value = contact ? contact.num : (homeroomState.contacts.length + 1);
    document.getElementById('contactNameInput').value = contact ? contact.name : '';
    document.getElementById('contactStudentPhone').value = contact ? contact.phone : '';
    document.getElementById('contactParentPhone').value = contact ? contact.parentPhone : '';
    document.getElementById('contactParent2Phone').value = contact ? contact.parent2Phone : '';

    modal?.classList.remove('hidden');
}

/* ==========================================================================
   4. 자리 바꾸기 모듈 (기피조합 비밀모달, 애니메이션, HWPX)
   ========================================================================== */
function setupSeatingModule() {
    document.getElementById('teacherDeskBtn')?.addEventListener('click', () => {
        const modal = document.getElementById('antiPairModal');
        const area = document.getElementById('antiPairTextarea');
        if (area) {
            area.value = homeroomState.antiPairs.map(p => `${p[0]},${p[1]}`).join('\n');
        }
        modal?.classList.remove('hidden');
    });

    document.getElementById('closeAntiPairModalBtn')?.addEventListener('click', () => {
        document.getElementById('antiPairModal')?.classList.add('hidden');
    });

    document.getElementById('saveAntiPairBtn')?.addEventListener('click', async () => {
        const text = document.getElementById('antiPairTextarea').value;
        const lines = text.split('\n');
        const pairs = [];

        lines.forEach(line => {
            const parts = line.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
            if (parts.length >= 2) {
                pairs.push([parts[0], parts[1]]);
            }
        });

        homeroomState.antiPairs = pairs;
        const userClassKey = `${homeroomState.userId}_${homeroomState.grade}_${homeroomState.classNum}`; localStorage.setItem(`anti_pairs_${userClassKey}`, JSON.stringify(pairs));
        try {
            await setDoc(doc(db, "homeroom_anti_pairs", userClassKey), {
                userId: homeroomState.userId,
                grade: homeroomState.grade,
                classNum: homeroomState.classNum,
                pairs: pairs
            });
        } catch(e) {}

        document.getElementById('antiPairModal')?.classList.add('hidden');
        alert("🤫 기피 조합이 안전하게 비밀 저장되었습니다.");
    });

    document.getElementById('startSeatingBtn')?.addEventListener('click', runSeatingArrangement);

    const hwpxInput = document.getElementById('hwpxTemplateInput');
    const hwpxBtn = document.getElementById('downloadHwpxBtn');
    hwpxInput?.addEventListener('change', () => {
        if (hwpxInput.files.length > 0) {
            seatingHwpxBlob = hwpxInput.files[0];
            hwpxBtn?.classList.remove('hidden');
            alert("✅ 자리배치 HWPX 양식이 등록되었습니다.");
        }
    });

    hwpxBtn?.addEventListener('click', downloadSeatingHwpx);
}

function initSeatingGrid() {
    if (homeroomState.seatingSeats.length === 0) {
        homeroomState.seatingSeats = Array.from({ length: 30 }, (_, idx) => ({
            id: idx,
            disabled: false,
            student: null
        }));
    }
    renderSeatingDesks();
}

function renderSeatingDesks() {
    const grid = document.getElementById('seatingGrid');
    if (!grid) return;
    grid.innerHTML = '';

    homeroomState.seatingSeats.forEach(seat => {
        const desk = document.createElement('div');
        desk.className = seat.disabled
            ? "h-16 rounded-2xl bg-slate-200 border-2 border-slate-300 flex items-center justify-center text-slate-400 font-bold text-xs cursor-pointer select-none transition-all shadow-inner"
            : "h-16 rounded-2xl bg-white border-2 border-indigo-100 hover:border-indigo-400 flex flex-col items-center justify-center gap-0.5 font-bold cursor-pointer select-none transition-all shadow-sm";

        if (seat.disabled) {
            desk.textContent = "제외";
        } else if (seat.student) {
            desk.innerHTML = `
                <span class="text-[10px] text-indigo-500 font-extrabold">${seat.student.num}번</span>
                <span class="text-xs font-bold text-slate-800">${seat.student.name}</span>
            `;
        } else {
            desk.innerHTML = `<span class="text-xs text-slate-300">${seat.id + 1}</span>`; }  desk.onclick = () => { seat.disabled = !seat.disabled; seat.student = null; renderSeatingDesks(); };  grid.appendChild(desk); }); }  function renderExcludeStudentList() { const container = document.getElementById('excludeStudentList'); if (!container) return; container.innerHTML = '';  const list = homeroomState.contacts.length > 0 ? homeroomState.contacts : Array.from({ length: 30 }, (_, i) => ({ num: i + 1, name: `${i + 1}번` }));

    list.forEach(s => {
        const isExcluded = homeroomState.excludedStudentNums.has(s.num);
        const chip = document.createElement('button');
        chip.className = `px-2 py-0.5 rounded-
