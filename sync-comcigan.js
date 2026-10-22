<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>부원여중 정보 플랫폼</title>
    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- Google Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap" rel="stylesheet">
    <!-- FontAwesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <!-- Marked.js (Markdown) -->
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        primary: '#0284c7',
                        secondary: '#0d9488',
                        mint: '#14b8a6',
                        lightbg: '#f8fafc',
                    },
                    fontFamily: {
                        sans: ['Noto Sans KR', 'sans-serif'],
                    }
                }
            }
        }
    </script>
    <style>
        body { font-family: 'Noto Sans KR', sans-serif; background-color: #f8fafc; }
        .transition-all-custom { transition: all 0.3s ease-in-out; }
        /* 노션 스타일 뷰어 CSS */
        .notion-content h1 { font-size: 1.5rem; font-weight: 800; margin-top: 1rem; margin-bottom: 0.5rem; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.3rem; }
        .notion-content h2 { font-size: 1.25rem; font-weight: 700; margin-top: 0.85rem; margin-bottom: 0.4rem; color: #334155; }
        .notion-content h3 { font-size: 1.05rem; font-weight: 600; margin-top: 0.75rem; margin-bottom: 0.3rem; color: #475569; }
        .notion-content p { margin-bottom: 0.6rem; line-height: 1.6; color: #334155; font-size: 0.9rem; }
        .notion-content ul { list-style-type: disc; margin-left: 1.25rem; margin-bottom: 0.6rem; color: #334155; font-size: 0.9rem; }
        .notion-content ol { list-style-type: decimal; margin-left: 1.25rem; margin-bottom: 0.6rem; color: #334155; font-size: 0.9rem; }
        .notion-content img { border-radius: 0.75rem; margin: 1rem auto; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); max-width: 100%; height: auto; border: 1px solid #e2e8f0; }
        .notion-content blockquote { border-left: 4px solid #0284c7; padding-left: 0.75rem; font-style: italic; color: #475569; margin: 0.75rem 0; background: #f0f9ff; padding: 0.5rem 0.75rem; border-radius: 0 0.5rem 0.5rem 0; font-size: 0.85rem; }
        
        /* 컴시간 시간표 하이라이트 색상 */
        .tt-cell-changed-red { background-color: #ef4444 !important; color: #ffffff !important; font-weight: bold; }
        .tt-cell-changed-green { background-color: #0f766e !important; color: #ffffff !important; font-weight: bold; }
        .tt-cell-normal { background-color: #ffffff; color: #1e293b; }
    </style>
</head>
<body class="text-slate-800 antialiased min-h-screen flex flex-col relative">

    <!-- ========================================================================= -->
    <!-- 1. 새 탭 단독 뷰어 모드 (수업 자료 및 업무 매뉴얼) -->
    <!-- ========================================================================= -->
    <div id="standaloneViewer" class="hidden min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
        <div class="max-w-4xl mx-auto bg-white rounded-3xl p-6 sm:p-12 shadow-sm border border-slate-200 space-y-6">
            <div class="flex items-center justify-between border-b border-slate-100 pb-4">
                <span id="viewerUnitBadge" class="text-xs font-bold px-3 py-1 rounded-full bg-sky-100 text-sky-700">1단원</span>
                <span id="viewerLessonNum" class="text-xs text-slate-400">1차시</span>
            </div>
            <div id="viewerCoverContainer" class="hidden w-full h-64 rounded-2xl overflow-hidden shadow-inner">
                <img id="viewerCoverImg" src="" alt="Cover" class="w-full h-full object-cover">
            </div>
            <h1 id="viewerTitle" class="text-2xl sm:text-4xl font-extrabold text-slate-800 leading-tight"></h1>
            <p id="viewerSummary" class="text-sm sm:text-base text-slate-500 italic bg-slate-50 p-4 rounded-xl border border-slate-100"></p>
            <div id="viewerMarkdownBody" class="notion-content pt-4 border-t border-slate-100"></div>
            <div class="pt-8 border-t border-slate-100 text-center">
                <p class="text-xs text-slate-400">부원여중 정보과 교육과정 수업 자료실 | 무단 배포를 금지합니다.</p>
            </div>
        </div>
    </div>

    <div id="standaloneTaskViewer" class="hidden min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
        <div class="max-w-4xl mx-auto bg-white rounded-3xl p-6 sm:p-10 shadow-sm border border-slate-200 space-y-6">
            <div class="flex items-center justify-between border-b border-slate-100 pb-4">
                <div class="flex items-center gap-2">
                    <span id="taskViewerCatBadge" class="text-xs font-bold px-3 py-1 rounded-full bg-indigo-100 text-indigo-700">정보 업무</span>
                    <span id="taskViewerStatusBadge" class="text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-800">대기중</span>
                </div>
                <div class="flex items-center gap-2">
                    <button id="taskViewerEditBtn" class="text-xs font-bold px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all flex items-center gap-1.5 shadow-sm">
                        <i class="fa-solid fa-pen"></i> <span>내용 수정</span>
                    </button>
                    <button id="taskViewerSaveBtn" class="hidden text-xs font-bold px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-all flex items-center gap-1.5 shadow-sm">
                        <i class="fa-solid fa-check"></i> <span>저장 완료</span>
                    </button>
                    <button id="taskViewerCancelBtn" class="hidden text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all">
                        취소
                    </button>
                </div>
            </div>
            
            <div id="taskViewDisplaySection" class="space-y-5">
                <h1 id="taskViewerTitle" class="text-2xl sm:text-3xl font-extrabold text-slate-800 leading-tight"></h1>
                <p id="taskViewerSummary" class="text-sm sm:text-base text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-100 leading-relaxed"></p>
                <div id="taskViewerMarkdownBody" class="notion-content pt-4 border-t border-slate-100"></div>
            </div>
            
            <div id="taskEditFormSection" class="hidden space-y-4">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1">카테고리</label>
                        <select id="taskViewerEditCat" class="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white">
                            <option value="devices">💻 아이스톡 & 사이트계정</option>
                            <option value="network">🌐 네트워크 & 서버실</option>
                            <option value="privacy">🛡️ 내PC지키미 & 보안점검</option>
                            <option value="software">🔑 SW & 관리자계정</option>
                            <option value="disposal">📊 정보공시 & 에듀파인</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1">진행 상태</label>
                        <select id="taskViewerEditStatus" class="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-bold">
                            <option value="todo">⏳ 대기중</option>
                            <option value="doing">🚀 진행중</option>
                            <option value="done">✅ 완료됨</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 mb-1">업무명 (제목)</label>
                    <input type="text" id="taskViewerEditTitle" class="w-full text-sm p-2.5 rounded-xl border border-slate-200 font-bold focus:ring-2 focus:ring-indigo-500">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 mb-1">요약 설명</label>
                    <input type="text" id="taskViewerEditSummary" class="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500">
                </div>
                <div>
                    <div class="flex items-center justify-between mb-1">
                        <label class="block text-xs font-semibold text-slate-600">업무 본문 (마크다운 지원)</label>
                        <span class="text-[10px] text-indigo-600 font-semibold">💡 캡처 후 여기에 바로 Ctrl + V 하시면 이미지가 자동 삽입됩니다!</span>
                    </div>
                    <textarea id="taskViewerEditContent" rows="14" class="w-full text-xs p-3.5 rounded-2xl border border-slate-200 font-mono leading-relaxed focus:ring-2 focus:ring-indigo-500"></textarea>
                </div>
            </div>

            <div class="pt-8 border-t border-slate-100 text-center">
                <p class="text-xs text-slate-400">부원여중 정보부 업무 관제 시스템 | 신정훈 선생님 전용 매뉴얼</p>
            </div>
        </div>
    </div>

    <!-- ========================================================================= -->
    <!-- 2. 메인 대시보드 애플리케이션 영역 -->
    <!-- ========================================================================= -->
    <div id="mainDashboardApp">
        <!-- 헤더 및 통합 내비게이션 -->
        <header class="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
                <div class="flex items-center gap-4">
                    <div class="flex items-center gap-2.5">
                        <div class="bg-gradient-to-r from-sky-500 to-teal-500 text-white p-2.5 rounded-xl shadow-md">
                            <i class="fa-solid fa-laptop-code text-xl"></i>
                        </div>
                        <div>
                            <h1 class="text-lg font-bold text-slate-800 leading-tight">부원여중 정보 플랫폼</h1>
                            <p class="text-xs text-slate-500">신정훈 선생님의 수업 및 교무 공간</p>
                        </div>
                    </div>

                    <nav class="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 ml-4">
                        <button id="navTabClass" class="nav-tab-btn active px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white text-sky-700 shadow-sm transition-all flex items-center gap-1.5">
                            <i class="fa-solid fa-graduation-cap"></i> 정보 수업
                        </button>
                        <button id="navTabWork" class="nav-tab-btn px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 transition-all flex items-center gap-1.5">
                            <i class="fa-solid fa-briefcase"></i> 🔒 정보업무 관제탑
                        </button>
                        <button id="navTabOffice" class="nav-tab-btn px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 transition-all flex items-center gap-1.5">
                            <i class="fa-solid fa-calendar-days"></i> 🍱 내 교무실 (급식/시간표)
                        </button>
                    </nav>
                </div>

                <div class="flex items-center gap-3">
                    <div class="relative w-32 sm:w-56 hidden sm:block">
                        <input type="text" id="globalSearch" placeholder="수업자료, 업무 검색..." 
                            class="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-100 rounded-full border-0 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all">
                        <i class="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-slate-400 text-xs"></i>
                    </div>

                    <div id="authStatusContainer">
                        <button id="openLoginModalBtn" class="bg-sky-600 hover:bg-sky-700 text-white text-xs px-3 py-2 rounded-xl font-medium transition-all shadow-sm flex items-center gap-1.5">
                            <i class="fa-solid fa-user-lock"></i> <span class="hidden sm:inline">교사 로그인</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- 모바일 내비게이션 바 -->
            <div class="flex md:hidden border-t border-slate-100 bg-slate-50 p-1.5 gap-1 justify-center">
                <button id="mobileNavTabClass" class="flex-1 py-1.5 text-center text-xs font-bold bg-white text-sky-700 rounded-lg shadow-sm">💻 정보 수업</button>
                <button id="mobileNavTabWork" class="flex-1 py-1.5 text-center text-xs font-medium text-slate-600">🔒 정보업무</button>
                <button id="mobileNavTabOffice" class="flex-1 py-1.5 text-center text-xs font-medium text-slate-600">🍱 시간표</button>
            </div>
        </header>

        <!-- ============================================== -->
        <!-- 탭 1: 정보 수업 대시보드 -->
        <!-- ============================================== -->
        <div id="tabContentClass" class="tab-view-content">
            <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
                <section class="bg-gradient-to-r from-sky-600 to-teal-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
                    <div class="relative z-10 flex flex-col md:flex-row items-center gap-6">
                        <div class="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white/20 backdrop-blur-md p-1 border-2 border-white/40 shadow-inner flex items-center justify-center text-5xl">👨‍🏫</div>
                        <div class="text-center md:text-left flex-1">
                            <div class="flex items-center justify-center md:justify-start gap-2 mb-1">
                                <span class="bg-white/20 text-xs px-2.5 py-0.5 rounded-full font-medium backdrop-blur-sm">부원여중 정보교사</span>
                                <span class="text-sky-100 text-xs">💻 컴퓨팅 사고력 증진</span>
                            </div>
                            <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">안녕하세요! 즐거운 정보 수업 공간입니다 👋</h2>
                            <p class="text-sky-100 text-sm sm:text-base max-w-2xl leading-relaxed">단원별 학습 자료, 실습 플랫폼 바로가기, 수행평가 과제 제출을 한곳에서 편리하게 확인하세요!</p>
                        </div>
                    </div>
                </section>

                <section class="bg-white rounded-2xl border border-sky-100 shadow-sm overflow-hidden transition-all-custom">
                    <div class="p-5 bg-sky-50/50 flex items-center justify-between border-b border-sky-100">
                        <div class="flex items-center gap-3">
                            <span class="bg-sky-500 text-white text-xs font-bold px-2.5 py-1 rounded-md animate-pulse">주요 공지</span>
                            <h3 class="font-bold text-slate-800 text-base sm:text-lg">오늘의 수업 및 수행평가 안내</h3>
                        </div>
                        <div class="flex items-center gap-2">
                            <button id="teacherEditNoticeBtn" class="hidden text-xs bg-amber-500 hover:bg-amber-600 text-white font-medium px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1">공지 관리</button>
                            <button id="toggleNoticeBtn" class="text-slate-500 hover:text-sky-600 focus:outline-none p-1"><i class="fa-solid fa-chevron-up" id="noticeIcon"></i></button>
                        </div>
                    </div>
                    <div id="noticeEditControls" class="hidden bg-amber-50 border-b border-amber-200 p-4 space-y-3">
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <select id="newNoticeType" class="text-xs p-2 rounded-lg border border-amber-300 bg-white"><option value="sky">안내</option><option value="amber">주의</option><option value="rose">긴급</option></select>
                            <input type="text" id="newNoticeTitle" placeholder="공지 제목 입력" class="text-xs p-2 rounded-lg border border-amber-300 bg-white sm:col-span-2">
                        </div>
                        <textarea id="newNoticeBody" placeholder="공지 세부 내용 입력..." class="w-full text-xs p-2 rounded-lg border border-amber-300 bg-white h-16"></textarea>
                        <div class="flex justify-end"><button id="addNoticeFirebaseBtn" class="bg-amber-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">새 공지 등록</button></div>
                    </div>
                    <div id="noticeContent" class="p-5 space-y-3 text-sm text-slate-600">
                        <div id="noticeListContainer" class="space-y-3"></div>
                    </div>
                </section>

                <section class="space-y-4">
                    <h3 class="text-lg font-bold text-slate-800 flex items-center gap-2"><i class="fa-solid fa-rocket text-sky-500"></i> 수업 바로가기 (실습 플랫폼)</h3>
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <a href="https://playentry.org" target="_blank" class="searchable-card bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center">
                            <div class="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center text-2xl mb-2"><i class="fa-solid fa-shapes"></i></div>
                            <span class="font-bold text-slate-800 text-sm">엔트리</span><span class="text-xs text-slate-400 mt-0.5">블록 코딩 실습</span>
                        </a>
                        <a href="https://www.menti.com" target="_blank" class="searchable-card bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center">
                            <div class="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center text-2xl mb-2"><i class="fa-solid fa-chart-simple"></i></div>
                            <span class="font-bold text-slate-800 text-sm">멘티미터</span><span class="text-xs text-slate-400 mt-0.5">실시간 설문/퀴즈</span>
                        </a>
                        <a href="https://www.icedu.kr" target="_blank" class="searchable-card bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center">
                            <div class="w-12 h-12 rounded-xl bg-cyan-100 text-cyan-600 flex items-center justify-center text-2xl mb-2"><i class="fa-solid fa-school"></i></div>
                            <span class="font-bold text-slate-800 text-sm">ICEDU</span><span class="text-xs text-slate-400 mt-0.5">인천교육 포털</span>
                        </a>
                    </div>
                </section>

                <section class="space-y-4">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <h3 class="text-lg font-bold text-slate-800 flex items-center gap-2"><i class="fa-solid fa-folder-open text-teal-500"></i> 단원별 수업 자료실</h3>
                        <button id="openNewLessonModalBtn" class="hidden text-xs bg-teal-600 hover:bg-teal-700 text-white font-semibold px-3 py-1.5 rounded-xl shadow-sm flex items-center gap-1.5"><i class="fa-solid fa-plus"></i> 새 자료 작성</button>
                    </div>
                    <div class="flex flex-wrap gap-1.5" id="categoryFilter">
                        <button class="filter-btn active text-xs font-medium px-3 py-1.5 rounded-full bg-sky-500 text-white shadow-sm" data-category="all">전체 보기</button>
                        <button class="filter-btn text-xs font-medium px-3 py-1.5 rounded-full bg-slate-200 text-slate-600" data-category="unit1">1단원</button>
                        <button class="filter-btn text-xs font-medium px-3 py-1.5 rounded-full bg-slate-200 text-slate-600" data-category="unit2">2단원</button>
                        <button class="filter-btn text-xs font-medium px-3 py-1.5 rounded-full bg-slate-200 text-slate-600" data-category="unit3">3단원</button>
                        <button class="filter-btn text-xs font-medium px-3 py-1.5 rounded-full bg-slate-200 text-slate-600" data-category="unit4">4단원</button>
                        <button class="filter-btn text-xs font-medium px-3 py-1.5 rounded-full bg-slate-200 text-slate-600" data-category="unit5">5단원</button>
                    </div>
                    <!-- 카드가 렌더링될 아름다운 디자인 복구 공간 -->
                    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-5" id="resourceContainer"></div>
                </section>

                <section class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                        <h3 class="text-lg font-bold text-slate-800"><i class="fa-solid fa-paper-plane text-sky-500 mr-2"></i>과제 제출</h3>
                        <form id="assignmentForm" class="space-y-4">
                            <div class="grid grid-cols-2 gap-3">
                                <input type="text" id="studentNum" placeholder="학번 (10101)" required class="text-sm p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                                <input type="text" id="studentName" placeholder="이름" required class="text-sm p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                            </div>
                            <textarea id="assignmentText" rows="3" placeholder="과제 내용..." required class="w-full text-sm p-2.5 bg-slate-50 rounded-xl border border-slate-200"></textarea>
                            <button type="submit" class="w-full bg-gradient-to-r from-sky-500 to-teal-500 text-white font-bold py-2.5 rounded-xl shadow-md text-sm">제출하기</button>
                        </form>
                    </div>
                    <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4 flex flex-col">
                        <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 class="text-lg font-bold text-slate-800"><i class="fa-solid fa-list-check text-teal-600 mr-2"></i>제출된 과제 목록</h3>
                            <span id="assignmentTeacherBadge" class="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">일반 모드</span>
                        </div>
                        <div id="assignmentList" class="space-y-3 flex-grow max-h-[300px] overflow-y-auto pr-1"></div>
                    </div>
                </section>
            </main>
        </div>

        <!-- ============================================== -->
        <!-- 탭 2: 정보업무 관제탑 -->
        <!-- ============================================== -->
        <div id="tabContentWork" class="tab-view-content hidden">
            <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
                <section class="bg-gradient-to-r from-slate-800 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
                    <div class="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
                        <div class="space-y-2 text-center sm:text-left">
                            <span class="bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 text-xs px-3 py-1 rounded-full font-bold">🔒 부원여중 정보부 전용 보안 스페이스</span>
                            <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight">정보기획 & 교육정보화 지원 업무 관제탑</h2>
                            <p class="text-slate-300 text-xs sm:text-sm max-w-xl">신정훈 선생님의 업무 노션 기반 수시 지침, 계정 정보, 공문 작성 양식 매뉴얼</p>
                        </div>
                        <button id="openNewTaskModalBtn" class="hidden bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs px-4 py-3 rounded-2xl shadow-lg transition-all flex items-center gap-2 whitespace-nowrap">
                            <i class="fa-solid fa-plus-circle text-base"></i> 새 업무/매뉴얼 추가
                        </button>
                    </div>
                </section>

                <div id="workAccessDeniedState" class="hidden bg-amber-50 border border-amber-200 rounded-3xl p-12 text-center space-y-4">
                    <div class="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-2xl mx-auto"><i class="fa-solid fa-lock"></i></div>
                    <h3 class="text-xl font-bold text-slate-800">교사 로그인이 필요한 공간입니다</h3>
                    <p class="text-xs text-slate-500">정보부 업무 관제탑은 관리자 로그인 후 열람할 수 있습니다.</p>
                </div>

                <div id="workMainDashboard" class="space-y-6">
                    <div class="flex flex-wrap gap-2 items-center" id="taskCategoryFilter">
                        <button id="addCategoryBtn" class="hidden text-xs font-bold px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-all flex items-center gap-1">
                            <i class="fa-solid fa-folder-plus"></i> 카테고리 추가
                        </button>
                        <button class="task-filter-btn active text-xs font-semibold px-3.5 py-2 rounded-xl bg-slate-800 text-white shadow-sm" data-workcat="all">전체 업무</button>
                        <button class="task-filter-btn text-xs font-medium px-3.5 py-2 rounded-xl bg-white text-slate-600 border border-slate-200" data-workcat="devices">💻 아이스톡 & 계정</button>
                        <button class="task-filter-btn text-xs font-medium px-3.5 py-2 rounded-xl bg-white text-slate-600 border border-slate-200" data-workcat="network">🌐 네트워크 & 서버</button>
                        <button class="task-filter-btn text-xs font-medium px-3.5 py-2 rounded-xl bg-white text-slate-600 border border-slate-200" data-workcat="privacy">🛡️ 내PC지키미 보안</button>
                        <button class="task-filter-btn text-xs font-medium px-3.5 py-2 rounded-xl bg-white text-slate-600 border border-slate-200" data-workcat="software">🔑 SW & 관리자계정</button>
                        <button class="task-filter-btn text-xs font-medium px-3.5 py-2 rounded-xl bg-white text-slate-600 border border-slate-200" data-workcat="disposal">📊 정보공시 & 공문</button>
                    </div>
                    <!-- 카드가 렌더링될 아름다운 디자인 복구 공간 -->
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" id="taskContainer"></div>
                </div>
            </main>
        </div>

        <!-- ============================================== -->
        <!-- 탭 3: 내 교무실 (급식 & 시간표) -->
        <!-- ============================================== -->
        <div id="tabContentOffice" class="tab-view-content hidden">
            <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
                <section class="bg-gradient-to-r from-teal-700 via-sky-800 to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
                    <div class="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
                        <div class="space-y-1.5 text-center sm:text-left">
                            <span class="bg-white/20 text-teal-100 text-xs px-3 py-1 rounded-full font-bold backdrop-blur-sm flex items-center gap-2 inline-flex">
                                🍱 컴시간 알리미 자동 수집 연동
                                <span id="syncBadgeHeader" class="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-full font-bold">동기화 대기</span>
                            </span>
                            <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight">부원여중 실시간 일과·시간표 & 급식</h2>
                            <p class="text-teal-100 text-xs sm:text-sm">타이틀에서 선생님 이름과 학급을 클릭하여 변경하고, 내 기본값으로 고정하세요.</p>
                        </div>
                        <div class="flex items-center gap-2">
                            <a href="http://comci.net:4082/st" target="_blank" class="bg-white/20 hover:bg-white/30 text-white font-semibold text-xs px-3.5 py-2.5 rounded-2xl border border-white/30 transition-all flex items-center gap-1.5">
                                <i class="fa-solid fa-external-link"></i> 컴시간
                            </a>
                            <button id="openNeisConfigModalBtn" class="bg-white/20 hover:bg-white/30 text-white font-semibold text-xs px-3.5 py-2.5 rounded-2xl border border-white/30 transition-all flex items-center gap-1.5">
                                <i class="fa-solid fa-gear"></i> 설정
                            </button>
                        </div>
                    </div>
                </section>

                <div id="officeAccessDeniedState" class="hidden bg-amber-50 border border-amber-200 rounded-3xl p-12 text-center space-y-4">
                    <div class="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-2xl mx-auto"><i class="fa-solid fa-lock"></i></div>
                    <h3 class="text-xl font-bold text-slate-800">교사 로그인이 필요한 공간입니다</h3>
                </div>

                <div id="officeMainDashboard" class="space-y-8">
                    <!-- 교사 시간표 영역 -->
                    <div class="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 shadow-sm space-y-4">
                        <div class="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
                            <div class="flex items-center gap-2 flex-wrap">
                                <span class="w-2.5 h-6 bg-indigo-600 rounded-full"></span>
                                <h3 class="font-bold text-slate-800 text-base sm:text-lg flex items-center gap-1 flex-wrap">
                                    <span id="titleTeacherNameBtn" class="cursor-pointer underline decoration-dotted decoration-indigo-500 hover:text-indigo-600 transition-colors" title="클릭하여 교사 변경">신정훈</span>
                                    <span>시간표</span>
                                </h3>
                                <div class="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 ml-2">
                                    <button id="weekToggleThisBtn" class="px-3 py-1 rounded-lg text-xs font-bold bg-white text-indigo-700 shadow-sm transition-all">이번주</button>
                                    <button id="weekToggleNextBtn" class="px-3 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 transition-all">다음주</button>
                                </div>
                                <button id="setDefaultMyScheduleBtn" class="text-[11px] bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg ml-1 hover:bg-slate-100"><i class="fa-solid fa-thumbtack text-indigo-500"></i> 내 기본으로 저장</button>
                            </div>
                            <div class="flex items-center gap-3 text-xs">
                                <span id="teacherSyncStatusBadge" class="text-[11px] text-emerald-600 font-bold"><i class="fa-solid fa-cloud-arrow-down mr-1"></i>컴시간 연동</span>
                                <button id="saveTeacherTimetableBtn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow transition-all flex items-center gap-1">저장</button>
                                <span class="flex items-center gap-1 text-[11px]"><span class="w-3 h-3 rounded bg-red-500 inline-block"></span> 보강교체</span>
                                <span class="flex items-center gap-1 text-[11px]"><span class="w-3 h-3 rounded bg-teal-700 inline-block"></span> 특별수업</span>
                            </div>
                        </div>
                        <div class="overflow-x-auto border border-slate-200 rounded-2xl">
                            <table class="w-full text-center border-collapse text-xs sm:text-sm min-w-[500px]">
                                <thead>
                                    <tr class="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold" id="teacherThRow">
                                        <th class="py-2.5 px-2 w-16 border-r border-slate-200">교시</th><th class="py-2.5 px-2 border-r">월</th><th class="py-2.5 px-2 border-r">화</th><th class="py-2.5 px-2 border-r">수</th><th class="py-2.5 px-2 border-r">목</th><th class="py-2.5 px-2">금</th>
                                    </tr>
                                </thead>
                                <tbody id="teacherTimetableGridBody" class="divide-y divide-slate-200 font-medium text-slate-800"></tbody>
                            </table>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <!-- 학급 시간표 영역 -->
                        <div class="lg:col-span-8 bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 shadow-sm space-y-4">
                            <div class="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
                                <div class="flex items-center gap-2">
                                    <span class="w-2.5 h-6 bg-sky-500 rounded-full"></span>
                                    <h3 class="font-bold text-slate-800 text-base sm:text-lg flex items-center gap-1.5 flex-wrap">
                                        <span>제</span>
                                        <span id="titleClassNameBtn" class="cursor-pointer text-sky-700 bg-sky-50 hover:bg-sky-100 px-2.5 py-0.5 rounded-xl border border-sky-200 font-extrabold transition-all" title="클릭하여 학급 변경">1학년 7반</span>
                                        <span>시간표</span>
                                    </h3>
                                    <span id="classWeekBadge" class="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium">이번주</span>
                                </div>
                                <span class="text-xs text-sky-600 font-semibold"><i class="fa-solid fa-cloud-arrow-down mr-1"></i>컴시간 실시간 수집</span>
                            </div>
                            <div class="overflow-x-auto border border-slate-200 rounded-2xl">
                                <table class="w-full text-center border-collapse text-xs sm:text-sm min-w-[500px]">
                                    <thead>
                                        <tr class="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold" id="classThRow">
                                            <th class="py-2.5 px-2 w-16 border-r border-slate-200">교시</th><th class="py-2.5 px-2 border-r">월</th><th class="py-2.5 px-2 border-r">화</th><th class="py-2.5 px-2 border-r">수</th><th class="py-2.5 px-2 border-r">목</th><th class="py-2.5 px-2">금</th>
                                        </tr>
                                    </thead>
                                    <tbody id="classTimetableGridBody" class="divide-y divide-slate-200 font-medium text-slate-800"></tbody>
                                </table>
                            </div>
                        </div>

                        <!-- 오늘의 급식 -->
                        <div class="lg:col-span-4 bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4 flex flex-col justify-between">
                            <div class="space-y-3">
                                <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                                    <h3 class="font-bold text-slate-800 text-base sm:text-lg flex items-center gap-2">
                                        <i class="fa-solid fa-bowl-rice text-amber-500"></i> 부원여중 오늘의 급식
                                    </h3>
                                </div>
                                <div class="flex items-center gap-2">
                                    <input type="date" id="mealDateInput" class="text-xs p-1.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-700 flex-1">
                                    <button id="fetchMealBtn" class="bg-amber-500 hover:bg-amber-600 text-white text-xs px-3.5 py-1.5 rounded-xl font-bold transition-all shadow-sm">조회</button>
                                </div>
                                <div id="mealLoadingState" class="hidden text-center py-6 text-xs text-slate-400">
                                    <i class="fa-solid fa-spinner fa-spin mr-1"></i> 나이스 급식 수신 중...
                                </div>
                                <div id="mealContentBox" class="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 text-xs space-y-2">
                                    <div class="flex justify-between items-center text-amber-900 font-bold border-b border-amber-200/50 pb-1.5">
                                        <span id="mealTypeTitle" class="text-xs">🍚 중식 식단표</span>
                                        <span id="mealCalInfo" class="text-[11px] font-semibold text-amber-700"></span>
                                    </div>
                                    <div id="mealDishList" class="text-slate-700 text-xs sm:text-sm leading-relaxed whitespace-pre-line font-medium pt-1">
                                        급식 데이터를 불러오는 중입니다...
                                    </div>
                                </div>
                            </div>
                            <p class="text-[10px] text-slate-400 pt-2 border-t border-slate-100 text-right">NEIS 표준코드: 7331057</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>

        <footer class="bg-white border-t border-slate-200 py-6 mt-12">
            <div class="max-w-7xl mx-auto px-4 text-center space-y-2">
                <p class="text-xs text-slate-500">© 부원여중 정보&문프교사 신정훈. All rights reserved.</p>
                <p class="text-xs text-slate-400">Powered by <span class="font-bold text-sky-600">Firebase & NEIS API</span></p>
            </div>
        </footer>
    </div>

    <!-- ========================================================================= -->
    <!-- 모달 창 영역 -->
    <!-- ========================================================================= -->
    <div id="teacherSelectModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center hidden p-4">
        <div class="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div class="flex justify-between items-center border-b pb-2">
                <h3 class="font-bold text-slate-800 text-sm">시간표를 조회할 교사 선택</h3>
                <button id="closeTeacherSelectModalBtn" class="text-slate-400 hover:text-slate-600"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div id="modalTeacherList" class="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto text-xs p-1"></div>
        </div>
    </div>

    <div id="classSelectModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center hidden p-4">
        <div class="bg-white rounded-3xl p-6 max-w-xs w-full shadow-2xl space-y-4">
            <div class="flex justify-between items-center border-b pb-2">
                <h3 class="font-bold text-slate-800 text-sm">학급 선택</h3>
                <button id="closeClassSelectModalBtn" class="text-slate-400 hover:text-slate-600"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div id="modalClassList" class="grid grid-cols-3 gap-2 max-h-80 overflow-y-auto text-xs p-1"></div>
        </div>
    </div>

    <div id="neisConfigModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center hidden p-4">
        <div class="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative space-y-4">
            <button id="closeNeisConfigModalBtn" class="absolute top-4 right-4 text-slate-400 text-xl"><i class="fa-solid fa-xmark"></i></button>
            <div class="border-b border-slate-100 pb-3">
                <h3 class="text-lg font-bold text-slate-800">NEIS 오픈 API 연동 설정</h3>
                <p class="text-xs text-slate-500">부원여자중학교 나이스 공식 행정표준코드 연동</p>
            </div>
            <div class="space-y-3">
                <div>
                    <label class="block text-xs font-semibold text-slate-600 mb-1">NEIS API 인증키</label>
                    <input type="text" id="neisApiKeyInput" placeholder="발급받으신 나이스 인증키 입력" class="w-full text-xs p-2.5 rounded-xl border border-slate-200 font-mono">
                </div>
                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1">시도교육청코드</label>
                        <input type="text" id="neisOfficeCodeInput" value="E10" class="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold" readonly>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1">학교코드</label>
                        <input type="text" id="neisSchoolCodeInput" value="7331057" class="w-full text-xs p-2.5 rounded-xl border border-slate-200 font-bold bg-slate-50" readonly>
                    </div>
                </div>
            </div>
            <div class="flex justify-end gap-2 pt-3"><button id="saveNeisConfigBtn" class="px-5 py-2 text-xs font-bold text-white bg-teal-600 rounded-xl">저장</button></div>
        </div>
    </div>

    <!-- 수업자료 모달 (디자인 복구) -->
    <div id="lessonModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center hidden p-4">
        <div class="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto">
            <button id="closeLessonModalBtn" class="absolute top-4 right-4 text-slate-400 text-xl"><i class="fa-solid fa-xmark"></i></button>
            <h3 id="lessonModalTitle" class="text-xl font-bold text-slate-800 border-b pb-3">새 수업 자료 작성</h3>
            <form id="lessonForm" class="space-y-3.5">
                <input type="hidden" id="editLessonId">
                <div class="grid grid-cols-2 gap-3">
                    <select id="lessonUnitSelect" class="text-xs p-2.5 rounded-xl border border-slate-200">
                        <option value="unit1">1단원. 컴퓨팅 시스템</option><option value="unit2">2단원. 데이터</option>
                        <option value="unit3">3단원. 알고리즘과 프로그래밍</option><option value="unit4">4단원. 인공지능</option>
                        <option value="unit5">5단원. 디지털 문화</option>
                    </select>
                    <input type="text" id="lessonNumInput" placeholder="1차시" required class="text-xs p-2.5 rounded-xl border border-slate-200">
                </div>
                <input type="text" id="lessonTitleInput" placeholder="제목" required class="w-full text-xs p-2.5 rounded-xl border border-slate-200 font-bold">
                <input type="text" id="lessonSummaryInput" placeholder="요약" required class="w-full text-xs p-2.5 rounded-xl border border-slate-200">
                <input type="url" id="lessonCoverInput" placeholder="커버 이미지 URL" class="w-full text-xs p-2.5 rounded-xl border border-slate-200">
                <textarea id="lessonContentInput" rows="6" placeholder="마크다운 본문 (Ctrl+V 캡처 이미지 즉시 붙여넣기 가능)..." required class="w-full text-xs p-3 rounded-xl border border-slate-200 font-mono"></textarea>
                <div class="flex items-center gap-2 p-3 bg-slate-50 rounded-xl">
                    <input type="checkbox" id="lessonVisibilityCheckbox" checked class="w-4 h-4 text-sky-600 rounded">
                    <label class="text-xs font-medium text-slate-700">즉시 학생 공개</label>
                </div>
                <div class="flex justify-end gap-2 pt-2">
                    <button type="button" id="cancelLessonModalBtn" class="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl">취소</button>
                    <button type="submit" class="px-5 py-2 text-xs font-bold text-white bg-teal-600 rounded-xl">저장 완료</button>
                </div>
            </form>
        </div>
    </div>

    <!-- 업무자료 모달 (디자인 복구) -->
    <div id="taskModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center hidden p-4">
        <div class="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto">
            <button id="closeTaskModalBtn" class="absolute top-4 right-4 text-slate-400 text-xl"><i class="fa-solid fa-xmark"></i></button>
            <h3 id="taskModalTitle" class="text-xl font-bold text-slate-800 border-b pb-3">새 정보 업무 추가</h3>
            <form id="taskForm" class="space-y-3.5">
                <input type="hidden" id="editTaskId">
                <div class="grid grid-cols-2 gap-3">
                    <select id="taskCatSelect" class="text-xs p-2.5 rounded-xl border border-slate-200">
                        <option value="devices">💻 계정 및 기기</option><option value="network">🌐 네트워크/서버</option>
                        <option value="privacy">🛡️ 보안점검</option><option value="software">🔑 SW관리자</option>
                        <option value="disposal">📊 행정/공시</option>
                    </select>
                    <select id="taskStatusSelect" class="text-xs p-2.5 rounded-xl border border-slate-200 font-bold">
                        <option value="todo">⏳ 대기중 (예정)</option><option value="doing">🚀 진행중 (처리중)</option><option value="done">✅ 완료됨</option>
                    </select>
                </div>
                <input type="text" id="taskTitleInput" placeholder="업무명" required class="w-full text-xs p-2.5 rounded-xl border border-slate-200 font-bold">
                <input type="text" id="taskSummaryInput" placeholder="요약 설명" required class="w-full text-xs p-2.5 rounded-xl border border-slate-200">
                <textarea id="taskContentInput" rows="8" placeholder="업무 세부 지침 및 메모 (Ctrl+V 캡처 이미지 즉시 붙여넣기 가능)..." required class="w-full text-xs p-3 rounded-xl border border-slate-200 font-mono"></textarea>
                <div class="flex justify-end gap-2 pt-2">
                    <button type="button" id="cancelTaskModalBtn" class="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl">취소</button>
                    <button type="submit" class="px-5 py-2 text-xs font-bold text-white bg-indigo-600 rounded-xl">저장하기</button>
                </div>
            </form>
        </div>
    </div>

    <!-- 교사 로그인 모달 -->
    <div id="loginModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center hidden p-4">
        <div class="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl relative space-y-5">
            <button id="closeLoginModalBtn" class="absolute top-4 right-4 text-slate-400 text-lg"><i class="fa-solid fa-xmark"></i></button>
            <div class="text-center space-y-1"><h3 class="text-xl font-bold text-slate-800">교사 인증 로그인</h3></div>
            <form id="loginForm" class="space-y-3">
                <input type="email" id="loginEmail" placeholder="teacher@school.kr" required class="w-full text-sm p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <input type="password" id="loginPassword" placeholder="••••••••" required class="w-full text-sm p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <button type="submit" class="w-full bg-sky-600 text-white font-bold py-2.5 rounded-xl text-sm">로그인</button>
            </form>
        </div>
    </div>

    <!-- Firebase SDK (v10) 및 로직 구현 -->
    <script type="module">
        import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
        import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
        import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, getDoc, setDoc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

        const firebaseConfig = {
          apiKey: "AIzaSyBvT2aTTuFfu6tQ-PqE4_nkuo9sotAp1cs",
          authDomain: "class-208a0.firebaseapp.com",
          projectId: "class-208a0",
          storageBucket: "class-208a0.firebasestorage.app"
        };

        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getFirestore(app);

        let currentUser = null;
        let allLessonDocs = [];
        let allTaskDocs = [];
        let currentViewingTaskData = null;

        // 메타 데이터
        const unitMeta = {
            'unit1': { name: '1단원. 컴퓨팅 시스템', badgeClass: 'bg-sky-50 text-sky-600 border-sky-200' },
            'unit2': { name: '2단원. 데이터', badgeClass: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
            'unit3': { name: '3단원. 알고리즘과 프로그래밍', badgeClass: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
            'unit4': { name: '4단원. 인공지능', badgeClass: 'bg-purple-50 text-purple-600 border-purple-200' },
            'unit5': { name: '5단원. 디지털 문화', badgeClass: 'bg-amber-50 text-amber-600 border-amber-200' }
        };

        let workCatMeta = {
            'devices': { name: '💻 계정 및 기기', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
            'network': { name: '🌐 네트워크/서버', badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
            'privacy': { name: '🛡️ 보안점검', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200' },
            'software': { name: '🔑 SW관리자', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200' },
            'disposal': { name: '📊 행정/공시', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' }
        };

        const teacherList = [
            { id: '11', name: '김정애', short: '김정' }, { id: '32', name: '신정훈', short: '신정', default: true },
            { id: '33', name: '최용섭', short: '최용' }, { id: '34', name: '김용준', short: '김용' },
            { id: '35', name: '주형승', short: '주형' }, { id: '36', name: '한은지', short: '한은' },
            { id: '37', name: '김희라', short: '김희' }, { id: '38', name: '이아랑', short: '이아' },
            { id: '39', name: '김지혜', short: '김지' }, { id: '40', name: '천하얀', short: '천하' },
            { id: '41', name: '조성은', short: '조성' }, { id: '42', name: '이수진', short: '이수' },
            { id: '43', name: '박민지', short: '박민' }, { id: '44', name: '정유진', short: '정유' }
        ];

        let selectedTeacher = teacherList.find(t => t.default);
        let selectedGrade = 1;
        let selectedClassNum = 7;
        let currentWeekMode = 'this';
        let activeTeacherSchedule = {};
        let activeClassSchedule = {};
        let currentSelectedCategory = 'all';
        let currentWorkCategory = 'all';

        // 클립보드 이미지 페이스트 처리
        function enableClipboardImagePaste(el) {
            if (!el) return;
            el.addEventListener('paste', (e) => {
                const items = (e.clipboardData || window.clipboardData)?.items;
                if (!items) return;
                for (let i = 0; i < items.length; i++) {
                    if (items[i].type.indexOf('image') !== -1) {
                        e.preventDefault();
                        const file = items[i].getAsFile();
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                            const base64 = evt.target.result;
                            const start = el.selectionStart;
                            const end = el.selectionEnd;
                            const text = `\n\n![캡처 이미지](${base64})\n\n`;
                            el.value = el.value.substring(0, start) + text + el.value.substring(end);
                            el.selectionStart = el.selectionEnd = start + text.length;
                        };
                        reader.readAsDataURL(file);
                        break;
                    }
                }
            });
        }
        enableClipboardImagePaste(document.getElementById('taskContentInput'));
        enableClipboardImagePaste(document.getElementById('lessonContentInput'));
        enableClipboardImagePaste(document.getElementById('taskViewerEditContent'));

        // ==========================================
        // 새 탭 뷰어 감지 및 제어 로직 (버그 수정)
        // ==========================================
        const urlParams = new URLSearchParams(window.location.search);
        const isLessonViewer = urlParams.has('lesson');
        const isTaskViewer = urlParams.has('task');

        if (isLessonViewer) {
            document.getElementById('mainDashboardApp').classList.add('hidden');
            document.getElementById('standaloneViewer').classList.remove('hidden');
            loadStandaloneLesson(urlParams.get('lesson'));
        } else if (isTaskViewer) {
            document.getElementById('mainDashboardApp').classList.add('hidden');
            document.getElementById('standaloneTaskViewer').classList.remove('hidden');
            loadStandaloneTask(urlParams.get('task'));
        } else {
            // 기본 상태: 메인 앱 노출, 첫 번째 탭 활성화
            document.getElementById('mainDashboardApp').classList.remove('hidden');
        }

        async function loadStandaloneLesson(id) {
            try {
                const snap = await getDoc(doc(db, "lessons", id));
                if (!snap.exists()) return;
                const data = snap.data();
                document.title = `${data.title} | 정보 수업 자료실`;
                document.getElementById('viewerTitle').textContent = data.title;
                document.getElementById('viewerSummary').textContent = data.summary || '';
                document.getElementById('viewerLessonNum').textContent = data.lessonNum || '수업 자료';

                const meta = unitMeta[data.unit] || { name: '정보', badgeClass: 'bg-slate-100 text-slate-600' };
                const badge = document.getElementById('viewerUnitBadge');
                badge.textContent = meta.name;
                badge.className = `text-xs font-bold px-3 py-1 rounded-full border ${meta.badgeClass}`;

                if (data.coverImage) {
                    document.getElementById('viewerCoverImg').src = data.coverImage;
                    document.getElementById('viewerCoverContainer').classList.remove('hidden');
                }
                document.getElementById('viewerMarkdownBody').innerHTML = marked.parse(data.content || '');
            } catch (err) { }
        }

        async function loadStandaloneTask(id) {
            try {
                const snap = await getDoc(doc(db, "work_tasks", id));
                if (!snap.exists()) return;
                currentViewingTaskData = { id: snap.id, ...snap.data() };
                renderStandaloneTaskView();
            } catch (err) { }
        }

        function renderStandaloneTaskView() {
            if (!currentViewingTaskData) return;
            const data = currentViewingTaskData;

            document.title = `${data.title} | 정보부 업무 매뉴얼`;
            document.getElementById('taskViewerTitle').textContent = data.title;
            document.getElementById('taskViewerSummary').textContent = data.summary || '';

            const meta = workCatMeta[data.category] || { name: '정보 업무', badgeClass: 'bg-slate-100 text-slate-700' };
            const badge = document.getElementById('taskViewerCatBadge');
            badge.textContent = meta.name;
            badge.className = `text-xs font-bold px-3 py-1 rounded-full border ${meta.badgeClass}`;

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
        }

        // 인라인 편집 버튼 연결
        document.getElementById('taskViewerEditBtn')?.addEventListener('click', () => {
            if (!currentViewingTaskData) return;
            document.getElementById('taskViewerEditCat').value = currentViewingTaskData.category || 'devices';
            document.getElementById('taskViewerEditStatus').value = currentViewingTaskData.status || 'todo';
            document.getElementById('taskViewerEditTitle').value = currentViewingTaskData.title || '';
            document.getElementById('taskViewerEditSummary').value = currentViewingTaskData.summary || '';
            document.getElementById('taskViewerEditContent').value = currentViewingTaskData.content || '';

            document.getElementById('taskViewDisplaySection').classList.add('hidden');
            document.getElementById('taskEditFormSection').classList.remove('hidden');
            document.getElementById('taskViewerEditBtn').classList.add('hidden');
            document.getElementById('taskViewerSaveBtn').classList.remove('hidden');
            document.getElementById('taskViewerCancelBtn').classList.remove('hidden');
        });

        document.getElementById('taskViewerCancelBtn')?.addEventListener('click', () => {
            document.getElementById('taskEditFormSection').classList.add('hidden');
            document.getElementById('taskViewDisplaySection').classList.remove('hidden');
            document.getElementById('taskViewerSaveBtn').classList.add('hidden');
            document.getElementById('taskViewerCancelBtn').classList.add('hidden');
            document.getElementById('taskViewerEditBtn').classList.remove('hidden');
        });

        document.getElementById('taskViewerSaveBtn')?.addEventListener('click', async () => {
            if (!currentViewingTaskData) return;
            const updatedTitle = document.getElementById('taskViewerEditTitle').value.trim();
            const updatedSummary = document.getElementById('taskViewerEditSummary').value.trim();
            const updatedCategory = document.getElementById('taskViewerEditCat').value;
            const updatedStatus = document.getElementById('taskViewerEditStatus').value;
            const updatedContent = document.getElementById('taskViewerEditContent').value;

            if (!updatedTitle) return alert("제목을 입력하세요.");

            try {
                await updateDoc(doc(db, "work_tasks", currentViewingTaskData.id), {
                    title: updatedTitle, summary: updatedSummary, category: updatedCategory,
                    status: updatedStatus, content: updatedContent, updatedAt: serverTimestamp()
                });
                currentViewingTaskData = { ...currentViewingTaskData, title: updatedTitle, summary: updatedSummary, category: updatedCategory, status: updatedStatus, content: updatedContent };
                renderStandaloneTaskView();

                document.getElementById('taskEditFormSection').classList.add('hidden');
                document.getElementById('taskViewDisplaySection').classList.remove('hidden');
                document.getElementById('taskViewerSaveBtn').classList.add('hidden');
                document.getElementById('taskViewerCancelBtn').classList.add('hidden');
                document.getElementById('taskViewerEditBtn').classList.remove('hidden');
            } catch (err) { alert("저장 실패: " + err.message); }
        });

        // ==========================================
        // 탭 전환 및 로그인 처리 로직
        // ==========================================
        function switchTab(target) {
            document.getElementById('tabContentClass').classList.add('hidden');
            document.getElementById('tabContentWork').classList.add('hidden');
            document.getElementById('tabContentOffice').classList.add('hidden');
            
            document.getElementById('navTabClass').className = "nav-tab-btn px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-600 flex items-center gap-1.5";
            document.getElementById('navTabWork').className = "nav-tab-btn px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-600 flex items-center gap-1.5";
            document.getElementById('navTabOffice').className = "nav-tab-btn px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-600 flex items-center gap-1.5";

            if (target === 'work') {
                document.getElementById('tabContentWork').classList.remove('hidden');
                document.getElementById('navTabWork').className = "nav-tab-btn active px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white text-indigo-700 shadow-sm flex items-center gap-1.5";
            } else if (target === 'office') {
                document.getElementById('tabContentOffice').classList.remove('hidden');
                document.getElementById('navTabOffice').className = "nav-tab-btn active px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white text-teal-700 shadow-sm flex items-center gap-1.5";
                initTimetables();
            } else {
                document.getElementById('tabContentClass').classList.remove('hidden');
                document.getElementById('navTabClass').className = "nav-tab-btn active px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white text-sky-700 shadow-sm flex items-center gap-1.5";
            }
        }

        document.getElementById('navTabClass')?.addEventListener('click', () => switchTab('class'));
        document.getElementById('navTabWork')?.addEventListener('click', () => switchTab('work'));
        document.getElementById('navTabOffice')?.addEventListener('click', () => switchTab('office'));
        
        document.getElementById('openLoginModalBtn')?.addEventListener('click', () => document.getElementById('loginModal').classList.remove('hidden'));
        document.getElementById('closeLoginModalBtn')?.addEventListener('click', () => document.getElementById('loginModal').classList.add('hidden'));

        // 로그인 상태 갱신 (새 탭 오류 안 나도록 처리)
        onAuthStateChanged(auth, async (user) => {
            currentUser = user;
            
            // 로그인 상태에 따른 버튼 노출 제어 (메인 화면일 때만)
            if (!isLessonViewer && !isTaskViewer) {
                if (user) {
                    document.getElementById('openLoginModalBtn').classList.add('hidden');
                    document.getElementById('logoutBtn').classList.remove('hidden');
                    document.getElementById('workAccessDeniedState').classList.add('hidden');
                    document.getElementById('workMainDashboard').classList.remove('hidden');
                    document.getElementById('officeAccessDeniedState').classList.add('hidden');
                    document.getElementById('officeMainDashboard').classList.remove('hidden');
                    document.getElementById('teacherEditNoticeBtn').classList.remove('hidden');
                    document.getElementById('openNewLessonModalBtn').classList.remove('hidden');
                    document.getElementById('openNewTaskModalBtn').classList.remove('hidden');
                    document.getElementById('addCategoryBtn').classList.remove('hidden');

                    try {
                        const snap = await getDoc(doc(db, "user_preferences", user.uid));
                        if (snap.exists()) {
                            const pref = snap.data();
                            if (pref.teacherShort) {
                                const found = teacherList.find(t => t.short === pref.teacherShort);
                                if (found) selectedTeacher = found;
                            }
                            if (pref.classStr) {
                                selectedGrade = Number(pref.classStr.split('-')[0]);
                                selectedClassNum = Number(pref.classStr.split('-')[1]);
                            }
                        }
                    } catch(e) {}
                } else {
                    document.getElementById('openLoginModalBtn').classList.remove('hidden');
                    document.getElementById('logoutBtn').classList.add('hidden');
                    document.getElementById('workAccessDeniedState').classList.remove('hidden');
                    document.getElementById('workMainDashboard').classList.add('hidden');
                    document.getElementById('officeAccessDeniedState').classList.remove('hidden');
                    document.getElementById('officeMainDashboard').classList.add('hidden');
                    document.getElementById('teacherEditNoticeBtn').classList.add('hidden');
                    document.getElementById('openNewLessonModalBtn').classList.add('hidden');
                    document.getElementById('openNewTaskModalBtn').classList.add('hidden');
                    document.getElementById('addCategoryBtn').classList.add('hidden');
                }
            }
            
            renderLessons();
            renderTasks();
            if (!isLessonViewer && !isTaskViewer) initTimetables();
        });

        document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                await signInWithEmailAndPassword(auth, document.getElementById('loginEmail').value, document.getElementById('loginPassword').value);
                document.getElementById('loginModal').classList.add('hidden');
                document.getElementById('loginForm').reset();
            } catch (err) { alert("로그인 실패"); }
        });
        document.getElementById('logoutBtn')?.addEventListener('click', () => signOut(auth));

        // ==========================================
        // 🍱 컴시간 시간표 및 급식 연동 로직
        // ==========================================
        function initTimetables() {
            if(!document.getElementById('titleTeacherNameBtn')) return;
            document.getElementById('titleTeacherNameBtn').textContent = selectedTeacher.name;
            document.getElementById('titleClassNameBtn').textContent = `${selectedGrade}-${selectedClassNum}`;
            loadTeacherTimetable();
            loadClassTimetable();
            fetchComciganSyncStatus();
        }

        async function fetchComciganSyncStatus() {
            try {
                const snap = await getDoc(doc(db, "timetable_meta", "sync_status"));
                if (snap.exists()) {
                    const data = snap.data();
                    const d = new Date(data.lastSyncedAt);
                    const timeStr = `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
                    document.getElementById('syncBadgeHeader').textContent = `동기화 완료 (${timeStr})`;
                }
            } catch (err) {}
        }

        // 이번주/다음주 탭 토글
        document.getElementById('weekToggleThisBtn')?.addEventListener('click', (e) => {
            currentWeekMode = 'this';
            e.target.className = "px-3 py-1 text-xs font-bold bg-white text-indigo-700 rounded-lg shadow-sm";
            document.getElementById('weekToggleNextBtn').className = "px-3 py-1 text-xs font-medium text-slate-600 rounded-lg";
            document.getElementById('classWeekBadge').textContent = "이번주";
            initTimetables();
        });
        document.getElementById('weekToggleNextBtn')?.addEventListener('click', (e) => {
            currentWeekMode = 'next';
            e.target.className = "px-3 py-1 text-xs font-bold bg-white text-indigo-700 rounded-lg shadow-sm";
            document.getElementById('weekToggleThisBtn').className = "px-3 py-1 text-xs font-medium text-slate-600 rounded-lg";
            document.getElementById('classWeekBadge').textContent = "다음주";
            initTimetables();
        });

        // 팝업 메뉴 이벤트 연결
        document.getElementById('titleTeacherNameBtn')?.addEventListener('click', () => {
            const modal = document.getElementById('teacherSelectModal');
            const list = document.getElementById('modalTeacherList');
            list.innerHTML = '';
            teacherList.forEach(t => {
                const btn = document.createElement('button');
                btn.className = `p-2 rounded-xl text-center text-xs font-semibold ${t.short === selectedTeacher.short ? 'bg-indigo-600 text-white' : 'bg-slate-50 hover:bg-slate-200 text-slate-700'}`;
                btn.textContent = t.name;
                btn.onclick = () => { selectedTeacher = t; modal.classList.add('hidden'); initTimetables(); };
                list.appendChild(btn);
            });
            modal.classList.remove('hidden');
        });
        document.getElementById('closeTeacherSelectModalBtn')?.addEventListener('click', () => document.getElementById('teacherSelectModal').classList.add('hidden'));

        document.getElementById('titleClassNameBtn')?.addEventListener('click', () => {
            const modal = document.getElementById('classSelectModal');
            const list = document.getElementById('modalClassList');
            list.innerHTML = '';
            for (let g=1; g<=3; g++) {
                for(let c=1; c<=9; c++) {
                    const btn = document.createElement('button');
                    btn.className = `p-2 rounded-xl text-center text-xs font-semibold ${(g===selectedGrade && c===selectedClassNum) ? 'bg-sky-600 text-white' : 'bg-slate-50 hover:bg-slate-200 text-slate-700'}`;
                    btn.textContent = `${g}-${c}`;
                    btn.onclick = () => { selectedGrade = g; selectedClassNum = c; modal.classList.add('hidden'); initTimetables(); };
                    list.appendChild(btn);
                }
            }
            modal.classList.remove('hidden');
        });
        document.getElementById('closeClassSelectModalBtn')?.addEventListener('click', () => document.getElementById('classSelectModal').classList.add('hidden'));

        // 내 기본값으로 고정 저장
        document.getElementById('setDefaultMyScheduleBtn')?.addEventListener('click', async () => {
            if(!currentUser) return alert("교사 로그인이 필요합니다.");
            try {
                await setDoc(doc(db, "user_preferences", currentUser.uid), {
                    teacherShort: selectedTeacher.short,
                    teacherName: selectedTeacher.name,
                    classStr: `${selectedGrade}-${selectedClassNum}`
                }, { merge: true });
                alert(`앞으로 로그인 시 [${selectedTeacher.name}] 선생님과 [${selectedGrade}-${selectedClassNum}] 학급이 기본 세팅됩니다.`);
            } catch(e) { alert("저장 실패"); }
        });

        // 교사 시간표 렌더링
        async function loadTeacherTimetable() {
            const tbody = document.getElementById('teacherTimetableGridBody');
            if(!tbody) return;
            
            try {
                // 신정훈 선생님은 '32' 키로 고정, 나머지는 이름 앞 2글자
                const tCode = selectedTeacher.short === '신정' ? '32' : selectedTeacher.short;
                const docKey = `tt_teacher_${currentWeekMode}_${tCode}`;
                const snap = await getDoc(doc(db, "timetable_schedules", docKey));
                
                if (snap.exists()) {
                    activeTeacherSchedule = snap.data().schedule || {};
                } else {
                    activeTeacherSchedule = {};
                }
            } catch(e) { activeTeacherSchedule = {}; }

            tbody.innerHTML = '';
            for (let p = 1; p <= 7; p++) {
                let trHtml = `<tr class="border-b border-slate-200"><td class="py-2.5 px-1 font-bold bg-slate-50 border-r text-xs text-slate-500">${p}교시</td>`;
                for (let d = 0; d < 5; d++) {
                    const cellKey = `${p}_${d}`;
                    const cell = activeTeacherSchedule[cellKey] || { text: '', type: 'normal' };
                    let styleClass = cell.type === 'red' ? 'tt-cell-changed-red' : (cell.type === 'green' ? 'tt-cell-changed-green' : 'tt-cell-normal');
                    trHtml += `<td data-key="${cellKey}" class="tt-teacher-cell p-2 border-r ${styleClass} cursor-pointer hover:opacity-90 font-bold text-xs sm:text-sm" title="클릭하여 과목명/상태 변경">${cell.text}</td>`;
                }
                trHtml += `</tr>`;
                tbody.insertAdjacentHTML('beforeend', trHtml);
            }

            document.querySelectorAll('.tt-teacher-cell').forEach(td => {
                td.onclick = async () => {
                    if (!currentUser) return alert("교사 로그인이 필요합니다.");
                    const key = td.getAttribute('data-key');
                    const existing = activeTeacherSchedule[key] || { text: '', type: 'normal' };
                    const newText = prompt("과목명을 입력하세요 (비워두면 삭제):", existing.text);
                    if (newText === null) return;
                    
                    const typeChoice = prompt("시간표 색상을 선택하세요:\n1: 기본(흰색)\n2: 보강교체(빨강)\n3: 행사(초록)", existing.type === 'red' ? '2' : (existing.type === 'green' ? '3' : '1'));
                    let newType = typeChoice === '2' ? 'red' : (typeChoice === '3' ? 'green' : 'normal');

                    activeTeacherSchedule[key] = { text: newText.trim(), type: newType };
                    
                    const tCode = selectedTeacher.short === '신정' ? '32' : selectedTeacher.short;
                    const docKey = `tt_teacher_${currentWeekMode}_${tCode}`;
                    await setDoc(doc(db, "timetable_schedules", docKey), { schedule: activeTeacherSchedule }, { merge: true });
                    loadTeacherTimetable();
                };
            });
        }

        // 학급 시간표 렌더링
        async function loadClassTimetable() {
            const tbody = document.getElementById('classTimetableGridBody');
            if(!tbody) return;
            
            try {
                const docKey = `tt_class_${currentWeekMode}_${selectedGrade}-${selectedClassNum}`;
                const snap = await getDoc(doc(db, "timetable_schedules", docKey));
                
                if (snap.exists()) {
                    activeClassSchedule = snap.data().schedule || {};
                } else {
                    activeClassSchedule = {};
                }
            } catch(e) { activeClassSchedule = {}; }

            tbody.innerHTML = '';
            for (let p = 1; p <= 7; p++) {
                let trHtml = `<tr class="border-b border-slate-200"><td class="py-2.5 px-1 font-bold bg-slate-50 border-r text-xs text-slate-500">${p}교시</td>`;
                for (let d = 0; d < 5; d++) {
                    const cellKey = `${p}_${d}`;
                    const cell = activeClassSchedule[cellKey] || { text: '', type: 'normal' };
                    let styleClass = cell.type === 'red' ? 'tt-cell-changed-red' : (cell.type === 'green' ? 'tt-cell-changed-green' : 'tt-cell-normal');
                    trHtml += `<td data-key="${cellKey}" class="tt-class-cell p-2 border-r ${styleClass} font-bold text-xs sm:text-sm hover:opacity-90 cursor-pointer">${cell.text}</td>`;
                }
                trHtml += `</tr>`;
                tbody.insertAdjacentHTML('beforeend', trHtml);
            }

            document.querySelectorAll('.tt-class-cell').forEach(td => {
                td.onclick = async () => {
                    if (!currentUser) return alert("교사 로그인이 필요합니다.");
                    const key = td.getAttribute('data-key');
                    const existing = activeClassSchedule[key] || { text: '', type: 'normal' };
                    const newText = prompt("과목명을 입력하세요 (비워두면 삭제):", existing.text);
                    if (newText === null) return;
                    
                    const typeChoice = prompt("시간표 색상을 선택하세요:\n1: 기본(흰색)\n2: 보강교체(빨강)\n3: 행사(초록)", existing.type === 'red' ? '2' : (existing.type === 'green' ? '3' : '1'));
                    let newType = typeChoice === '2' ? 'red' : (typeChoice === '3' ? 'green' : 'normal');

                    activeClassSchedule[key] = { text: newText.trim(), type: newType };
                    
                    const docKey = `tt_class_${currentWeekMode}_${selectedGrade}-${selectedClassNum}`;
                    await setDoc(doc(db, "timetable_schedules", docKey), { schedule: activeClassSchedule }, { merge: true });
                    loadClassTimetable();
                };
            });
        }

        // 급식 연동 로직
        async function fetchNeisMeal(dateYmd) {
            const mealBox = document.getElementById('mealDishList');
            if(!mealBox) return;
            try {
                const res = await fetch(`https://open.neis.go.kr/hub/mealServiceDietInfo?Type=json&pIndex=1&pSize=5&ATPT_OFCDC_SC_CODE=E10&SD_SCHUL_CODE=7331057&MLSV_YMD=${dateYmd}`);
                const data = await res.json();
                if (data.mealServiceDietInfo) {
                    mealBox.textContent = data.mealServiceDietInfo[1].row[0].DDISH_NM.replace(/\([0-9\.\s]+\)/g, '').replace(/<br\/>/g, '\n');
                } else { mealBox.textContent = "급식 정보가 없습니다."; }
            } catch (err) { mealBox.textContent = "조회 오류"; }
        }

        const todayYmd = new Date().toISOString().slice(0,10).replace(/-/g, '');
        document.getElementById('mealDateInput').value = new Date().toISOString().slice(0,10);
        document.getElementById('fetchMealBtn')?.addEventListener('click', () => {
            fetchNeisMeal(document.getElementById('mealDateInput').value.replace(/-/g, ''));
        });
        fetchNeisMeal(todayYmd);

        // ==========================================
        // 📚 수업 및 정보업무관제탑 전체 카드 렌더링 시스템 (디자인 복구 완료)
        // ==========================================
        function renderLessons() {
            const container = document.getElementById('resourceContainer');
            if (!container) return;
            let filtered = allLessonDocs.filter(item => {
                if (!currentUser && item.isVisible === false) return false;
                if (currentSelectedCategory !== 'all' && item.unit !== currentSelectedCategory) return false;
                return true;
            });

            if (filtered.length === 0) {
                container.innerHTML = `<div class="col-span-full text-center py-12 bg-white rounded-2xl border border-slate-100 p-6 space-y-2"><i class="fa-solid fa-folder-open text-3xl text-slate-300"></i><p class="text-xs text-slate-500">등록되었거나 공개된 수업 자료가 없습니다.</p></div>`;
                return;
            }

            container.innerHTML = '';
            filtered.forEach(lesson => {
                const meta = unitMeta[lesson.unit] || { name: '수업 자료', badgeClass: 'bg-slate-100 text-slate-600 border-slate-200' };
                const isHidden = lesson.isVisible === false;
                const card = document.createElement('div');
                card.className = `searchable-card bg-white p-5 rounded-2xl border ${isHidden ? 'border-dashed border-amber-300 bg-amber-50/20' : 'border-slate-100'} shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative group cursor-pointer`;
                
                card.innerHTML = `
                    <div onclick="window.open('?lesson=${lesson.id}', '_blank')">
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-xs font-semibold px-2.5 py-0.5 rounded-md border ${meta.badgeClass}">${meta.name}</span>
                            <div class="flex items-center gap-1.5">
                                ${isHidden ? '<span class="text-[10px] bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded">비공개</span>' : ''}
                                <span class="text-xs text-slate-400 font-medium">${lesson.lessonNum || ''}</span>
                            </div>
                        </div>
                        <h4 class="font-bold text-slate-800 text-base mb-1 group-hover:text-sky-600 transition-colors">${lesson.title}</h4>
                        <p class="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">${lesson.summary}</p>
                    </div>
                    <div class="pt-3 border-t border-slate-100 flex flex-col gap-2">
                        <div class="flex items-center justify-between text-xs" onclick="window.open('?lesson=${lesson.id}', '_blank')">
                            <span class="text-slate-400"><i class="fa-regular fa-file-lines mr-1"></i> 수업 노트</span>
                            <span class="text-sky-600 font-semibold hover:underline flex items-center gap-1">새 탭에서 열기 <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i></span>
                        </div>
                        ${currentUser ? `
                            <div class="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between bg-slate-50 p-2 rounded-xl" onclick="event.stopPropagation()">
                                <span class="text-[10px] font-semibold ${!isHidden ? 'text-teal-700' : 'text-slate-400'}">${!isHidden ? '공개중' : '숨김'}</span>
                                <div class="flex items-center gap-2">
                                    <button data-id="${lesson.id}" class="edit-lesson-btn text-xs text-slate-500 hover:text-sky-600 p-1" title="수정"><i class="fa-solid fa-pen"></i></button>
                                    <button data-id="${lesson.id}" class="delete-lesson-btn text-xs text-slate-400 hover:text-rose-500 p-1" title="삭제"><i class="fa-solid fa-trash-can"></i></button>
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

        function renderTasks() {
            const container = document.getElementById('taskContainer');
            if (!container) return;
            let filtered = allTaskDocs.filter(item => {
                if (currentWorkCategory !== 'all' && item.category !== currentWorkCategory) return false;
                return true;
            });

            if (filtered.length === 0) {
                container.innerHTML = `<div class="col-span-full text-center py-12 bg-white rounded-3xl border border-slate-200 p-8 space-y-3"><i class="fa-solid fa-clipboard-list text-3xl text-slate-300"></i><p class="text-xs text-slate-500">등록된 정보부 업무 항목이 없습니다.</p></div>`;
                return;
            }

            container.innerHTML = '';
            filtered.forEach(task => {
                const meta = workCatMeta[task.category] || { name: '정보 업무', badgeClass: 'bg-slate-100 text-slate-700 border-slate-200' };
                
                let statusBadgeHtml = '';
                if (task.status === 'doing') {
                    statusBadgeHtml = `<button data-id="${task.id}" data-status="doing" class="status-toggle-btn bg-sky-100 hover:bg-sky-200 text-sky-800 text-[10px] px-2.5 py-1 rounded-md font-bold transition-all shadow-sm flex items-center gap-1" title="클릭하면 상태 변경">🚀 진행중 <i class="fa-solid fa-arrows-rotate text-[8px]"></i></button>`;
                } else if (task.status === 'done') {
                    statusBadgeHtml = `<button data-id="${task.id}" data-status="done" class="status-toggle-btn bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] px-2.5 py-1 rounded-md font-bold transition-all shadow-sm flex items-center gap-1" title="클릭하면 상태 변경">✅ 완료됨 <i class="fa-solid fa-arrows-rotate text-[8px]"></i></button>`;
                } else {
                    statusBadgeHtml = `<button data-id="${task.id}" data-status="todo" class="status-toggle-btn bg-amber-100 hover:bg-amber-200 text-amber-800 text-[10px] px-2.5 py-1 rounded-md font-bold transition-all shadow-sm flex items-center gap-1" title="클릭하면 상태 변경">⏳ 대기중 <i class="fa-solid fa-arrows-rotate text-[8px]"></i></button>`;
                }

                const card = document.createElement('div');
                card.className = "searchable-card bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-3 cursor-pointer group";
                card.onclick = () => window.open(`?task=${task.id}`, '_blank');

                card.innerHTML = `
                    <div class="space-y-2">
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-semibold px-2.5 py-0.5 rounded-md border ${meta.badgeClass}">${meta.name}</span>
                            ${statusBadgeHtml}
                        </div>
                        <h4 class="font-bold text-slate-800 text-base leading-snug group-hover:text-indigo-600 transition-colors">${task.title}</h4>
                        <p class="text-xs text-slate-500 leading-relaxed">${task.summary}</p>
                    </div>
                    <div class="bg-slate-50 p-3 rounded-2xl border border-slate-100 notion-content max-h-48 overflow-y-auto text-xs">
                        ${marked.parse(task.content || '')}
                    </div>
                    <div class="pt-3 border-t border-slate-100 flex items-center justify-between" onclick="event.stopPropagation()">
                        <span class="text-[10px] text-sky-600 font-semibold hover:underline cursor-pointer" onclick="window.open('?task=${task.id}', '_blank')">새 탭에서 열기 <i class="fa-solid fa-arrow-up-right-from-square text-[9px]"></i></span>
                        ${currentUser ? `
                            <div class="flex items-center gap-2">
                                <button data-id="${task.id}" class="edit-task-btn text-xs text-slate-500 hover:text-indigo-600 p-1"><i class="fa-solid fa-pen"></i></button>
                                <button data-id="${task.id}" class="delete-task-btn text-xs text-slate-400 hover:text-rose-500 p-1"><i class="fa-solid fa-trash-can"></i></button>
                            </div>
                        ` : ''}
                    </div>
                `;
                container.appendChild(card);
            });

            document.querySelectorAll('.status-toggle-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    if (!currentUser) return alert("교사 로그인이 필요합니다.");
                    const taskId = e.currentTarget.getAttribute('data-id');
                    const currentStatus = e.currentTarget.getAttribute('data-status') || 'todo';
                    const nextStatus = currentStatus === 'todo' ? 'doing' : (currentStatus === 'doing' ? 'done' : 'todo');
                    await updateDoc(doc(db, "work_tasks", taskId), { status: nextStatus });
                });
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
                    if (confirm("이 업무 항목을 완전히 삭제하시겠습니까?")) await deleteDoc(doc(db, "work_tasks", e.currentTarget.getAttribute('data-id')));
                });
            });
        }

        // Firestore 실시간 리스너 연결
        onSnapshot(query(collection(db, "lessons"), orderBy("createdAt", "desc")), (snapshot) => {
            allLessonDocs = []; snapshot.forEach(docSnap => allLessonDocs.push({ id: docSnap.id, ...docSnap.data() })); renderLessons();
        });
        onSnapshot(query(collection(db, "work_tasks"), orderBy("createdAt", "desc")), (snapshot) => {
            allTaskDocs = []; snapshot.forEach(docSnap => allTaskDocs.push({ id: docSnap.id, ...docSnap.data() })); renderTasks();
        });

        // 모달 폼 전송 이벤트
        document.getElementById('openNewLessonModalBtn')?.addEventListener('click', () => {
            document.getElementById('editLessonId').value = ''; document.getElementById('lessonForm').reset(); document.getElementById('lessonModal').classList.remove('hidden');
        });
        document.getElementById('closeLessonModalBtn')?.addEventListener('click', () => document.getElementById('lessonModal').classList.add('hidden'));
        document.getElementById('cancelLessonModalBtn')?.addEventListener('click', () => document.getElementById('lessonModal').classList.add('hidden'));
        
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

        document.getElementById('openNewTaskModalBtn')?.addEventListener('click', () => {
            document.getElementById('editTaskId').value = ''; document.getElementById('taskForm').reset(); document.getElementById('taskModal').classList.remove('hidden');
        });
        document.getElementById('closeTaskModalBtn')?.addEventListener('click', () => document.getElementById('taskModal').classList.add('hidden'));
        document.getElementById('cancelTaskModalBtn')?.addEventListener('click', () => document.getElementById('taskModal').classList.add('hidden'));

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

        // 카테고리 필터
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => { b.classList.remove('bg-sky-500', 'text-white', 'shadow-sm', 'active'); b.classList.add('bg-slate-200', 'text-slate-600'); });
                btn.classList.add('bg-sky-500', 'text-white', 'shadow-sm', 'active');
                currentSelectedCategory = btn.getAttribute('data-category'); renderLessons();
            });
        });
        document.querySelectorAll('.task-filter-btn').forEach(btn => {
            if(btn.id === 'addCategoryBtn') return;
            btn.addEventListener('click', () => {
                document.querySelectorAll('.task-filter-btn').forEach(b => { if(b.id !== 'addCategoryBtn') { b.classList.remove('bg-slate-800', 'text-white', 'shadow-sm', 'active'); b.classList.add('bg-white', 'text-slate-600'); } });
                btn.classList.add('bg-slate-800', 'text-white', 'shadow-sm', 'active');
                currentWorkCategory = btn.getAttribute('data-workcat'); renderTasks();
            });
        });

        // 공지 및 과제제출 연동 (약식)
        const noticesRef = collection(db, "notices");
        onSnapshot(query(noticesRef, orderBy("createdAt", "desc")), (snapshot) => {
            const container = document.getElementById('noticeListContainer');
            if(!container) return;
            container.innerHTML = '';
            document.getElementById('noticeLoadingState')?.classList.add('hidden');
            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                container.innerHTML += `<div class="flex justify-between p-3 bg-sky-50 rounded-xl mb-2 text-xs"><div><p class="font-bold">${data.title}</p><p>${data.body}</p></div>${currentUser ? `<button onclick="this.dispatchEvent(new CustomEvent('deleteNotice', {bubbles: true, detail: '${docSnap.id}'}))" class="text-red-400"><i class="fa-solid fa-trash"></i></button>` : ''}</div>`;
            });
        });
        document.addEventListener('deleteNotice', async (e) => { if(confirm("삭제하시겠습니까?")) await deleteDoc(doc(db, "notices", e.detail)); });

        document.getElementById('teacherEditNoticeBtn')?.addEventListener('click', () => document.getElementById('noticeEditControls')?.classList.toggle('hidden'));
        document.getElementById('addNoticeFirebaseBtn')?.addEventListener('click', async () => {
            const t = document.getElementById('newNoticeTitle').value, b = document.getElementById('newNoticeBody').value;
            if(t && b) { await addDoc(noticesRef, { title: t, body: b, type: document.getElementById('newNoticeType').value, createdAt: serverTimestamp() }); document.getElementById('newNoticeTitle').value=''; document.getElementById('newNoticeBody').value=''; }
        });

        onSnapshot(query(collection(db, "assignments"), orderBy("createdAt", "desc")), (snapshot) => {
            const container = document.getElementById('assignmentList');
            if(!container) return;
            container.innerHTML = '';
            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                container.innerHTML += `<div class="p-3 bg-slate-50 rounded-xl mb-2 text-xs"><div class="flex justify-between font-bold"><span>${data.studentNum} ${data.studentName}</span><span>${data.timeStr||''}</span></div><p>${data.text}</p></div>`;
            });
        });
        document.getElementById('assignmentForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const now = new Date();
            await addDoc(collection(db, "assignments"), { studentNum: document.getElementById('studentNum').value, studentName: document.getElementById('studentName').value, text: document.getElementById('assignmentText').value, timeStr: `${now.getMonth()+1}/${now.getDate()} ${now.getHours()}:${now.getMinutes()}`, createdAt: serverTimestamp() });
            alert("제출 완료!"); document.getElementById('assignmentForm').reset();
        });

        document.getElementById('globalSearch')?.addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase().trim();
            document.querySelectorAll('.searchable-card').forEach(c => c.style.display = c.textContent.toLowerCase().includes(q) ? '' : 'none');
        });
        document.getElementById('toggleNoticeBtn')?.addEventListener('click', () => {
            document.getElementById('noticeContent')?.classList.toggle('hidden'); document.getElementById('noticeIcon')?.classList.toggle('rotate-180');
        });

        // 사용자 편의성: 카테고리 동적 추가
        document.getElementById('addCategoryBtn')?.addEventListener('click', () => {
            const catName = prompt("새로 추가할 카테고리 이름 (예: 📋 공문함):");
            if (!catName) return;
            const catId = 'cat_' + Date.now();
            workCatMeta[catId] = { name: catName, badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
            const newBtn = document.createElement('button');
            newBtn.className = 'task-filter-btn text-xs font-medium px-3.5 py-2 rounded-xl bg-white text-slate-600 border border-slate-200';
            newBtn.setAttribute('data-workcat', catId); newBtn.textContent = catName;
            newBtn.addEventListener('click', () => {
                document.querySelectorAll('.task-filter-btn').forEach(b => { if(b.id !== 'addCategoryBtn') { b.classList.remove('bg-slate-800', 'text-white'); b.classList.add('bg-white', 'text-slate-600'); } });
                newBtn.classList.add('bg-slate-800', 'text-white'); currentWorkCategory = catId; renderTasks();
            });
            document.getElementById('taskCategoryFilter').appendChild(newBtn);
            const opt = document.createElement('option'); opt.value = catId; opt.textContent = catName;
            document.getElementById('taskCatSelect').appendChild(opt);
        });

    </script>
</body>
</html>
