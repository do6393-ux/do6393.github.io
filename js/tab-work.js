import { db, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp } from './firebase-config.js';

let allTaskDocs = [];
let currentSelectedCategory = 'all';

export function initWorkTab(currentUser) {
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
        const catMap = { 'devices': '💻 계정 및 기기', 'network': '🌐 네트워크/서버', 'privacy': '🛡️ 보안점검', 'software': '🔑 SW관리자', 'disposal': '📊 행정/공시' };
        const statMap = { 'todo': '⏳ 대기', 'doing': '🚀 진행', 'done': '✅ 완료' };
        
        const card = document.createElement('div');
        card.className = `bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between cursor-pointer group`;
        
        // 🎯 절대 경로 추적 로직 추가 (URL 덮어쓰기 오작동 방지)
        card.onclick = () => {
            const targetUrl = window.location.origin + window.location.pathname + '?task=' + task.id;
            window.open(targetUrl, '_blank');
        };

        card.innerHTML = `
            <div>
                <div class="flex items-center justify-between mb-3">
                    <span class="text-[11px] font-bold px-2 py-1 rounded-md bg-slate-100 text-slate-600">${catMap[task.category] || task.category}</span>
                    <span class="text-[11px] font-bold px-2 py-1 rounded-md ${task.status==='done'?'bg-emerald-100 text-emerald-600':(task.status==='doing'?'bg-sky-100 text-sky-600':'bg-amber-100 text-amber-600')}">${statMap[task.status] || task.status}</span>
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

    document.querySelectorAll('.edit-task-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
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
            if (confirm("업무를 삭제하시겠습니까?")) await deleteDoc(doc(db, "work_tasks", e.currentTarget.getAttribute('data-id')));
        });
    });
}
