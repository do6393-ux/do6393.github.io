import { db, collection, addDoc, updateDoc, deleteDoc, doc, getDoc, onSnapshot, query, orderBy, serverTimestamp } from './firebase-config.js';

let allTaskDocs = [];
let currentSelectedCategory = 'all';

const catMap = { 'devices': '💻 계정 및 기기', 'network': '🌐 네트워크/서버', 'privacy': '🛡️ 보안점검', 'software': '🔑 SW관리자', 'disposal': '📊 행정/공시' };
const statMap = { 'todo': '⏳ 대기', 'doing': '🚀 진행', 'done': '✅ 완료' };
const nextStatusMap = { 'todo': 'doing', 'doing': 'done', 'done': 'todo' };

const editorToolbar = [
    ['style', ['style']],
    ['font', ['bold', 'underline', 'clear']],
    ['fontsize', ['fontsize']],
    ['color', ['color']],
    ['para', ['ul', 'ol', 'paragraph']],
    ['table', ['table']],
    ['insert', ['picture', 'link', 'video']],
    ['view', ['codeview', 'fullscreen']]
];

const urlParams = new URLSearchParams(window.location.search);
const standaloneTaskId = urlParams.get('task');
if (standaloneTaskId) {
    initStandaloneTaskViewer(standaloneTaskId);
}

export function initWorkTab(currentUser) {
    if (standaloneTaskId) return;

    // 🎯 모달 업무 에디터 초기화
    if (window.$ && $('#taskContentInput').length && !$('#taskContentInput').next('.note-editor').length) {
        $('#taskContentInput').summernote({
            placeholder: '업무 세부 매뉴얼을 작성하세요. 사진이나 서식을 자유롭게 넣을 수 있습니다...',
            tabsize: 2,
            height: 250,
            lang: 'ko-KR',
            toolbar: editorToolbar
        });
    }

    onSnapshot(query(collection(db, "work_tasks"), orderBy("createdAt", "desc")), (snapshot) => {
        allTaskDocs = [];
        snapshot.forEach(d => allTaskDocs.push({ id: d.id, ...d.data() }));
        renderTasks(currentUser);
    });

    document.querySelectorAll('.task-filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.task-filter-btn').forEach(b => {
                b.classList.remove('bg-slate-800', 'text-white', 'shadow-sm', 'active');
                b.classList.add('bg-white', 'text-slate-600');
            });
            const target = e.currentTarget;
            target.classList.remove('bg-white', 'text-slate-600');
            target.classList.add('bg-slate-800', 'text-white', 'shadow-sm', 'active');
            currentSelectedCategory = target.getAttribute('data-category');
            renderTasks(currentUser);
        });
    });

    const openBtn = document.getElementById('openNewTaskModalBtn');
    const modal = document.getElementById('taskModal');
    const closeBtn = document.getElementById('closeTaskModalBtn');
    const saveBtn = document.getElementById('saveTaskFirebaseBtn');

    if (openBtn && modal) {
        openBtn.onclick = () => {
            document.getElementById('editTaskId').value = '';
            document.getElementById('taskTitleInput').value = '';
            document.getElementById('taskSummaryInput').value = '';
            if (window.$ && $('#taskContentInput').next('.note-editor').length) {
                $('#taskContentInput').summernote('code', '');
            } else {
                document.getElementById('taskContentInput').value = '';
            }
            document.getElementById('taskModalTitle').textContent = '새 업무 등록';
            modal.classList.remove('hidden');
        };
    }

    if (closeBtn && modal) {
        closeBtn.onclick = () => modal.classList.add('hidden');
    }

    if (saveBtn && modal) {
        saveBtn.onclick = async () => {
            const id = document.getElementById('editTaskId').value;
            const category = document.getElementById('taskCatSelect').value;
            const status = document.getElementById('taskStatusSelect').value;
            const title = document.getElementById('taskTitleInput').value.trim();
            const summary = document.getElementById('taskSummaryInput').value.trim();
            
            // 🎯 에디터 내용 추출
            let content = '';
            if (window.$ && $('#taskContentInput').next('.note-editor').length) {
                content = $('#taskContentInput').summernote('code');
            } else {
                content = document.getElementById('taskContentInput').value.trim();
            }

            if (!title) return alert('업무 제목을 입력하세요.');

            saveBtn.disabled = true;
            saveBtn.textContent = '저장중...';

            try {
                const payload = { category, status, title, summary, content };
                if (id) {
                    await updateDoc(doc(db, "work_tasks", id), payload);
                } else {
                    payload.createdAt = serverTimestamp();
                    await addDoc(collection(db, "work_tasks"), payload);
                }
                modal.classList.add('hidden');
            } catch (err) {
                console.error("업무 저장 에러:", err);
                alert('업무 저장 중 오류가 발생했습니다.');
            } finally {
                saveBtn.disabled = false;
                saveBtn.textContent = '업무 저장';
            }
        };
    }
}

