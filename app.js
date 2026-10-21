import { auth, db, unitMeta, workCatMeta, pdfWorkTasksClean } from "./firebase-config.js";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, addDoc, updateDoc, deleteDoc, doc, getDoc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let currentUser = null;
let allLessonDocs = [];
let allTaskDocs = [];
let currentSelectedCategory = 'all';
let currentWorkCategory = 'all';

// Tab Switching
const navTabClass = document.getElementById('navTabClass');
const navTabWork = document.getElementById('navTabWork');
const mobileNavTabClass = document.getElementById('mobileNavTabClass');
const mobileNavTabWork = document.getElementById('mobileNavTabWork');
const tabContentClass = document.getElementById('tabContentClass');
const tabContentWork = document.getElementById('tabContentWork');

function switchTab(target) {
    if (target === 'work') {
        tabContentClass.classList.add('hidden');
        tabContentWork.classList.remove('hidden');
        navTabClass.className = "nav-tab-btn px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-600";
        navTabWork.className = "nav-tab-btn active px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white text-indigo-700 shadow-sm";
    } else {
        tabContentWork.classList.add('hidden');
        tabContentClass.classList.remove('hidden');
        navTabWork.className = "nav-tab-btn px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-600";
        navTabClass.className = "nav-tab-btn active px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white text-sky-700 shadow-sm";
    }
}

navTabClass?.addEventListener('click', () => switchTab('class'));
navTabWork?.addEventListener('click', () => switchTab('work'));
mobileNavTabClass?.addEventListener('click', () => switchTab('class'));
mobileNavTabWork?.addEventListener('click', () => switchTab('work'));

// Standalone Viewers
const urlParams = new URLSearchParams(window.location.search);
const viewLessonId = urlParams.get('lesson');
const viewTaskId = urlParams.get('task');

if (viewLessonId) {
    document.getElementById('mainDashboardApp').classList.add('hidden');
    document.getElementById('standaloneViewer').classList.remove('hidden');
    loadStandaloneLesson(viewLessonId);
} else if (viewTaskId) {
    document.getElementById('mainDashboardApp').classList.add('hidden');
    document.getElementById('standaloneTaskViewer').classList.remove('hidden');
    loadStandaloneTask(viewTaskId);
}

async function loadStandaloneLesson(id) {
    try {
        const docRef = doc(db, "lessons", id);
        const snap = await getDoc(docRef);
        if (!snap.exists()) { document.getElementById('viewerTitle').textContent = "자료를 찾을 수 없습니다."; return; }
        const data = snap.data();
        document.title = `${data.title} | 정보 수업 자료실`;
        document.getElementById('viewerTitle').textContent = data.title;
        document.getElementById('viewerSummary').textContent = data.summary || '';
        document.getElementById('viewerLessonNum').textContent = data.lessonNum || '수업 자료';

        const meta = unitMeta[data.unit] || { name: '정보', badgeClass: 'bg-slate-100 text-slate-600' };
        const badge = document.getElementById('viewerUnitBadge');
        badge.textContent = meta.name;
        badge.className = `text-xs font-bold px-3 py-1 rounded-full ${meta.badgeClass}`;

        if (data.coverImage) {
            document.getElementById('viewerCoverImg').src = data.coverImage;
            document.getElementById('viewerCoverContainer').classList.remove('hidden');
        }
        document.getElementById('viewerMarkdownBody').innerHTML = marked.parse(data.content || '');
    } catch (err) { document.getElementById('viewerTitle').textContent = "자료 로드 오류"; }
}

