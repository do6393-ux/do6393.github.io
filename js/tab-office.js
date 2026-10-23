import { db, collection, doc, getDoc, setDoc } from './firebase-config.js';

export const teacherList = [
    { name: "곽경애", short: "경애" }, { name: "권수영", short: "수영" }, { name: "김미래", short: "미래" },
    { name: "김영희", short: "영희" }, { name: "김지민", short: "지민" }, { name: "노현아", short: "현아" },
    { name: "문정식", short: "정식" }, { name: "박정민", short: "정민" }, { name: "박현주", short: "현주" },
    { name: "성영은", short: "성영" }, { name: "신정훈", short: "정훈" }, { name: "심지수", short: "지수" },
    { name: "오혜선", short: "혜선" }, { name: "이명화", short: "명화" }, { name: "이윤수", short: "윤수" },
    { name: "이종민", short: "종민" }, { name: "임효진", short: "효진" }, { name: "장민지", short: "민지" },
    { name: "정다은", short: "다은" }, { name: "조수아", short: "수아" }, { name: "최진희", short: "진희" },
    { name: "하서영", short: "서영" }, { name: "한민주", short: "한민" }, { name: "황지수", short: "황지" }
];

export let officeState = {
    selectedTeacher: teacherList.find(t => t.short === "정훈"),
    selectedGrade: 1,
    selectedClassNum: 7,
    isNextWeek: false
};

const schoolCode = "72886";
let scData = null;

// 🎯 DB에서 불러온 기본 시간표 상태 변수
let currentTeacherBaseTimetable = Array(7).fill().map(() => Array(5).fill(""));
let currentClassBaseTimetable = Array(7).fill().map(() => Array(5).fill(""));
let activeBaseModalType = null; // 'teacher' or 'class'

// 🎯 이벤트(민트색) 과목 필터링 키워드
const eventKeywords = ['자치', '동아', '봉사', '진로'];

