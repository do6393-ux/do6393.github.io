import { db, auth, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from './firebase-config.js';

let students = [];
let disabledSeats = []; 
let excludedStudents = []; 
let antiPairs = []; 
let allocatedSeats = new Array(36).fill(null); 
let hwpxFileBlob = null; 

document.addEventListener('DOMContentLoaded', () => {

    const tabContactBtn = document.getElementById('homeroomSubTabContacts');
    const tabSeatingBtn = document.getElementById('homeroomSubTabSeating');
    const secContacts = document.getElementById('homeroomSectionContacts');
    const secSeating = document.getElementById('homeroomSectionSeating');

    tabContactBtn?.addEventListener('click', () => {
        tabContactBtn.className = "px-4 py-2 text-sm font-bold bg-white text-rose-600 rounded-xl shadow-sm transition-all";
        tabSeatingBtn.className = "px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-800 rounded-xl transition-all";
        secContacts.classList.remove('hidden');
        secSeating.classList.add('hidden');
    });

    tabSeatingBtn?.addEventListener('click', () => {
        tabSeatingBtn.className = "px-4 py-2 text-sm font-bold bg-white text-indigo-600 rounded-xl shadow-sm transition-all";
        tabContactBtn.className = "px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-800 rounded-xl transition-all";
        secSeating.classList.remove('hidden');
        secContacts.classList.add('hidden');
        renderSeatGrid(); 
        renderExcludeList();
    });

    document.getElementById('deleteAllContactsBtn')?.addEventListener('click', async () => {
        if (!auth.currentUser) return alert("교사 로그인이 필요합니다.");
        if (students.length === 0) return alert("삭제할 연락처가 없습니다.");
        const answer = prompt(`⚠️ 등록된 ${students.length}명의 연락처를 모두 삭제하시겠습니까?\n진행하시려면 '삭제합니다' 라고 입력해주세요.`);
        if (answer === '삭제합니다') {
            try {
                await Promise.all(students.map(st => deleteDoc(doc(db, "homeroom_contacts", st.id))));
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
        for (let st of parsedStudents) {
            const payload = { number: st.number, name: st.name, studentPhone: st.phones[0] || "", parentPhone1: st.phones[1] || "", parentPhone2: st.phones[2] || "" };
            const existing = students.find(s => s.number === st.number);
            try {
                if (existing) await updateDoc(doc(db, "homeroom_contacts", existing.id), payload);
                else await addDoc(collection(db, "homeroom_contacts"), payload);
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
        if (id && confirm("개별 삭제할까요?")) { await deleteDoc(doc(db, "homeroom_contacts", id)); document.getElementById('contactModal').classList.add('hidden'); }
    });
    document.getElementById('saveContactBtn')?.addEventListener('click', async () => {
        if (!auth.currentUser) return alert("로그인 필요");
        const num = Number(document.getElementById('contactNumInput').value); const name = document.getElementById('contactNameInput').value.trim();
        if (!num || !name) return alert("번호와 이름 입력 필수");
        const payload = { number: num, name, studentPhone: document.getElementById('contactStudentPhone').value.trim(), parentPhone1: document.getElementById('contactParentPhone').value.trim(), parentPhone2: document.getElementById('contactParent2Phone').value.trim() };
        const editId = document.getElementById('editContactId').value;
        try { if (editId) await updateDoc(doc(db, "homeroom_contacts", editId), payload); else await addDoc(collection(db, "homeroom_contacts"), payload);
        document.getElementById('contactModal').classList.add('hidden'); } catch (e) { alert("저장 실패"); }
    });

    let deskClicks = 0;
    let deskTimer;
    document.getElementById('teacherDeskBtn')?.addEventListener('click', () => {
        deskClicks++;
        clearTimeout(deskTimer);
        deskTimer = setTimeout(() => { deskClicks = 0; }, 1000); 
        if (deskClicks >= 3) {
            document.getElementById('antiPairModal').classList.remove('hidden');
            deskClicks = 0;
        }
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

    document.getElementById('hwpxTemplateInput')?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if(file) {
            hwpxFileBlob = file;
            alert("✅ HWPX 템플릿 파일이 정상적으로 등록되었습니다.\n자리 뽑기 후 [HWPX로 저장] 버튼이 활성화됩니다.");
            if(allocatedSeats.some(s => s !== null)) document.getElementById('downloadHwpxBtn').classList.remove('hidden');
        }
    });

    document.getElementById('startSeatingBtn')?.addEventListener('click', async () => {
        if (students.length === 0) return alert("학생 명단이 없습니다. 먼저 비상연락망에 학생을 등록해주세요.");

        const activeStudents = students.filter(s => !excludedStudents.includes(s.number));
        
        const validSeatIndices = [];
        for (let i = 0; i < 36; i++) {
            if (!disabledSeats.includes(i)) validSeatIndices.push(i);
        }

        if (activeStudents.length > validSeatIndices.length) {
            return alert(`자리가 부족합니다!\n학생 수: ${activeStudents.length}명\n빈자리 수: ${validSeatIndices.length}석\n(회색칸을 클릭해 자리를 늘려주세요.)`);
        }

        let finalAllocation = null;
        let attempts = 0;

        while (attempts < 2000) { 
            attempts++;
            let shuffled = [...activeStudents];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }

            let tempSeats = new Array(36).fill(null);
            let sIdx = 0;
            for (let idx of validSeatIndices) {
                if (sIdx < shuffled.length) {
                    tempSeats[idx] = shuffled[sIdx];
                    sIdx++;
                }
            }

            let isSafe = true;
            for (let pair of antiPairs) {
                const pos1 = tempSeats.findIndex(s => s && s.number === pair[0]);
                const pos2 = tempSeats.findIndex(s => s && s.number === pair[1]);
                if (pos1 !== -1 && pos2 !== -1) {
                    const r1 = Math.floor(pos1 / 6), c1 = pos1 % 6;
                    const r2 = Math.floor(pos2 / 6), c2 = pos2 % 6;
                    if ((r1 === r2 && Math.abs(c1 - c2) === 1) || (c1 === c2 && Math.abs(r1 - r2) === 1)) {
                        isSafe = false;
                        break;
                    }
                }
            }

            if (isSafe) {
                finalAllocation = tempSeats;
                break;
            }
        }

        if (!finalAllocation) return alert("기피 조합 조건이 너무 빡빡하여 배치를 찾지 못했습니다. 기피 조합을 조금 줄여주세요.");

        allocatedSeats = finalAllocation; 

        const skipAnim = document.getElementById('skipAnimationCheckbox').checked;
        if (skipAnim) {
            renderSeatGrid();
            triggerConfetti();
        } else {
            const btn = document.getElementById('startSeatingBtn');
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 돌리는 중...';
            
            let ticks = 0;
            const maxTicks = 15; 
            const interval = setInterval(() => {
                const grid = document.getElementById('seatingGrid');
                grid.innerHTML = '';
                for (let i = 0; i < 36; i++) {
                    const cell = document.createElement('div');
                    if (disabledSeats.includes(i)) {
                        cell.className = "h-16 sm:h-20 bg-slate-200 border-2 border-slate-300 rounded-xl flex items-center justify-center opacity-50";
                        cell.innerHTML = `<i class="fa-solid fa-xmark text-slate-400"></i>`;
                    } else if (validSeatIndices.includes(i) && Math.random() > 0.3) {
                        const randStudent = activeStudents[Math.floor(Math.random() * activeStudents.length)];
                        cell.className = "h-16 sm:h-20 bg-indigo-50 border-2 border-indigo-200 rounded-xl flex flex-col items-center justify-center shadow-sm";
                        cell.innerHTML = `<span class="text-xs text-indigo-400 font-bold">${randStudent.number}</span><span class="text-sm sm:text-base font-extrabold text-indigo-700">${randStudent.name}</span>`;
                    } else {
                        cell.className = "h-16 sm:h-20 bg-slate-50 border-2 border-slate-200 rounded-xl";
                    }
                    grid.appendChild(cell);
                }

                ticks++;
                if (ticks >= maxTicks) {
                    clearInterval(interval);
                    renderSeatGrid(); 
                    triggerConfetti();
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fa-solid fa-play"></i> 자리 뽑기';
                }
            }, 100);
        }
    });

    document.getElementById('downloadHwpxBtn')?.addEventListener('click', async () => {
        if(!hwpxFileBlob) return alert("먼저 상단의 [양식 등록]을 눌러 HWPX 템플릿 파일을 올려주세요.");
        
        try {
            const zip = await JSZip.loadAsync(hwpxFileBlob);
            let xmlContent = await zip.file("Contents/section0.xml").async("string");
            
            for (let i = 0; i < 36; i++) {
                const st = allocatedSeats[i];
                // 🎯 띄어쓰기 제거: `${st.number}.${st.name}` 적용 완료
                const replaceText = st ? `${st.number}.${st.name}` : ""; 
                const hwpxIndex = 36 - i; 
                const regex = new RegExp(`\\{\\{자리${hwpxIndex}\\}\\}`, 'g');
                xmlContent = xmlContent.replace(regex, replaceText);
            }
            
            zip.file("Contents/section0.xml", xmlContent);
            
            const newBlob = await zip.generateAsync({ type: "blob" });
            const url = window.URL.createObjectURL(newBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = "1-7반_자리배치결과.hwpx";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
        } catch (error) {
            console.error(error);
            alert("HWPX 파일을 처리하는 중 오류가 발생했습니다. 양식 파일이 맞는지 확인해 주세요.");
        }
    });
});

export function initHomeroomTab(currentUser) {
    if (!currentUser) return;
    onSnapshot(query(collection(db, "homeroom_contacts"), orderBy("number", "asc")), (snapshot) => {
        students = [];
        snapshot.forEach(d => students.push({ id: d.id, ...d.data() }));
        renderContacts();
        renderExcludeList();
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
                    document.getElementById('downloadHwpxBtn')?.classList.add('hidden');
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
    
    if(allocatedSeats.some(s => s !== null) && hwpxFileBlob) {
        document.getElementById('downloadHwpxBtn')?.classList.remove('hidden');
    }
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