async function loadStandaloneTask(id) {
    try {
        const docRef = doc(db, "work_tasks", id);
        const snap = await getDoc(docRef);
        if (!snap.exists()) { document.getElementById('taskViewerTitle').textContent = "업무 항목을 찾을 수 없습니다."; return; }
        const data = snap.data();
        
        document.title = `${data.title} | 정보부 업무 매뉴얼`;
        document.getElementById('taskViewerTitle').textContent = data.title;
        document.getElementById('taskViewerSummary').textContent = data.summary || '';

        const meta = workCatMeta[data.category] || { name: '정보 업무', badgeClass: 'bg-slate-100 text-slate-700' };
        const badge = document.getElementById('taskViewerCatBadge');
        badge.textContent = meta.name;
        badge.className = `text-xs font-bold px-3 py-1 rounded-full ${meta.badgeClass}`;

        const statusBadge = document.getElementById('taskViewerStatusBadge');
        if (data.status === 'doing') {
            statusBadge.textContent = '🚀 진행중';
            statusBadge.className = 'text-xs font-bold px-3 py-1 rounded-full bg-sky-100 text-sky-800';
        } else if (data.status === 'done') {
            statusBadge.textContent = '✅ 완료됨';
            statusBadge.className = 'text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800';
        } else {
            statusBadge.textContent = '⏳ 대기중';
            statusBadge.className = 'text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-800';
        }

        document.getElementById('taskViewerMarkdownBody').innerHTML = marked.parse(data.content || '');
    } catch (err) { document.getElementById('taskViewerTitle').textContent = "업무 로드 오류"; }
}

// Auth
const authStatusContainer = document.getElementById('authStatusContainer');
const loginModal = document.getElementById('loginModal');
const openLoginModalBtn = document.getElementById('openLoginModalBtn');
const closeLoginModalBtn = document.getElementById('closeLoginModalBtn');
const loginForm = document.getElementById('loginForm');

openLoginModalBtn?.addEventListener('click', () => loginModal.classList.remove('hidden'));
closeLoginModalBtn?.addEventListener('click', () => loginModal.classList.add('hidden'));

onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
        authStatusContainer.innerHTML = `
            <div class="flex items-center gap-2">
                <span class="text-xs text-sky-700 font-semibold hidden sm:inline"><i class="fa-solid fa-user-check mr-1"></i>신정훈 선생님</span>
                <button id="logoutBtn" class="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs px-3 py-1.5 rounded-xl font-medium">로그아웃</button>
            </div>
        `;
        document.getElementById('logoutBtn').addEventListener('click', () => signOut(auth));
        document.getElementById('teacherEditNoticeBtn')?.classList.remove('hidden');
        document.getElementById('openNewLessonModalBtn')?.classList.remove('hidden');
        document.getElementById('openNewTaskModalBtn')?.classList.remove('hidden');
        document.getElementById('addCategoryBtn')?.classList.remove('hidden');
        document.getElementById('workAccessDeniedState')?.classList.add('hidden');
        document.getElementById('workMainDashboard')?.classList.remove('hidden');
    } else {
        authStatusContainer.innerHTML = `
            <button id="openLoginModalBtn" class="bg-sky-600 hover:bg-sky-700 text-white text-xs px-3 py-2 rounded-xl font-medium"><i class="fa-solid fa-user-lock mr-1"></i>교사 로그인</button>
        `;
        document.getElementById('openLoginModalBtn').addEventListener('click', () => loginModal.classList.remove('hidden'));
        document.getElementById('teacherEditNoticeBtn')?.classList.add('hidden');
        document.getElementById('openNewLessonModalBtn')?.classList.add('hidden');
        document.getElementById('openNewTaskModalBtn')?.classList.add('hidden');
        document.getElementById('addCategoryBtn')?.classList.add('hidden');
        document.getElementById('workAccessDeniedState')?.classList.remove('hidden');
        document.getElementById('workMainDashboard')?.classList.add('hidden');
    }
    renderLessons();
    renderTasks();
});

loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        await signInWithEmailAndPassword(auth, document.getElementById('loginEmail').value, document.getElementById('loginPassword').value);
        loginModal.classList.add('hidden');
        loginForm.reset();
    } catch (err) {
        alert("로그인에 실패했습니다.");
    }
});

// Lessons
const lessonsRef = collection(db, "lessons");
onSnapshot(query(lessonsRef, orderBy("createdAt", "desc")), (snapshot) => {
    allLessonDocs = [];
    snapshot.forEach(docSnap => allLessonDocs.push({ id: docSnap.id, ...docSnap.data() }));
    renderLessons();
});

