export const homeroomState = {
    userId: localStorage.getItem('user_id') || "default_teacher",
    grade: 1,
    classNum: 7,
    contacts: [],
    excludedStudentNums: new Set(),
    seatingRows: parseInt(localStorage.getItem('seating_rows'), 10) || 6, // 기본 6줄(36석)
    seatingSeats: [],
    antiPairs: [],
    cleaningData: Array(6).fill().map(() => Array(5).fill(null)), // 6구역 x 5조
    currentCleaningSlot: null
};

export const cleaningAreas = [
    "교실 쓸기 - 창",
    "교실 쓸기 - 중앙",
    "교실 쓸기 - 복도",
    "컴퓨터실 - 창문쪽",
    "컴퓨터실 - 복도쪽",
    "교탁 및 칠판"
];

export function updateHomeroomHeaders() {
    const titleContacts = document.getElementById('homeroomTitleContacts');
    const titleCleaning = document.getElementById('homeroomTitleCleaning');
    const g = homeroomState.grade || 1;
    const c = homeroomState.classNum || 7;
    if (titleContacts) titleContacts.textContent = `${g}학년 ${c}반 비상연락망`;
    if (titleCleaning) titleCleaning.textContent = `${g}학년 ${c}반 청소 구역`;
}
