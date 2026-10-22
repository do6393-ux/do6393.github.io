import { auth, db, signInWithEmailAndPassword, signOut, onAuthStateChanged, collection, addDoc, doc, getDoc, updateDoc, serverTimestamp } from './firebase-config.js';
import { initClassTab, unitMeta } from './tab-class.js';
import { initWorkTab, workCatMeta } from './tab-work.js';
import { initOfficeTab, officeState, teacherList } from './tab-office.js';

let currentUser = null;

// 새 탭 단독 뷰어 (URL 파라미터 감지)
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has('lesson')) {
    document.getElementById('mainDashboardApp').classList.add('hidden');
    document.getElementById('standaloneViewer').classList.remove('hidden');
    loadStandaloneLesson(urlParams.get('lesson'));
} else if (urlParams.has('task')) {
    document.getElementById('mainDashboardApp').classList.add('hidden');
    document.getElementById('standaloneTaskViewer').classList.remove('hidden');
    loadStandaloneTask(urlParams.get('task'));
}

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

// 로그인 상태 감지
onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (!urlParams.has('lesson') && !urlParams.has('task')) {
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

// 로그인/로그아웃 모달 
document.getElementById('openLoginModalBtn')?.addEventListener('click', () => document.getElementById('loginModal').classList.remove('hidden'));
document.getElementById('closeLoginModalBtn')?.addEventListener('click', () => document.getElementById('loginModal').classList.add('hidden'));
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try { await signInWithEmailAndPassword(auth, document.getElementById('loginEmail').value, document.getElementById('loginPassword').value); document.getElementById('loginModal').classList.add('hidden'); } 
    catch (err) { alert("로그인 실패"); }
});
document.getElementById('logoutBtn')?.addEventListener('click', () => signOut(auth));

// 폼 저장 로직 연결
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

document.getElementById('assignmentForm')?.addEventListener('submit', async (e) => {
    e.preventDefault(); const now = new Date();
    await addDoc(collection(db, "assignments"), { studentNum: document.getElementById('studentNum').value, studentName: document.getElementById('studentName').value, text: document.getElementById('assignmentText').value, timeStr: `${now.getMonth()+1}/${now.getDate()} ${now.getHours()}:${now.getMinutes()}`, createdAt: serverTimestamp() });
    alert("제출 완료!"); document.getElementById('assignmentForm').reset();
});

// 모달 닫기 공통 연결
document.getElementById('openNewLessonModalBtn')?.addEventListener('click', () => { document.getElementById('editLessonId').value = ''; document.getElementById('lessonForm').reset(); document.getElementById('lessonModal').classList.remove('hidden'); });
document.getElementById('closeLessonModalBtn')?.addEventListener('click', () => document.getElementById('lessonModal').classList.add('hidden'));
document.getElementById('openNewTaskModalBtn')?.addEventListener('click', () => { document.getElementById('editTaskId').value = ''; document.getElementById('taskForm').reset(); document.getElementById('taskModal').classList.remove('hidden'); });
document.getElementById('closeTaskModalBtn')?.addEventListener('click', () => document.getElementById('taskModal').classList.add('hidden'));

// 이미지 클립보드 붙여넣기 기능
function enableClipboardImagePaste(el) {
    if (!el) return;
    el.addEventListener('paste', (e) => {
        const items = (e.clipboardData || window.clipboardData)?.items; if (!items) return;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                e.preventDefault(); const reader = new FileReader();
                reader.onload = (evt) => {
                    const text = `\n\n![캡처 이미지](${evt.target.result})\n\n`;
                    el.value = el.value.substring(0, el.selectionStart) + text + el.value.substring(el.selectionEnd);
                };
                reader.readAsDataURL(items[i].getAsFile()); break;
            }
        }
    });
}
enableClipboardImagePaste(document.getElementById('taskContentInput'));
enableClipboardImagePaste(document.getElementById('lessonContentInput'));

// ----------------------------------------------------
// 단독 뷰어 로직 (수업/업무 공통)
// ----------------------------------------------------
let viewingData = null;

async function loadStandaloneLesson(id) {
    const snap = await getDoc(doc(db, "lessons", id)); if (!snap.exists()) return;
    viewingData = { id: snap.id, ...snap.data() };
    const meta = unitMeta[viewingData.unit] || { name: '정보', badgeClass: 'bg-slate-100 text-slate-600' };
    document.getElementById('viewerTitle').textContent = viewingData.title;
    document.getElementById('viewerSummary').textContent = viewingData.summary || '';
    document.getElementById('viewerLessonNum').textContent = viewingData.lessonNum || '';
    document.getElementById('viewerUnitBadge').textContent = meta.name;
    document.getElementById('viewerUnitBadge').className = `text-xs font-bold px-3 py-1 rounded-full border ${meta.badgeClass}`;
    if (viewingData.coverImage) { document.getElementById('viewerCoverImg').src = viewingData.coverImage; document.getElementById('viewerCoverContainer').classList.remove('hidden'); }
    document.getElementById('viewerMarkdownBody').innerHTML = marked.parse(viewingData.content || '');
}

async function loadStandaloneTask(id) {
    const snap = await getDoc(doc(db, "work_tasks", id)); if (!snap.exists()) return;
    viewingData = { id: snap.id, ...snap.data() };
    const meta = workCatMeta[viewingData.category] || { name: '정보 업무', badgeClass: 'bg-slate-100 text-slate-700' };
    document.getElementById('taskViewerTitle').textContent = viewingData.title;
    document.getElementById('taskViewerSummary').textContent = viewingData.summary || '';
    document.getElementById('taskViewerCatBadge').textContent = meta.name;
    document.getElementById('taskViewerCatBadge').className = `text-xs font-bold px-3 py-1 rounded-full border ${meta.badgeClass}`;
    document.getElementById('taskViewerMarkdownBody').innerHTML = marked.parse(viewingData.content || '');
}
