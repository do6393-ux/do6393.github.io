import { db, collection, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from './firebase-config.js';

export const workCatMeta = {
    'devices': { name: '💻 계정 및 기기', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
    'network': { name: '🌐 네트워크/서버', badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
    'privacy': { name: '🛡️ 보안점검', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200' },
    'software': { name: '🔑 SW관리자', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200' },
    'disposal': { name: '📊 행정/공시', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' }
};

let allTaskDocs = [];
let currentWorkCategory = 'all';

export function initWorkTab(currentUser) {
    onSnapshot(query(collection(db, "work_tasks"), orderBy("createdAt", "desc")), (snapshot) => {
        allTaskDocs = []; snapshot.forEach(d => allTaskDocs.push({ id: d.id, ...d.data() }));
        renderTasks(currentUser);
    });

    document.querySelectorAll('.task-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.task-filter-btn').forEach(b => { b.classList.remove('bg-slate-800', 'text-white', 'shadow-sm', 'active'); b.classList.add('bg-white', 'text-slate-600'); });
            btn.classList.add('bg-slate-800', 'text-white', 'shadow-sm', 'active');
            currentWorkCategory = btn.getAttribute('data-category'); 
            renderTasks(currentUser);
        });
    });
}

function renderTasks(currentUser) {
    const container = document.getElementById('taskContainer');
    if (!container) return;
    
    let filtered = allTaskDocs.filter(item => currentWorkCategory === 'all' || item.category === currentWorkCategory);
    container.innerHTML = '';

    filtered.forEach(task => {
        const meta = workCatMeta[task.category] || { name: '정보 업무', badgeClass: 'bg-slate-100 text-slate-700' };
        let statusBadgeHtml = task.status === 'doing' ? `<button data-id="${task.id}" data-status="doing" class="status-toggle-btn bg-sky-100 hover:bg-sky-200 text-sky-800 text-[10px] px-2.5 py-1 rounded-md font-bold transition-all shadow-sm">🚀 진행중</button>` : (task.status === 'done' ? `<button data-id="${task.id}" data-status="done" class="status-toggle-btn bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] px-2.5 py-1 rounded-md font-bold transition-all shadow-sm">✅ 완료됨</button>` : `<button data-id="${task.id}" data-status="todo" class="status-toggle-btn bg-amber-100 hover:bg-amber-200 text-amber-800 text-[10px] px-2.5 py-1 rounded-md font-bold transition-all shadow-sm">⏳ 대기중</button>`);

        const card = document.createElement('div');
        card.className = "bg-white p-5 rounded-3xl border border-slate-200 shadow-sm cursor-pointer group hover:shadow-md transition-all";
        card.onclick = () => window.open(`?task=${task.id}`, '_blank');
        card.innerHTML = `
            <div class="space-y-2"><div class="flex justify-between items-center"><span class="text-xs font-semibold px-2.5 py-0.5 rounded-md border ${meta.badgeClass}">${meta.name}</span><div onclick="event.stopPropagation()">${statusBadgeHtml}</div></div>
            <h4 class="font-bold text-slate-800 leading-snug group-hover:text-indigo-600">${task.title}</h4></div>
            <div class="bg-slate-50 p-3 rounded-2xl border border-slate-100 notion-content max-h-48 overflow-hidden text-xs mt-3">${marked.parse(task.content || '')}</div>
            ${currentUser ? `
                <div class="pt-3 mt-3 border-t border-slate-100 flex justify-end gap-2" onclick="event.stopPropagation()">
                    <button class="edit-task-btn text-xs text-slate-500 p-1 hover:text-indigo-600" data-id="${task.id}"><i class="fa-solid fa-pen"></i></button>
                    <button class="delete-task-btn text-xs text-slate-400 p-1 hover:text-rose-500" data-id="${task.id}"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            ` : ''}
        `;
        container.appendChild(card);
    });

    document.querySelectorAll('.status-toggle-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            if (!currentUser) return alert("교사 로그인이 필요합니다.");
            const tId = e.currentTarget.getAttribute('data-id'), cur = e.currentTarget.getAttribute('data-status');
            await updateDoc(doc(db, "work_tasks", tId), { status: cur === 'todo' ? 'doing' : (cur === 'doing' ? 'done' : 'todo') });
        });
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
            if (confirm("삭제하시겠습니까?")) await deleteDoc(doc(db, "work_tasks", e.currentTarget.getAttribute('data-id')));
        });
    });
}
