import { db, auth, collection, addDoc, updateDoc, deleteDoc, doc, setDoc, getDoc, onSnapshot, query, orderBy } from './firebase-config.js';

let students = [];
let disabledSeats = []; 
let excludedStudents = []; 
let antiPairs = []; 
let allocatedSeats = new Array(36).fill(null); 

// 🎯 청소 및 파일 상태 관리
let hwpxFileBlob = null; 
let cleaningHwpxBlob = null;
let cleaningMatrix = Array(6).fill().map(() => Array(5).fill(null)); 
let cleaningSelectRow = -1;
let cleaningSelectCol = -1;

let currentClassStr = '1-7'; 
let unsubscribeContacts = null; 
let unsubscribeCleaning = null;

// Helper: Base64를 Blob으로 변환 (로컬 저장소 복구용)
function dataURItoBlob(dataURI) {
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
    return new Blob([ab], {type: mimeString});
}

// 🎯 브라우저에 영구 보존된 HWPX 양식 불러오기
function loadSavedTemplates() {
    const seatingURI = localStorage.getItem(`hwpx_seating_${currentClassStr}`);
    if (seatingURI) {
        hwpxFileBlob = dataURItoBlob(seatingURI);
        document.getElementById('downloadHwpxBtn')?.classList.remove('hidden');
        document.getElementById('seatingHwpxLabel').innerHTML = '<i class="fa-solid fa-check"></i> 저장된 양식 켬';
    } else {
        hwpxFileBlob = null;
        document.getElementById('downloadHwpxBtn')?.classList.add('hidden');
        document.getElementById('seatingHwpxLabel').innerHTML = '<i class="fa-solid fa-file-arrow-up"></i> 양식 등록(.hwpx)';
    }
    
    const cleaningURI = localStorage.getItem(`hwpx_cleaning_${currentClassStr}`);
    if (cleaningURI) {
        cleaningHwpxBlob = dataURItoBlob(cleaningURI);
        document.getElementById('downloadCleaningHwpxBtn')?.classList.remove('hidden');
        document.getElementById('cleaningHwpxLabel').innerHTML = '<i class="fa-solid fa-check"></i> 저장된 양식 켬';
    } else {
        cleaningHwpxBlob = null;
        document.getElementById('downloadCleaningHwpxBtn')?.classList.add('hidden');
        document.getElementById('cleaningHwpxLabel').innerHTML = '<i class="fa-solid fa-file-arrow-up"></i> 양식 등록(.hwpx)';
    }
}

