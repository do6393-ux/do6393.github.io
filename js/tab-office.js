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

export function initOfficeTab(currentUser) {
    initTimetables(currentUser);
    
    // 🎯 기본저장 버튼 이벤트를 함수 내부로 이동시켜 화면이 렌더링된 후 확실히 작동하게 묶음
    const saveBtn = document.getElementById('setDefaultMyScheduleBtn');
    if (saveBtn) {
        saveBtn.onclick = async () => {
            const user = auth.currentUser;
            if (!user) return alert("교사 로그인이 필요합니다.");
            
            try {
                await setDoc(doc(db, "user_preferences", user.uid), {
                    teacherShort: officeState.selectedTeacher.short,
                    classStr: `${officeState.selectedGrade}-${officeState.selectedClassNum}`
                }, { merge: true });
                
                alert(`✅ 설정 완료!\n[${user.email}] 계정에 [${officeState.selectedTeacher.name}] 교사와 [${officeState.selectedGrade}-${officeState.selectedClassNum}] 학급이 기본값으로 저장되었습니다.`);
            } catch(e) { 
                alert("저장 중 오류가 발생했습니다.");
            }
        };
    }

    document.getElementById('weekToggleThisBtn')?.addEventListener('click', (e) => {
        officeState.currentWeekMode = 'this';
        e.target.className = "px-3 py-1 text-xs font-bold bg-white text-indigo-700 shadow-sm rounded-lg transition-all";
        document.getElementById('weekToggleNextBtn').className = "px-3 py-1 text-xs font-medium text-slate-600 rounded-lg transition-all";
        initTimetables(auth.currentUser);
    });
    
    // ... 나머지 탭 로직 동일하게 유지 (모달 오픈, 급식 API 조회 등) ...
}

export function initTimetables(currentUser) {
    if(!document.getElementById('titleTeacherNameBtn')) return;
    document.getElementById('titleTeacherNameBtn').textContent = officeState.selectedTeacher.name;
    document.getElementById('titleClassNameBtn').textContent = `${officeState.selectedGrade}-${officeState.selectedClassNum}`;
    loadTeacherTimetable(currentUser);
    loadClassTimetable(currentUser);
}

// ... 하위 시간표 렌더링 로직(loadTeacherTimetable 등) 동일하게 유지 ...
