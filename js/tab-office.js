import { db, doc, getDoc, setDoc, auth } from './firebase-config.js';

export const teacherList = [
    { id: '11', name: '김정애', short: '김정' }, { id: '32', name: '신정훈', short: '신정', default: true },
    { id: '33', name: '최용섭', short: '최용' }, { id: '34', name: '김용준', short: '김용' },
    { id: '35', name: '주형승', short: '주형' }, { id: '36', name: '한은지', short: '한은' },
    { id: '37', name: '김희라', short: '김희' }, { id: '38', name: '이아랑', short: '이아' },
    { id: '39', name: '김지혜', short: '김지' }, { id: '40', name: '천하얀', short: '천하' },
    { id: '41', name: '조성은', short: '조성' }, { id: '42', name: '이수진', short: '이수' },
    { id: '43', name: '박민지', short: '박민' }, { id: '44', name: '정유진', short: '정유' }
];

const baseTeacherSchedule32 = {
    '1_0': '108정보', '3_0': '107정보', '5_0': '106정보', '6_0': '109정보',
    '1_1': '102정보', '2_1': '110정보', '4_1': '104정보', '6_1': '101정보',
    '2_2': '102정보', '3_2': '103정보', '5_2': '106정보', '6_2': '105정보',
    '1_3': '109정보', '2_3': '101정보', '4_3': '105정보', '5_3': '104정보',
    '1_4': '110정보', '2_4': '107정보', '4_4': '108정보', '6_4': '103정보'
};

export let officeState = {
    selectedTeacher: teacherList.find(t => t.default),
    selectedGrade: 1, selectedClassNum: 7, currentWeekMode: 'this'
};

// 🎯 확실한 실행을 위해 파일이 열리자마자 가장 먼저 버튼 이벤트를 장착합니다.
document.getElementById('setDefaultMyScheduleBtn')?.addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user) return alert("교사 로그인이 필요합니다.");
    
    try {
        await setDoc(doc(db, "user_preferences", user.uid), {
            teacherShort: officeState.selectedTeacher.short,
            classStr: `${officeState.selectedGrade}-${officeState.selectedClassNum}`
        }, { merge: true });
        
        alert(`✅ 설정 완료!\n다음 번 [${user.email}] 계정으로 로그인하시면, [${officeState.selectedTeacher.name}] 선생님과 [${officeState.selectedGrade}학년 ${officeState.selectedClassNum}반]이 기본으로 뜹니다.`);
    } catch(e) { 
        alert("저장 중 오류가 발생했습니다.");
    }
});

export function initOfficeTab(currentUser) {
    initTimetables(currentUser);
    
    document.getElementById('weekToggleThisBtn')?.addEventListener('click', (e) => {
        officeState.currentWeekMode = 'this';
        e.target.className = "px-3 py-1 text-xs font-bold bg-white text-indigo-700 shadow-sm rounded-lg transition-all";
        document.getElementById('weekToggleNextBtn').className = "px-3 py-1 text-xs font-medium text-slate-600 rounded-lg transition-all";
        initTimetables(auth.currentUser);
    });
    
    document.getElementById('weekToggleNextBtn')?.addEventListener('click', (e) => {
        officeState.currentWeekMode = 'next';
        e.target.className = "px-3 py-1 text-xs font-bold bg-white text-indigo-700 shadow-sm rounded-lg transition-all";
        document.getElementById('weekToggleThisBtn').className = "px-3 py-1 text-xs font-medium text-slate-600 rounded-lg transition-all";
        initTimetables(auth.currentUser);
    });

    document.getElementById('titleTeacherNameBtn')?.addEventListener('click', () => {
        const list = document.getElementById('modalTeacherList'); list.innerHTML = '';
        teacherList.forEach(t => {
            const btn = document.createElement('button');
            btn.className = `p-2 rounded-xl text-center text-xs font-semibold ${t.short === officeState.selectedTeacher.short ? 'bg-indigo-600 text-white' : 'bg-slate-50 hover:bg-slate-200'}`;
            btn.textContent = t.name;
            btn.onclick = () => { officeState.selectedTeacher = t; document.getElementById('teacherSelectModal').classList.add('hidden'); initTimetables(auth.currentUser); };
            list.appendChild(btn);
        });
        document.getElementById('teacherSelectModal').classList.remove('hidden');
    });

    document.getElementById('titleClassNameBtn')?.addEventListener('click', () => {
        const list = document.getElementById('modalClassList'); list.innerHTML = '';
        for (let g=1; g<=3; g++) {
            for(let c=1; c<=9; c++) {
                const btn = document.createElement('button');
                btn.className = `p-2 rounded-xl text-center text-xs font-semibold ${(g===officeState.selectedGrade && c===officeState.selectedClassNum) ? 'bg-sky-600 text-white' : 'bg-slate-50 hover:bg-slate-200'}`;
                btn.textContent = `${g}-${c}`;
                btn.onclick = () => { officeState.selectedGrade = g; officeState.selectedClassNum = c; document.getElementById('classSelectModal').classList.add('hidden'); initTimetables(auth.currentUser); };
                list.appendChild(btn);
            }
        }
        document.getElementById('classSelectModal').classList.remove('hidden');
    });

    document.getElementById('closeTeacherSelectModalBtn')?.addEventListener('click', () => document.getElementById('teacherSelectModal').classList.add('hidden'));
    document.getElementById('closeClassSelectModalBtn')?.addEventListener('click', () => document.getElementById('classSelectModal').classList.add('hidden'));

    const todayYmd = new Date().toISOString().slice(0,10).replace(/-/g, '');
    document.getElementById('mealDateInput').value = new Date().toISOString().slice(0,10);
    document.getElementById('fetchMealBtn')?.addEventListener('click', () => { fetchNeisMeal(document.getElementById('mealDateInput').value.replace(/-/g, '')); });
    fetchNeisMeal(todayYmd);
}