document.addEventListener('DOMContentLoaded', () => {

    const tabContactBtn = document.getElementById('homeroomSubTabContacts');
    const tabSeatingBtn = document.getElementById('homeroomSubTabSeating');
    const tabCleaningBtn = document.getElementById('homeroomSubTabCleaning');
    const secContacts = document.getElementById('homeroomSectionContacts');
    const secSeating = document.getElementById('homeroomSectionSeating');
    const secCleaning = document.getElementById('homeroomSectionCleaning');

    function switchSubTab(target) {
        const onClass = "px-4 py-2 text-sm font-bold bg-white rounded-xl shadow-sm transition-all ";
        const offClass = "px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-800 rounded-xl transition-all";
        
        tabContactBtn.className = offClass; tabSeatingBtn.className = offClass; tabCleaningBtn.className = offClass;
        secContacts.classList.add('hidden'); secSeating.classList.add('hidden'); secCleaning.classList.add('hidden');

        if (target === 'cleaning') {
            tabCleaningBtn.className = onClass + "text-emerald-600"; secCleaning.classList.remove('hidden'); renderCleaningGrid();
        } else if (target === 'seating') {
            tabSeatingBtn.className = onClass + "text-indigo-600"; secSeating.classList.remove('hidden'); renderSeatGrid(); renderExcludeList();
        } else {
            tabContactBtn.className = onClass + "text-rose-600"; secContacts.classList.remove('hidden');
        }
    }

    tabContactBtn?.addEventListener('click', () => switchSubTab('contacts'));
    tabSeatingBtn?.addEventListener('click', () => switchSubTab('seating'));
    tabCleaningBtn?.addEventListener('click', () => switchSubTab('cleaning'));

    document.getElementById('deleteAllContactsBtn')?.addEventListener('click', async () => {
        if (!auth.currentUser) return alert("교사 로그인이 필요합니다.");
        if (students.length === 0) return alert("삭제할 연락처가 없습니다.");
        const answer = prompt(`⚠️ 등록된 ${students.length}명의 연락처를 모두 삭제하시겠습니까?\n진행하시려면 '삭제합니다' 라고 입력해주세요.`);
        if (answer === '삭제합니다') {
            try {
                const colName = `homeroom_contacts_${currentClassStr}`;
                await Promise.all(students.map(st => deleteDoc(doc(db, colName, st.id))));
                alert("✅ 전체 삭제가 안전하게 완료되었습니다.");
            } catch (e) { alert("삭제 처리 중 오류가 발생했습니다."); }
        } else if (answer !== null) { alert("입력 문구가 일치하지 않아 취소되었습니다."); }
    });

    document.getElementById('openBulkPasteModalBtn')?.addEventListener('click', () => { document.getElementById('bulkPasteTextarea').value = ''; document.getElementById('bulkPasteModal').classList.remove('hidden'); });
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
                    if (!current.name) current.name = line; else current.phones.push(line);
                }
            }
            if (current) parsedStudents.push(current);
        } else {
            const lines = rawText.split('\n');
            for (let line of lines) {
                const rowData = line.trim().split(/\t+/);
                if (rowData.length < 2) continue;
                const num = Number(rowData[0]); const name = String(rowData[1] || "").trim();
                if (isNaN(num) || !name) continue;
                let sPhone = String(rowData[3] || "").trim(); let pPhone1 = String(rowData[4] || "").trim(); let pPhone2 = String(rowData[5] || "").trim();
                parsedStudents.push({ number: num, name, phones: [sPhone, pPhone1, pPhone2].filter(Boolean) });
            }
        }
        if (parsedStudents.length === 0) return alert("파싱할 수 있는 데이터가 없습니다.");
        let importCount = 0;
        const colName = `homeroom_contacts_${currentClassStr}`;
        for (let st of parsedStudents) {
            const payload = { number: st.number, name: st.name, studentPhone: st.phones[0] || "", parentPhone1: st.phones[1] || "", parentPhone2: st.phones[2] || "" };
            const existing = students.find(s => s.number === st.number);
            try {
                if (existing) await updateDoc(doc(db, colName, existing.id), payload);
                else await addDoc(collection(db, colName), payload);
                importCount++;
            } catch (err) {}
        }
        alert(`✅ 일괄 등록 완료 (총 ${importCount}명)`);
        document.getElementById('bulkPasteModal').classList.add('hidden');
    });

    document.getElementById('openNewContactModalBtn')?.addEventListener('click', () => {
        document.getElementById('editContactId').value = ''; document.getElementById('contactNumInput').value = ''; document.getElementById('contactNameInput').value = '';
        document.getElementById('contactStudentPhone').value = ''; document.getElementById('contactParentPhone').value = ''; document.getElementById('contactParent2Phone').value = '';
        document.getElementById('contactModalNumber').textContent = "신규"; document.getElementById('contactModalName').textContent = "학생 추가";
        document.getElementById('contactViewMode').classList.add('hidden'); document.getElementById('contactEditMode').classList.remove('hidden');
        document.getElementById('contactModal').classList.remove('hidden');
    });

    document.getElementById('closeContactModalBtn')?.addEventListener('click', () => document.getElementById('contactModal').classList.add('hidden'));
    document.getElementById('cancelContactEditBtn')?.addEventListener('click', () => {
        if (document.getElementById('editContactId').value) { document.getElementById('contactEditMode').classList.add('hidden'); document.getElementById('contactViewMode').classList.remove('hidden'); } 
        else document.getElementById('contactModal').classList.add('hidden');
    });
    document.getElementById('editContactModeBtn')?.addEventListener('click', () => { document.getElementById('contactViewMode').classList.add('hidden'); document.getElementById('contactEditMode').classList.remove('hidden'); });
    
    document.getElementById('deleteContactBtn')?.addEventListener('click', async () => {
        const id = document.getElementById('editContactId').value;
        const colName = `homeroom_contacts_${currentClassStr}`;
        if (id && confirm("개별 삭제할까요?")) { await deleteDoc(doc(db, colName, id)); document.getElementById('contactModal').classList.add('hidden'); }
    });

    document.getElementById('saveContactBtn')?.addEventListener('click', async () => {
        if (!auth.currentUser) return alert("로그인 필요");
        const num = Number(document.getElementById('contactNumInput').value); const name = document.getElementById('contactNameInput').value.trim();
        if (!num || !name) return alert("번호와 이름 입력 필수");
        const payload = { number: num, name, studentPhone: document.getElementById('contactStudentPhone').value.trim(), parentPhone1: document.getElementById('contactParentPhone').value.trim(), parentPhone2: document.getElementById('contactParent2Phone').value.trim() };
        const editId = document.getElementById('editContactId').value;
        const colName = `homeroom_contacts_${currentClassStr}`;
        try { if (editId) await updateDoc(doc(db, colName, editId), payload); else await addDoc(collection(db, colName), payload);
        document.getElementById('contactModal').classList.add('hidden'); } catch (e) { alert("저장 실패"); }
    });

    let deskClicks = 0;
    let deskTimer;
    document.getElementById('teacherDeskBtn')?.addEventListener('click', () => {
        deskClicks++; clearTimeout(deskTimer); deskTimer = setTimeout(() => { deskClicks = 0; }, 1000); 
        if (deskClicks >= 3) { document.getElementById('antiPairModal').classList.remove('hidden'); deskClicks = 0; }
    });

    document.getElementById('closeAntiPairModalBtn')?.addEventListener('click', () => document.getElementById('antiPairModal').classList.add('hidden'));
    document.getElementById('saveAntiPairBtn')?.addEventListener('click', () => {
        const text = document.getElementById('antiPairTextarea').value;
        antiPairs = text.split('\n').map(line => {
            const parts = line.split(',').map(n => Number(n.trim()));
            return parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) ? parts : null;
        }).filter(p => p !== null);
        alert("🤫 기피 조합이 안전하게 비밀 저장되었습니다.");
        document.getElementById('antiPairModal').classList.add('hidden');
    });

    // 🎯 HWPX 양식 등록 시 LocalStorage로 내장 영구 보존 처리 (자리 뽑기)
    document.getElementById('hwpxTemplateInput')?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if(file) {
            const reader = new FileReader();
            reader.onload = function(evt) {
                localStorage.setItem(`hwpx_seating_${currentClassStr}`, evt.target.result);
                hwpxFileBlob = dataURItoBlob(evt.target.result);
                document.getElementById('seatingHwpxLabel').innerHTML = '<i class="fa-solid fa-check"></i> 저장된 양식 켬';
                alert(`✅ HWPX 템플릿 파일이 브라우저에 영구 보존되었습니다.\n(앞으로는 양식이 바뀔 때만 다시 올려주시면 됩니다.)`);
                if(allocatedSeats.some(s => s !== null)) document.getElementById('downloadHwpxBtn').classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        }
    });

    document.getElementById('startSeatingBtn')?.addEventListener('click', async () => {
        if (students.length === 0) return alert("학생 명단이 없습니다. 먼저 비상연락망에 학생을 등록해주세요.");
        const activeStudents = students.filter(s => !excludedStudents.includes(s.number));
        const validSeatIndices = [];
        for (let i = 0; i < 36; i++) { if (!disabledSeats.includes(i)) validSeatIndices.push(i); }

        if (activeStudents.length > validSeatIndices.length) return alert(`자리가 부족합니다!\n학생 수: ${activeStudents.length}명\n빈자리 수: ${validSeatIndices.length}석`);

        let finalAllocation = null;
        let attempts = 0;
        while (attempts < 2000) { 
            attempts++;
            let shuffled = [...activeStudents];
            for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }

            let tempSeats = new Array(36).fill(null);
            let sIdx = 0;
            for (let idx of validSeatIndices) { if (sIdx < shuffled.length) { tempSeats[idx] = shuffled[sIdx]; sIdx++; } }

            let isSafe = true;
            for (let pair of antiPairs) {
                const pos1 = tempSeats.findIndex(s => s && s.number === pair[0]);
                const pos2 = tempSeats.findIndex(s => s && s.number === pair[1]);
                if (pos1 !== -1 && pos2 !== -1) {
                    const r1 = Math.floor(pos1 / 6), c1 = pos1 % 6; const r2 = Math.floor(pos2 / 6), c2 = pos2 % 6;
                    if ((r1 === r2 && Math.abs(c1 - c2) === 1) || (c1 === c2 && Math.abs(r1 - r2) === 1)) { isSafe = false; break; }
                }
            }
            if (isSafe) { finalAllocation = tempSeats; break; }
        }

        if (!finalAllocation) return alert("기피 조합 조건이 너무 빡빡하여 배치를 찾지 못했습니다. 기피 조합을 조금 줄여주세요.");
        allocatedSeats = finalAllocation; 

        const skipAnim = document.getElementById('skipAnimationCheckbox').checked;
        if (skipAnim) { renderSeatGrid(); triggerConfetti(); } else {
            const btn = document.getElementById('startSeatingBtn'); btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 돌리는 중...';
            let ticks = 0; const maxTicks = 15; 
            const interval = setInterval(() => {
                const grid = document.getElementById('seatingGrid'); grid.innerHTML = '';
                for (let i = 0; i < 36; i++) {
                    const cell = document.createElement('div');
                    if (disabledSeats.includes(i)) {
                        cell.className = "h-16 sm:h-20 bg-slate-200 border-2 border-slate-300 rounded-xl flex items-center justify-center opacity-50"; cell.innerHTML = `<i class="fa-solid fa-xmark text-slate-400"></i>`;
                    } else if (validSeatIndices.includes(i) && Math.random() > 0.3) {
                        const randStudent = activeStudents[Math.floor(Math.random() * activeStudents.length)];
                        cell.className = "h-16 sm:h-20 bg-indigo-50 border-2 border-indigo-200 rounded-xl flex flex-col items-center justify-center shadow-sm";
                        cell.innerHTML = `<span class="text-xs text-indigo-400 font-bold">${randStudent.number}</span><span class="text-sm sm:text-base font-extrabold text-indigo-700">${randStudent.name}</span>`;
                    } else { cell.className = "h-16 sm:h-20 bg-slate-50 border-2 border-slate-200 rounded-xl"; }
                    grid.appendChild(cell);
                }
                ticks++;
                if (ticks >= maxTicks) { clearInterval(interval); renderSeatGrid(); triggerConfetti(); btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-play"></i> 자리 뽑기'; }
            }, 100);
        }
    });

    document.getElementById('downloadHwpxBtn')?.addEventListener('click', async () => {
        if(!hwpxFileBlob) return alert("양식이 등록되어 있지 않습니다. 양식을 등록해주세요.");
        try {
            const zip = await JSZip.loadAsync(hwpxFileBlob);
            let xmlContent = await zip.file("Contents/section0.xml").async("string");
            
            for (let i = 0; i < 36; i++) {
                const st = allocatedSeats[i];
                const replaceText = st ? `${st.number}.${st.name}` : ""; 
                const hwpxIndex = 36 - i; 
                const regex = new RegExp(`\\{\\{자리${hwpxIndex}\\}\\}`, 'g');
                xmlContent = xmlContent.replace(regex, replaceText);
            }
            zip.file("Contents/section0.xml", xmlContent);
            
            const newBlob = await zip.generateAsync({ type: "blob" });
            const url = window.URL.createObjectURL(newBlob);
            const a = document.createElement('a'); a.href = url; a.download = `${currentClassStr}반_자리배치결과.hwpx`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a); window.URL.revokeObjectURL(url);
        } catch (error) { alert("HWPX 처리 오류. 올바른 양식 파일인지 확인해주세요."); }
    });

    // ==========================================
    // 🎯 신규 기능: 청소 구역 (가로 1몸 회전 로직 + 영구 저장)
    // ==========================================

    document.getElementById('cleaningHwpxTemplateInput')?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if(file) {
            const reader = new FileReader();
            reader.onload = function(evt) {
                localStorage.setItem(`hwpx_cleaning_${currentClassStr}`, evt.target.result);
                cleaningHwpxBlob = dataURItoBlob(evt.target.result);
                document.getElementById('cleaningHwpxLabel').innerHTML = '<i class="fa-solid fa-check"></i> 저장된 양식 켬';
                document.getElementById('downloadCleaningHwpxBtn').classList.remove('hidden');
                alert(`✅ 청소구역 HWPX 템플릿 파일이 브라우저에 영구 보존되었습니다.`);
            };
            reader.readAsDataURL(file);
        }
    });

    // 회전 저장 통합 로직
    async function saveAndRenderCleaning() {
        const docName = `homeroom_cleaning_${currentClassStr}`;
        await setDoc(doc(db, "homeroom_cleaning_data", docName), { matrix: cleaningMatrix });
    }

    // ⬆️ 위로 교대
    document.getElementById('rotateCleaningUpBtn')?.addEventListener('click', async () => {
        if (!auth.currentUser) return alert("교사 로그인이 필요합니다.");
        const firstRow = cleaningMatrix.shift(); // 첫 줄 빼서
        cleaningMatrix.push(firstRow);           // 맨 밑에 삽입
        await saveAndRenderCleaning();
    });

    // ⬇️ 아래로 교대
    document.getElementById('rotateCleaningDownBtn')?.addEventListener('click', async () => {
        if (!auth.currentUser) return alert("교사 로그인이 필요합니다.");
        const lastRow = cleaningMatrix.pop();    // 맨 밑줄 빼서
        cleaningMatrix.unshift(lastRow);         // 첫 줄에 삽입
        await saveAndRenderCleaning();
    });

    document.getElementById('closeCleaningSelectModalBtn')?.addEventListener('click', () => document.getElementById('cleaningStudentSelectModal').classList.add('hidden'));

    // HWPX 파일 다운로드 (청소 구역용)
    document.getElementById('downloadCleaningHwpxBtn')?.addEventListener('click', async () => {
        if(!cleaningHwpxBlob) return alert("먼저 상단의 [양식 등록]을 눌러 청소구역 HWPX 템플릿 파일을 올려주세요.");
        
        try {
            const zip = await JSZip.loadAsync(cleaningHwpxBlob);
            let xmlContent = await zip.file("Contents/section0.xml").async("string");
            
            // {{청소1}} ~ {{청소30}}
            for (let r = 0; r < 6; r++) {
                for (let c = 0; c < 5; c++) {
                    const st = cleaningMatrix[r][c];
                    const replaceText = st ? `${st.number}.${st.name}` : ""; 
                    const hwpxIndex = (r * 5) + c + 1; 
                    const regex = new RegExp(`\\{\\{청소${hwpxIndex}\\}\\}`, 'g');
                    xmlContent = xmlContent.replace(regex, replaceText);
                }
            }
            zip.file("Contents/section0.xml", xmlContent);
            const newBlob = await zip.generateAsync({ type: "blob" });
            const url = window.URL.createObjectURL(newBlob);
            const a = document.createElement('a'); a.href = url; a.download = `${currentClassStr}반_청소구역결과.hwpx`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a); window.URL.revokeObjectURL(url);
        } catch (error) { alert("HWPX 처리 오류. 올바른 양식 파일인지 확인해주세요."); }
    });
});

