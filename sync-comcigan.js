const Timetable = require('comcigan-parser');
const admin = require('firebase-admin');

if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.error("오류: FIREBASE_SERVICE_ACCOUNT 키 누락");
  process.exit(1);
}

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// 🚀 해킹(Monkey Patch): _0_1을 강제로 _0_2로 변조하여 다음 주 데이터를 가로채기
const originalBufferFrom = Buffer.from;
global.FETCH_NEXT_WEEK = false;
Buffer.from = function(data, encoding) {
    if (typeof data === 'string' && data.endsWith('_0_1')) {
        if (global.FETCH_NEXT_WEEK) {
            data = data.replace('_0_1', '_0_2');
        }
    }
    return originalBufferFrom(data, encoding);
};

async function runSync() {
  console.log("부원여자중학교 컴시간알리미 수집 시작...");

  // 🔥 1. [이번 주] 전용 로봇 띄우기 (데이터 섞임 완벽 방지)
  global.FETCH_NEXT_WEEK = false;
  const tThis = new Timetable();
  await tThis.init();
  const schools = await tThis.search('부원여자중학교');
  if (!schools || schools.length === 0) throw new Error("부원여자중학교 검색 실패");
  tThis.setSchool(schools[0].code);
  const resultThis = await tThis.getTimetable();
  
  // 🔥 2. [다음 주] 전용 로봇 띄우기 (독립된 객체 사용)
  global.FETCH_NEXT_WEEK = true;
  const tNext = new Timetable();
  await tNext.init();
  tNext.setSchool(schools[0].code);
  let resultNext = null;
  try {
      resultNext = await tNext.getTimetable();
  } catch (e) {
      console.log("다음 주 데이터 아직 미등록 상태");
  }

  const batch = db.batch();
  let totalClassCount = 0;

  const processWeekData = (resultData, weekKey) => {
    if (!resultData) return;
    const teacherSchedules = {};

    for (const grade of Object.keys(resultData)) {
      const gradeClasses = resultData[grade];
      if (!gradeClasses || typeof gradeClasses !== 'object') continue;

      for (const cls of Object.keys(gradeClasses)) {
        const classWeek = gradeClasses[cls];
        if (!Array.isArray(classWeek)) continue;

        if (weekKey === 'this') totalClassCount++;
        const classDocKey = `tt_class_${weekKey}_${grade}-${cls}`;
        const scheduleMap = {};

        for (let day = 0; day < 5; day++) {
          if (!classWeek[day]) continue;
          for (let pIdx = 0; pIdx < classWeek[day].length; pIdx++) {
            const item = classWeek[day][pIdx];
            if (!item || !item.subject) continue; // 빈칸은 저장하지 않아 덮어쓰기 방지

            const period = item.classTime || (pIdx + 1);
            const subject = item.subject;
            const teacherNameRaw = item.teacher || '';
            const type = item.changed ? 'red' : 'normal';

            // 1. 학급 시간표
            scheduleMap[`${period}_${day}`] = {
              text: teacherNameRaw ? `${subject}${teacherNameRaw.replace('*','')}` : subject,
              type: type
            };

            // 2. 교사 시간표 자동 추출 (110반 표기 버그 수정 & 이름 앞 2글자 추출)
            if (teacherNameRaw) {
              const tKey = teacherNameRaw.substring(0, 2); 
              const classFormatted = `${grade}${String(cls).padStart(2, '0')}`; // 1학년 10반 -> 110
              
              if (!teacherSchedules[tKey]) teacherSchedules[tKey] = {};
              teacherSchedules[tKey][`${period}_${day}`] = {
                text: `${classFormatted}${subject}`,
                type: type
              };
            }
          }
        }

        // 🔥 merge: true 삭제! 쓰레기 데이터를 완전히 날려버리고 깨끗하게 덮어씁니다.
        batch.set(db.collection("timetable_schedules").doc(classDocKey), {
          grade: Number(grade),
          classNum: Number(cls),
          schedule: scheduleMap,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }

    // 교사별 시간표도 깨끗하게 덮어쓰기
    for (const [tKey, tSchedule] of Object.entries(teacherSchedules)) {
      batch.set(db.collection("timetable_schedules").doc(`tt_teacher_${weekKey}_${tKey}`), {
        teacherCode: tKey,
        schedule: tSchedule,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // 신정훈 선생님 32번 키 보장
      if (tKey === '신정') {
        batch.set(db.collection("timetable_schedules").doc(`tt_teacher_${weekKey}_32`), {
          teacherName: '신정훈',
          schedule: tSchedule,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }
  };

  // 파싱 실행
  processWeekData(resultThis, 'this');
  processWeekData(resultNext, 'next');

  // 동기화 로그
  const logRef = db.collection("timetable_meta").doc("sync_status");
  batch.set(logRef, {
    lastSyncedAt: new Date().toISOString(),
    status: "SUCCESS",
    schoolName: schools[0].name,
    message: `[이번주 & 다음주] 겹침 없이 클린 동기화 완료: 학급 ${totalClassCount}개`
  });

  await batch.commit();
  console.log("Firebase 최신 시간표 (이번주/다음주) 중복 제거 및 저장 완료!");
}

runSync().catch(err => { console.error(err); process.exit(1); });
