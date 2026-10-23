import { db, doc, getDoc, setDoc } from './firebase-config.js';

export let homeroomState = {
    userId: localStorage.getItem('user_id') || "default_teacher",
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

// 서브탭 전환 함수
export function switchHomeroomSubTab(tabName) {
    const tabContacts = document.getElementById('homeroomSubTabContacts');
    const tabSeating = document.getElementById('homeroomSubTabSeating');
    const tabCleaning = document.getElementById('homeroomSubTabCleaning');

    const secContacts = document.getElementById('homeroomSectionContacts');
    const secSeating = document.getElementById('homeroomSectionSeating');
    const secCleaning = document.getElementById('homeroomSectionCleaning');

    const inactiveClass = "px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-800 rounded-xl transition-all";
    if (tabContacts) tabContacts.className = inactiveClass;
    if (tabSeating) tabSeating.className = inactiveClass;
    if (tabCleaning) tabCleaning.className = inactiveClass;

    if (secContacts) secContacts.classList.add('hidden');
    if (secSeating) secSeating.classList.add('hidden');
    if (secCleaning) secCleaning.classList.add('hidden');

    if (tabName === 'contacts') {
        if (tabContacts) tabContacts.className = "px-4 py-2 text-sm font-bold bg-white text-rose-600 rounded-xl shadow-sm transition-all";
        if (secContacts) secContacts.classList.remove('hidden');
        renderContactGrid();
    } else if (tabName === 'seating') {
        if (tabSeating) tabSeating.className = "px-4 py-2 text-sm font-bold bg-white text-indigo-600 rounded-xl shadow-sm transition-all";
        if (secSeating) secSeating.classList.remove('hidden');
        initSeatingGrid();
        renderExcludeStudentList();
    } else if (tabName === 'cleaning') {
        if (tabCleaning) tabCleaning.className = "px-4 py-2 text-sm font-bold bg-white text-emerald-600 rounded-xl shadow-sm transition-all";
        if (secCleaning) secCleaning.classList.remove('hidden');
        renderCleaningGrid();
    }
}

// 🎯 1. 초기화 함수 (선생님 로그인 정보 즉시 동기화)
export async function initHomeroomTab(currentUser) {
    if (currentUser && currentUser.uid) {
        homeroomState.userId = currentUser.uid;
        localStorage.setItem('user_id', currentUser.uid);
    }

    const savedG = parseInt(localStorage.getItem('office_grade'), 10);
    const savedC = parseInt(localStorage.getItem('office_class'), 10);
    homeroomState.grade = (!isNaN(savedG) && savedG > 0) ? savedG : 1;
    homeroomState.classNum = (!isNaN(savedC) && savedC > 0) ? savedC : 7;

    updateHomeroomHeaders();
    setupAllModules();
    await loadHomeroomData();
}

// 🎯 2. 학급 변경 업데이트 함수 (NaN 방지)
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

    if (!isNaN(parsedG) && parsedG > 0) {
        homeroomState.grade = parsedG;
        localStorage.setItem('office_grade', parsedG);
    }
    if (!isNaN(parsedC) && parsedC > 0) {
        homeroomState.classNum = parsedC;
        localStorage.setItem('office_class', parsedC);
    }

    updateHomeroomHeaders();
    setupAllModules();
    loadHomeroomData();
}

function updateHomeroomHeaders() {
    const titleContacts = document.getElementById('homeroomTitleContacts');
    const titleCleaning = document.getElementById('homeroomTitleCleaning');
    const g = homeroomState.grade || 1;
    const c = homeroomState.classNum || 7;
    if (titleContacts) titleContacts.textContent = `${g}학년 ${c}반 비상연락망`;
    if (titleCleaning) titleCleaning.textContent = `${g}학년 ${c}반 청소 구역`;
}

function setupAllModules() {
    setupSubTabs();
    setupContactsModule();
    setupSeatingModule();
    setupCleaningModule();
}