function renderTasks(currentUser) {
    const container = document.getElementById('taskContainer');
    if (!container) return;
    
    let filtered = allTaskDocs.filter(item => {
        if (currentSelectedCategory !== 'all' && item.category !== currentSelectedCategory) return false;
        return true;
    });

    container.innerHTML = '';
    filtered.forEach(task => {
        const card = document.createElement('div');
        card.className = `bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between cursor-pointer group`;
        
        card.onclick = () => {
            const targetUrl = window.location.origin + window.location.pathname + '?task=' + task.id;
            window.open(targetUrl, '_blank');
        };

        card.innerHTML = `
            <div>
                <div class="flex items-center justify-between mb-3">
                    <span class="text-[11px] font-bold px-2 py-1 rounded-md bg-slate-100 text-slate-600">${catMap[task.category] || task.category}</span>
                    <button class="toggle-status-btn text-[11px] font-bold px-2 py-1 rounded-md transition-transform active:scale-95 ${task.status==='done'?'bg-emerald-100 text-emerald-600':(task.status==='doing'?'bg-sky-100 text-sky-600':'bg-amber-100 text-amber-600')}" data-id="${task.id}" data-status="${task.status}" title="클릭하여 상태 변경">${statMap[task.status] || task.status}</button>
                </div>
                <h4 class="font-bold text-slate-800 text-base mb-1 group-hover:text-indigo-600">${task.title}</h4>
                <p class="text-xs text-slate-500 line-clamp-2 mb-4">${task.summary}</p>
            </div>
            ${currentUser ? `
                <div class="mt-2 pt-2 border-t border-slate-100 flex gap-2 justify-end" onclick="event.stopPropagation()">
                    <button class="edit-task-btn text-xs text-slate-500 hover:text-indigo-600 p-1" data-id="${task.id}"><i class="fa-solid fa-pen"></i></button>
                    <button class="delete-task-btn text-xs text-slate-400 hover:text-rose-500 p-1" data-id="${task.id}"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            ` : ''}
        `;
        container.appendChild(card);
    });

    // 🎯 카드에서 대기 상태 원클릭 변경 (대기중 -> 진행중 -> 완료됨)
    document.querySelectorAll('.toggle-status-btn').forEach(btn => {
        btn.onclick = async (e) => {
            e.stopPropagation();
            const taskId = btn.getAttribute('data-id');
            const currentStatus = btn.getAttribute('data-status') || 'todo';
            const nextStatus = nextStatusMap[currentStatus] || 'todo';
            await updateDoc(doc(db, "work_tasks", taskId), { status: nextStatus });
        };
    });

    document.querySelectorAll('.edit-task-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const task = allTaskDocs.find(t => t.id === e.currentTarget.getAttribute('data-id'));
            if (!task) return;
            document.getElementById('editTaskId').value = task.id;
            document.getElementById('taskCatSelect').value = task.category;
            document.getElementById('taskStatusSelect').value = task.status;
            document.getElementById('taskTitleInput').value = task.title || '';
            document.getElementById('taskSummaryInput').value = task.summary || '';
            
            // 🎯 에디터에 기존 HTML 주입
            if (window.$ && $('#taskContentInput').next('.note-editor').length) {
                $('#taskContentInput').summernote('code', task.content || '');
            } else {
                document.getElementById('taskContentInput').value = task.content || '';
            }

            document.getElementById('taskModalTitle').textContent = '업무 수정';
            document.getElementById('taskModal')?.classList.remove('hidden');
        });
    });

    document.querySelectorAll('.delete-task-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            if (confirm("업무를 삭제하시겠습니까?")) await deleteDoc(doc(db, "work_tasks", e.currentTarget.getAttribute('data-id')));
        });
    });
}

