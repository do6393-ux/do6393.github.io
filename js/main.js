import { auth, db, signInWithEmailAndPassword, signOut, onAuthStateChanged, doc, getDoc, setDoc, updateDoc, addDoc, collection, serverTimestamp } from './firebase-config.js';
import { initClassTab } from './tab-class.js';
import { initWorkTab } from './tab-work.js';
import { initOfficeTab, officeState, teacherList } from './tab-office.js';
import { updateHomeroomClass } from './tab-homeroom.js';

let currentUser = null;

// 🎯 1. 최상단 라우팅 (UI 전환을 가장 먼저 실행하여 메인 대시보드가 뜨는 것을 원천 차단)
const urlParams = new URLSearchParams(window.location.search);
const isLessonView = urlParams.has('lesson');
const isTaskView = urlParams.has('task');

document.addEventListener('DOMContentLoaded', () => {
    
    // 뷰어 모드 접속 시 메인 대시보드 즉시 가림
    if (isLessonView || isTaskView) {
        document.getElementById('mainDashboardApp').classList.add('hidden');
        if (isLessonView) document.getElementById('standaloneViewer').classList.remove('hidden');
        if (isTaskView) document.getElementById('standaloneTaskViewer').classList.remove('hidden');
    }
    
    function switchTab(target) {
        document.getElementById('tabContentClass').classList.add('hidden');
        document.getElementById('tabContentWork').classList.add('hidden');
        document.getElementById('tabContentOffice').classList.add('hidden');
        document.getElementById('tabContentHomeroom').classList.add('hidden');
        
        const btnOff = "nav-tab-btn px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-600 flex items-center gap-1.5";
        document.getElementById('navTabClass').className = btnOff;
        if(currentUser) { 
            document.getElementById('navTabWork').className = btnOff; 
            document.getElementById('navTabOffice').className = btnOff;
            document.getElementById('navTabHomeroom').className = btnOff;
        }

        const mobOff = "flex-1 py-1.5 text-center text-xs font-medium text-slate-600";
        document.getElementById('mobileNavTabClass').className = mobOff;
        if(currentUser) { 
            document.getElementById('mobileNavTabWork').className = mobOff; 
            document.getElementById('mobileNavTabOffice').className = mobOff;
            document.getElementById('mobileNavTabHomeroom').className = mobOff;
        }

        if (target === 'work' && currentUser) {
            document.getElementById('tabContentWork').classList.remove('hidden');
            document.getElementById('navTabWork').className = "nav-tab-btn active px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white text-indigo-700 shadow-sm flex items-center gap-1.5";
            document.getElementById('mobileNavTabWork').className = "flex-1 py-1.5 text-center text-xs font-bold bg-white text-indigo-700 rounded-lg shadow-sm";
        } else if (target === 'office' && currentUser) {
            document.getElementById('tabContentOffice').classList.remove('hidden');
            document.getElementById('navTabOffice').className = "nav-tab-btn active px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white text-teal-700 shadow-sm flex items-center gap-1.5";
            document.getElementById('mobileNavTabOffice').className = "flex-1 py-1.5 text-center text-xs font-bold bg-white text-teal-700 rounded-lg shadow-sm";
        } else if (target === 'homeroom' && currentUser) {
            document.getElementById('tabContentHomeroom').classList.remove('hidden');
            document.getElementById('navTabHomeroom').className = "nav-tab-btn active px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white text-rose-600 shadow-sm flex items-center gap-1.5";
            document.getElementById('mobileNavTabHomeroom').className = "flex-1 py-1.5 text-center text-xs font-bold bg-white text-rose-600 rounded-lg shadow-sm";
        } else {
            document.getElementById('tabContentClass').classList.remove('hidden');
            document.getElementById('navTabClass').className = "nav-tab-btn active px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white text-sky-700 shadow-sm flex items-center gap-1.5";
            document.getElementById('mobileNavTabClass').className = "flex-1 py-1.5 text-center text-xs font-bold bg-white text-sky-700 rounded-lg shadow-sm";
        }
    }

    document.getElementById('navTabClass')?.addEventListener('click', () => switchTab('class'));
    document.getElementById('navTabWork')?.addEventListener('click', () => switchTab('work'));
    document.getElementById('navTabOffice')?.addEventListener('click', () => switchTab('office'));
    document.getElementById('navTabHomeroom')?.addEventListener('click', () => switchTab('homeroom'));
    
    document.getElementById('mobileNavTabClass')?.addEventListener('click', () => switchTab('class'));
    document.getElementById('mobileNavTabWork')?.addEventListener('click', () => switchTab('work'));
    document.getElementById('mobileNavTabOffice')?.addEventListener('click', () => switchTab('office'));
    document.getElementById('mobileNavTabHomeroom')?.addEventListener('click', () => switchTab('homeroom'));

    document.getElementById('openLoginModalBtn')?.addEventListener('click', () => document.getElementById('loginModal').classList.remove('hidden'));
    document.getElementById('closeLoginModalBtn')?.addEventListener('click', () => document.getElementById('loginModal').classList.add('hidden'));
    document.getElementById('logoutBtn')?.addEventListener('click', () => signOut(auth));

    document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        try { 
            await signInWithEmailAndPassword(auth, document.getElementById('loginEmail').value, document.getElementById('loginPassword').value); 
            document.getElementById('loginModal').classList.add('hidden'); 
            document.getElementById('loginForm').reset();
        } catch (err) { alert("로그인 실패"); }
    });

    const tSelect = document.getElementById('profileTeacherSelect');
    if (tSelect) {
        teacherList.forEach(t => { const opt = document.createElement('option'); opt.value = t.short; opt.textContent = t.name; tSelect.appendChild(opt); });
    }
    
    function updateHomeroomUI() {
        const classStr = `${officeState.selectedGrade}-${officeState.selectedClassNum}`;
        document.getElementById('navTabHomeroomText').textContent = `🔒 ${classStr}반`; document.getElementById('mobileNavTabHomeroomText').textContent = `🔒 ${classStr}반`;
        document.getElementById('homeroomTitleContacts').textContent = `${officeState.selectedGrade}학년 ${officeState.selectedClassNum}반 비상연락망`;
        
        const cleanTitle = document.getElementById('homeroomTitleCleaning');
        if (cleanTitle) cleanTitle.textContent = `${officeState.selectedGrade}학년 ${officeState.selectedClassNum}반 청소 구역`;
        
        updateHomeroomClass(classStr);
    }

    document.getElementById('openProfileSettingsBtn')?.addEventListener('click', () => {
        document.getElementById('profileTeacherSelect').value = officeState.selectedTeacher.short;
        document.getElementById('profileGradeSelect').value = officeState.selectedGrade;
        document.getElementById('profileClassSelect').value = officeState.selectedClassNum;
        document.getElementById('profileSettingsModal').classList.remove('hidden');
    });
    
    document.getElementById('closeProfileSettingsBtn')?.addEventListener('click', () => document.getElementById('profileSettingsModal').classList.add('hidden'));
    
    document.getElementById('saveProfileSettingsBtn')?.addEventListener('click', async () => {
        if (!currentUser) return;
        const short = document.getElementById('profileTeacherSelect').value;
        const gr = document.getElementById('profileGradeSelect').value;
        const cl = document.getElementById('profileClassSelect').value;
        
        try {
            await setDoc(doc(db, "user_preferences", currentUser.uid), { teacherShort: short, classStr: `${gr}-${cl}` }, { merge: true });
            officeState.selectedTeacher = teacherList.find(t => t.short === short);
            officeState.selectedGrade = Number(gr);
            officeState.selectedClassNum = Number(cl);
            
            document.getElementById('profileSettingsModal').classList.add('hidden');
            alert("✅ 설정이 저장되었습니다. 이제 로그인 시 항상 이 설정으로 시작합니다.");
            
            initOfficeTab(currentUser);
            updateHomeroomUI();
        } catch(e) { alert("저장 실패"); }
    });

    onAuthStateChanged(auth, async (user) => {
        currentUser = user;
        
        // 🎯 2. 단원별 수업 자료실 새 탭 데이터 파싱
        if (isLessonView) {
            try {
                const snap = await getDoc(doc(db, "lessons", urlParams.get('lesson')));
                if (snap.exists()) {
                    const d = snap.data();
                    document.getElementById('viewerTitle').textContent = d.title || '';
                    document.getElementById('viewerSummary').textContent = d.summary || '';
                    document.getElementById('viewerMarkdownBody').innerHTML = window.marked ? marked.parse(d.content || '') : (d.content || '');
                    if (d.coverImage) {
                        document.getElementById('viewerCoverContainer').classList.remove('hidden');
                        document.getElementById('viewerCoverImg').src = d.coverImage;
                    }
                    const unitMeta = {
                        'unit1': { name: '1단원. 컴퓨팅 시스템', badgeClass: 'bg-sky-50 text-sky-600 border-sky-200' },
                        'unit2': { name: '2단원. 데이터', badgeClass: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
                        'unit3': { name: '3단원. 알고리즘과 프로그래밍', badgeClass: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
                        'unit4': { name: '4단원. 인공지능', badgeClass: 'bg-purple-50 text-purple-600 border-purple-200' },
                        'unit5': { name: '5단원. 디지털 문화', badgeClass: 'bg-amber-50 text-amber-600 border-amber-200' }
                    };
                    const m = unitMeta[d.unit] || { name: '수업 자료', badgeClass: 'bg-slate-100 text-slate-600' };
                    const b = document.getElementById('viewerUnitBadge');
                    b.textContent = m.name; b.className = `text-xs font-bold px-3 py-1 rounded-full border ${m.badgeClass}`;
                    document.getElementById('viewerLessonNum').textContent = d.lessonNum || '';
                } else {
                    document.getElementById('viewerTitle').textContent = "삭제되었거나 없는 자료입니다.";
                }
            } catch(e) {}
            return;
        }

        // 🎯 3. 정보 기획 업무 새 탭 데이터 파싱
        if (isTaskView) {
            try {
                const snap = await getDoc(doc(db, "work_tasks", urlParams.get('task')));
                if (snap.exists()) {
                    const d = snap.data();
                    document.getElementById('taskViewerTitle').textContent = d.title || '';
                    document.getElementById('taskViewerSummary').textContent = d.summary || '';
                    document.getElementById('taskViewerMarkdownBody').innerHTML = window.marked ? marked.parse(d.content || '') : (d.content || '');
                    const catMap = { 'devices': '💻 계정 및 기기', 'network': '🌐 네트워크/서버', 'privacy': '🛡️ 보안점검', 'software': '🔑 SW관리자', 'disposal': '📊 행정/공시' };
                    const statMap = { 'todo': '⏳ 대기중', 'doing': '🚀 진행중', 'done': '✅ 완료됨' };
                    const cb = document.getElementById('taskViewerCatBadge');
                    const sb = document.getElementById('taskViewerStatusBadge');
                    cb.textContent = catMap[d.category] || d.category;
                    cb.className = "text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200";
                    sb.textContent = statMap[d.status] || d.status;
                    sb.className = d.status === 'done' ? "text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200" : "text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200";
                } else {
                    document.getElementById('taskViewerTitle').textContent = "삭제되었거나 없는 업무입니다.";
                }
            } catch(e) {}
            return;
        }

        // 뷰어가 아니면 대시보드 로직 정상 수행
        if (user) {
            document.getElementById('openLoginModalBtn')?.classList.add('hidden');
            document.getElementById('logoutBtn')?.classList.remove('hidden');
            document.getElementById('openProfileSettingsBtn')?.classList.remove('hidden'); 
            document.getElementById('teacherEditNoticeBtn')?.classList.remove('hidden');
            
            document.getElementById('navTabWork')?.classList.remove('hidden');
            document.getElementById('navTabOffice')?.classList.remove('hidden');
            document.getElementById('navTabHomeroom')?.classList.remove('hidden'); 
            document.getElementById('mobileNavTabWork')?.classList.remove('hidden');
            document.getElementById('mobileNavTabOffice')?.classList.remove('hidden');
            document.getElementById('mobileNavTabHomeroom')?.classList.remove('hidden');
            
            document.getElementById('openNewLessonModalBtn')?.classList.remove('hidden');
            document.getElementById('openNewTaskModalBtn')?.classList.remove('hidden');

            try {
                const snap = await getDoc(doc(db, "user_preferences", user.uid));
                if (snap.exists()) {
                    const p = snap.data();
                    if (p.teacherShort) officeState.selectedTeacher = teacherList.find(t => t.short === p.teacherShort) || officeState.selectedTeacher;
                    if (p.classStr) { officeState.selectedGrade = Number(p.classStr.split('-')[0]); officeState.selectedClassNum = Number(p.classStr.split('-')[1]); }
                }
            } catch(e) {}
            
            updateHomeroomUI();
        } else {
            document.getElementById('openLoginModalBtn')?.classList.remove('hidden');
            document.getElementById('logoutBtn')?.classList.add('hidden');
            document.getElementById('openProfileSettingsBtn')?.classList.add('hidden');
            document.getElementById('teacherEditNoticeBtn')?.classList.add('hidden');
            
            document.getElementById('navTabWork')?.classList.add('hidden');
            document.getElementById('navTabOffice')?.classList.add('hidden');
            document.getElementById('navTabHomeroom')?.classList.add('hidden');
            document.getElementById('mobileNavTabWork')?.classList.add('hidden');
            document.getElementById('mobileNavTabOffice')?.classList.add('hidden');
            document.getElementById('mobileNavTabHomeroom')?.classList.add('hidden');
            
            document.getElementById('openNewLessonModalBtn')?.classList.add('hidden');
            document.getElementById('openNewTaskModalBtn')?.classList.add('hidden');
            switchTab('class');
        }
        initClassTab(user);
        initWorkTab(user);
        initOfficeTab(user);
    });

    document.getElementById('closeLessonModalBtn')?.addEventListener('click', () => document.getElementById('lessonModal').classList.add('hidden'));
    document.getElementById('closeTaskModalBtn')?.addEventListener('click', () => document.getElementById('taskModal').classList.add('hidden'));

    document.getElementById('openNewLessonModalBtn')?.addEventListener('click', () => { document.getElementById('editLessonId').value = ''; document.getElementById('lessonForm').reset(); document.getElementById('lessonModal').classList.remove('hidden'); });
    document.getElementById('lessonForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const editId = document.getElementById('editLessonId').value;
        const payload = {
            unit: document.getElementById('lessonUnitSelect').value, lessonNum: document.getElementById('lessonNumInput').value.trim(),
            title: document.getElementById('lessonTitleInput').value.trim(), summary: document.getElementById('lessonSummaryInput').value.trim(),
            coverImage: document.getElementById('lessonCoverInput').value.trim(), content: document.getElementById('lessonContentInput').value,
            isVisible: document.getElementById('lessonVisibilityCheckbox').checked, createdAt: serverTimestamp()
        };
        if (editId) await updateDoc(doc(db, "lessons", editId), payload); else await addDoc(collection(db, "lessons"), payload);
        document.getElementById('lessonModal').classList.add('hidden');
    });

    document.getElementById('openNewTaskModalBtn')?.addEventListener('click', () => { document.getElementById('editTaskId').value = ''; document.getElementById('taskForm').reset(); document.getElementById('taskModal').classList.remove('hidden'); });
    document.getElementById('taskForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const editId = document.getElementById('editTaskId').value;
        const payload = {
            category: document.getElementById('taskCatSelect').value, status: document.getElementById('taskStatusSelect').value,
            title: document.getElementById('taskTitleInput').value.trim(), summary: document.getElementById('taskSummaryInput').value.trim(),
            content: document.getElementById('taskContentInput').value, createdAt: serverTimestamp()
        };
        if (editId) await updateDoc(doc(db, "work_tasks", editId), payload); else await addDoc(collection(db, "work_tasks"), payload);
        document.getElementById('taskModal').classList.add('hidden');
    });
});
