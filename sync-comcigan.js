const Timetable = require('comcigan-parser');
const admin = require('firebase-admin');

if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.error("오류: FIREBASE_SERVICE_ACCOUNT 키 누락");
  process.exit(1);
}

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// 🚀 핵심 해킹(Monkey Patch): comcigan-parser가 무조건 '이번 주(_0_1)'만 부르는 것을 강제로 '다음 주(_0_2)'로 조작
const originalBufferFrom = Buffer.from;
global.FETCH_NEXT_WEEK = false;
Buffer.from = function(data, encoding) {
    if (typeof data === 'string' && data.endsWith('_0_1')) {
        if (global.FETCH_NEXT_WEEK) {
            data = data.replace('_0_1', '_0_2'); // 다음 주 코드로 강제 변환
        }
    }
    return originalBufferFrom(data, encoding);
};

async function runSync() {
  console.log("부원여자중학교 컴시간알리미 수집 시작...");

  const timetable = new Timetable();
  await timetable.init();

  const schools = await timetable.search('부원여자중학교');
  if (!schools || schools.length === 0) throw new Error("부원여자중학교 검색 실패");

  timetable.setSchool(schools[0].code);

  // 1. 이번 주 데이터 수집
  global.FETCH_NEXT_WEEK = false;
  let resultThis = await timetable.getTimetable();
  
  // 2. 다음 주 데이터 수집 (해킹 트릭 발동!)
  global.FETCH_NEXT_WEEK = true;
  let resultNext = null;
  try {
      resultNext = await timetable.getTimetable();
  } catch (e) {
      console.log("다음 주 데이터 아직 미등록 상태");
  }

  const batch = db.batch();
  let totalClassCount = 0;

  // 파싱 함수
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
            if (!item) continue;

            const period = item.classTime || (pIdx + 1);
            const subject = item.subject || '';
            const teacherNameRaw = item.teacher || '';
            const type = item.changed ? 'red' : 'normal';

            // 학급 시간표 저장
            scheduleMap[`${period}_${day}`] = {
              text: teacherNameRaw ? `${subject}${teacherNameRaw.replace('*','')}` : subject,
              type: type
            };

            // 교사 시간표 자동 추출 (110반 표기 버그 수정 & 이름 앞 2글자 추출)
            if (teacherNameRaw) {
              const tKey = teacherNameRaw.substring(0, 2); // "신정", "김정" 등
              const classFormatted = `${grade}${String(cls).padStart(2, '0')}`; // 1학년 10반 -> 110
              
              if (!teacherSchedules[tKey]) teacherSchedules[tKey] = {};
              teacherSchedules[tKey][`${period}_${day}`] = {
                text: `${classFormatted}${subject}`,
                type: type
              };
            }
          }
        }

        // 해당 주차 학급 시간표 DB 저장
        batch.set(db.collection("timetable_schedules").doc(classDocKey), {
          grade: Number(grade), classNum: Number(cls), schedule: scheduleMap, updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      }
    }

    // 해당 주차 전 교사 시간표 DB 일괄 저장
    for (const [tKey, tSchedule] of Object.entries(teacherSchedules)) {
      const tDocRef = db.collection("timetable_schedules").doc(`tt_teacher_${weekKey}_${tKey}`);
      batch.set(tDocRef, {
        teacherCode: tKey, schedule: tSchedule, updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      // 신정훈 선생님 32번 키 특별 보장
      if (tKey === '신정') {
        batch.set(db.collection("timetable_schedules").doc(`tt_teacher_${weekKey}_32`), {
          teacherName: '신정훈', schedule: tSchedule, updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      }
    }
  };

  processWeekData(resultThis, 'this');
  processWeekData(resultNext, 'next');

  const logRef = db.collection("timetable_meta").doc("sync_status");
  batch.set(logRef, {
    lastSyncedAt: new Date().toISOString(), status: "SUCCESS", schoolName: schools[0].name,
    message: `[이번주/다음주] 완벽 동기화 완료: 학급 ${totalClassCount}개`
  });

  await batch.commit();
  console.log("Firebase 최신 시간표 (이번주/다음주) 저장 완료!");
}

runSync().catch(err => { console.error(err); process.exit(1); });