export function initOfficeTab(currentUser) {
    if (!currentUser) return;
    
    // 교사/학급 선택 UI 연결
    document.getElementById('titleTeacherNameBtn')?.addEventListener('click', () => {
        const container = document.getElementById('modalTeacherList');
        container.innerHTML = '';
        teacherList.forEach(t => {
            const btn = document.createElement('button');
            btn.className = `p-2 rounded-xl border text-center font-bold transition-colors ${officeState.selectedTeacher.short === t.short ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'hover:bg-slate-50 border-slate-200 text-slate-600'}`;
            btn.textContent = t.name;
            btn.onclick = () => {
                officeState.selectedTeacher = t;
                document.getElementById('titleTeacherNameBtn').textContent = t.name;
                document.getElementById('teacherSelectModal').classList.add('hidden');
                loadBaseTimetablesAndRender();
            };
            container.appendChild(btn);
        });
        document.getElementById('teacherSelectModal').classList.remove('hidden');
    });
    
    document.getElementById('closeTeacherSelectModalBtn')?.addEventListener('click', () => document.getElementById('teacherSelectModal').classList.add('hidden'));

    document.getElementById('titleClassNameBtn')?.addEventListener('click', () => {
        const container = document.getElementById('modalClassList');
        container.innerHTML = '';
        for (let g = 1; g <= 3; g++) {
            for (let c = 1; c <= 10; c++) {
                const btn = document.createElement('button');
                btn.className = `p-2 rounded-xl border text-center font-bold transition-colors ${(officeState.selectedGrade === g && officeState.selectedClassNum === c) ? 'bg-sky-50 text-sky-700 border-sky-200' : 'hover:bg-slate-50 border-slate-200 text-slate-600'}`;
                btn.textContent = `${g}-${c}`;
                btn.onclick = () => {
                    officeState.selectedGrade = g;
                    officeState.selectedClassNum = c;
                    document.getElementById('titleClassNameBtn').textContent = `${g}-${c}`;
                    document.getElementById('classSelectModal').classList.add('hidden');
                    loadBaseTimetablesAndRender();
                };
                container.appendChild(btn);
            }
        }
        document.getElementById('classSelectModal').classList.remove('hidden');
    });
    
    document.getElementById('closeClassSelectModalBtn')?.addEventListener('click', () => document.getElementById('classSelectModal').classList.add('hidden'));

    // 🎯 기본 시간표 설정 모달 연결 로직
    const baseModal = document.getElementById('baseTimetableModal');
    const baseInputBody = document.getElementById('baseTimetableInputBody');
    
    document.getElementById('openTeacherBaseBtn')?.addEventListener('click', () => {
        activeBaseModalType = 'teacher';
        document.getElementById('baseTimetableModalTitle').textContent = `${officeState.selectedTeacher.name} 교사 기본 시간표 설정`;
        document.getElementById('baseTimetableModalDesc').textContent = "입력 예시: 1-8";
        renderBaseTimetableInputGrid(currentTeacherBaseTimetable);
        baseModal.classList.remove('hidden');
    });

    document.getElementById('openClassBaseBtn')?.addEventListener('click', () => {
        activeBaseModalType = 'class';
        document.getElementById('baseTimetableModalTitle').textContent = `${officeState.selectedGrade}-${officeState.selectedClassNum} 학급 기본 시간표 설정`;
        document.getElementById('baseTimetableModalDesc').textContent = "입력 예시: 정보32";
        renderBaseTimetableInputGrid(currentClassBaseTimetable);
        baseModal.classList.remove('hidden');
    });

    document.getElementById('closeBaseTimetableModalBtn')?.addEventListener('click', () => baseModal.classList.add('hidden'));

    document.getElementById('saveBaseTimetableBtn')?.addEventListener('click', async () => {
        const newData = Array(7).fill().map(() => Array(5).fill(""));
        for (let r = 0; r < 7; r++) {
            for (let c = 0; c < 5; c++) {
                const val = document.getElementById(`baseInput_${r}_${c}`).value.trim();
                newData[r][c] = val;
            }
        }

        try {
            if (activeBaseModalType === 'teacher') {
                await setDoc(doc(db, "base_timetables", `teacher_${officeState.selectedTeacher.short}`), { matrix: newData });
                currentTeacherBaseTimetable = newData;
            } else {
                await setDoc(doc(db, "base_timetables", `class_${officeState.selectedGrade}_${officeState.selectedClassNum}`), { matrix: newData });
                currentClassBaseTimetable = newData;
            }
            alert("✅ 기본 시간표가 저장되었습니다.");
            baseModal.classList.add('hidden');
            renderTeacherTimetable();
            renderClassTimetable();
        } catch (e) {
            alert("저장 중 오류가 발생했습니다.");
        }
    });

    const btnThis = document.getElementById('weekToggleThisBtn');
    const btnNext = document.getElementById('weekToggleNextBtn');
    
    btnThis?.addEventListener('click', () => {
        officeState.isNextWeek = false;
        btnThis.className = "px-3 py-1 text-xs font-bold bg-white text-indigo-700 shadow-sm rounded-lg transition-all";
        btnNext.className = "px-3 py-1 text-xs font-medium text-slate-600 rounded-lg transition-all";
        renderTeacherTimetable();
        renderClassTimetable();
    });
    
    btnNext?.addEventListener('click', () => {
        officeState.isNextWeek = true;
        btnNext.className = "px-3 py-1 text-xs font-bold bg-white text-indigo-700 shadow-sm rounded-lg transition-all";
        btnThis.className = "px-3 py-1 text-xs font-medium text-slate-600 rounded-lg transition-all";
        renderTeacherTimetable();
        renderClassTimetable();
    });

    const mealDateInput = document.getElementById('mealDateInput');
    const fetchMealBtn = document.getElementById('fetchMealBtn');
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    if (mealDateInput) mealDateInput.value = `${yyyy}-${mm}-${dd}`;
    
    fetchMealBtn?.addEventListener('click', fetchMeal);
    
    document.getElementById('titleTeacherNameBtn').textContent = officeState.selectedTeacher.name;
    document.getElementById('titleClassNameBtn').textContent = `${officeState.selectedGrade}-${officeState.selectedClassNum}`;

    // 초기 데이터 로딩
    loadBaseTimetablesAndRender();
    fetchMeal();
}

function renderBaseTimetableInputGrid(dataMatrix) {
    const tbody = document.getElementById('baseTimetableInputBody');
    tbody.innerHTML = '';
    for (let r = 0; r < 7; r++) {
        const tr = document.createElement('tr');
        let html = `<td class="py-2 border-r border-slate-200 font-bold bg-slate-50">${r + 1}교시</td>`;
        for (let c = 0; c < 5; c++) {
            html += `<td class="p-1 border-r border-slate-200"><input type="text" id="baseInput_${r}_${c}" value="${dataMatrix[r][c] || ''}" class="w-full text-center text-xs p-1.5 rounded bg-white border border-slate-300 focus:ring-1 focus:ring-indigo-400 outline-none"></td>`;
        }
        tr.innerHTML = html;
        tbody.appendChild(tr);
    }
}

