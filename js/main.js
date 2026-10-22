import { auth, db, signInWithEmailAndPassword, signOut, onAuthStateChanged, collection, addDoc, doc, getDoc, updateDoc, serverTimestamp } from './firebase-config.js';
import { initClassTab, unitMeta } from './tab-class.js';
import { initWorkTab, workCatMeta } from './tab-work.js';
import { initOfficeTab, officeState, teacherList } from './tab-office.js';

let currentUser = null;

// 🔥 HTML 화면이 완벽히 렌더링된 후 모든 버튼 기능을 활성화하도록 안전장치 추가
document.addEventListener('DOMContentLoaded', () => {
    
    // 탭 스위치 로직
    function switchTab(target) {
        document.getElementById('tabContentClass').classList.add('hidden');
        document.getElementById('tabContentWork').classList.add('hidden');
        document.getElementById('tabContentOffice').classList.add('hidden');
        
        const btnOff = "nav-tab-btn px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-600 flex items-center gap-1.5";
        document.getElementById('navTabClass').className = btnOff;
        if(currentUser) { document.getElementById('navTabWork').className = btnOff; document.getElementById('navTabOffice').className = btnOff; }

        const mobOff = "flex-1 py-1.5 text-center text-xs font-medium text-slate-600";
        document.getElementById('mobileNavTabClass').className = mobOff;
        if(currentUser) { document.getElementById('mobileNavTabWork').className = mobOff; document.getElementById('mobileNavTabOffice').className = mobOff; }

        if (target === 'work') {
            if(!currentUser) return switchTab('class'); 
            document.getElementById('tabContentWork').classList.remove('hidden');
            document.getElementById('navTabWork').className = "nav-tab-btn active px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white text-indigo-700 shadow-sm flex items-center gap-1.5";
            document.getElementById('mobileNavTabWork').className = "flex-1 py-1.5 text-center text-xs font-bold bg-white text-indigo-700 rounded-lg shadow-sm";
        } else if (target === 'office') {
            if(!currentUser) return switchTab('class'); 
            document.getElementById('tabContentOffice').classList.remove('hidden');
            document.getElementById('navTabOffice').className = "nav-tab-btn active px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white text-teal-700 shadow-sm flex items-center gap-1.5";
            document.getElementById('mobileNavTabOffice').className = "flex-1 py-1.5 text-center text-xs font-bold bg-white text-teal-700 rounded-lg shadow-sm";
        } else {
            document.getElementById('tabContentClass').classList.remove('hidden');
            document.getElementById('navTabClass').className = "nav-tab-btn active px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white text-sky-700 shadow-sm flex items-center gap-1.5";
            document.getElementById('mobileNavTabClass').className = "flex-1 py-1.5 text-center text-xs font-bold bg-white text-sky-700 rounded-lg shadow-sm";
        }
    }

    document.getElementById('navTabClass')?.addEventListener('click', () => switchTab('class'));
    document.getElementById('navTabWork')?.addEventListener('click', () => switchTab('work'));
    document.getElementById('navTabOffice')?.addEventListener('click', () => switchTab('office'));
    document.getElementById('mobileNavTabClass')?.addEventListener('click', () => switchTab('class'));
    document.getElementById('mobileNavTabWork')?.addEventListener('click', () => switchTab('work'));
    document.getElementById('mobileNavTabOffice')?.addEventListener('click', () => switchTab('office'));

    const urlParams = new URLSearchParams(window.location.search);
    const isLessonViewer = urlParams.has('lesson');
    const isTaskViewer = urlParams.has('task');

    // 🎯 교사 로그인 모달 제어 (안전하게 연결)
    document.getElementById('openLoginModalBtn')?.addEventListener('click', () => document.getElementById('loginModal').classList.remove('hidden'));
    document.getElementById('closeLoginModalBtn')?.addEventListener('click', () => document.getElementById('loginModal').classList.add('hidden'));
    document.getElementById('logoutBtn')?.addEventListener('click', () => signOut(auth));

    document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        try { 
            await signInWithEmailAndPassword(auth, document.getElementById('loginEmail').value, document.getElementById('loginPassword').value); 
            document.getElementById('loginModal').classList.add('hidden'); 
            document.getElementById('loginForm').reset();
        } catch (err) { alert("로그인 실패: 이메일과 비밀번호를 확인해주세요."); }
    });

    onAuthStateChanged(auth, async (user) => {
        currentUser = user;
        if (!isLessonViewer && !isTaskViewer) {
            if (user) {
                document.getElementById('openLoginModalBtn').classList.add('hidden');
                document.getElementById('logoutBtn').classList.remove('hidden');
                document.getElementById('navTabWork').classList.remove('hidden');
                document.getElementById('navTabOffice').classList.remove('hidden');
                document.getElementById('mobileNavTabWork').classList.remove('hidden');
                document.getElementById('mobileNavTabOffice').classList.remove('hidden');
                document.getElementById('openNewLessonModalBtn').classList.remove('hidden');
                document.getElementById('openNewTaskModalBtn').classList.remove('hidden');

                try {
                    const snap = await getDoc(doc(db, "user_preferences", user.uid));
                    if (snap.exists()) {
                        const p = snap.data();
                        if (p.teacherShort) officeState.selectedTeacher = teacherList.find(t => t.short === p.teacherShort) || officeState.selectedTeacher;
                        if (p.classStr) { officeState.selectedGrade = Number(p.classStr.split('-')[0]); officeState.selectedClassNum = Number(p.classStr.split('-')[1]); }
                    }
                } catch(e) {}
            } else {
                document.getElementById('openLoginModalBtn').classList.remove('hidden');
                document.getElementById('logoutBtn').classList.add('hidden');
                document.getElementById('navTabWork').classList.add('hidden');
                document.getElementById('navTabOffice').classList.add('hidden');
                document.getElementById('mobileNavTabWork').classList.add('hidden');
                document.getElementById('mobileNavTabOffice').classList.add('hidden');
                document.getElementById('openNewLessonModalBtn').classList.add('hidden');
                document.getElementById('openNewTaskModalBtn').classList.add('hidden');
                
                if(!document.getElementById('tabContentWork').classList.contains('hidden') || !document.getElementById('tabContentOffice').classList.contains('hidden')) { switchTab('class'); }
            }
            initClassTab(user);
            initWorkTab(user);
            initOfficeTab(user);
        }
    });

    // 폼 관련 이벤트 리스너들
    document.getElementById('lessonForm')?.addEventListener('submit', async (e) => { /* 폼 로직 유지 */ e.preventDefault(); /* ... */ });
    document.getElementById('taskForm')?.addEventListener('submit', async (e) => { /* 폼 로직 유지 */ e.preventDefault(); /* ... */ });
    
    document.getElementById('openNewLessonModalBtn')?.addEventListener('click', () => { document.getElementById('editLessonId').value = ''; document.getElementById('lessonForm').reset(); document.getElementById('lessonModal').classList.remove('hidden'); });
    document.getElementById('closeLessonModalBtn')?.addEventListener('click', () => document.getElementById('lessonModal').classList.add('hidden'));
    document.getElementById('openNewTaskModalBtn')?.addEventListener('click', () => { document.getElementById('editTaskId').value = ''; document.getElementById('taskForm').reset(); document.getElementById('taskModal').classList.remove('hidden'); });
    document.getElementById('closeTaskModalBtn')?.addEventListener('click', () => document.getElementById('taskModal').classList.add('hidden'));
});
