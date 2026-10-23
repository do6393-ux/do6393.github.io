import { db, doc, getDoc, setDoc } from '../firebase-config.js';
import { homeroomState, cleaningAreas } from './state.js';

let cleaningHwpxBlob = null;

export async function loadCleaningData() {
    const g = homeroomState.grade;
    const c = homeroomState.classNum;
    const uid = homeroomState.userId;

    const candidateKeys = [
        `${uid}_${g}_${c}`,
        `${uid}_${g}-${c}`,
        `${g}_${c}`,
        `${g}-${c}`
    ];

    let loaded = null;
    for (const key of candidateKeys) {
        const local = localStorage.getItem(`cleaning_grid_${key}`);
        if (local) {
            try { loaded = JSON.parse(local); break; } catch(e){}
        }
    }
    for (const key of candidateKeys) {
        try {
            const snap = await getDoc(doc(db, "homeroom_cleaning", key));
            if (snap.exists() && snap.data().grid) {
                loaded = snap.data().grid;
                break;
            }
        } catch (e) {}
    }

    if (loaded) {
        homeroomState.cleaningData = loaded;
        localStorage.setItem(`cleaning_grid_${uid}_${g}_${c}`, JSON.stringify(loaded));
    } else {
        homeroomState.cleaningData = Array(6).fill().map(() => Array(5).fill(null));
    }

    renderCleaningGrid();
}

export function setupCleaningModule() {
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

export function renderCleaningGrid() {
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
        : Array.from({ length: 36 }, (_, i) => ({ num: i + 1, name: `${i + 1}번 학생` }));

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

export async function saveCleaningData() {
    const g = homeroomState.grade;
    const c = homeroomState.classNum;
    const uid = homeroomState.userId;
    const key = `${uid}_${g}_${c}`;

    localStorage.setItem(`cleaning_grid_${key}`, JSON.stringify(homeroomState.cleaningData));

    try {
        await setDoc(doc(db, "homeroom_cleaning", key), {
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

export async function downloadCleaningHwpx() {
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