export function initTimetables(currentUser) {
    if(!document.getElementById('titleTeacherNameBtn')) return;
    document.getElementById('titleTeacherNameBtn').textContent = officeState.selectedTeacher.name;
    document.getElementById('titleClassNameBtn').textContent = `${officeState.selectedGrade}-${officeState.selectedClassNum}`;
    loadTeacherTimetable(currentUser);
    loadClassTimetable(currentUser);
}

async function loadTeacherTimetable(currentUser) {
    const tbody = document.getElementById('teacherTimetableGridBody'); if(!tbody) return;
    let schedule = {};
    try {
        const tCode = officeState.selectedTeacher.short === '신정' ? '32' : officeState.selectedTeacher.short;
        const snap = await getDoc(doc(db, "timetable_schedules", `tt_teacher_${officeState.currentWeekMode}_${tCode}`));
        if (snap.exists()) schedule = snap.data().schedule;
    } catch(e) {}

    tbody.innerHTML = '';
    for (let p = 1; p <= 7; p++) {
        let tr = `<tr class="border-b border-slate-200"><td class="py-2.5 px-1 font-bold bg-slate-50 border-r text-xs text-slate-500">${p}교시</td>`;
        for (let d = 0; d < 5; d++) {
            const key = `${p}_${d}`; const cell = schedule[key] || { text: '', type: 'normal' };
            let style = 'tt-cell-normal';
            if (officeState.selectedTeacher.short === '신정') {
                if (cell.text !== (baseTeacherSchedule32[key] || '')) style = cell.text.includes('진로') ? 'tt-cell-changed-green' : (cell.text ? 'tt-cell-changed-red' : style);
            } else {
                if (cell.type === 'red') style = 'tt-cell-changed-red'; if (cell.type === 'green') style = 'tt-cell-changed-green';
            }
            tr += `<td data-key="${key}" class="tt-teacher-cell p-2 border-r ${style} cursor-pointer font-bold text-xs sm:text-sm hover:opacity-90">${cell.text}</td>`;
        }
        tbody.insertAdjacentHTML('beforeend', tr + '</tr>');
    }

    document.querySelectorAll('.tt-teacher-cell').forEach(td => {
        td.onclick = async () => {
            const user = auth.currentUser;
            if (!user) return alert("교사 로그인이 필요합니다.");
            const key = td.getAttribute('data-key');
            const newText = prompt("과목명 입력 (비워두면 삭제):", schedule[key]?.text || ''); if (newText === null) return;
            const newTypeChoice = prompt("색상 선택: 1(기본), 2(연보라/보강), 3(민트/행사)", '1');
            schedule[key] = { text: newText.trim(), type: newTypeChoice === '2' ? 'red' : (newTypeChoice === '3' ? 'green' : 'normal') };
            const tCode = officeState.selectedTeacher.short === '신정' ? '32' : officeState.selectedTeacher.short;
            await setDoc(doc(db, "timetable_schedules", `tt_teacher_${officeState.currentWeekMode}_${tCode}`), { schedule }, { merge: true });
            loadTeacherTimetable(user);
        };
    });
}

async function loadClassTimetable(currentUser) {
    const tbody = document.getElementById('classTimetableGridBody'); if(!tbody) return;
    let schedule = {};
    try {
        const snap = await getDoc(doc(db, "timetable_schedules", `tt_class_${officeState.currentWeekMode}_${officeState.selectedGrade}-${officeState.selectedClassNum}`));
        if (snap.exists()) schedule = snap.data().schedule;
    } catch(e) {}

    tbody.innerHTML = '';
    for (let p = 1; p <= 7; p++) {
        let tr = `<tr class="border-b border-slate-200"><td class="py-2.5 px-1 font-bold bg-slate-50 border-r text-xs text-slate-500">${p}교시</td>`;
        for (let d = 0; d < 5; d++) {
            const key = `${p}_${d}`; const cell = schedule[key] || { text: '', type: 'normal' };
            let style = cell.type === 'red' ? 'tt-cell-changed-red' : (cell.type === 'green' ? 'tt-cell-changed-green' : 'tt-cell-normal');
            tr += `<td data-key="${key}" class="tt-class-cell p-2 border-r ${style} cursor-pointer font-bold text-xs sm:text-sm hover:opacity-90">${cell.text}</td>`;
        }
        tbody.insertAdjacentHTML('beforeend', tr + '</tr>');
    }
}

async function fetchNeisMeal(dateYmd) {
    const mealBox = document.getElementById('mealDishList'); if(!mealBox) return;
    try {
        const res = await fetch(`https://open.neis.go.kr/hub/mealServiceDietInfo?Type=json&pIndex=1&pSize=5&ATPT_OFCDC_SC_CODE=E10&SD_SCHUL_CODE=7331057&MLSV_YMD=${dateYmd}`);
        const data = await res.json();
        if (data.mealServiceDietInfo) mealBox.textContent = data.mealServiceDietInfo[1].row[0].DDISH_NM.replace(/\([0-9\.\s]+\)/g, '').replace(/<br\/>/g, '\n');
        else mealBox.textContent = "급식 정보가 없습니다.";
    } catch (err) { mealBox.textContent = "조회 오류"; }
