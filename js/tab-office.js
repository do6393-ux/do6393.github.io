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

// 🎯 1-7반 기본 시간표 (제공해주신 이미지 기준 데이터)
const baseTimetable1_7 = [
    // 1교시: [월, 화, 수, 목, 금]
    ["체육34", "과학23", "기가29", "국어03", "기가29"],
    // 2교시
    ["국어03", "수학17", "미술41", "과학23", "정보32"],
    // 3교시
    ["정보32", "기가29", "미술41", "음악39", "수학17"],
    // 4교시
    ["진직50", "국어03", "음악39", "사회09", "영어44"],
    // 5교시
    ["과학23", "사회09", "영어44", "스포29", "체육34"],
    // 6교시
    ["수학17", "체육34", "사회09", "영어44", "국어03"],
    // 7교시 (빈칸 대비)
    ["", "", "", "", ""]
];

export function initOfficeTab(currentUser) {
    if (!currentUser) return;
    
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
                renderTeacherTimetable();
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
                    renderClassTimetable();
                };
                container.appendChild(btn);
            }
        }
        document.getElementById('classSelectModal').classList.remove('hidden');
    });
    
    document.getElementById('closeClassSelectModalBtn')?.addEventListener('click', () => document.getElementById('classSelectModal').classList.add('hidden'));

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

    fetchComciData().then(() => {
        renderTeacherTimetable();
        renderClassTimetable();
    });
    
    fetchMeal();
}

async function fetchComciData() {
    try {
        const res = await fetch(`https://comci.kro.kr/api/GET/${schoolCode}`);
        if (!res.ok) throw new Error();
        scData = await res.json();
    } catch(e) {
        console.error(e);
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
    return `${sbjName}<br><span class="text-[10px] text-slate-400 font-normal">${tName}</span>`;
}

// 🎯 기본 시간표 과목 비교용 순수 텍스트 파싱
function getPureSubjectText(code) {
    if(!scData) return "";
    const strCode = String(code);
    const teacherId = parseInt(strCode.slice(-2), 10);
    const subjectId = parseInt(strCode.slice(0, -2), 10);
    const sbjName = scData.지명[subjectId] || "";
    const tNumStr = String(teacherId).padStart(2, '0');
    return `${sbjName}${tNumStr}`;
}

function renderTeacherTimetable() {
    const tbody = document.getElementById('teacherTimetableGridBody');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    if(!scData) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-10 text-slate-400">데이터를 불러오지 못했습니다.</td></tr>`;
        return;
    }

    const tIdx = scData.성명.indexOf(officeState.selectedTeacher.short);
    if(tIdx === -1) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-10 text-slate-400">해당 교사의 시간표 정보가 없습니다.</td></tr>`;
        return;
    }

    const wData = officeState.isNextWeek ? scData.자료481 : scData.자료481; // API 한계로 일단 동일 참조
    if(!wData) return;

    for (let period = 1; period <= 7; period++) {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50 transition-colors";
        let html = `<td class="py-3 sm:py-4 border-r border-slate-200 font-bold bg-slate-50">${period}교시</td>`;
        
        for (let day = 1; day <= 5; day++) {
            let info = "";
            let isChanged = false;
            
            // 모든 학급(1~3학년)을 순회하며 해당 교사(tIdx)가 수업하는 학급 찾기
            for (let g = 1; g <= 3; g++) {
                const cCount = scData.학급수[g];
                for (let c = 1; c <= cCount; c++) {
                    const code = wData[g][c][day][period];
                    if (code > 0) {
                        const tId = parseInt(String(code).slice(-2), 10);
                        if (tId === tIdx) {
                            // 변경 여부 판별 로직 추가 가능 (교사 시간표 기준)
                            const isEvent = code === 10000;
                            const cellClass = isEvent ? 'bg-emerald-100' : (isChanged ? 'bg-purple-200' : ''); // 보강 -> 변경(purple)
                            info = `<div class="h-full flex items-center justify-center ${cellClass}">${g}-${c}</div>`;
                        }
                    }
                }
            }
            html += `<td class="border-r border-slate-200 font-bold ${info ? 'text-indigo-700' : 'text-slate-300'}">${info || '-'}</td>`;
        }
        tr.innerHTML = html;
        tbody.appendChild(tr);
    }
}

function renderClassTimetable() {
    const tbody = document.getElementById('classTimetableGridBody');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    if(!scData) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-10 text-slate-400">데이터를 불러오지 못했습니다.</td></tr>`;
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
                let isChanged = false;
                
                // 🎯 1학년 7반일 때만 기본 시간표와 대조하여 '변경(보라색)' 여부 판단
                if (g === 1 && c === 7) {
                    const baseSbj = baseTimetable1_7[period - 1]?.[day - 1] || "";
                    if (baseSbj !== "" && pureText !== "" && pureText !== baseSbj) {
                        isChanged = true;
                    }
                } else {
                    // 다른 반은 기존 원본 로직(자료481 vs 일과자료 비교 등)이 필요하지만 현재는 임시 false
                    isChanged = false;
                }

                // 🎯 변경(보라색) 색상 적용 (#d8b4fe -> bg-purple-300 등 테일윈드 근사치 적용)
                const isEvent = code === 10000;
                const cellClass = isEvent ? 'bg-emerald-100' : (isChanged ? 'bg-[#d8b4fe] text-white' : '');
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
    const ATPT_OFCDC_SC_CODE = 'E10'; // 인천
    const SD_SCHUL_CODE = '7331078';  // 부원여중

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
