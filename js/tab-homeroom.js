import { homeroomState, updateHomeroomHeaders } from './homeroom/state.js';
import { setupContactsModule, loadContactsData, renderContactGrid, handleSaveBulkPaste, openContactEditMode } from './homeroom/subtab-contacts.js';
import { setupSeatingModule, loadSeatingData, renderSeatingDesks, renderExcludeStudentList, handleResetSeating, changeSeatingRows, updateSeatingDimensionUI } from './homeroom/subtab-seating.js';
import { setupCleaningModule, loadCleaningData, renderCleaningGrid } from './homeroom/subtab-cleaning.js';
import { setupRecordsModule, loadRecordsData } from './homeroom/subtab-records.js'; // 🎯 새 탭 모듈 연결

export { homeroomState };

export function switchHomeroomSubTab(tabName) {
    const tabContacts = document.getElementById('homeroomSubTabContacts');
    const tabSeating = document.getElementById('homeroomSubTabSeating');
    const tabCleaning = document.getElementById('homeroomSubTabCleaning');
    const tabRecords = document.getElementById('homeroomSubTabRecords'); // 🎯

    const secContacts = document.getElementById('homeroomSectionContacts');
    const secSeating = document.getElementById('homeroomSectionSeating');
    const secCleaning = document.getElementById('homeroomSectionCleaning');
    const secRecords = document.getElementById('homeroomSectionRecords'); // 🎯

    const inactiveClass = "px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-800 rounded-xl transition-all";
    if (tabContacts) tabContacts.className = inactiveClass;
    if (tabSeating) tabSeating.className = inactiveClass;
    if (tabCleaning) tabCleaning.className = inactiveClass;
    if (tabRecords) tabRecords.className = inactiveClass;

    if (secContacts) secContacts.classList.add('hidden');
    if (secSeating) secSeating.classList.add('hidden');
    if (secCleaning) secCleaning.classList.add('hidden');
    if (secRecords) secRecords.classList.add('hidden');

    if (tabName === 'contacts') {
        if (tabContacts) tabContacts.className = "px-4 py-2 text-sm font-bold bg-white text-rose-600 rounded-xl shadow-sm transition-all";
        if (secContacts) secContacts.classList.remove('hidden');
        renderContactGrid();
    } else if (tabName === 'seating') {
        if (tabSeating) tabSeating.className = "px-4 py-2 text-sm font-bold bg-white text-indigo-600 rounded-xl shadow-sm transition-all";
        if (secSeating) secSeating.classList.remove('hidden');
        renderSeatingDesks();
        renderExcludeStudentList();
        updateSeatingDimensionUI();
    } else if (tabName === 'cleaning') {
        if (tabCleaning) tabCleaning.className = "px-4 py-2 text-sm font-bold bg-white text-emerald-600 rounded-xl shadow-sm transition-all";
        if (secCleaning) secCleaning.classList.remove('hidden');
        renderCleaningGrid();
    } else if (tabName === 'records') { // 🎯 행발/세특 기록 탭 오픈
        if (tabRecords) tabRecords.className = "px-4 py-2 text-sm font-bold bg-white text-purple-600 rounded-xl shadow-sm transition-all";
        if (secRecords) secRecords.classList.remove('hidden');
        loadRecordsData(); // 학생 목록 갱신 및 공용 DB 로드
    }
}

export async function initHomeroomTab(currentUser) {
    if (currentUser && currentUser.uid) {
        homeroomState.userId = currentUser.uid;
        localStorage.setItem('user_id', currentUser.uid);
    }

    const savedG = parseInt(localStorage.getItem('office_grade'), 10);
    const savedC = parseInt(localStorage.getItem('office_class'), 10);
    homeroomState.grade = (!isNaN(savedG) && savedG > 0) ? savedG : 1;
    homeroomState.classNum = (!isNaN(savedC) && savedC > 0) ? savedC : 7;

    updateHomeroomHeaders();
    setupAllSubModules();
    await loadAllSubModulesData();
}

export function updateHomeroomClass(gradeOrObj, classNum) {
    let g, c;
    if (typeof gradeOrObj === 'object' && gradeOrObj !== null) {
        g = gradeOrObj.grade || gradeOrObj.selectedGrade;
        c = gradeOrObj.classNum || gradeOrObj.class || gradeOrObj.selectedClassNum;
    } else {
        g = gradeOrObj;
        c = classNum;
    }

    const parsedG = parseInt(g, 10);
    const parsedC = parseInt(c, 10);

    if (!isNaN(parsedG) && parsedG > 0) {
        homeroomState.grade = parsedG;
        localStorage.setItem('office_grade', parsedG);
    }
    if (!isNaN(parsedC) && parsedC > 0) {
        homeroomState.classNum = parsedC;
        localStorage.setItem('office_class', parsedC);
    }

    homeroomState.contacts = [];
    homeroomState.cleaningData = Array(6).fill().map(() => Array(5).fill(null));
    homeroomState.antiPairs = [];
    homeroomState.seatingSeats = [];
    homeroomState.excludedStudentNums.clear();

    updateHomeroomHeaders();
    setupAllSubModules();
    loadAllSubModulesData();
}

