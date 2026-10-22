const Comcigan = require('comcigan-parser');
const admin = require('firebase-admin');

if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.error("오류: FIREBASE_SERVICE_ACCOUNT 시크릿 키가 누락되었습니다.");
  process.exit(1);
}

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function runSync() {
  console.log("부원여자중학교 컴시간알리미 수집 시작...");

  const timetable = new Comcigan();
  await timetable.init();

  const schools = await timetable.searchSchool('부원여자중학교');
  if (schools.length === 0) {
    throw new Error("부원여자중학교를 찾을 수 없습니다.");
  }

  const school = schools[0];
  timetable.setSchool(school.code);

  const result = await timetable.getTimetable();
  const batch = db.batch();

  // 1~3학년 전체 학급 시간표 저장
  for (let grade = 1; grade <= 3; grade++) {
    if (!result[grade]) continue;
    for (let cls = 1; cls < result[grade].length; cls++) {
      const classData = result[grade][cls];
      if (!classData) continue;

      const classKey = `tt_class_current_${grade}-${cls}`;
      const docRef = db.collection("timetable_schedules").doc(classKey);

      const scheduleMap = {};
      for (let day = 0; day < 5; day++) {
        if (!classData[day]) continue;
        for (let period = 1; period <= 7; period++) {
          const item = classData[day][period - 1] || {};
          const subject = item.subject || '';
          const teacher = item.teacher || '';
          let type = 'normal';
          if (item.changed) type = 'red';

          scheduleMap[`${period}_${day}`] = {
            text: teacher ? `${subject}${teacher}` : subject,
            type: type
          };
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

  // 성공 로그 저장
  const logRef = db.collection("timetable_meta").doc("sync_status");
  batch.set(logRef, {
    lastSyncedAt: new Date().toISOString(),
    status: "SUCCESS",
    schoolName: school.name,
    message: "컴시간알리미 데이터가 정상적으로 수집되었습니다."
  });

  await batch.commit();
  console.log("시간표 동기화 완료!");
}

runSync().catch(err => {
  console.error("동기화 실패:", err);
  process.exit(1);
});