function renderLessons() {
    const container = document.getElementById('resourceContainer');
    if (!container) return;
    let filtered = allLessonDocs.filter(item => {
        if (!currentUser && item.isVisible === false) return false;
        if (currentSelectedCategory !== 'all' && item.unit !== currentSelectedCategory) return false;
        return true;
    });

    if (filtered.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center py-10 text-xs text-slate-400">등록된 수업 자료가 없습니다.</div>`;
        return;
    }

    container.innerHTML = '';
    filtered.forEach(lesson => {
        const meta = unitMeta[lesson.unit] || { name: '수업 자료', badgeClass: 'bg-slate-100 text-slate-600' };
        const isHidden = lesson.isVisible === false;
        const card = document.createElement('div');
        card.className = `searchable-card bg-white p-5 rounded-2xl border ${isHidden ? 'border-dashed border-amber-300 bg-amber-50/20' : 'border-slate-100'} shadow-sm hover:shadow-md transition-all flex flex-col justify-between cursor-pointer`;
        card.innerHTML = `
            <div onclick="window.open('?lesson=${lesson.id}', '_blank')">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-xs font-semibold px-2.5 py-0.5 rounded-md border ${meta.badgeClass}">${meta.name}</span>
                    <span class="text-xs text-slate-400">${lesson.lessonNum || ''}</span>
                </div>
                <h4 class="font-bold text-slate-800 text-base mb-1 hover:text-sky-600">${lesson.title}</h4>
                <p class="text-xs text-slate-500 line-clamp-2 mb-4">${lesson.summary}</p>
            </div>
            <div class="pt-3 border-t border-slate-100 flex flex-col gap-2">
                <div class="flex items-center justify-between text-xs" onclick="window.open('?lesson=${lesson.id}', '_blank')">
                    <span class="text-slate-400"><i class="fa-regular fa-file-lines mr-1"></i> 수업 노트</span>
                    <span class="text-sky-600 font-semibold hover:underline">새 탭에서 열기 <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i></span>
                </div>
                ${currentUser ? `
                    <div class="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between bg-slate-50 p-2 rounded-xl">
                        <span class="text-[10px] font-semibold text-teal-700">${lesson.isVisible !== false ? '공개중' : '숨김'}</span>
                        <div class="flex items-center gap-2">
                            <button data-id="${lesson.id}" class="edit-lesson-btn text-xs text-slate-500"><i class="fa-solid fa-pen"></i></button>
                            <button data-id="${lesson.id}" class="delete-lesson-btn text-xs text-slate-400"><i class="fa-solid fa-trash-can"></i></button>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
        container.appendChild(card);
    });

    document.querySelectorAll('.edit-lesson-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const lesson = allLessonDocs.find(l => l.id === e.currentTarget.getAttribute('data-id'));
            if (!lesson) return;
            document.getElementById('editLessonId').value = lesson.id;
            document.getElementById('lessonUnitSelect').value = lesson.unit;
            document.getElementById('lessonNumInput').value = lesson.lessonNum || '';
            document.getElementById('lessonTitleInput').value = lesson.title || '';
            document.getElementById('lessonSummaryInput').value = lesson.summary || '';
            document.getElementById('lessonCoverInput').value = lesson.coverImage || '';
            document.getElementById('lessonContentInput').value = lesson.content || '';
            document.getElementById('lessonVisibilityCheckbox').checked = lesson.isVisible !== false;
            document.getElementById('lessonModal').classList.remove('hidden');
        });
    });

    document.querySelectorAll('.delete-lesson-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (confirm("삭제하시겠습니까?")) await deleteDoc(doc(db, "lessons", e.currentTarget.getAttribute('data-id')));
        });
    });
}