function setupSubTabs() {
    const tabContacts = document.getElementById('homeroomSubTabContacts');
    const tabSeating = document.getElementById('homeroomSubTabSeating');
    const tabCleaning = document.getElementById('homeroomSubTabCleaning');

    if (tabContacts) tabContacts.onclick = (e) => { e.preventDefault(); switchHomeroomSubTab('contacts'); };
    if (tabSeating) tabSeating.onclick = (e) => { e.preventDefault(); switchHomeroomSubTab('seating'); };
    if (tabCleaning) tabCleaning.onclick = (e) => { e.preventDefault(); switchHomeroomSubTab('cleaning'); };
}

/* ==========================================================================
   🎯 3. 스마트 통합 데이터 로드 (과거 모든 키를 뒤져서 복원)
   ========================================================================== */
async function loadHomeroomData() {
    const g = homeroomState.grade;
    const c = homeroomState.classNum;
    const uid = homeroomState.userId;

    // 과거 및 현재 사용 가능한 모든 키 후보군 (언더바, 하이픈, UID 조합)
    const candidateKeys = [
        `${uid}_${g}_${c}`,
        `${uid}_${g}-${c}`,
        `${g}_${c}`,
        `${g}-${c}`
    ];

    // 1) 비상연락망 복구 로드
    let loadedContacts = null;
    for (const key of candidateKeys) {
        const local = localStorage.getItem(`contacts_${key}`);
        if (local) {
            try {
                const parsed = JSON.parse(local);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    loadedContacts = parsed;
                    break;
                }
            } catch(e){}
        }
    }

    // Firestore DB에서 스마트 탐색
    for (const key of candidateKeys) {
        try {
            const snap = await getDoc(doc(db, "homeroom_contacts", key));
            if (snap.exists() && snap.data().list && snap.data().list.length > 0) {
                loadedContacts = snap.data().list;
                break;
            }
        } catch (e) {}
    }

    if (loadedContacts && loadedContacts.length > 0) {
        homeroomState.contacts = loadedContacts;
        // 가장 안전한 표준 키(`contacts_${uid}_${g}_${c}`)로 재동기화
        localStorage.setItem(`contacts_${uid}_${g}_${c}`, JSON.stringify(loadedContacts));
    }
    renderContactGrid();
    renderExcludeStudentList();

    // 2) 청소 구역 복구 로드
    let loadedCleaning = null;
    for (const key of candidateKeys) {
        const local = localStorage.getItem(`cleaning_grid_${key}`);
        if (local) {
            try { loadedCleaning = JSON.parse(local); break; } catch(e){}
        }
    }
    for (const key of candidateKeys) {
        try {
            const snap = await getDoc(doc(db, "homeroom_cleaning", key));
            if (snap.exists() && snap.data().grid) {
                loadedCleaning = snap.data().grid;
                break;
            }
        } catch (e) {}
    }
    if (loadedCleaning) {
        homeroomState.cleaningData = loadedCleaning;
        localStorage.setItem(`cleaning_grid_${uid}_${g}_${c}`, JSON.stringify(loadedCleaning));
    }
    renderCleaningGrid();

    // 3) 기피 조합 복구 로드
    for (const key of candidateKeys) {
        const local = localStorage.getItem(`anti_pairs_${key}`);
        if (local) {
            try { homeroomState.antiPairs = JSON.parse(local); break; } catch(e){}
        }
    }
    for (const key of candidateKeys) {
        try {
            const snap = await getDoc(doc(db, "homeroom_anti_pairs", key));
            if (snap.exists() && snap.data().pairs) {
                homeroomState.antiPairs = snap.data().pairs;
                break;
            }
        } catch (e) {}
    }

    initSeatingGrid();
}

/* ==========================================================================
   4. 청소 구역 모듈 (학생 배지 즉시 렌더링 + 이중 안전 저장)
   ========================================================================== */
