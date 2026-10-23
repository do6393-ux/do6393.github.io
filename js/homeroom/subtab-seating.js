import { db, doc, getDoc, setDoc } from '../firebase-config.js';
import { homeroomState } from './state.js';

let seatingHwpxBlob = null;

export async function loadSeatingData() {
    const g = homeroomState.grade;
    const c = homeroomState.classNum;
    const uid = homeroomState.userId;

    const candidateKeys = [
        `${uid}_${g}_${c}`,
        `${uid}_${g}-${c}`,
        `${g}_${c}`,
        `${g}-${c}`
    ];

    // 기피 조합 로드
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

    // 자리 배치 결과 로드
    let loaded = null;
    for (const key of candidateKeys) {
        const local = localStorage.getItem(`seating_${key}`);
        if (local) {
            try { loaded = JSON.parse(local); break; } catch(e){}
        }
    }
    for (const key of candidateKeys) {
        try {
            const snap = await getDoc(doc(db, "homeroom_seating", key));
            if (snap.exists() && snap.data().seats) {
                loaded = snap.data();
                break;
            }
        } catch (e) {}
    }

    if (loaded && Array.isArray(loaded.seats) && loaded.seats.length > 0) {
        homeroomState.seatingRows = loaded.rows || 6;
        homeroomState.seatingSeats = loaded.seats;
        localStorage.setItem('seating_rows', homeroomState.seatingRows);
        localStorage.setItem(`seating_${uid}_${g}_${c}`, JSON.stringify(loaded));
        updateSeatingDimensionUI();
        renderSeatingDesks();
    } else {
        initSeatingGrid(false);
        updateSeatingDimensionUI();
    }
}

export function setupSeatingModule() {
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

            try {
                await setDoc(doc(db, "homeroom_anti_pairs", `${uid}_${g}_${c}`), {
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

    const resetBtn = document.getElementById('resetSeatingBtn');
    if (resetBtn) resetBtn.onclick = handleResetSeating;

    const decreaseBtn = document.getElementById('decreaseRowBtn');
    const increaseBtn = document.getElementById('increaseRowBtn');

    if (decreaseBtn) decreaseBtn.onclick = () => changeSeatingRows(-1);
    if (increaseBtn) increaseBtn.onclick = () => changeSeatingRows(1);

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

export function handleResetSeating() {
    if (!confirm("현재 배치된 자리를 모두 비우시겠습니까? (제외 자리는 유지됩니다)")) return;

    homeroomState.seatingSeats.forEach(seat => {
        seat.student = null;
    });

    renderSeatingDesks();
    saveSeatingData();
    alert("✅ 자리가 초기화되었습니다.");
}

export async function saveSeatingData() {
    const g = homeroomState.grade;
    const c = homeroomState.classNum;
    const uid = homeroomState.userId;
    const key = `${uid}_${g}_${c}`;

    const payload = {
        rows: homeroomState.seatingRows,
        seats: homeroomState.seatingSeats
    };

    localStorage.setItem(`seating_${key}`, JSON.stringify(payload));

    try {
        await setDoc(doc(db, "homeroom_seating", key), {
            userId: uid,
            grade: g,
            classNum: c,
            ...payload,
            updatedAt: new Date().toISOString()
        });
    } catch (e) {
        console.warn("자리배치 DB 저장 실패:", e);
    }
}

export function changeSeatingRows(delta) {
    const targetRows = homeroomState.seatingRows + delta;
    if (targetRows < 4 || targetRows > 8) return;

    homeroomState.seatingRows = targetRows;
    localStorage.setItem('seating_rows', targetRows);
    initSeatingGrid(true);
    updateSeatingDimensionUI();
    saveSeatingData();
}

export function updateSeatingDimensionUI() {
    const dimText = document.getElementById('seatingDimensionText');
    if (dimText) {
        const totalSeats = homeroomState.seatingRows * 6;
        dimText.textContent = `${homeroomState.seatingRows}줄 (${totalSeats}석)`;
    }
}

export function initSeatingGrid(preserveExisting = false) {
    const totalSeats = homeroomState.seatingRows * 6;
    const oldSeats = homeroomState.seatingSeats || [];

    const newSeats = [];
    for (let idx = 0; idx < totalSeats; idx++) {
        if (preserveExisting && oldSeats[idx]) {
            newSeats.push(oldSeats[idx]);
        } else {
            newSeats.push({
                id: idx,
                disabled: false,
                student: null
            });
        }
    }
    homeroomState.seatingSeats = newSeats;
    renderSeatingDesks();
}

export function renderSeatingDesks() {
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
            saveSeatingData();
        };

        grid.appendChild(desk);
    });
}

export function renderExcludeStudentList() {
    const container = document.getElementById('excludeStudentList');
    if (!container) return;
    container.innerHTML = '';

    const list = homeroomState.contacts.length > 0 
        ? homeroomState.contacts 
        : Array.from({ length: 36 }, (_, i) => ({ num: i + 1, name: `${i + 1}번` }));

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

export async function runSeatingArrangement() {
    const availableSeats = homeroomState.seatingSeats.filter(s => !s.disabled);
    
    let students = homeroomState.contacts.length > 0 
        ? homeroomState.contacts.filter(s => !homeroomState.excludedStudentNums.has(s.num))
        : Array.from({ length: availableSeats.length }, (_, i) => ({ num: i + 1, name: `${i + 1}번` }));

    if (students.length > availableSeats.length) {
        return alert(`배치할 학생(${students.length}명)이 활성화된 자리(${availableSeats.length}개)보다 많습니다. 자리를 추가해주세요.`);
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
        saveSeatingData();
        if (typeof confetti === 'function') confetti({ particleCount: 70, spread: 60 });
    } else {
        availableSeats.forEach(s => s.student = null);
        renderSeatingDesks();

        for (let i = 0; i < availableSeats.length; i++) {
            availableSeats[i].student = bestOrder[i] || null;
            renderSeatingDesks();
            await new Promise(r => setTimeout(r, 60));
        }
        saveSeatingData();
        if (typeof confetti === 'function') confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }
}

export async function downloadSeatingHwpx() {
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