export function updateHomeroomClass(classStr) {
    if (!auth.currentUser) return;
    currentClassStr = classStr;
    
    loadSavedTemplates(); // 🎯 클래스가 바뀔 때마다 각 반의 로컬 양식을 불러옵니다.
    
    if (unsubscribeContacts) unsubscribeContacts();
    if (unsubscribeCleaning) unsubscribeCleaning();
    
    students = [];
    allocatedSeats = new Array(36).fill(null);
    cleaningMatrix = Array(6).fill().map(() => Array(5).fill(null)); 
    
    renderContacts();
    renderExcludeList();
    renderSeatGrid();
    renderCleaningGrid();
    
    const colName = `homeroom_contacts_${currentClassStr}`;
    unsubscribeContacts = onSnapshot(query(collection(db, colName), orderBy("number", "asc")), (snapshot) => {
        students = [];
        snapshot.forEach(d => students.push({ id: d.id, ...d.data() }));
        renderContacts();
        renderExcludeList();
    });

    const cleanDocName = `homeroom_cleaning_${currentClassStr}`;
    unsubscribeCleaning = onSnapshot(doc(db, "homeroom_cleaning_data", cleanDocName), (snapshot) => {
        if(snapshot.exists() && snapshot.data().matrix) {
            cleaningMatrix = snapshot.data().matrix;
        } else {
            cleaningMatrix = Array(6).fill().map(() => Array(5).fill(null)); 
        }
        renderCleaningGrid();
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
        card.className = "bg-white py-3 px-1 rounded-xl shadow-sm border border-rose-100 hover:border-rose-300 hover:shadow-md cursor-pointer flex flex-col items-center text-center transition-all";
        card.innerHTML = `<div class="w-9 h-9 sm:w-10 sm:h-10 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center text-sm sm:text-base font-bold mb-1.5 border border-rose-100 shadow-sm">${st.number}</div><h4 class="font-bold text-slate-800 text-[11px] sm:text-xs w-full truncate px-1" title="${st.name}">${st.name}</h4>`;
        card.onclick = () => openContactModal(st);
        container.appendChild(card);
    });
}

