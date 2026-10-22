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
      // 🔥 오직 'this(이번주)' 데이터만 갱신하도록 수정
      const classKeyThis = `tt_class_this_${grade}-${cls}`;
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

          scheduleMap[`${period}_${day}`] = {
            text: teacherNameRaw ? `${subject}${teacherNameRaw.replace('*','')}` : subject,
            type: type
          };

          if (teacherNameRaw) {
            const tKey = teacherNameRaw.substring(0, 2);
            const classFormatted = `${grade}${String(cls).padStart(2, '0')}`;
            
            if (!teacherSchedules[tKey]) teacherSchedules[tKey] = {};
            teacherSchedules[tKey][`${period}_${day}`] = {
              text: `${classFormatted}${subject}`,
              type: type
            };
          }
        }
      }

      // 이번주 학급 시간표만 저장 (다음주 덮어쓰기 로직 완전 삭제)
      batch.set(db.collection("timetable_schedules").doc(classKeyThis), {
        grade: Number(grade),
        classNum: Number(cls),
        schedule: scheduleMap,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }
  }

  // 이번주 교사 시간표만 저장
  for (const [tKey, tSchedule] of Object.entries(teacherSchedules)) {
    // 신정훈 선생님 매핑
    const docKeyThis = (tKey === '32' || tKey === '신정') ? 'tt_teacher_this_32' : `tt_teacher_this_${tKey}`;
    
    batch.set(db.collection("timetable_schedules").doc(docKeyThis), {
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
    message: `[이번주] 최신 시간표 수집 완료: 학급 ${classCount}개`
  });

  await batch.commit();
  console.log("Firebase 이번 주 데이터 정상 저장 완료!");
}

runSync().catch(err => { console.error(err); process.exit(1); });
