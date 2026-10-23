import { db, doc, getDoc, setDoc } from '../firebase-config.js';
import { homeroomState } from './state.js';
import { renderExcludeStudentList } from './subtab-seating.js';

export async function loadContactsData() {
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
        const local = localStorage.getItem(`contacts_${key}`);
        if (local) {
            try {
                const parsed = JSON.parse(local);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    loaded = parsed;
                    break;
                }
            } catch(e){}
        }
    }

    for (const key of candidateKeys) {
        try {
            const snap = await getDoc(doc(db, "homeroom_contacts", key));
            if (snap.exists() && snap.data().list && snap.data().list.length > 0) {
                loaded = snap.data().list;
                break;
            }
        } catch (e) {}
    }

    if (loaded && loaded.length > 0) {
        homeroomState.contacts = loaded;
        localStorage.setItem(`contacts_${uid}_${g}_${c}`, JSON.stringify(loaded));
    } else {
        homeroomState.contacts = [];
    }

    renderContactGrid();
    renderExcludeStudentList();
}

export function parseBulkStudentText(rawText) {
    if (!rawText || !rawText.trim()) return [];

    const cleanText = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = cleanText.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return [];

    const headerKeywords = ['성명', '학생명', '전화번호', '핸드폰', '보호자', '학부모', '집전화', '연락처', '비고'];

    const extractStdPhones = (str) => {
        const matches = str.match(/01[0-9][-\s\.]?[0-9]{3,4}[-\s\.]?[0-9]{4}/g) || [];
        return matches.map(p => {
            const digits = p.replace(/\D/g, '');
            if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
            if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
            return p;
        });
    };

    // 방법 1: 일반 행 단위 파싱
    const rowParsed = [];
    lines.forEach((line, idx) => {
        if (headerKeywords.some(k => line.includes(k)) && idx <= 1) return;

        let tokens = [];
        if (line.includes('\t')) {
            tokens = line.split('\t').map(t => t.trim()).filter(Boolean);
        } else if (line.includes(',')) {
            tokens = line.split(',').map(t => t.trim()).filter(Boolean);
        } else {
            tokens = line.split(/\s+/).map(t => t.trim()).filter(Boolean);
        }

        if (tokens.length >= 2) {
            let num = null;
            let name = "";

            const numMatch0 = tokens[0].match(/\d+/);
            const numMatch1 = tokens[1].match(/\d+/);

            if (numMatch0 && tokens[0].length <= 5) {
                num = parseInt(numMatch0[0], 10);
                name = tokens[1];
            } else if (numMatch1 && tokens[1].length <= 5) {
                name = tokens[0];
                num = parseInt(numMatch1[0], 10);
            } else {
                num = idx + 1;
                name = tokens[0];
            }

            name = name.replace(/[^가-힣a-zA-Z0-9]/g, '');
            if (!name) return;

            const phones = extractStdPhones(line);
            rowParsed.push({
                id: `st_${Date.now()}_${idx}`,
                num: num,
                name: name,
                phone: phones[0] || "",
                parentPhone: phones[1] || "",
                parent2Phone: phones[2] || ""
            });
        }
    });

    if (rowParsed.length > 0) return rowParsed;

    // 방법 2: 웹 표 복사 스트림 파싱
    const allTokens = [];
    lines.forEach(l => {
        const parts = l.split(/[\t,]+|\s{2,}/).map(t => t.trim()).filter(Boolean);
        allTokens.push(...parts);
    });

    const streamParsed = [];
    let i = 0;
    while (i < allTokens.length) {
        const tok = allTokens[i];
        if (headerKeywords.some(k => tok.includes(k))) {
            i++;
            continue;
        }

        if (/^\d{1,4}$/.test(tok)) {
            const num = parseInt(tok, 10);
            if (i + 1 < allTokens.length) {
                const name = allTokens[i + 1].replace(/[^가-힣a-zA-Z0-9]/g, '');
                i += 2;

                const phones = [];
                while (i < allTokens.length && !/^\d{1,4}$/.test(allTokens[i])) {
                    const found = extractStdPhones(allTokens[i]);
                    if (found.length > 0) phones.push(...found);
                    i++;
                }

                if (name) {
                    streamParsed.push({
                        id: `st_${Date.now()}_${streamParsed.length}`,
                        num: num,
                        name: name,
                        phone: phones[0] || "",
                        parentPhone: phones[1] || "",
                        parent2Phone: phones[2] || ""
                    });
                }
                continue;
            }
        }
        i++;
    }

    return streamParsed;
}

export async function handleSaveBulkPaste() {
    const textarea = document.getElementById('bulkPasteTextarea');
    const bulkModal = document.getElementById('bulkPasteModal');
    const text = textarea?.value || '';

    if (!text.trim()) return alert("데이터를 입력해주세요.");

    const parsed = parseBulkStudentText(text);

    if (parsed.length === 0) {
        return alert("유효한 학생 데이터를 찾지 못했습니다.\n[번호] [이름] [전화번호...] 형태로 복사되었는지 확인해주세요.");
    }

    parsed.sort((a, b) => a.num - b.num);
    homeroomState.contacts = parsed;

    renderContactGrid();
    renderExcludeStudentList();
    if (bulkModal) bulkModal.classList.add('hidden');

    const g = homeroomState.grade;
    const c = homeroomState.classNum;
    const uid = homeroomState.userId;

    localStorage.setItem(`contacts_${uid}_${g}_${c}`, JSON.stringify(parsed));

    try {
        await setDoc(doc(db, "homeroom_contacts", `${uid}_${g}_${c}`), {
            userId: uid,
            grade: g,
            classNum: c,
            list: parsed,
            updatedAt: new Date().toISOString()
        });
    } catch (e) {
        console.error("Firestore 연락망 저장 에러:", e);
    }

    alert(`✅ 총 ${parsed.length}명의 학생 연락처가 파이어베이스 DB에 안전하게 등록되었습니다.`);
}

export function setupContactsModule() {
    const contactModal = document.getElementById('contactModal');
    const bulkModal = document.getElementById('bulkPasteModal');

    const closeContactBtn = document.getElementById('closeContactModalBtn');
    if (closeContactBtn) closeContactBtn.onclick = () => contactModal?.classList.add('hidden');

    const openNewBtn = document.getElementById('openNewContactModalBtn');
    if (openNewBtn) openNewBtn.onclick = () => openContactEditMode(null);

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

            try {
                await setDoc(doc(db, "homeroom_contacts", `${uid}_${g}_${c}`), { list: [] });
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

    const saveBulkBtn = document.getElementById('saveBulkPasteBtn');
    if (saveBulkBtn) saveBulkBtn.onclick = handleSaveBulkPaste;

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

            try {
                await setDoc(doc(db, "homeroom_contacts", `${uid}_${g}_${c}`), {
                    userId: uid,
                    grade: g,
                    classNum: c,
                    list: homeroomState.contacts,
                    updatedAt: new Date().toISOString()
                });
            } catch (e) {}
        };
    }

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

            try {
                await setDoc(doc(db, "homeroom_contacts", `${uid}_${g}_${c}`), {
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

export function renderContactGrid() {
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

export function openContactViewMode(contact) {
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

export function openContactEditMode(contact) {
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