// 🎯 파이어베이스 기본 시간표 로딩 & 컴시간 로딩 통합 함수
async function loadBaseTimetablesAndRender() {
    try {
        const tSnap = await getDoc(doc(db, "base_timetables", `teacher_${officeState.selectedTeacher.short}`));
        if (tSnap.exists() && tSnap.data().matrix) currentTeacherBaseTimetable = tSnap.data().matrix;
        else currentTeacherBaseTimetable = Array(7).fill().map(() => Array(5).fill(""));

        const cSnap = await getDoc(doc(db, "base_timetables", `class_${officeState.selectedGrade}_${officeState.selectedClassNum}`));
        if (cSnap.exists() && cSnap.data().matrix) currentClassBaseTimetable = cSnap.data().matrix;
        else currentClassBaseTimetable = Array(7).fill().map(() => Array(5).fill(""));
        
        await fetchComciData();
    } catch(e) {
        console.error("초기 로딩 오류:", e);
    }
    renderTeacherTimetable();
    renderClassTimetable();
}

// 🎯 컴시간 API 예외 처리 강화
async function fetchComciData() {
    try {
        const res = await fetch(`https://comci.kro.kr/api/GET/${schoolCode}`);
        if (!res.ok) throw new Error();
        scData = await res.json();
    } catch(e) {
        scData = null; // 실패 시 안전장치
    }
}

function parseComciSubject(code) {
    if(!scData) return "";
    const strCode = String(code);
    const teacherId = parseInt(strCode.slice(-2), 10);
    const subjectId = parseInt(strCode.slice(0, -2), 10);
    const sbjName = scData.지명[subjectId] || "";
    const tName = scData.성명[teacherId] || "";
    if(!sbjName && !tName) return "";
    return `${sbjName}<br><span class="text-[10px] opacity-70 font-normal">${tName}</span>`;
}

function getPureSubjectText(code) {
    if(!scData) return "";
    const strCode = String(code);
    const teacherId = parseInt(strCode.slice(-2), 10);
    const subjectId = parseInt(strCode.slice(0, -2), 10);
    const sbjName = scData.지명[subjectId] || "";
    const tNumStr = String(teacherId).padStart(2, '0');
    return `${sbjName}${tNumStr}`;
}

// 교사 시간표 렌더링
function renderTeacherTimetable() {
    const tbody = document.getElementById('teacherTimetableGridBody');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    if(!scData) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-10 text-slate-400 font-bold bg-slate-50 rounded-xl">⚠️ 컴시간 서버 응답 지연/오류입니다. 잠시 후 다시 시도해주세요.</td></tr>`;
        return;
    }

    const tIdx = scData.성명.indexOf(officeState.selectedTeacher.short);
    if(tIdx === -1) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-10 text-slate-400">해당 교사의 시간표 정보가 없습니다.</td></tr>`;
        return;
    }

    const wData = officeState.isNextWeek ? scData.자료481 : scData.자료481;
    if(!wData) return;

    for (let period = 1; period <= 7; period++) {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50 transition-colors";
        let html = `<td class="py-3 sm:py-4 border-r border-slate-200 font-bold bg-slate-50">${period}교시</td>`;
        
        for (let day = 1; day <= 5; day++) {
            let info = "";
            let isChanged = false;
            let isMintEvent = false;
            
            for (let g = 1; g <= 3; g++) {
                const cCount = scData.학급수[g];
                for (let c = 1; c <= cCount; c++) {
                    const code = wData[g][c][day][period];
                    if (code > 0) {
                        const tId = parseInt(String(code).slice(-2), 10);
                        if (tId === tIdx) {
                            const subjectName = scData.지명[parseInt(String(code).slice(0, -2), 10)] || "";
                            
                            // 🎯 1. 이벤트 (민트색) 확인
                            if (eventKeywords.some(k => subjectName.startsWith(k))) {
                                isMintEvent = true;
                            }
                            
                            // 🎯 2. 변경(보라색) 확인 (교사가 저장한 기본 시간표 'g-c' 값과 대조)
                            const baseText = currentTeacherBaseTimetable[period - 1][day - 1];
                            const currentText = `${g}-${c}`;
                            if (baseText && baseText !== currentText) {
                                isChanged = true;
                            }

                            // 셀 색상 로직 적용
                            let cellClass = '';
                            if (isMintEvent) cellClass = 'bg-[#d1fae5] text-[#047857]'; // Mint
                            else if (isChanged) cellClass = 'bg-[#d8b4fe] text-white'; // Purple
                            
                            info = `<div class="h-full flex flex-col items-center justify-center py-2 ${cellClass} rounded-sm">
                                        <span>${currentText}</span>
                                        <span class="text-[10px] font-normal opacity-80">${subjectName}</span>
                                    </div>`;
                        }
                    }
                }
            }
            html += `<td class="border-r border-slate-200 font-bold ${info ? 'text-indigo-700 p-0' : 'text-slate-300'}">${info || '-'}</td>`;
        }
        tr.innerHTML = html;
        tbody.appendChild(tr);
    }
}