document.getElementById('openNewLessonModalBtn')?.addEventListener('click', () => {
    document.getElementById('editLessonId').value = '';
    document.getElementById('lessonForm').reset();
    document.getElementById('lessonModal').classList.remove('hidden');
});
document.getElementById('closeLessonModalBtn')?.addEventListener('click', () => document.getElementById('lessonModal').classList.add('hidden'));
document.getElementById('cancelLessonModalBtn')?.addEventListener('click', () => document.getElementById('lessonModal').classList.add('hidden'));

document.getElementById('lessonForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const editId = document.getElementById('editLessonId').value;
    const payload = {
        unit: document.getElementById('lessonUnitSelect').value,
        lessonNum: document.getElementById('lessonNumInput').value.trim(),
        title: document.getElementById('lessonTitleInput').value.trim(),
        summary: document.getElementById('lessonSummaryInput').value.trim(),
        coverImage: document.getElementById('lessonCoverInput').value.trim(),
        content: document.getElementById('lessonContentInput').value,
        isVisible: document.getElementById('lessonVisibilityCheckbox').checked,
        createdAt: serverTimestamp()
    };
    if (editId) await updateDoc(doc(db, "lessons", editId), payload);
    else await addDoc(collection(db, "lessons"), payload);
    document.getElementById('lessonModal').classList.add('hidden');
});

// Dynamic Category Adding
document.getElementById('addCategoryBtn')?.addEventListener('click', () => {
    const catName = prompt("새로 추가할 카테고리 이름을 입력하세요 (예: 📋 신학기 준비):");
    if (!catName || !catName.trim()) return;

    const catId = 'cat_' + Date.now();
    workCatMeta[catId] = { name: catName.trim(), badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200' };

    const filterContainer = document.getElementById('taskCategoryFilter');
    const newBtn = document.createElement('button');
    newBtn.className = 'task-filter-btn text-xs font-medium px-3.5 py-2 rounded-xl bg-white text-slate-600 border border-slate-200';
    newBtn.setAttribute('data-workcat', catId);
    newBtn.textContent = catName.trim();
    newBtn.addEventListener('click', () => {
        document.querySelectorAll('.task-filter-btn').forEach(b => {
            b.classList.remove('bg-slate-800', 'text-white');
            b.classList.add('bg-white', 'text-slate-600');
        });
        newBtn.classList.add('bg-slate-800', 'text-white');
        currentWorkCategory = catId;
        renderTasks();
    });
    filterContainer.appendChild(newBtn);

    const selectEl = document.getElementById('taskCatSelect');
    const opt = document.createElement('option');
    opt.value = catId;
    opt.textContent = catName.trim();
    selectEl.appendChild(opt);

    alert(`'${catName}' 카테고리가 새로 추가되었습니다!`);
});

// Tasks
const tasksRef = collection(db, "work_tasks");
onSnapshot(query(tasksRef, orderBy("createdAt", "desc")), async (snapshot) => {
    if (snapshot.empty) {
        for (const t of pdfWorkTasksClean) {
            await addDoc(tasksRef, { ...t, createdAt: serverTimestamp() });
        }
        return;
    }
    allTaskDocs = [];
    snapshot.forEach(docSnap => allTaskDocs.push({ id: docSnap.id, ...docSnap.data() }));
    renderTasks();
});

function renderTasks() {
    const container = document.getElementById('taskContainer');
    if (!container) return;
    let filtered = allTaskDocs.filter(item => {
        if (currentWorkCategory !== 'all' && item.category !== currentWorkCategory) return false;
        return true;
    });

    if (filtered.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center py-10 text-xs text-slate-400">등록된 업무가 없습니다.</div>`;
        return;
    }

    container.innerHTML = '';
    filtered.forEach(task => {
        const meta = workCatMeta[task.category] || { name: '정보 업무', badgeClass: 'bg-slate-100 text-slate-700' };
        let statusBadge = `<span class="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded font-bold">⏳ 대기중</span>`;
        if (task.status === 'doing') statusBadge = `<span class="bg-sky-100 text-sky-800 text-[10px] px-2 py-0.5 rounded font-bold">🚀 진행중</span>`;
        if (task.status === 'done') statusBadge = `<span class="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded font-bold">✅ 완료됨</span>`;

        const card = document.createElement('div');
        card.className = "searchable-card bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-3 cursor-pointer group";
        card.innerHTML = `
            <div class="space-y-2" onclick="window.open('?task=${task.id}', '_blank')">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-semibold px-2.5 py-0.5 rounded-md border ${meta.badgeClass}">${meta.name}</span>
                    ${statusBadge}
                </div>
                <h4 class="font-bold text-slate-800 text-base leading-snug group-hover:text-indigo-600 transition-colors">${task.title}</h4>
                <p class="text-xs text-slate-500 leading-relaxed">${task.summary}</p>
            </div>
            <div class="bg-slate-50 p-3 rounded-2xl border border-slate-100 notion-content max-h-48 overflow-y-auto text-xs" onclick="window.open('?task=${task.id}', '_blank')">
                ${marked.parse(task.content || '')}
            </div>
            <div class="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span class="text-[10px] text-sky-600 font-semibold hover:underline" onclick="window.open('?task=${task.id}', '_blank')">새 탭에서 매뉴얼 열기 <i class="fa-solid fa-arrow-up-right-from-square text-[9px]"></i></span>
                ${currentUser ? `
                    <div class="flex items-center gap-2">
                        <button data-id="${task.id}" class="edit-task-btn text-xs text-slate-500 hover:text-indigo-600"><i class="fa-solid fa-pen"></i></button>
                        <button data-id="${task.id}" class="delete-task-btn text-xs text-slate-400 hover:text-rose-500"><i class="fa-solid fa-trash-can"></i></button>
                    </div>
                ` : ''}
            </div>
        `;
        container.appendChild(card);
    });

    document.querySelectorAll('.edit-task-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const task = allTaskDocs.find(t => t.id === e.currentTarget.getAttribute('data-id'));
            if (!task) return;
            document.getElementById('editTaskId').value = task.id;
            document.getElementById('taskCatSelect').value = task.category;
            document.getElementById('taskStatusSelect').value = task.status;
            document.getElementById('taskTitleInput').value = task.title || '';
            document.getElementById('taskSummaryInput').value = task.summary || '';
            document.getElementById('taskContentInput').value = task.content || '';
            document.getElementById('taskModal').classList.remove('hidden');
        });
    });

    document.querySelectorAll('.delete-task-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (confirm("삭제하시겠습니까?")) await deleteDoc(doc(db, "work_tasks", e.currentTarget.getAttribute('data-id')));
        });
    });
}