function setupAllSubModules() {
    setupSubTabNav();
    setupContactsModule();
    setupSeatingModule();
    setupCleaningModule();
    setupRecordsModule(); // 🎯 새 탭 이벤트 리스너 등록
}

async function loadAllSubModulesData() {
    await Promise.all([
        loadContactsData(),
        loadSeatingData(),
        loadCleaningData()
    ]);
}

function setupSubTabNav() {
    const tabContacts = document.getElementById('homeroomSubTabContacts');
    const tabSeating = document.getElementById('homeroomSubTabSeating');
    const tabCleaning = document.getElementById('homeroomSubTabCleaning');
    const tabRecords = document.getElementById('homeroomSubTabRecords');

    if (tabContacts) tabContacts.onclick = (e) => { e.preventDefault(); switchHomeroomSubTab('contacts'); };
    if (tabSeating) tabSeating.onclick = (e) => { e.preventDefault(); switchHomeroomSubTab('seating'); };
    if (tabCleaning) tabCleaning.onclick = (e) => { e.preventDefault(); switchHomeroomSubTab('cleaning'); };
    if (tabRecords) tabRecords.onclick = (e) => { e.preventDefault(); switchHomeroomSubTab('records'); };
}

if (typeof document !== 'undefined') {
    document.addEventListener('click', (e) => {
        const subTab = e.target.closest('#homeroomSubTabContacts, #homeroomSubTabSeating, #homeroomSubTabCleaning, #homeroomSubTabRecords');
        if (subTab) {
            e.preventDefault();
            if (subTab.id === 'homeroomSubTabContacts') switchHomeroomSubTab('contacts');
            else if (subTab.id === 'homeroomSubTabSeating') switchHomeroomSubTab('seating');
            else if (subTab.id === 'homeroomSubTabCleaning') switchHomeroomSubTab('cleaning');
            else if (subTab.id === 'homeroomSubTabRecords') switchHomeroomSubTab('records');
            return;
        }

        if (e.target.closest('#resetSeatingBtn')) {
            e.preventDefault();
            handleResetSeating();
            return;
        }
        if (e.target.closest('#openNewContactModalBtn')) {
            e.preventDefault();
            openContactEditMode(null);
            return;
        }
        if (e.target.closest('#openBulkPasteModalBtn')) {
            e.preventDefault();
            const bulk = document.getElementById('bulkPasteModal');
            const txt = document.getElementById('bulkPasteTextarea');
            if (txt) txt.value = '';
            bulk?.classList.remove('hidden');
            return;
        }
        if (e.target.closest('#closeBulkPasteModalBtn, #cancelBulkPasteBtn')) {
            e.preventDefault();
            document.getElementById('bulkPasteModal')?.classList.add('hidden');
            return;
        }
        if (e.target.closest('#saveBulkPasteBtn')) {
            e.preventDefault();
            handleSaveBulkPaste();
            return;
        }
        if (e.target.closest('#closeContactModalBtn')) {
            e.preventDefault();
            document.getElementById('contactModal')?.classList.add('hidden');
            return;
        }
        if (e.target.closest('#teacherDeskBtn')) {
            e.preventDefault();
            const modal = document.getElementById('antiPairModal');
            const area = document.getElementById('antiPairTextarea');
            if (area) area.value = homeroomState.antiPairs.map(p => `${p[0]}, ${p[1]}`).join('\n');
            modal?.classList.remove('hidden');
            return;
        }
        if (e.target.closest('#closeAntiPairModalBtn')) {
            e.preventDefault();
            document.getElementById('antiPairModal')?.classList.add('hidden');
            return;
        }
        if (e.target.closest('#closeCleaningSelectModalBtn')) {
            e.preventDefault();
            document.getElementById('cleaningStudentSelectModal')?.classList.add('hidden');
            return;
        }
        if (e.target.closest('#decreaseRowBtn')) {
            e.preventDefault();
            changeSeatingRows(-1);
            return;
        }
        if (e.target.closest('#increaseRowBtn')) {
            e.preventDefault();
            changeSeatingRows(1);
            return;
        }
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupAllSubModules);
    } else {
        setupAllSubModules();
    }
}