function renderExcludeList() {
    const container = document.getElementById('excludeStudentList');
    if (!container) return;
    container.innerHTML = '';
    students.forEach(st => {
        const label = document.createElement('label');
        label.className = "flex items-center gap-1 bg-white px-2 py-1 rounded border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors whitespace-nowrap";
        const isChecked = excludedStudents.includes(st.number) ? "checked" : "";
        label.innerHTML = `<input type="checkbox" value="${st.number}" class="w-3 h-3 text-indigo-600 rounded border-slate-300" ${isChecked}> <span class="text-[10px] sm:text-xs font-bold text-slate-600">${st.name}</span>`;
        label.querySelector('input').addEventListener('change', (e) => {
            if (e.target.checked) excludedStudents.push(st.number);
            else excludedStudents = excludedStudents.filter(n => n !== st.number);
        });
        container.appendChild(label);
    });
}

function renderSeatGrid() {
    const grid = document.getElementById('seatingGrid');
    if (!grid) return;
    grid.innerHTML = '';
    for (let i = 0; i < 36; i++) {
        const cell = document.createElement('div');
        const st = allocatedSeats[i]; 
        if (disabledSeats.includes(i)) {
            cell.className = "h-16 sm:h-20 bg-slate-200 border-2 border-slate-300 rounded-xl flex items-center justify-center cursor-pointer hover:opacity-80 transition-all";
            cell.innerHTML = `<i class="fa-solid fa-xmark text-slate-400"></i>`;
        } else if (st) {
            cell.className = "h-16 sm:h-20 bg-indigo-50 border-2 border-indigo-300 rounded-xl flex flex-col items-center justify-center shadow-md cursor-pointer hover:bg-indigo-100 transition-all";
            cell.innerHTML = `<span class="text-[10px] sm:text-xs text-indigo-500 font-bold">${st.number}</span><span class="text-sm sm:text-base font-extrabold text-indigo-800">${st.name}</span>`;
        } else {
            cell.className = "h-16 sm:h-20 bg-white border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-all text-slate-300";
            cell.innerHTML = `<span class="text-xs">클릭시</span><span class="text-[10px]">제외</span>`;
        }

        cell.onclick = () => {
            if(allocatedSeats.some(s => s !== null)) {
                if(confirm("배치된 자리가 초기화됩니다. 변경하시겠습니까?")) {
                    allocatedSeats = new Array(36).fill(null);
                    renderSeatGrid();
                }
                return;
            }
            if (disabledSeats.includes(i)) disabledSeats = disabledSeats.filter(idx => idx !== i);
            else disabledSeats.push(i);
            renderSeatGrid();
        };
        grid.appendChild(cell);
    }
}