document.getElementById('openNewTaskModalBtn')?.addEventListener('click', () => {
    document.getElementById('editTaskId').value = '';
    document.getElementById('taskForm').reset();
    document.getElementById('taskModal').classList.remove('hidden');
});
document.getElementById('closeTaskModalBtn')?.addEventListener('click', () => document.getElementById('taskModal').classList.add('hidden'));
document.getElementById('cancelTaskModalBtn')?.addEventListener('click', () => document.getElementById('taskModal').classList.add('hidden'));

document.getElementById('taskForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const editId = document.getElementById('editTaskId').value;
    const payload = {
        category: document.getElementById('taskCatSelect').value,
        status: document.getElementById('taskStatusSelect').value,
        title: document.getElementById('taskTitleInput').value.trim(),
        summary: document.getElementById('taskSummaryInput').value.trim(),
        content: document.getElementById('taskContentInput').value,
        createdAt: serverTimestamp()
    };
    if (editId) await updateDoc(doc(db, "work_tasks", editId), payload);
    else await addDoc(collection(db, "work_tasks"), payload);
    document.getElementById('taskModal').classList.add('hidden');
});

// Filter Handlers
document.querySelectorAll('.task-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.task-filter-btn').forEach(b => {
            b.classList.remove('bg-slate-800', 'text-white');
            b.classList.add('bg-white', 'text-slate-600');
        });
        btn.classList.add('bg-slate-800', 'text-white');
        currentWorkCategory = btn.getAttribute('data-workcat');
        renderTasks();
    });
});

