const Timetable = require('comcigan-parser');
const admin = require('firebase-admin');

if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.error("오류: FIREBASE_SERVICE_ACCOUNT 키 누락");
  process.exit(1);
}

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function runSync() {
  console.log("부원여자중학교 컴시간알리미 수집 시작...");

  const timetable = new Timetable();
  await timetable.init();

  const schools = await timetable.search('부원여자중학교');
  if (!schools || schools.length === 0) throw new Error("부원여자중학교 검색 실패");

  const school = schools[0];
  timetable.setSchool(school.code);
  const result = await timetable.getTimetable();
  
  const batch = db.batch();
  const teacherSchedules = {};
  let classCount = 0;

  for (const grade of Object.keys(result)) {
    const gradeClasses = result[grade];
    if (!gradeClasses || typeof gradeClasses !== 'object') continue;

    for (const cls of Object.keys(gradeClasses)) {
      const classWeek = gradeClasses[cls];
      if (!Array.isArray(classWeek)) continue;

      classCount++;
      const classKey = `tt_class_current_${grade}-${cls}`;
      const scheduleMap = {};

      for (let day = 0; day < 5; day++) {
        if (!classWeek[day]) continue;
        for (let pIdx = 0; pIdx < classWeek[day].length; pIdx++) {
          const item = classWeek[day][pIdx];
          if (!item) continue;

          const period = item.classTime || (pIdx + 1);
          const subject = item.subject || '';
          const teacherNameRaw = item.teacher || ''; // 예: "신정*", "김정*"
          const type = item.changed ? 'red' : 'normal';

          // 1) 학급 시간표 (예: 정보32)
          scheduleMap[`${period}_${day}`] = {
            text: teacherNameRaw ? `${subject}${teacherNameRaw.replace('*','')}` : subject,
            type: type
          };

          // 2) 교사 시간표 자동 매핑 (마스킹 무시하고 앞 2글자 추출)
          if (teacherNameRaw) {
            const tKey = teacherNameRaw.substring(0, 2); // "신정", "김정"
            const classFormatted = `${grade}${String(cls).padStart(2, '0')}`; // 1학년 10반 -> 110
            
            if (!teacherSchedules[tKey]) teacherSchedules[tKey] = {};
            teacherSchedules[tKey][`${period}_${day}`] = {
              text: `${classFormatted}${subject}`,
              type: type
            };
          }
        }
      }

      batch.set(db.collection("timetable_schedules").doc(classKey), {
        grade: Number(grade),
        classNum: Number(cls),
        schedule: scheduleMap,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }
  }

  // 교사별 시간표 저장 (앞 2글자 키로 저장)
  for (const [tKey, tSchedule] of Object.entries(teacherSchedules)) {
    const tDocRef = db.collection("timetable_schedules").doc(`tt_teacher_current_${tKey}`);
    batch.set(tDocRef, {
      teacherCode: tKey,
      schedule: tSchedule,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }

  const logRef = db.collection("timetable_meta").doc("sync_status");
  batch.set(logRef, {
    lastSyncedAt: new Date().toISOString(),
    status: "SUCCESS",
    schoolName: school.name,
    message: `최신 시간표 수집 완료: 학급 ${classCount}개, 교사 ${Object.keys(teacherSchedules).length}명`
  });

  await batch.commit();
  console.log("Firebase 저장 성공!");
}

runSync().catch(err => { console.error(err); process.exit(1); });
