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

  const schools = await timetable.search('부원여자중학교');
  if (!schools || schools.length === 0) {
    throw new Error("부원여자중학교를 찾을 수 없습니다.");
  }

  const school = schools[0];
  console.log(`학교 지정 완료: ${school.name} (코드: ${school.code})`);
  timetable.setSchool(school.code);

  const result = await timetable.getTimetable();
  console.log("컴시간 데이터 수집 성공! 데이터 파싱 및 Firebase 저장 시작...");

  const batch = db.batch();
  const teacherSchedules = {};
  let totalClassCount = 0;

  // 학년별 객체 순회 (Object.keys 사용)
  for (const grade of Object.keys(result)) {
    const gradeClasses = result[grade];
    if (!gradeClasses || typeof gradeClasses !== 'object') continue;

    // 반별 객체 순회 (1반, 2반, 3반 ...)
    for (const cls of Object.keys(gradeClasses)) {
      const classWeek = gradeClasses[cls];
      if (!classWeek || !Array.isArray(classWeek)) continue;

      totalClassCount++;
      const classKey = `tt_class_current_${grade}-${cls}`;
      const docRef = db.collection("timetable_schedules").doc(classKey);

      const scheduleMap = {};

      // 요일 순회: classWeek[0]=월, [1]=화, [2]=수, [3]=목, [4]=금
      for (let day = 0; day < classWeek.length && day < 5; day++) {
        const dayPeriods = classWeek[day];
        if (!dayPeriods || !Array.isArray(dayPeriods)) continue;

        for (let pIdx = 0; pIdx < dayPeriods.length; pIdx++) {
          const item = dayPeriods[pIdx];
          if (!item) continue;

          const period = item.classTime || (pIdx + 1);
          const subject = item.subject || '';
          const teacher = item.teacher || '';

          // 1) 학급 시간표 저장 (예: 정보32, 수학17)
          scheduleMap[`${period}_${day}`] = {
            text: teacher ? `${subject}${teacher}` : subject,
            type: 'normal'
          };

          // 2) 교사별 시간표 자동 역추출 (예: 107정보)
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
        grade: Number(grade),
        classNum: Number(cls),
        schedule: scheduleMap,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }
  }

  console.log(`총 ${totalClassCount}개 학급 시간표 변환 완료!`);

  // 교사별 시간표 저장 (신정훈 선생님 매핑 포함)
  let teacherDocCount = 0;
  for (const [tName, tSchedule] of Object.entries(teacherSchedules)) {
    teacherDocCount++;
    // 신정훈 선생님 키 고정 매핑
    const docKey = (tName.includes('신정') || tName === '32') 
      ? 'tt_teacher_current_32' 
      : `tt_teacher_${encodeURIComponent(tName)}`;

    const tDocRef = db.collection("timetable_schedules").doc(docKey);
    batch.set(tDocRef, {
      teacherName: tName,
      schedule: tSchedule,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }

  // 신정훈 선생님 데이터가 별도 키로 존재할 경우 중복 보장
  if (teacherSchedules['신정훈']) {
    batch.set(db.collection("timetable_schedules").doc('tt_teacher_current_32'), {
      teacherName: '신정훈',
      schedule: teacherSchedules['신정훈'],
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }

  // 동기화 로그 기록
  const logRef = db.collection("timetable_meta").doc("sync_status");
  batch.set(logRef, {
    lastSyncedAt: new Date().toISOString(),
    status: "SUCCESS",
    schoolName: school.name,
    message: `정상 동기화 완료: ${totalClassCount}개 학급, ${teacherDocCount}명 교사 시간표 저장됨`
  });

  await batch.commit();
  console.log(`성공: 학급 ${totalClassCount}개, 교사 ${teacherDocCount}명 데이터가 Firebase에 저장되었습니다!`);
}

runSync().catch(err => {
  console.error("동기화 실패:", err);
  process.exit(1);
});
