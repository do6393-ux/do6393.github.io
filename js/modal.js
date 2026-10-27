export function injectModals() {
    if (document.getElementById('dynamicModalContainer')) return;
    
    const modalContainer = document.createElement('div');
    modalContainer.id = 'dynamicModalContainer';
    modalContainer.innerHTML = `
    <!-- 1. 교사 로그인 모달 -->
    <div id="loginModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center hidden p-4">
        <div class="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl relative space-y-5">
            <button id="closeLoginModalBtn" class="absolute top-4 right-4 text-slate-400 text-lg hover:text-slate-700"><i class="fa-solid fa-xmark"></i></button>
            <div class="text-center">
                <div class="w-12 h-12 bg-sky-100 text-sky-600 rounded-2xl flex items-center justify-center mx-auto text-xl mb-2"><i class="fa-solid fa-lock"></i></div>
                <h3 class="text-lg font-bold text-slate-800">교사 인증 로그인</h3>
                <p class="text-xs text-slate-500 mt-1">부원여중 교사 계정으로 로그인하세요.</p>
            </div>
            <form id="loginForm" class="space-y-3">
                <input type="email" id="loginEmailInput" placeholder="이메일 (아이디)" required class="w-full text-xs p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-sky-400">
                <input type="password" id="loginPasswordInput" placeholder="비밀번호" required class="w-full text-xs p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-sky-400">
                <button type="submit" id="loginSubmitBtn" class="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 rounded-xl text-xs shadow-md transition-all">로그인</button>
            </form>
        </div>
    </div>

    <!-- 2. 수업 자료 작성/수정 모달 -->
    <div id="lessonModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center hidden p-4">
        <div class="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto">
            <button id="closeLessonModalBtn" class="absolute top-4 right-4 text-slate-400 text-lg hover:text-slate-700"><i class="fa-solid fa-xmark"></i></button>
            <h3 id="lessonModalTitle" class="text-lg font-bold text-slate-800">수업 자료 작성 / 수정</h3>
            <div class="space-y-3">
                <input type="hidden" id="editLessonId">
                <div class="grid grid-cols-2 gap-2">
                    <select id="lessonUnitSelect" class="text-xs p-2.5 rounded-xl border border-slate-200 bg-white">
                        <option value="unit1">1단원</option>
                        <option value="unit2">2단원</option>
                        <option value="unit3">3단원</option>
                        <option value="unit4">4단원</option>
                        <option value="unit5">5단원</option>
                    </select>
                    <input type="text" id="lessonNumInput" placeholder="차시 (예: 1차시)" class="text-xs p-2.5 rounded-xl border border-slate-200">
                </div>
                <input type="text" id="lessonTitleInput" placeholder="수업 제목" class="w-full text-xs p-2.5 rounded-xl border border-slate-200 font-bold">
                <input type="text" id="lessonSummaryInput" placeholder="한 줄 요약 (학습 목표 등)" class="w-full text-xs p-2.5 rounded-xl border border-slate-200">
                <input type="url" id="lessonCoverInput" placeholder="커버 이미지 URL (선택사항)" class="w-full text-xs p-2.5 rounded-xl border border-slate-200">
                <textarea id="lessonContentInput" class="w-full"></textarea>
                <div class="flex items-center gap-2 pt-1">
                    <label class="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                        <input type="checkbox" id="lessonVisibilityCheckbox" class="w-4 h-4 rounded text-teal-600 focus:ring-teal-500" checked>
                        <span>학생들에게 자료 공개</span>
                    </label>
                </div>
            </div>
            <div class="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button id="saveLessonFirebaseBtn" class="bg-teal-600 hover:bg-teal-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md transition-all">저장하기</button>
            </div>
        </div>
    </div>

    <!-- 3. 업무 작성/수정 모달 -->
    <div id="taskModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center hidden p-4">
        <div class="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto">
            <button id="closeTaskModalBtn" class="absolute top-4 right-4 text-slate-400 text-lg hover:text-slate-700"><i class="fa-solid fa-xmark"></i></button>
            <h3 id="taskModalTitle" class="text-lg font-bold text-slate-800">업무 등록 / 수정</h3>
            <div class="space-y-3">
                <input type="hidden" id="editTaskId">
                <div class="grid grid-cols-2 gap-2">
                    <select id="taskCatSelect" class="text-xs p-2.5 rounded-xl border border-slate-200 bg-white">
                        <option value="devices">💻 계정 및 기기</option>
                        <option value="network">🌐 네트워크/서버</option>
                        <option value="privacy">🛡️ 보안점검</option>
                        <option value="software">🔑 SW관리자</option>
                        <option value="disposal">📊 행정/공시</option>
                    </select>
                    <select id="taskStatusSelect" class="text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-bold">
                        <option value="todo">⏳ 대기중</option>
                        <option value="doing">🚀 진행중</option>
                        <option value="done">✅ 완료됨</option>
                    </select>
                </div>
                <input type="text" id="taskTitleInput" placeholder="업무 제목" class="w-full text-xs p-2.5 rounded-xl border border-slate-200 font-bold">
                <input type="text" id="taskSummaryInput" placeholder="업무 개요" class="w-full text-xs p-2.5 rounded-xl border border-slate-200">
                <textarea id="taskContentInput" class="w-full"></textarea>
            </div>
            <div class="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button id="saveTaskFirebaseBtn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md transition-all">업무 저장</button>
            </div>
        </div>
    </div>

    <!-- 4. 기본 시간표 설정 모달 -->
    <div id="baseTimetableModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center hidden p-4">
        <div class="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl relative space-y-4">
            <button id="closeBaseTimetableModalBtn" class="absolute top-4 right-4 text-slate-400 text-lg hover:text-slate-700"><i class="fa-solid fa-xmark"></i></button>
            <div>
                <h3 id="baseTimetableModalTitle" class="text-lg font-bold text-slate-800">기본 시간표 설정</h3>
                <p id="baseTimetableModalDesc" class="text-xs text-slate-500 mt-0.5">입력된 시간표를 기준으로 변동 사항을 자동 감지합니다.</p>
            </div>
            <div class="overflow-x-auto border border-slate-200 rounded-2xl">
                <table class="w-full text-center border-collapse text-xs">
                    <thead class="bg-slate-100 text-slate-700 font-bold border-b">
                        <tr><th class="py-2 border-r w-14">교시</th><th class="border-r">월</th><th class="border-r">화</th><th class="border-r">수</th><th class="border-r">목</th><th>금</th></tr>
                    </thead>
                    <tbody id="baseTimetableInputBody" class="divide-y divide-slate-200"></tbody>
                </table>
            </div>
            <div class="flex justify-end gap-2 pt-2">
                <button id="saveBaseTimetableBtn" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl text-xs shadow-md transition-all">저장 및 적용</button>
            </div>
        </div>
    </div>

    <!-- 5. 교사 선택 모달 -->
    <div id="teacherSelectModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center hidden p-4">
        <div class="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 relative">
            <button id="closeTeacherSelectModalBtn" class="absolute top-4 right-4 text-slate-400 text-lg hover:text-slate-700"><i class="fa-solid fa-xmark"></i></button>
            <h3 class="text-lg font-bold text-slate-800 text-center">조회할 교사 변경</h3>
            <div id="modalTeacherList"></div>
        </div>
    </div>

    <!-- 6. 학급 선택 모달 -->
    <div id="classSelectModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center hidden p-4">
        <div class="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 relative">
            <button id="closeClassSelectModalBtn" class="absolute top-4 right-4 text-slate-400 text-lg hover:text-slate-700"><i class="fa-solid fa-xmark"></i></button>
            <h3 class="text-lg font-bold text-slate-800 text-center">조회할 학급 선택</h3>
            <div id="modalClassList" class="grid grid-cols-5 gap-2"></div>
        </div>
    </div>

    <!-- 7. 공용 문구 등록/관리 커스텀 모달 -->
    <div id="customPresetModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center hidden p-4">
        <div class="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative space-y-5">
            <button id="closePresetModalBtn" class="absolute top-4 right-4 text-slate-400 text-xl hover:text-slate-700"><i class="fa-solid fa-xmark"></i></button>
            <div class="border-b border-slate-100 pb-3 flex justify-between items-end">
                <div>
                    <h3 class="text-lg font-bold text-slate-800"><i class="fa-solid fa-cloud-arrow-up text-purple-500"></i> 공용 문구 관리</h3>
                    <p class="text-[11px] text-slate-500 mt-1">등록된 문구는 모든 교사가 함께 사용할 수 있습니다.</p>
                </div>
            </div>
            <div class="flex gap-2 mb-2">
                <button id="presetModalTabAddBtn" class="flex-1 text-sm font-bold text-purple-600 border-b-2 border-purple-600 pb-2">새 문구 추가</button>
                <button id="presetModalTabManageBtn" class="flex-1 text-sm font-bold text-slate-400 hover:text-slate-600 border-b-2 border-transparent pb-2 transition-colors">기존 문구 관리</button>
            </div>
            <div id="presetAddView" class="space-y-4">
                <div>
                    <label class="block text-xs font-bold text-slate-700 mb-2">추가할 항목 선택</label>
                    <div class="grid grid-cols-3 gap-2">
                        <button type="button" class="preset-type-btn active bg-purple-50 border border-purple-200 text-purple-700 font-bold text-xs py-2 rounded-xl" data-type="situation">세부 상황</button>
                        <button type="button" class="preset-type-btn bg-slate-50 border border-slate-200 text-slate-600 font-bold text-xs py-2 rounded-xl" data-type="action">행동/변화</button>
                        <button type="button" class="preset-type-btn bg-slate-50 border border-slate-200 text-slate-600 font-bold text-xs py-2 rounded-xl" data-type="category">새 카테고리</button>
                    </div>
                </div>
                <div id="presetCategoryWrapper">
                    <label class="block text-xs font-bold text-slate-700 mb-1">대상 카테고리</label>
                    <select id="presetTargetCategory" class="w-full text-sm p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-purple-400"></select>
                </div>
                <div id="presetNewCategoryWrapper" class="hidden">
                    <label class="block text-xs font-bold text-slate-700 mb-1">새 카테고리 이름</label>
                    <input type="text" id="presetNewCategoryInput" placeholder="예: 진로 특강 참여도" class="w-full text-sm p-2.5 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-purple-400">
                </div>
                <div>
                    <label id="presetInputLabel" class="block text-xs font-bold text-slate-700 mb-1">상황 문구 입력</label>
                    <textarea id="presetTextInput" rows="3" placeholder="예: 진로 특강 시간에 자신의 적성을 탐색할 때" class="w-full text-sm p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-purple-400"></textarea>
                </div>
                <div class="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <button id="cancelPresetModalBtn" class="px-4 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">취소</button>
                    <button id="savePresetBtn" class="px-5 py-2.5 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md transition-colors"><i class="fa-solid fa-check"></i> DB에 추가</button>
                </div>
            </div>
            <div id="presetManageView" class="hidden space-y-4">
                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <label class="block text-xs font-bold text-slate-700 mb-1">카테고리 선택</label>
                        <select id="manageCategorySelect" class="w-full text-xs p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-purple-400"></select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-700 mb-1">관리할 항목</label>
                        <select id="manageTypeSelect" class="w-full text-xs p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-purple-400">
                            <option value="situations">세부 상황 목록</option>
                            <option value="actions">구체적 행동/변화 목록</option>
                        </select>
                    </div>
                </div>
                <div id="manageItemList" class="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar"></div>
            </div>
        </div>
    </div>

    <!-- 8. 비상연락망 상세/전화 모달 -->
    <div id="contactModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center hidden p-4">
        <div class="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl relative space-y-6">
            <button id="closeContactModalBtn" class="absolute top-4 right-4 text-slate-400 text-xl hover:text-slate-700"><i class="fa-solid fa-xmark"></i></button>
            <div class="text-center border-b border-slate-100 pb-4">
                <span id="contactModalNumber" class="text-rose-500 font-bold text-lg mr-1"></span>
                <span id="contactModalName" class="text-2xl font-extrabold text-slate-800"></span>
            </div>
            <div id="contactViewMode" class="space-y-3">
                <a id="callStudentBtn" href="#" class="flex items-center justify-center gap-2 w-full bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold py-3.5 rounded-2xl transition-colors text-sm border border-sky-200 shadow-sm"><i class="fa-solid fa-mobile-screen text-lg"></i> <span id="callStudentText">학생 본인</span></a>
                <div class="grid grid-cols-2 gap-2">
                    <a id="callParentBtn" href="#" class="flex items-center justify-center gap-1.5 w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold py-3.5 rounded-2xl transition-colors text-xs sm:text-sm border border-emerald-200 shadow-sm"><i class="fa-solid fa-phone text-base"></i> <span id="callParentText">학부모 1</span></a>
                    <a id="callParent2Btn" href="#" class="flex items-center justify-center gap-1.5 w-full bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold py-3.5 rounded-2xl transition-colors text-xs sm:text-sm border border-amber-200 shadow-sm"><i class="fa-solid fa-phone text-base"></i> <span id="callParent2Text">학부모 2</span></a>
                </div>
                <div class="pt-4 flex justify-between items-center gap-2">
                    <button id="deleteContactBtn" class="text-xs text-slate-400 hover:text-rose-500 underline">개별 삭제</button>
                    <button id="editContactModeBtn" class="text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl transition-colors">수정</button>
                </div>
            </div>
            <div id="contactEditMode" class="hidden space-y-4">
                <input type="hidden" id="editContactId">
                <div class="grid grid-cols-3 gap-2">
                    <input type="number" id="contactNumInput" placeholder="번호" required class="col-span-1 text-sm p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-center font-bold">
                    <input type="text" id="contactNameInput" placeholder="학생 이름" required class="col-span-2 text-sm p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-bold">
                </div>
                <div>
                    <label class="text-xs text-slate-500 ml-1">학생 전화번호</label>
                    <input type="tel" id="contactStudentPhone" placeholder="010-0000-0000" class="w-full text-sm p-2.5 bg-slate-50 rounded-xl border border-slate-200 mt-1">
                </div>
                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <label class="text-[10px] sm:text-xs text-slate-500 ml-1">학부모 1 번호</label>
                        <input type="tel" id="contactParentPhone" placeholder="010-0000-0000" class="w-full text-sm p-2.5 bg-slate-50 rounded-xl border border-slate-200 mt-1">
                    </div>
                    <div>
                        <label class="text-[10px] sm:text-xs text-slate-500 ml-1">학부모 2 번호</label>
                        <input type="tel" id="contactParent2Phone" placeholder="선택사항" class="w-full text-sm p-2.5 bg-slate-50 rounded-xl border border-slate-200 mt-1">
                    </div>
                </div>
                <div class="flex gap-2 pt-2">
                    <button id="cancelContactEditBtn" class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2.5 rounded-xl text-sm transition-colors">취소</button>
                    <button id="saveContactBtn" class="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-bold py-2.5 rounded-xl text-sm shadow-sm transition-colors">저장</button>
                </div>
            </div>
        </div>
    </div>

    <!-- 9. 여러 명 일괄 붙여넣기 모달 -->
    <div id="bulkPasteModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center hidden p-4">
        <div class="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative space-y-4">
            <button id="closeBulkPasteModalBtn" class="absolute top-4 right-4 text-slate-400 text-lg hover:text-slate-700"><i class="fa-solid fa-xmark"></i></button>
            <h3 class="text-lg font-bold text-slate-800">여러 명 명단 일괄 붙여넣기</h3>
            <p class="text-xs text-slate-500">엑셀이나 한글에서 번호, 이름, 전화번호 열을 복사하여 그대로 붙여넣으세요.</p>
            <textarea id="bulkPasteInput" rows="10" placeholder="1 강서연 010-1234-5678 010-9876-5432..." class="w-full text-xs p-3 rounded-2xl border border-slate-200 font-mono"></textarea>
            <div class="flex justify-end gap-2 pt-2">
                <button id="saveBulkPasteBtn" class="bg-rose-500 hover:bg-rose-600 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md transition-all">명단 파싱 및 등록</button>
            </div>
        </div>
    </div>

    <!-- 10. 단일 연락처 직접 등록 모달 -->
    <div id="newContactModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center hidden p-4">
        <div class="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl relative space-y-4">
            <button id="closeNewContactModalBtn" class="absolute top-4 right-4 text-slate-400 text-lg hover:text-slate-700"><i class="fa-solid fa-xmark"></i></button>
            <h3 class="text-lg font-bold text-slate-800 text-center">연락처 직접 추가</h3>
            <div class="space-y-3">
                <div class="grid grid-cols-3 gap-2">
                    <input type="number" id="newContactNum" placeholder="번호" class="col-span-1 text-xs p-2.5 rounded-xl border border-slate-200 text-center font-bold">
                    <input type="text" id="newContactName" placeholder="이름" class="col-span-2 text-xs p-2.5 rounded-xl border border-slate-200 font-bold">
                </div>
                <input type="tel" id="newContactStudentPhone" placeholder="학생 전화번호" class="w-full text-xs p-2.5 rounded-xl border border-slate-200">
                <input type="tel" id="newContactParentPhone" placeholder="학부모 1 번호" class="w-full text-xs p-2.5 rounded-xl border border-slate-200">
                <input type="tel" id="newContactParent2Phone" placeholder="학부모 2 번호" class="w-full text-xs p-2.5 rounded-xl border border-slate-200">
            </div>
            <div class="flex justify-end gap-2 pt-2">
                <button id="saveNewContactBtn" class="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 rounded-xl text-xs shadow-md transition-all">추가하기</button>
            </div>
        </div>
    </div>

    <!-- 11. 청소 구역 배정 모달 -->
    <div id="cleaningAssignModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center hidden p-4">
        <div class="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl relative space-y-4">
            <button id="closeCleaningAssignModalBtn" class="absolute top-4 right-4 text-slate-400 text-lg hover:text-slate-700"><i class="fa-solid fa-xmark"></i></button>
            <h3 class="text-lg font-bold text-slate-800">청소 학생 배정</h3>
            <div id="cleaningStudentSelectContainer" class="max-h-60 overflow-y-auto grid grid-cols-3 gap-2 p-1"></div>
        </div>
    </div>

    <!-- 12. 내 계정 기본 설정 모달 -->
    <div id="profileSettingsModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center hidden p-4">
        <div class="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl space-y-5 relative">
            <button id="closeProfileSettingsBtn" class="absolute top-4 right-4 text-slate-400 text-lg hover:text-slate-700"><i class="fa-solid fa-xmark"></i></button>
            <div class="text-center border-b border-slate-100 pb-3">
                <h3 class="text-lg font-bold text-slate-800">내 계정 기본 설정</h3>
                <p class="text-xs text-slate-500 mt-0.5">내 정보와 담당 학급을 설정합니다.</p>
            </div>
            <div class="space-y-3">
                <div>
                    <label class="text-xs font-bold text-slate-600 ml-1">선생님 성함</label>
                    <input type="text" id="profileTeacherInput" placeholder="예: 신정훈" class="w-full text-xs p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-sky-400 font-bold mt-1">
                </div>
                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <label class="text-xs font-bold text-slate-600 ml-1">담당 학년</label>
                        <select id="profileGradeSelect" class="w-full text-xs p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-sky-400 font-bold mt-1">
                            <option value="1">1학년</option>
                            <option value="2">2학년</option>
                            <option value="3">3학년</option>
                        </select>
                    </div>
                    <div>
                        <label class="text-xs font-bold text-slate-600 ml-1">담당 반</label>
                        <select id="profileClassSelect" class="w-full text-xs p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-sky-400 font-bold mt-1">
                            <option value="1">1반</option>
                            <option value="2">2반</option>
                            <option value="3">3반</option>
                            <option value="4">4반</option>
                            <option value="5">5반</option>
                            <option value="6">6반</option>
                            <option value="7">7반</option>
                            <option value="8">8반</option>
                            <option value="9">9반</option>
                            <option value="10">10반</option>
                        </select>
                    </div>
                </div>
            </div>
            <div class="pt-2">
                <button id="saveProfileSettingsBtn" class="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-xl text-xs shadow-md transition-all">설정 저장</button>
            </div>
        </div>
    </div>
    `;
    document.body.appendChild(modalContainer);
}