// 🎯 청소 구역 테이블 렌더링 함수
function renderCleaningGrid() {
    const tbody = document.getElementById('cleaningGridBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const rowLabels = [
        "교실 쓸기 - 창", "교실 쓸기 - 중앙", "교실 쓸기 - 복도", 
        "컴퓨터실 - 창문쪽", "컴퓨터실 - 복도쪽", "교탁 및 칠판"
    ];

    for (let r = 0; r < 6; r++) {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50 transition-colors";
        
        const th = document.createElement('td');
        th.className = "py-3 px-2 border-r border-slate-200 font-bold text-xs bg-slate-50";
        th.textContent = rowLabels[r];
        tr.appendChild(th);

        for (let c = 0; c < 5; c++) {
            const td = document.createElement('td');
            const isLast = c === 4;
            td.className = `py-3 px-2 cursor-pointer transition-all ${isLast ? '' : 'border-r border-slate-200'}`;
            
            const st = cleaningMatrix[r][c];
            if (st) {
                td.innerHTML = `<div class="bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold py-1.5 rounded-lg text-[11px] hover:bg-emerald-100">${st.number}. ${st.name}</div>`;
            } else {
                td.innerHTML = `<div class="text-slate-300 text-[10px] py-1.5 border border-dashed border-slate-200 rounded-lg hover:bg-slate-100">+ 배정</div>`;
            }

            td.onclick = () => openCleaningStudentSelect(r, c);
            tr.appendChild(td);
        }
        tbody.appendChild(tr);
    }
}