// 학급 시간표 렌더링
function renderClassTimetable() {
    const tbody = document.getElementById('classTimetableGridBody');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    if(!scData) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-10 text-slate-400 font-bold bg-slate-50 rounded-xl">⚠️ 컴시간 서버 응답 지연/오류입니다. 잠시 후 다시 시도해주세요.</td></tr>`;
        return;
    }

    const g = officeState.selectedGrade;
    const c = officeState.selectedClassNum;
    const wData = officeState.isNextWeek ? scData.자료481 : scData.자료481;
    if(!wData || !wData[g] || !wData[g][c]) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-10 text-slate-400">시간표 정보가 없습니다.</td></tr>`;
        return;
    }

    for (let period = 1; period <= 7; period++) {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50 transition-colors";
        let html = `<td class="py-3 sm:py-4 border-r border-slate-200 font-bold bg-slate-50">${period}교시</td>`;
        
        for (let day = 1; day <= 5; day++) {
            const code = wData[g][c][day][period];
            if (code > 0) {
                const pureText = getPureSubjectText(code); // ex) "체육34"
                const subjectName = scData.지명[parseInt(String(code).slice(0, -2), 10)] || "";
                
                let isChanged = false;
                let isMintEvent = false;
                
                // 🎯 1. 이벤트 (민트색) 확인
                if (eventKeywords.some(k => subjectName.startsWith(k))) {
                    isMintEvent = true;
                }

                // 🎯 2. 변경 (보라색) 확인
                const baseText = currentClassBaseTimetable[period - 1][day - 1];
                if (baseText && pureText && pureText !== baseText) {
                    isChanged = true;
                }

                let cellClass = '';
                if (isMintEvent) cellClass = 'bg-[#d1fae5] text-[#047857]'; // Mint
                else if (isChanged) cellClass = 'bg-[#d8b4fe] text-white'; // Purple
                
                const displayHtml = parseComciSubject(code);
                html += `<td class="border-r border-slate-200 font-bold text-sky-700 ${cellClass}">${displayHtml}</td>`;
            } else {
                html += `<td class="border-r border-slate-200 font-bold text-slate-300">-</td>`;
            }
        }
        tr.innerHTML = html;
        tbody.appendChild(tr);
    }
}

async function fetchMeal() {
    const dateInput = document.getElementById('mealDateInput').value;
    const listDiv = document.getElementById('mealDishList');
    if(!dateInput || !listDiv) return;
    
    listDiv.innerHTML = "데이터 조회 중...";
    const dateStr = dateInput.replace(/-/g, '');
    const ATPT_OFCDC_SC_CODE = 'E10'; 
    const SD_SCHUL_CODE = '7331078';  

    try {
        const res = await fetch(`https://open.neis.go.kr/hub/mealServiceDietInfo?KEY=4095db6a1ff547ecae2ce3dbf074d9e9&Type=json&ATPT_OFCDC_SC_CODE=${ATPT_OFCDC_SC_CODE}&SD_SCHUL_CODE=${SD_SCHUL_CODE}&MLSV_YMD=${dateStr}`);
        const data = await res.json();
        
        if (data.mealServiceDietInfo && data.mealServiceDietInfo[1].row.length > 0) {
            let mealStr = data.mealServiceDietInfo[1].row[0].DDISH_NM;
            mealStr = mealStr.replace(/<br\/>/g, '\n').replace(/\([^)]*\)/g, '').replace(/[^가-힣a-zA-Z0-9\s]/g, '');
            listDiv.innerHTML = mealStr;
        } else {
            listDiv.innerHTML = "해당 날짜의 급식 정보가 없습니다.";
        }
    } catch(e) {
        listDiv.innerHTML = "급식 정보를 불러오는 중 오류가 발생했습니다.";
    }
}