function setupCleaningModule() {
    const modal = document.getElementById('cleaningStudentSelectModal');
    const closeBtn = document.getElementById('closeCleaningSelectModalBtn');
    if (closeBtn) closeBtn.onclick = () => modal?.classList.add('hidden');

    const btnUp = document.getElementById('rotateCleaningUpBtn');
    if (btnUp) {
        btnUp.onclick = () => {
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
        };
    }

    const btnDown = document.getElementById('rotateCleaningDownBtn');
    if (btnDown) {
        btnDown.onclick = () => {
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
        };
    }

    const hwpxInput = document.getElementById('cleaningHwpxTemplateInput');
    const hwpxBtn = document.getElementById('downloadCleaningHwpxBtn');
    if (hwpxInput) {
        hwpxInput.onchange = () => {
            if (hwpxInput.files.length > 0) {
                cleaningHwpxBlob = hwpxInput.files[0];
                hwpxBtn?.classList.remove('hidden');
                alert("✅ 청소 구역 HWPX 양식이 등록되었습니다.");
            }
        };
    }
    if (hwpxBtn) hwpxBtn.onclick = downloadCleaningHwpx;
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
                html += `
                    <td class="p-1.5 border-r border-slate-200 align-middle">
                        <div class="group relative flex items-center justify-between px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-xl font-bold shadow-sm transition-all select-none">
                            <div class="flex items-center gap-1.5 overflow-hidden cursor-pointer flex-1" onclick="window.openCleaningSelectModal(${r}, ${c})">
                                <span class="bg-emerald-200 text-emerald-800 text-[11px] font-extrabold px-1.5 py-0.5 rounded">${student.num}번</span>
                                <span class="text-xs truncate font-extrabold text-slate-800">${student.name}</span>
                            </div>
                            <button type="button" class="text-slate-400 hover:text-rose-500 p-1 rounded-md transition-colors ml-1" title="배정 해제" onclick="window.clearCleaningSlot(${r}, ${c}); event.stopPropagation();">
                                <i class="fa-solid fa-xmark text-xs pointer-events-none"></i>
                            </button>
                        </div>
                    </td>
                `;
            } else {
                html += `
                    <td class="p-1.5 border-r border-slate-200 align-middle">
                        <button type="button" onclick="window.openCleaningSelectModal(${r}, ${c})" class="w-full py-2.5 border-2 border-dashed border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 hover:text-emerald-700 text-slate-400 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1">
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
    const g = homeroomState.grade;
    const c = homeroomState.classNum;
    const uid = homeroomState.userId;
    const key = `${uid}_${g}_${c}`;

    localStorage.setItem(`cleaning_grid_${key}`, JSON.stringify(homeroomState.cleaningData));
    localStorage.setItem(`cleaning_grid_${g}_${c}`, JSON.stringify(homeroomState.cleaningData));

    try {
        await setDoc(doc(db, "homeroom_cleaning", key), {
            userId: uid,
            grade: g,
            classNum: c,
            grid: homeroomState.cleaningData,
            updatedAt: new Date().toISOString()
        });
        await setDoc(doc(db, "homeroom_cleaning", `${g}_${c}`), {
            userId: uid,
            grade: g,
            classNum: c,
            grid: homeroomState.cleaningData,
            updatedAt: new Date().toISOString()
        });
    } catch (e) {
        console.warn("청소구역 DB 저장 에러:", e);
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
   🎯 5. 비상연락망 모듈 (이중 키 영구 저장 & 빈 배열 덮어쓰기 방지)
   ========================================================================== */
function setupContactsModule() {
    const contactModal = document.getElementById('contactModal');
    const bulkModal = document.getElementById('bulkPasteModal');

    const closeContactBtn = document.getElementById('closeContactModalBtn');
    if (closeContactBtn) closeContactBtn.onclick = () => contactModal?.classList.add('hidden');

    const openNewBtn = document.getElementById('openNewContactModalBtn');
    if (openNewBtn) openNewBtn.onclick = () => openContactEditMode(null);

    // 전체 삭제 (사용자가 직접 승인했을 때만 명시적 초기화)
    const deleteTotalBtn = document.getElementById('deleteAllContactsBtn');
    if (deleteTotalBtn) {
        deleteTotalBtn.onclick = async () => {
            if (!confirm("정말 모든 학생 연락처를 삭제하시겠습니까?")) return;
            homeroomState.contacts = [];
            renderContactGrid();
            renderExcludeStudentList();

            const g = homeroomState.grade;
            const c = homeroomState.classNum;
            const uid = homeroomState.userId;

            localStorage.removeItem(`contacts_${uid}_${g}_${c}`);
            localStorage.removeItem(`contacts_${g}_${c}`);

            try {
                await setDoc(doc(db, "homeroom_contacts", `${uid}_${g}_${c}`), { list: [] });
                await setDoc(doc(db, "homeroom_contacts", `${g}_${c}`), { list: [] });
            } catch (e) {}
        };
    }

    const openBulkBtn = document.getElementById('openBulkPasteModalBtn');
    if (openBulkBtn) {
        openBulkBtn.onclick = () => {
            const txt = document.getElementById('bulkPasteTextarea');
            if (txt) txt.value = '';
            bulkModal?.classList.remove('hidden');
        };
    }

    const closeBulkBtn = document.getElementById('closeBulkPasteModalBtn');
    if (closeBulkBtn) closeBulkBtn.onclick = () => bulkModal?.classList.add('hidden');

    const cancelBulkBtn = document.getElementById('cancelBulkPasteBtn');
    if (cancelBulkBtn) cancelBulkBtn.onclick = () => bulkModal?.classList.add('hidden');

    // 🎯 여러 명 붙여넣기 영구 저장 (UID 키 + 학급 키 이중 저장)
    const saveBulkBtn = document.getElementById('saveBulkPasteBtn');
    if (saveBulkBtn) {
        saveBulkBtn.onclick = async () => {
            const text = document.getElementById('bulkPasteTextarea')?.value || '';
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

            const g = homeroomState.grade;
            const c = homeroomState.classNum;
            const uid = homeroomState.userId;

            // 로컬스토리지 저장
            localStorage.setItem(`contacts_${uid}_${g}_${c}`, JSON.stringify(parsed));
            localStorage.setItem(`contacts_${g}_${c}`, JSON.stringify(parsed));

            // 파이어베이스 영구 저장 (어떤 환경에서도 복구되도록 2개 경로에 보관)
            try {
                await setDoc(doc(db, "homeroom_contacts", `${uid}_${g}_${c}`), {
                    userId: uid,
                    grade: g,
                    classNum: c,
                    list: parsed,
                    updatedAt: new Date().toISOString()
                });
                await setDoc(doc(db, "homeroom_contacts", `${g}_${c}`), {
                    userId: uid,
                    grade: g,
                    classNum: c,
                    list: parsed,
                    updatedAt: new Date().toISOString()
                });
            } catch (e) {
                console.error("Firestore 연락망 저장 에러:", e);
            }

            alert(`✅ 총 ${parsed.length}명의 학생 연락처가 파이어베이스 DB에 영구 저장되었습니다.`);
        };
    }

    const editModeBtn = document.getElementById('editContactModeBtn');
    if (editModeBtn) {
        editModeBtn.onclick = () => {
            const id = document.getElementById('editContactId')?.value;
            const target = homeroomState.contacts.find(c => c.id === id);
            if (target) openContactEditMode(target);
        };
    }

    const cancelEditBtn = document.getElementById('cancelContactEditBtn');
    if (cancelEditBtn) {
        cancelEditBtn.onclick = () => {
            document.getElementById('contactEditMode')?.classList.add('hidden');
            document.getElementById('contactViewMode')?.classList.remove('hidden');
        };
    }

    // 🎯 개별 학생 저장
    const saveContactBtn = document.getElementById('saveContactBtn');
    if (saveContactBtn) {
        saveContactBtn.onclick = async () => {
            const id = document.getElementById('editContactId')?.value;
            const num = Number(document.getElementById('contactNumInput')?.value);
            const name = document.getElementById('contactNameInput')?.value.trim();
            const phone = document.getElementById('contactStudentPhone')?.value.trim() || "";
            const p1 = document.getElementById('contactParentPhone')?.value.trim() || "";
            const p2 = document.getElementById('contactParent2Phone')?.value.trim() || "";

            if (!name) return alert("학생 이름을 입력해주세요.");

            if (id) {
                const idx = homeroomState.contacts.findIndex(c => c.id === id);
                if (idx !== -1) {
                    homeroomState.contacts[idx] = { id, num, name, phone, parentPhone: p1, parent2Phone: p2 };
                }
            } else {
                homeroomState.contacts.push({
                    id: `st_${Date.now()}`,
                    num: num || homeroomState.contacts.length + 1,
                    name,
                    phone,
                    parentPhone: p1,
                    parent2Phone: p2
                });
            }

            homeroomState.contacts.sort((a, b) => a.num - b.num);
            renderContactGrid();
            renderExcludeStudentList();
            contactModal?.classList.add('hidden');

            const g = homeroomState.grade;
            const c = homeroomState.classNum;
            const uid = homeroomState.userId;

            localStorage.setItem(`contacts_${uid}_${g}_${c}`, JSON.stringify(homeroomState.contacts));
            localStorage.setItem(`contacts_${g}_${c}`, JSON.stringify(homeroomState.contacts));

            try {
                await setDoc(doc(db, "homeroom_contacts", `${uid}_${g}_${c}`), {
                    userId: uid,
                    grade: g,
                    classNum: c,
                    list: homeroomState.contacts,
                    updatedAt: new Date().toISOString()
                });
                await setDoc(doc(db, "homeroom_contacts", `${g}_${c}`), {
                    userId: uid,
                    grade: g,
                    classNum: c,
                    list: homeroomState.contacts,
                    updatedAt: new Date().toISOString()
                });
            } catch (e) {}
        };
    }

    // 🎯 개별 학생 삭제
    const deleteContactBtn = document.getElementById('deleteContactBtn');
    if (deleteContactBtn) {
        deleteContactBtn.onclick = async () => {
            const id = document.getElementById('editContactId')?.value;
            if (!confirm("이 연락처를 삭제하시겠습니까?")) return;

            homeroomState.contacts = homeroomState.contacts.filter(c => c.id !== id);
            renderContactGrid();
            renderExcludeStudentList();
            contactModal?.classList.add('hidden');

            const g = homeroomState.grade;
            const c = homeroomState.classNum;
            const uid = homeroomState.userId;

            localStorage.setItem(`contacts_${uid}_${g}_${c}`, JSON.stringify(homeroomState.contacts));
            localStorage.setItem(`contacts_${g}_${c}`, JSON.stringify(homeroomState.contacts));

            try {
                await setDoc(doc(db, "homeroom_contacts", `${uid}_${g}_${c}`), {
                    userId: uid,
                    grade: g,
                    classNum: c,
                    list: homeroomState.contacts,
                    updatedAt: new Date().toISOString()
                });
                await setDoc(doc(db, "homeroom_contacts", `${g}_${c}`), {
                    userId: uid,
                    grade: g,
                    classNum: c,
                    list: homeroomState.contacts,
                    updatedAt: new Date().toISOString()
                });
            } catch (e) {}
        };
    }
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
    document.getElementById('contactModalNumber').textContent = `${contact.num}번`;
    document.getElementById('contactModalName').textContent = contact.name;

    const btnStd = document.getElementById('callStudentBtn');
    const btnP1 = document.getElementById('callParentBtn');
    const btnP2 = document.getElementById('callParent2Btn');

    if (btnStd) {
        btnStd.href = contact.phone ? `tel:${contact.phone}` : "#";
        btnStd.className = contact.phone 
            ? "flex items-center justify-center gap-2 w-full bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold py-3 rounded-2xl transition-colors text-sm border border-sky-200 shadow-sm"
            : "flex items-center justify-center gap-2 w-full bg-slate-50 text-slate-300 font-bold py-3 rounded-2xl pointer-events-none border border-slate-100 text-sm";
    }

    if (btnP1) {
        btnP1.href = contact.parentPhone ? `tel:${contact.parentPhone}` : "#";
        btnP1.className = contact.parentPhone 
            ? "flex items-center justify-center gap-1.5 w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold py-3 rounded-2xl transition-colors text-xs border border-emerald-200 shadow-sm"
            : "flex items-center justify-center gap-1.5 w-full bg-slate-50 text-slate-300 font-bold py-3 rounded-2xl pointer-events-none border border-slate-100 text-xs";
    }

    if (btnP2) {
        btnP2.href = contact.parent2Phone ? `tel:${contact.parent2Phone}` : "#";
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
   6. 자리 바꾸기 모듈
   ========================================================================== */
function setupSeatingModule() {
    const deskBtn = document.getElementById('teacherDeskBtn');
    if (deskBtn) {
        deskBtn.onclick = () => {
            const modal = document.getElementById('antiPairModal');
            const area = document.getElementById('antiPairTextarea');
            if (area) {
                area.value = homeroomState.antiPairs.map(p => `${p[0]}, ${p[1]}`).join('\n');
            }
            modal?.classList.remove('hidden');
        };
    }

    const closeAntiBtn = document.getElementById('closeAntiPairModalBtn');
    if (closeAntiBtn) closeAntiBtn.onclick = () => document.getElementById('antiPairModal')?.classList.add('hidden');

    const saveAntiBtn = document.getElementById('saveAntiPairBtn');
    if (saveAntiBtn) {
        saveAntiBtn.onclick = async () => {
            const text = document.getElementById('antiPairTextarea')?.value || '';
            const lines = text.split('\n');
            const pairs = [];

            lines.forEach(line => {
                const parts = line.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
                if (parts.length >= 2) {
                    pairs.push([parts[0], parts[1]]);
                }
            });

            homeroomState.antiPairs = pairs;
            const g = homeroomState.grade;
            const c = homeroomState.classNum;
            const uid = homeroomState.userId;

            localStorage.setItem(`anti_pairs_${uid}_${g}_${c}`, JSON.stringify(pairs));
            localStorage.setItem(`anti_pairs_${g}_${c}`, JSON.stringify(pairs));

            try {
                await setDoc(doc(db, "homeroom_anti_pairs", `${uid}_${g}_${c}`), {
                    userId: uid,
                    grade: g,
                    classNum: c,
                    pairs: pairs
                });
                await setDoc(doc(db, "homeroom_anti_pairs", `${g}_${c}`), {
                    userId: uid,
                    grade: g,
                    classNum: c,
                    pairs: pairs
                });
            } catch(e) {}

            document.getElementById('antiPairModal')?.classList.add('hidden');
            alert("🤫 기피 조합이 안전하게 비밀 저장되었습니다.");
        };
    }

    const startBtn = document.getElementById('startSeatingBtn');
    if (startBtn) startBtn.onclick = runSeatingArrangement;

    const hwpxInput = document.getElementById('hwpxTemplateInput');
    const hwpxBtn = document.getElementById('downloadHwpxBtn');
    if (hwpxInput) {
        hwpxInput.onchange = () => {
            if (hwpxInput.files.length > 0) {
                seatingHwpxBlob = hwpxInput.files[0];
                hwpxBtn?.classList.remove('hidden');
                alert("✅ 자리배치 HWPX 양식이 등록되었습니다.");
            }
        };
    }
    if (hwpxBtn) hwpxBtn.onclick = downloadSeatingHwpx;
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
            desk.innerHTML = `<span class="text-xs text-slate-300">${seat.id + 1}</span>`;
        }

        desk.onclick = () => {
            seat.disabled = !seat.disabled;
            seat.student = null;
            renderSeatingDesks();
        };

        grid.appendChild(desk);
    });
}

function renderExcludeStudentList() {
    const container = document.getElementById('excludeStudentList');
    if (!container) return;
    container.innerHTML = '';

    const list = homeroomState.contacts.length > 0 
        ? homeroomState.contacts 
        : Array.from({ length: 30 }, (_, i) => ({ num: i + 1, name: `${i + 1}번` }));

    list.forEach(s => {
        const isExcluded = homeroomState.excludedStudentNums.has(s.num);
        const chip = document.createElement('button');
        chip.className = `px-2 py-0.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-colors ${
            isExcluded 
                ? 'bg-rose-500 text-white shadow-sm' 
                : 'bg-white/20 text-white hover:bg-white/30'
        }`;
        chip.textContent = `${s.num} ${s.name}`;
        chip.onclick = () => {
            if (homeroomState.excludedStudentNums.has(s.num)) {
                homeroomState.excludedStudentNums.delete(s.num);
            } else {
                homeroomState.excludedStudentNums.add(s.num);
            }
            renderExcludeStudentList();
        };
        container.appendChild(chip);
    });
}

async function runSeatingArrangement() {
    const availableSeats = homeroomState.seatingSeats.filter(s => !s.disabled);
    
    let students = homeroomState.contacts.length > 0 
        ? homeroomState.contacts.filter(s => !homeroomState.excludedStudentNums.has(s.num))
        : Array.from({ length: availableSeats.length }, (_, i) => ({ num: i + 1, name: `${i + 1}번` }));

    if (students.length > availableSeats.length) {
        return alert(`배치할 학생(${students.length}명)이 활성화된 자리(${availableSeats.length}개)보다 많습니다.`);
    }

    let bestOrder = null;
    let attempts = 0;

    while (attempts < 100) {
        attempts++;
        const shuffled = [...students].sort(() => Math.random() - 0.5);
        let hasConflict = false;

        for (let i = 0; i < shuffled.length; i++) {
            const seatIdx = availableSeats[i].id;
            const r1 = Math.floor(seatIdx / 6);
            const c1 = seatIdx % 6;
            const st1 = shuffled[i].num;

            for (let j = i + 1; j < shuffled.length; j++) {
                const seatIdx2 = availableSeats[j].id;
                const r2 = Math.floor(seatIdx2 / 6);
                const c2 = seatIdx2 % 6;
                const st2 = shuffled[j].num;

                const isAdjacent = (Math.abs(r1 - r2) + Math.abs(c1 - c2)) === 1;
                if (isAdjacent) {
                    const isAntiPair = homeroomState.antiPairs.some(
                        p => (p[0] === st1 && p[1] === st2) || (p[0] === st2 && p[1] === st1)
                    );
                    if (isAntiPair) {
                        hasConflict = true;
                        break;
                    }
                }
            }
            if (hasConflict) break;
        }

        if (!hasConflict) {
            bestOrder = shuffled;
            break;
        }
    }

    if (!bestOrder) {
        bestOrder = [...students].sort(() => Math.random() - 0.5);
    }

    const skipAnim = document.getElementById('skipAnimationCheckbox')?.checked;

    if (skipAnim) {
        availableSeats.forEach((seat, idx) => {
            seat.student = bestOrder[idx] || null;
        });
        renderSeatingDesks();
        if (typeof confetti === 'function') confetti({ particleCount: 70, spread: 60 });
    } else {
        availableSeats.forEach(s => s.student = null);
        renderSeatingDesks();

        for (let i = 0; i < availableSeats.length; i++) {
            availableSeats[i].student = bestOrder[i] || null;
            renderSeatingDesks();
            await new Promise(r => setTimeout(r, 60));
        }
        if (typeof confetti === 'function') confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }
}

async function downloadSeatingHwpx() {
    if (!seatingHwpxBlob) return alert("등록된 HWPX 양식이 없습니다.");
    try {
        const zip = await JSZip.loadAsync(seatingHwpxBlob);
        let sectionXml = await zip.file("Contents/section0.xml")?.async("string");
        if (!sectionXml) return alert("HWPX 문서 구조를 읽을 수 없습니다.");

        homeroomState.seatingSeats.forEach((seat, idx) => {
            const tag = `{{S_${idx + 1}}}`;
            const text = seat.student ? `${seat.student.num} ${seat.student.name}` : (seat.disabled ? "제외" : "");
            sectionXml = sectionXml.replaceAll(tag, text);
        });

        zip.file("Contents/section0.xml", sectionXml);
        const outBlob = await zip.generateAsync({ type: "blob" });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(outBlob);
        a.download = `${homeroomState.grade}학년_${homeroomState.classNum}반_자리배치.hwpx`;
        a.click();
    } catch(e) {
        alert("HWPX 다운로드 중 오류가 발생했습니다.");
    }
}

/* ==========================================================================
   전역 이벤트 위임 (어떤 환경에서도 버튼이 무조건 반응하도록 보장)
   ========================================================================== */
if (typeof document !== 'undefined') {
    document.addEventListener('click', (e) => {
        const subTab = e.target.closest('#homeroomSubTabContacts, #homeroomSubTabSeating, #homeroomSubTabCleaning');
        if (subTab) {
            e.preventDefault();
            if (subTab.id === 'homeroomSubTabContacts') switchHomeroomSubTab('contacts');
            else if (subTab.id === 'homeroomSubTabSeating') switchHomeroomSubTab('seating');
            else if (subTab.id === 'homeroomSubTabCleaning') switchHomeroomSubTab('cleaning');
            return;
        }

        if (e.target.closest('#openNewContactModalBtn')) {
            e.preventDefault();
            openContactEditMode(null);
            return;
        }
        if (e.target.closest('#openBulkPasteModalBtn')) {
            e.preventDefault();
            const bulk = document.getElementById('bulkPasteModal');
            const txt = document.getElementById('bulkPasteTextarea');
            if (txt) txt.value = '';
            bulk?.classList.remove('hidden');
            return;
        }
        if (e.target.closest('#closeBulkPasteModalBtn, #cancelBulkPasteBtn')) {
            e.preventDefault();
            document.getElementById('bulkPasteModal')?.classList.add('hidden');
            return;
        }
        if (e.target.closest('#closeContactModalBtn')) {
            e.preventDefault();
            document.getElementById('contactModal')?.classList.add('hidden');
            return;
        }
        if (e.target.closest('#teacherDeskBtn')) {
            e.preventDefault();
            const modal = document.getElementById('antiPairModal');
            const area = document.getElementById('antiPairTextarea');
            if (area) area.value = homeroomState.antiPairs.map(p => `${p[0]}, ${p[1]}`).join('\n');
            modal?.classList.remove('hidden');
            return;
        }
        if (e.target.closest('#closeAntiPairModalBtn')) {
            e.preventDefault();
            document.getElementById('antiPairModal')?.classList.add('hidden');
            return;
        }
        if (e.target.closest('#closeCleaningSelectModalBtn')) {
            e.preventDefault();
            document.getElementById('cleaningStudentSelectModal')?.classList.add('hidden');
            return;
        }
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupAllModules);
    } else {
        setupAllModules();
    }
}