// 청소 구역 학생 선택 팝업 오픈
function openCleaningStudentSelect(row, col) {
    cleaningSelectRow = row;
    cleaningSelectCol = col;
    
    const list = document.getElementById('cleaningStudentList');
    list.innerHTML = '';
    
    // 빈칸 비우기 버튼
    const clearBtn = document.createElement('button');
    clearBtn.className = "col-span-full py-2 bg-slate-100 text-slate-500 font-bold rounded-lg hover:bg-slate-200 mb-2 border border-slate-200";
    clearBtn.textContent = "비우기 (삭제)";
    clearBtn.onclick = async () => {
        cleaningMatrix[cleaningSelectRow][cleaningSelectCol] = null;
        document.getElementById('cleaningStudentSelectModal').classList.add('hidden');
        await setDoc(doc(db, "homeroom_cleaning_data", `homeroom_cleaning_${currentClassStr}`), { matrix: cleaningMatrix });
    };
    list.appendChild(clearBtn);

    students.forEach(st => {
        // 이미 다른 칸에 있는지 확인
        let isAlreadyAssigned = false;
        for(let r=0; r<6; r++){
            for(let c=0; c<5; c++){
                if(cleaningMatrix[r][c] && cleaningMatrix[r][c].number === st.number) isAlreadyAssigned = true;
            }
        }

        const btn = document.createElement('button');
        btn.className = `p-2 rounded-xl border text-center font-bold text-[11px] transition-colors ${isAlreadyAssigned ? 'bg-slate-50 text-slate-400 border-slate-200' : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'}`;
        btn.textContent = `${st.number}. ${st.name}`;
        
        btn.onclick = async () => {
            // 다른 칸에 있던 학생이면 예전 칸 지우기
            for(let r=0; r<6; r++){
                for(let c=0; c<5; c++){
                    if(cleaningMatrix[r][c] && cleaningMatrix[r][c].number === st.number) cleaningMatrix[r][c] = null;
                }
            }
            cleaningMatrix[cleaningSelectRow][cleaningSelectCol] = { number: st.number, name: st.name };
            document.getElementById('cleaningStudentSelectModal').classList.add('hidden');
            await setDoc(doc(db, "homeroom_cleaning_data", `homeroom_cleaning_${currentClassStr}`), { matrix: cleaningMatrix });
        };
        list.appendChild(btn);
    });
    
    document.getElementById('cleaningStudentSelectModal').classList.remove('hidden');
}

