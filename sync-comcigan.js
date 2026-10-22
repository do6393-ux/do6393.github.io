const Timetable = require('comcigan-parser');
const admin = require('firebase-admin');

// 1. Firebase Secret 검증
if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.error("오류: FIREBASE_SERVICE_ACCOUNT 시크릿 키가 누락되었습니다.");
  process.exit(1);
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} catch (e) {
  console.error("오류: FIREBASE_SERVICE_ACCOUNT JSON 파싱 실패:", e.message);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function runSync() {
  console.log("부원여자중학교 컴시간알리미 수집 시작...");

  const timetable = new Timetable();
  await timetable.init();

  // searchSchool -> search 로 정상 수정
  const schools = await timetable.search('부원여자중학교');
  if (!schools || schools.length === 0) {
    throw new Error("부원여자중학교를 찾을 수 없습니다.");
  }

  const school = schools[0];
  console.log(`학교 지정 완료: ${school.name} (코드: ${school.code})`);
  timetable.setSchool(school.code);

  const result = await timetable.getTimetable();
  console.log("컴시간 데이터 수집 성공! Firebase 동기화 진행 중...");

  const batch = db.batch();
  const teacherSchedules = {}; // 교사별 시간표 수집 맵

  // 1~3학년 전체 학급 시간표 순회
  for (let grade = 1; grade <= 3; grade++) {
    if (!result[grade]) continue;
    for (let cls = 1; cls < result[grade].length; cls++) {
      const classWeek = result[grade][cls];
      if (!classWeek) continue;

      const classKey = `tt_class_current_${grade}-${cls}`;
      const docRef = db.collection("timetable_schedules").doc(classKey);

      const scheduleMap = {};
      // classWeek: [월(0), 화(1), 수(2), 목(3), 금(4)]
      for (let day = 0; day < 5; day++) {
        const dayPeriods = classWeek[day];
        if (!dayPeriods || !Array.isArray(dayPeriods)) continue;

        for (let pIdx = 0; pIdx < dayPeriods.length; pIdx++) {
          const item = dayPeriods[pIdx];
          if (!item) continue;

          const period = item.classTime || (pIdx + 1);
          const subject = item.subject || '';
          const teacher = item.teacher || '';

          // 1) 학급 시간표 저장 (예: 체육34, 정보32)
          scheduleMap[`${period}_${day}`] = {
            text: teacher ? `${subject}${teacher}` : subject,
            type: 'normal'
          };

          // 2) 교사별 시간표 자동 추출 (예: 107정보)
          if (teacher) {
            if (!teacherSchedules[teacher]) {
              teacherSchedules[teacher] = {};
            }
            teacherSchedules[teacher][`${period}_${day}`] = {
              text: `${grade}0${cls}${subject}`,
              type: 'normal'
            };
          }
        }
      }

      batch.set(docRef, {
        grade: grade,
        classNum: cls,
        schedule: scheduleMap,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }
  }

  // 교사별 시간표 Firebase 저장 (신정훈 선생님 자동 매핑)
  for (const [tName, tSchedule] of Object.entries(teacherSchedules)) {
    const docKey = tName.includes('신정') ? 'tt_teacher_current_32' : `tt_teacher_${encodeURIComponent(tName)}`;
    const tDocRef = db.collection("timetable_schedules").doc(docKey);
    batch.set(tDocRef, {
      teacherName: tName,
      schedule: tSchedule,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }

  // 동기화 로그 기록
  const logRef = db.collection("timetable_meta").doc("sync_status");
  batch.set(logRef, {
    lastSyncedAt: new Date().toISOString(),
    status: "SUCCESS",
    schoolName: school.name,
    message: "부원여중 컴시간 학급 및 교사 시간표가 정상 수집되어 동기화되었습니다."
  });

  await batch.commit();
  console.log("모든 학급 및 교사 시간표가 Firebase에 성공적으로 저장되었습니다!");
}

runSync().catch(err => {
  console.error("동기화 실패:", err);
  process.exit(1);
});
