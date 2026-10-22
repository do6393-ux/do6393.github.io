const Timetable = require('comcigan-parser');
const admin = require('firebase-admin');

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
  console.log("컴시간 데이터 수집 성공! 데이터 파싱 시작...");

  const batch = db.batch();
  const teacherSchedules = {};
  let totalClassCount = 0;

  // 전체 학년/반 순회
  for (const grade of Object.keys(result)) {
    const gradeClasses = result[grade];
    if (!gradeClasses || typeof gradeClasses !== 'object') continue;

    for (const cls of Object.keys(gradeClasses)) {
      const classWeek = gradeClasses[cls];
      if (!classWeek || !Array.isArray(classWeek)) continue;

      totalClassCount++;
      const classKeyThis = `tt_class_this_${grade}-${cls}`;
      const classKeyNext = `tt_class_next_${grade}-${cls}`;

      const scheduleMap = {};

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
            type: item.changed ? 'red' : 'normal'
          };

          // 2) 교사별 시간표 역추출 (버그 수정: 10반일 때 1010이 아닌 110으로 생성)
          if (teacher) {
            const classFormatted = `${grade}${String(cls).padStart(2, '0')}`; // 1학년 7반 -> 107, 1학년 10반 -> 110
            
            if (!teacherSchedules[teacher]) {
              teacherSchedules[teacher] = {};
            }
            teacherSchedules[teacher][`${period}_${day}`] = {
              text: `${classFormatted}${subject}`,
              type: item.changed ? 'red' : 'normal'
            };
          }
        }
      }

      // 이번주 및 다음주 학급 시간표 저장
      batch.set(db.collection("timetable_schedules").doc(classKeyThis), {
        grade: Number(grade),
        classNum: Number(cls),
        schedule: scheduleMap,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      batch.set(db.collection("timetable_schedules").doc(classKeyNext), {
        grade: Number(grade),
        classNum: Number(cls),
        schedule: scheduleMap,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }
  }

  // 교사별 시간표 저장 (ID 및 교사명 다중 키 보장 매핑)
  let teacherDocCount = 0;
  for (const [tCode, tSchedule] of Object.entries(teacherSchedules)) {
    teacherDocCount++;

    // 이번주 저장
    batch.set(db.collection("timetable_schedules").doc(`tt_teacher_this_${tCode}`), {
      teacherCode: tCode,
      schedule: tSchedule,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    // 다음주 저장
    batch.set(db.collection("timetable_schedules").doc(`tt_teacher_next_${tCode}`), {
      teacherCode: tCode,
      schedule: tSchedule,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    // 신정훈 선생님 전용 키 매핑
    if (tCode === '32' || tCode.includes('신정')) {
      batch.set(db.collection("timetable_schedules").doc('tt_teacher_this_32'), {
        teacherName: '신정훈',
        schedule: tSchedule,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      batch.set(db.collection("timetable_schedules").doc('tt_teacher_next_32'), {
        teacherName: '신정훈',
        schedule: tSchedule,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }
  }

  // 동기화 로그 기록
  const logRef = db.collection("timetable_meta").doc("sync_status");
  batch.set(logRef, {
    lastSyncedAt: new Date().toISOString(),
    status: "SUCCESS",
    schoolName: school.name,
    message: `정상 동기화 완료: ${totalClassCount}개 학급, ${teacherDocCount}명 교사 시간표가 수집되었습니다.`
  });

  await batch.commit();
  console.log(`성공: 학급 ${totalClassCount}개, 교사 ${teacherDocCount}명 데이터가 Firebase에 저장되었습니다!`);
}

runSync().catch(err => {
  console.error("동기화 실패:", err);
  process.exit(1);
});