// 새 탭 단독 업무 뷰어 및 스마트 에디터
async function initStandaloneTaskViewer(taskId) {
    try {
        const snap = await getDoc(doc(db, "work_tasks", taskId));
        if (!snap.exists()) return alert('해당 업무를 찾을 수 없습니다.');
        let task = { id: snap.id, ...snap.data() };

        const updateView = (t) => {
            const catBadge = document.getElementById('taskViewerCatBadge');
            catBadge.textContent = catMap[t.category] || t.category;
            catBadge.className = 'text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700';

            const statBadge = document.getElementById('taskViewerStatusBadge');
            statBadge.textContent = statMap[t.status] || t.status;
            statBadge.className = `text-xs font-bold px-3 py-1 rounded-full cursor-pointer hover:opacity-80 transition-transform active:scale-95 ${t.status==='done'?'bg-emerald-100 text-emerald-700':(t.status==='doing'?'bg-sky-100 text-sky-700':'bg-amber-100 text-amber-700')}`;

            document.getElementById('taskViewerTitle').textContent = t.title;
            document.getElementById('taskViewerSummary').textContent = t.summary || '';

            const mdBody = document.getElementById('taskViewerMarkdownBody');
            mdBody.innerHTML = window.marked ? window.marked.parse(t.content || '') : (t.content || '');
        };

        updateView(task);

        const statBadge = document.getElementById('taskViewerStatusBadge');
        if (statBadge) {
            statBadge.onclick = async () => {
                const next = nextStatusMap[task.status] || 'todo';
                await updateDoc(doc(db, "work_tasks", task.id), { status: next });
                task.status = next;
                updateView(task);
            };
        }

        const editBtn = document.getElementById('taskViewerEditBtn');
        const saveBtn = document.getElementById('taskViewerSaveBtn');
        const cancelBtn = document.getElementById('taskViewerCancelBtn');
        const displaySec = document.getElementById('taskViewDisplaySection');
        const formSec = document.getElementById('taskEditFormSection');

        if (editBtn) {
            editBtn.classList.remove('hidden');

            editBtn.onclick = () => {
                document.getElementById('taskViewerEditCat').value = task.category;
                document.getElementById('taskViewerEditStatus').value = task.status;
                document.getElementById('taskViewerEditTitle').value = task.title;
                document.getElementById('taskViewerEditSummary').value = task.summary || '';

                // 🎯 뷰어 에디터 초기화 및 본문 주입
                if (window.$ && $('#taskViewerEditContent').length && !$('#taskViewerEditContent').next('.note-editor').length) {
                    $('#taskViewerEditContent').summernote({
                        tabsize: 2,
                        height: 380,
                        lang: 'ko-KR',
                        toolbar: editorToolbar
                    });
                }
                if (window.$ && $('#taskViewerEditContent').next('.note-editor').length) {
                    $('#taskViewerEditContent').summernote('code', task.content || '');
                } else {
                    document.getElementById('taskViewerEditContent').value = task.content || '';
                }

                displaySec.classList.add('hidden');
                formSec.classList.remove('hidden');
                editBtn.classList.add('hidden');
                saveBtn.classList.remove('hidden');
                cancelBtn.classList.remove('hidden');
            };

            cancelBtn.onclick = () => {
                formSec.classList.add('hidden');
                displaySec.classList.remove('hidden');
                editBtn.classList.remove('hidden');
                saveBtn.classList.add('hidden');
                cancelBtn.classList.add('hidden');
            };

            saveBtn.onclick = async () => {
                let content = '';
                if (window.$ && $('#taskViewerEditContent').next('.note-editor').length) {
                    content = $('#taskViewerEditContent').summernote('code');
                } else {
                    content = document.getElementById('taskViewerEditContent').value.trim();
                }

                const updated = {
                    category: document.getElementById('taskViewerEditCat').value,
                    status: document.getElementById('taskViewerEditStatus').value,
                    title: document.getElementById('taskViewerEditTitle').value.trim(),
                    summary: document.getElementById('taskViewerEditSummary').value.trim(),
                    content: content
                };

                saveBtn.disabled = true;
                saveBtn.textContent = '저장중...';
                await updateDoc(doc(db, "work_tasks", task.id), updated);
                window.location.reload();
            };
        }
    } catch (e) {
        console.error("단독 업무 로드 실패:", e);
    }
}