document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => {
            b.classList.remove('bg-sky-500', 'text-white');
            b.classList.add('bg-slate-200', 'text-slate-600');
        });
        btn.classList.add('bg-sky-500', 'text-white');
        currentSelectedCategory = btn.getAttribute('data-category');
        renderLessons();
    });
});

// Notice & Assignment Sync
const noticesRef = collection(db, "notices");
onSnapshot(query(noticesRef, orderBy("createdAt", "desc")), (snapshot) => {
    document.getElementById('noticeLoadingState')?.classList.add('hidden');
    const container = document.getElementById('noticeListContainer');
    if (!container) return;
    if (snapshot.empty) {
        container.innerHTML = `<div class="p-3 bg-sky-50 text-xs text-slate-600">등록된 공지가 없습니다.</div>`;
        return;
    }
    container.innerHTML = '';
    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const div = document.createElement('div');
        div.className = "flex items-start justify-between p-3 bg-sky-50 border border-sky-100 rounded-xl text-xs";
        div.innerHTML = `<div><p class="font-bold text-slate-800">${data.title}</p><p class="text-slate-600">${data.body}</p></div>
        ${currentUser ? `<button data-id="${docSnap.id}" class="delete-notice-btn text-rose-400"><i class="fa-solid fa-trash-can"></i></button>` : ''}`;
        container.appendChild(div);
    });
    document.querySelectorAll('.delete-notice-btn').forEach(b => b.addEventListener('click', async (e) => await deleteDoc(doc(db, "notices", e.currentTarget.getAttribute('data-id')))));
});

document.getElementById('teacherEditNoticeBtn')?.addEventListener('click', () => document.getElementById('noticeEditControls')?.classList.toggle('hidden'));
document.getElementById('addNoticeFirebaseBtn')?.addEventListener('click', async () => {
    const title = document.getElementById('newNoticeTitle').value.trim();
    const body = document.getElementById('newNoticeBody').value.trim();
    if(!title || !body) return;
    await addDoc(noticesRef, { title, body, type: document.getElementById('newNoticeType').value, createdAt: serverTimestamp() });
    document.getElementById('newNoticeTitle').value = ''; document.getElementById('newNoticeBody').value = '';
});

const assignmentRef = collection(db, "assignments");
onSnapshot(query(assignmentRef, orderBy("createdAt", "desc")), (snapshot) => {
    const container = document.getElementById('assignmentList');
    if (!container) return;
    if (snapshot.empty) { container.innerHTML = `<p class="text-xs text-slate-400 text-center py-6">제출된 과제가 없습니다.</p>`; return; }
    container.innerHTML = '';
    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const div = document.createElement('div');
        div.className = "p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1 relative";
        div.innerHTML = `
            <div class="flex justify-between items-center"><span class="font-bold text-xs">${data.studentNum} ${data.studentName}</span><span class="text-[10px] text-slate-400">${data.timeStr||''}</span></div>
            <p class="text-xs text-slate-600">${data.text}</p>
        `;
        container.appendChild(div);
    });
});

document.getElementById('assignmentForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const now = new Date();
    await addDoc(assignmentRef, {
        studentNum: document.getElementById('studentNum').value.trim(),
        studentName: document.getElementById('studentName').value.trim(),
        text: document.getElementById('assignmentText').value.trim(),
        timeStr: `${now.getMonth()+1}/${now.getDate()} ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`,
        createdAt: serverTimestamp()
    });
    alert("제출 완료!");
    document.getElementById('assignmentForm').reset();
});

document.getElementById('globalSearch')?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    document.querySelectorAll('.searchable-card').forEach(c => c.style.display = c.textContent.toLowerCase().includes(q) ? '' : 'none');
});
document.getElementById('toggleNoticeBtn')?.addEventListener('click', () => {
    document.getElementById('noticeContent')?.classList.toggle('hidden');
    document.getElementById('noticeIcon')?.classList.toggle('rotate-180');
});
