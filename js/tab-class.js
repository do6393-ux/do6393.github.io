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

// 스마트 에디터 공통 툴바 프리셋
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
const standaloneLessonId = urlParams.get('lesson');
if (standaloneLessonId) {
    initStandaloneLessonViewer(standaloneLessonId);
}

export function initClassTab(currentUser) {
    if (standaloneLessonId) return;

    // 🎯 모달 수업 에디터 초기화
    if (window.$ && $('#lessonContentInput').length && !$('#lessonContentInput').next('.note-editor').length) {
        $('#lessonContentInput').summernote({
            placeholder: '수업 자료를 작성하세요. 사진이나 표를 자유롭게 넣고 크기를 조절할 수 있습니다...',
            tabsize: 2,
            height: 250,
            lang: 'ko-KR',
            toolbar: editorToolbar
        });
    }

    onSnapshot(query(collection(db, "lessons"), orderBy("createdAt", "desc")), (snapshot) => {
        allLessonDocs = [];
        snapshot.forEach(d => allLessonDocs.push({ id: d.id, ...d.data() }));
        renderLessons(currentUser);
    });

    onSnapshot(query(collection(db, "assignments"), orderBy("createdAt", "desc")), (snapshot) => {
        const container = document.getElementById('assignmentList');
        if (!container) return;
        container.innerHTML = '';
        snapshot.forEach(d => {
            const data = d.data();
            container.innerHTML += `<div class="p-3 bg-slate-50 rounded-xl mb-2 text-xs"><div class="flex justify-between font-bold"><span>${data.studentNum} ${data.studentName}</span><span>${data.timeStr||''}</span></div><p>${data.text}</p></div>`;
        });
    });

    const assignmentForm = document.getElementById('assignmentForm');
    if (assignmentForm) {
        assignmentForm.onsubmit = async (e) => {
            e.preventDefault();
            const sNum = document.getElementById('studentNum').value;
            const sName = document.getElementById('studentName').value;
            const text = document.getElementById('assignmentText').value;
            if (sNum && sName && text) {
                const now = new Date();
                const timeStr = `${now.getMonth()+1}/${now.getDate()} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
                await addDoc(collection(db, "assignments"), {
                    studentNum: sNum, studentName: sName, text: text, timeStr: timeStr, createdAt: serverTimestamp()
                });
                document.getElementById('assignmentText').value = '';
                alert('과제가 성공적으로 제출되었습니다!');
            }
        };
    }

    const noticesRef = collection(db, "notices");
    onSnapshot(query(noticesRef, orderBy("createdAt", "desc")), (snapshot) => {
        const container = document.getElementById('noticeListContainer');
        if (!container) return;
        container.innerHTML = '';
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            container.innerHTML += `
                <div class="flex justify-between p-3 bg-sky-50 rounded-xl mb-2 text-xs">
                    <div>
                        <p class="font-bold text-slate-800">${data.title}</p>
                        <p class="mt-1">${data.body}</p>
                    </div>
                    ${currentUser ? `<button data-id="${docSnap.id}" class="delete-notice-btn text-slate-400 hover:text-red-500 p-1"><i class="fa-solid fa-trash"></i></button>` : ''}
                </div>`;
        });

        document.querySelectorAll('.delete-notice-btn').forEach(btn => {
            btn.onclick = async (e) => {
                if (confirm('공지를 삭제하시겠습니까?')) await deleteDoc(doc(db, 'notices', e.currentTarget.getAttribute('data-id')));
            };
        });
    });

    document.getElementById('teacherEditNoticeBtn')?.addEventListener('click', () => document.getElementById('noticeEditControls')?.classList.toggle('hidden'));
    document.getElementById('toggleNoticeBtn')?.addEventListener('click', () => {
        document.getElementById('noticeContent')?.classList.toggle('hidden');
        document.getElementById('noticeIcon')?.classList.toggle('rotate-180');
    });

    const addNoticeBtn = document.getElementById('addNoticeFirebaseBtn');
    if (addNoticeBtn) {
        addNoticeBtn.onclick = async () => {
            const t = document.getElementById('newNoticeTitle').value;
            const b = document.getElementById('newNoticeBody').value;
            if (t && b) {
                await addDoc(noticesRef, { title: t, body: b, type: document.getElementById('newNoticeType').value, createdAt: serverTimestamp() });
                document.getElementById('newNoticeTitle').value = '';
                document.getElementById('newNoticeBody').value = '';
                document.getElementById('noticeEditControls').classList.add('hidden');
            }
        };
    }

    document.querySelectorAll('.lesson-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.lesson-filter-btn').forEach(b => { b.classList.remove('bg-sky-500', 'text-white', 'shadow-sm', 'active'); b.classList.add('bg-slate-200', 'text-slate-600'); });
            btn.classList.add('bg-sky-500', 'text-white', 'shadow-sm', 'active');
            currentSelectedCategory = btn.getAttribute('data-category'); 
            renderLessons(currentUser);
        });
    });

    const openBtn = document.getElementById('openNewLessonModalBtn');
    const modal = document.getElementById('lessonModal');
    const closeBtn = document.getElementById('closeLessonModalBtn');
    const saveBtn = document.getElementById('saveLessonFirebaseBtn');

    if (openBtn && modal) {
        openBtn.onclick = () => {
            document.getElementById('editLessonId').value = '';
            document.getElementById('lessonTitleInput').value = '';
            document.getElementById('lessonNumInput').value = '';
            document.getElementById('lessonSummaryInput').value = '';
            document.getElementById('lessonCoverInput').value = '';
            if (window.$ && $('#lessonContentInput').next('.note-editor').length) {
                $('#lessonContentInput').summernote('code', '');
            } else {
                document.getElementById('lessonContentInput').value = '';
            }
            if (document.getElementById('lessonVisibilityCheckbox')) document.getElementById('lessonVisibilityCheckbox').checked = true;
            document.getElementById('lessonModalTitle').textContent = '새 수업 자료 등록';
            modal.classList.remove('hidden');
        };
    }

    if (closeBtn && modal) {
        closeBtn.onclick = () => modal.classList.add('hidden');
    }

    if (saveBtn && modal) {
        saveBtn.onclick = async () => {
            const id = document.getElementById('editLessonId').value;
            const unit = document.getElementById('lessonUnitSelect').value;
            const lessonNum = document.getElementById('lessonNumInput').value.trim();
            const title = document.getElementById('lessonTitleInput').value.trim();
            const summary = document.getElementById('lessonSummaryInput').value.trim();
            const coverImage = document.getElementById('lessonCoverInput').value.trim();
            
            // 🎯 에디터 HTML 내용 안전 추출
            let content = '';
            if (window.$ && $('#lessonContentInput').next('.note-editor').length) {
                content = $('#lessonContentInput').summernote('code');
            } else {
                content = document.getElementById('lessonContentInput').value.trim();
            }

            const isVisible = document.getElementById('lessonVisibilityCheckbox') ? document.getElementById('lessonVisibilityCheckbox').checked : true;

            if (!title) return alert('수업 제목을 입력하세요.');

            saveBtn.disabled = true;
            saveBtn.textContent = '저장중...';

            try {
                const payload = { unit, lessonNum, title, summary, coverImage, content, isVisible };
                if (id) {
                    await updateDoc(doc(db, "lessons", id), payload);
                } else {
                    payload.createdAt = serverTimestamp();
                    await addDoc(collection(db, "lessons"), payload);
                }
                modal.classList.add('hidden');
            } catch (err) {
                console.error("수업 저장 에러:", err);
                alert('저장 중 오류가 발생했습니다.');
            } finally {
                saveBtn.disabled = false;
                saveBtn.textContent = '저장하기';
            }
        };
    }
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
            
            // 🎯 에디터에 기존 본문 HTML 안전 적재
            if (window.$ && $('#lessonContentInput').next('.note-editor').length) {
                $('#lessonContentInput').summernote('code', lesson.content || '');
            } else {
                document.getElementById('lessonContentInput').value = lesson.content || '';
            }

            if (document.getElementById('lessonVisibilityCheckbox')) {
                document.getElementById('lessonVisibilityCheckbox').checked = lesson.isVisible !== false;
            }
            document.getElementById('lessonModalTitle').textContent = '수업 자료 수정';
            document.getElementById('lessonModal')?.classList.remove('hidden');
        });
    });

    document.querySelectorAll('.delete-lesson-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            if (confirm("삭제하시겠습니까?")) await deleteDoc(doc(db, "lessons", e.currentTarget.getAttribute('data-id')));
        });
    });
}

// 새 탭 단독 수업 뷰어 및 스마트 에디터
async function initStandaloneLessonViewer(lessonId) {
    try {
        const snap = await getDoc(doc(db, "lessons", lessonId));
        if (!snap.exists()) return alert('해당 수업 자료를 찾을 수 없습니다.');
        const lesson = { id: snap.id, ...snap.data() };

        const meta = unitMeta[lesson.unit] || { name: '수업 자료' };
        document.getElementById('viewerUnitBadge').textContent = meta.name;
        document.getElementById('viewerLessonNum').textContent = lesson.lessonNum || '';
        document.getElementById('viewerTitle').textContent = lesson.title;
        document.getElementById('viewerSummary').textContent = lesson.summary || '';
        
        if (lesson.coverImage) {
            document.getElementById('viewerCoverImg').src = lesson.coverImage;
            document.getElementById('viewerCoverContainer').classList.remove('hidden');
        }

        const mdBody = document.getElementById('viewerMarkdownBody');
        mdBody.innerHTML = window.marked ? window.marked.parse(lesson.content || '') : (lesson.content || '');

        const editBtn = document.getElementById('viewerEditBtn');
        const saveBtn = document.getElementById('viewerSaveBtn');
        const cancelBtn = document.getElementById('viewerCancelBtn');
        const displaySec = document.getElementById('viewerDisplaySection');
        const formSec = document.getElementById('viewerEditFormSection');

        if (editBtn) {
            editBtn.classList.remove('hidden');

            editBtn.onclick = () => {
                document.getElementById('viewerEditUnit').value = lesson.unit;
                document.getElementById('viewerEditLessonNum').value = lesson.lessonNum || '';
                document.getElementById('viewerEditTitle').value = lesson.title;
                document.getElementById('viewerEditSummary').value = lesson.summary || '';
                document.getElementById('viewerEditCover').value = lesson.coverImage || '';

                // 🎯 뷰어 에디터 초기화 및 본문 주입
                if (window.$ && $('#viewerEditContent').length && !$('#viewerEditContent').next('.note-editor').length) {
                    $('#viewerEditContent').summernote({
                        tabsize: 2,
                        height: 380,
                        lang: 'ko-KR',
                        toolbar: editorToolbar
                    });
                }
                if (window.$ && $('#viewerEditContent').next('.note-editor').length) {
                    $('#viewerEditContent').summernote('code', lesson.content || '');
                } else {
                    document.getElementById('viewerEditContent').value = lesson.content || '';
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
                if (window.$ && $('#viewerEditContent').next('.note-editor').length) {
                    content = $('#viewerEditContent').summernote('code');
                } else {
                    content = document.getElementById('viewerEditContent').value.trim();
                }

                const updated = {
                    unit: document.getElementById('viewerEditUnit').value,
                    lessonNum: document.getElementById('viewerEditLessonNum').value.trim(),
                    title: document.getElementById('viewerEditTitle').value.trim(),
                    summary: document.getElementById('viewerEditSummary').value.trim(),
                    coverImage: document.getElementById('viewerEditCover').value.trim(),
                    content: content
                };

                saveBtn.disabled = true;
                saveBtn.textContent = '저장중...';
                await updateDoc(doc(db, "lessons", lesson.id), updated);
                window.location.reload();
            };
        }
    } catch (e) {
        console.error("단독 수업 로드 실패:", e);
    }
}
