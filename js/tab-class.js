import { db, collection, addDoc, updateDoc, deleteDoc, doc, getDoc, onSnapshot, query, orderBy, serverTimestamp } from './firebase-config.js';

export const unitMeta = {
    'unit1': { name: '1단원. 컴퓨팅 시스템', badgeClass: 'bg-sky-50 text-sky-600 border-sky-200' },
    'unit2': { name: '2단원. 데이터', badgeClass: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
    'unit3': { name: '3단원. 알고리즘과 프로그래밍', badgeClass: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
    'unit4': { name: '4단원. 인공지능', badgeClass: 'bg-purple-50 text-purple-600 border-purple-200' },
    'unit5': { name: '5단원. 디지털 문화', badgeClass: 'bg-amber-50 text-amber-600 border-amber-200' }
};

let allLessonDocs = [];
let currentSelectedCategory = 'all';

export function initClassTab(currentUser) {
    onSnapshot(query(collection(db, "lessons"), orderBy("createdAt", "desc")), (snapshot) => {
        allLessonDocs = []; snapshot.forEach(d => allLessonDocs.push({ id: d.id, ...d.data() }));
        renderLessons(currentUser);
    });

    onSnapshot(query(collection(db, "assignments"), orderBy("createdAt", "desc")), (snapshot) => {
        const container = document.getElementById('assignmentList');
        if(!container) return;
        container.innerHTML = '';
        snapshot.forEach(d => {
            const data = d.data();
            container.innerHTML += `<div class="p-3 bg-slate-50 rounded-xl mb-2 text-xs"><div class="flex justify-between font-bold"><span>${data.studentNum} ${data.studentName}</span><span>${data.timeStr||''}</span></div><p>${data.text}</p></div>`;
        });
    });

    document.querySelectorAll('.lesson-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.lesson-filter-btn').forEach(b => { b.classList.remove('bg-sky-500', 'text-white', 'shadow-sm', 'active'); b.classList.add('bg-slate-200', 'text-slate-600'); });
            btn.classList.add('bg-sky-500', 'text-white', 'shadow-sm', 'active');
            currentSelectedCategory = btn.getAttribute('data-category'); 
            renderLessons(currentUser);
        });
    });
}

function renderLessons(currentUser) {
    const container = document.getElementById('resourceContainer');
    if (!container) return;
    
    let filtered = allLessonDocs.filter(item => {
        if (!currentUser && item.isVisible === false) return false;
        if (currentSelectedCategory !== 'all' && item.unit !== currentSelectedCategory) return false;
        return true;
    });

    container.innerHTML = '';
    filtered.forEach(lesson => {
        const meta = unitMeta[lesson.unit] || { name: '수업 자료', badgeClass: 'bg-slate-100 text-slate-600 border-slate-200' };
        const isHidden = lesson.isVisible === false;
        const card = document.createElement('div');
        card.className = `bg-white p-5 rounded-2xl border ${isHidden ? 'border-dashed border-amber-300 bg-amber-50/20' : 'border-slate-100'} shadow-sm hover:shadow-md transition-all flex flex-col justify-between cursor-pointer group`;
        card.onclick = () => window.open(`?lesson=${lesson.id}`, '_blank');
        card.innerHTML = `
            <div>
                <div class="flex items-center justify-between mb-2">
                    <span class="text-xs font-semibold px-2.5 py-0.5 rounded-md border ${meta.badgeClass}">${meta.name}</span>
                    <span class="text-xs text-slate-400 font-medium">${lesson.lessonNum || ''}</span>
                </div>
                <h4 class="font-bold text-slate-800 text-base mb-1 group-hover:text-sky-600">${lesson.title}</h4>
                <p class="text-xs text-slate-500 line-clamp-2 mb-4">${lesson.summary}</p>
            </div>
            ${currentUser ? `
                <div class="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between bg-slate-50 p-2 rounded-xl" onclick="event.stopPropagation()">
                    <span class="text-[10px] font-semibold ${!isHidden ? 'text-teal-700' : 'text-slate-400'}">${!isHidden ? '공개중' : '숨김'}</span>
                    <div class="flex gap-2">
                        <button class="edit-lesson-btn text-xs text-slate-500 hover:text-sky-600 p-1" data-id="${lesson.id}"><i class="fa-solid fa-pen"></i></button>
                        <button class="delete-lesson-btn text-xs text-slate-400 hover:text-rose-500 p-1" data-id="${lesson.id}"><i class="fa-solid fa-trash-can"></i></button>
                    </div>
                </div>
            ` : ''}
        `;
        container.appendChild(card);
    });

    document.querySelectorAll('.edit-lesson-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
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
            if (confirm("삭제하시겠습니까?")) await deleteDoc(doc(db, "lessons", e.currentTarget.getAttribute('data-id')));
        });
    });
}