function triggerConfetti() {
    var duration = 2 * 1000;
    var animationEnd = Date.now() + duration;
    var defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };
    function randomInRange(min, max) { return Math.random() * (max - min) + min; }
    var interval = setInterval(function() {
        var timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) { return clearInterval(interval); }
        var particleCount = 50 * (timeLeft / duration);
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
    }, 250);
}

function openContactModal(st) {
    document.getElementById('contactModalNumber').textContent = String(st.number).padStart(2, '0');
    document.getElementById('contactModalName').textContent = st.name;
    const p1 = st.parentPhone1 || ''; const p2 = st.parentPhone2 || '';
    document.getElementById('editContactId').value = st.id; document.getElementById('contactNumInput').value = st.number;
    document.getElementById('contactNameInput').value = st.name; document.getElementById('contactStudentPhone').value = st.studentPhone || '';
    document.getElementById('contactParentPhone').value = p1; document.getElementById('contactParent2Phone').value = p2;

    const btnS = document.getElementById('callStudentBtn'); const txtS = document.getElementById('callStudentText');
    if (st.studentPhone) { btnS.href = `tel:${st.studentPhone}`; btnS.className = "flex items-center justify-center gap-2 w-full bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold py-3.5 rounded-2xl text-sm border border-sky-200 shadow-sm"; txtS.textContent = `학생 연결`; } 
    else { btnS.removeAttribute('href'); btnS.className = "flex items-center justify-center gap-2 w-full bg-slate-50 text-slate-400 font-bold py-3.5 rounded-2xl cursor-not-allowed text-sm border border-slate-200"; txtS.textContent = "학생 연락처 없음"; }

    const btnP1 = document.getElementById('callParentBtn'); const txtP1 = document.getElementById('callParentText');
    if (p1) { btnP1.href = `tel:${p1}`; btnP1.className = "flex items-center justify-center gap-1.5 w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold py-3.5 rounded-2xl text-xs sm:text-sm border border-emerald-200 shadow-sm"; txtP1.textContent = `학부모 1 연결`; } 
    else { btnP1.removeAttribute('href'); btnP1.className = "flex items-center justify-center gap-1.5 w-full bg-slate-50 text-slate-400 font-bold py-3.5 rounded-2xl cursor-not-allowed text-xs sm:text-sm border border-slate-200"; txtP1.textContent = "학부모 1 없음"; }

    const btnP2 = document.getElementById('callParent2Btn'); const txtP2 = document.getElementById('callParent2Text');
    if (p2 && p2 !== '없다') { btnP2.href = `tel:${p2}`; btnP2.className = "flex items-center justify-center gap-1.5 w-full bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold py-3.5 rounded-2xl text-xs sm:text-sm border border-amber-200 shadow-sm"; txtP2.textContent = `학부모 2 연결`; } 
    else { btnP2.removeAttribute('href'); btnP2.className = "flex items-center justify-center gap-1.5 w-full bg-slate-50 text-slate-400 font-bold py-3.5 rounded-2xl cursor-not-allowed text-xs sm:text-sm border border-slate-200"; txtP2.textContent = "학부모 2 없음"; }

    document.getElementById('contactEditMode').classList.add('hidden'); document.getElementById('contactViewMode').classList.remove('hidden'); document.getElementById('contactModal').classList.remove('hidden');
}
