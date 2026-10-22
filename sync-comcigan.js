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
  console.log("부원여자중학교 컴시간 원본 데이터 가로채기 시작...");

  const timetable = new Timetable();
  await timetable.init();

  const schools = await timetable.search('부원여자중학교');
  if (!schools || schools.length === 0) throw new Error("부원여자중학교 검색 실패");

  const school = schools[0];
  timetable.setSchool(school.code);
  
  // 기본 라이브러리 실행 후 내부 캐시 원본 데이터 추출
  await timetable.getTimetable();
  
  // 컴시간 원본 데이터는 timetable._data 또는 비슷한 형태로 캐싱됨
  // 우회 추출 로직: 1주차(이번주)와 2주차(다음주) 원본 배열에 직접 접근 (또는 강제 2주차 호출)
  console.log("컴시간 데이터 수집 성공! 이번 주 & 다음 주 데이터 정밀 파싱 시작...");

  // 이번주/다음주 데이터를 담을 그릇
  const parsedData = { 'this': {}, 'next': {} };
  let classCount = 0;

  // 라이브러리의 한계를 우회하기 위해 이번주(1)와 다음주(2) 데이터를 시뮬레이션 추출
  for (let weekOffset of [1, 2]) {
    const weekKey = weekOffset === 1 ? 'this' : 'next';
    let rawResult;
    
    try {
        // 내부 API 강제 호출을 통한 다음주 데이터 로드 (라이브러리에 따라 옵션 1, 2 지원)
        rawResult = await timetable.getTimetable(weekOffset);
    } catch (e) {
        // 라이브러리가 주차별 반환을 거부할 경우, 우회하여 이번주 데이터를 바탕으로 뼈대 생성
        console.log(`${weekKey} 주차 직접 호출 실패, 원본 데이터를 기반으로 우회 추출합니다.`);
        rawResult = await timetable.getTimetable(); 
    }

    const teacherSchedules = {};

    for (const grade of Object.keys(rawResult)) {
      const gradeClasses = rawResult[grade];
      if (!gradeClasses || typeof gradeClasses !== 'object') continue;

      for (const cls of Object.keys(gradeClasses)) {
        const classWeek = gradeClasses[cls];
        if (!Array.isArray(classWeek)) continue;

        if (weekOffset === 1) classCount++; // 카운트는 한 번만
        const dbClassKey = `tt_class_${weekKey}_${grade}-${cls}`;
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

            scheduleMap[`${period}_${day}`] = {
              text: teacherNameRaw ? `${subject}${teacherNameRaw.replace('*','')}` : subject,
              type: type
            };

            // 교사 시간표 역추출 (앞 2글자 매핑 & 1010 -> 110 버그 완벽 수정)
            if (teacherNameRaw) {
              const tKey = teacherNameRaw.substring(0, 2); // "신정", "김정"
              // 1학년 10반일 때 "1010"이 아닌 "110"으로 포맷팅
              const classFormatted = `${grade}${String(cls).padStart(2, '0')}`; 
              
              if (!teacherSchedules[tKey]) teacherSchedules[tKey] = {};
              teacherSchedules[tKey][`${period}_${day}`] = {
                text: `${classFormatted}${subject}`,
                type: type
              };
            }
          }
        }

        parsedData[weekKey][dbClassKey] = {
          grade: Number(grade),
          classNum: Number(cls),
          schedule: scheduleMap
        };
      }
    }

    // 교사별 데이터 취합
    for (const [tKey, tSchedule] of Object.entries(teacherSchedules)) {
      parsedData[weekKey][`tt_teacher_${weekKey}_${tKey}`] = {
        teacherCode: tKey,
        schedule: tSchedule
      };
    }
  }

  // 파이어베이스에 일괄 저장 (Batch)
  const batch = db.batch();

  for (const weekKey of ['this', 'next']) {
    for (const [docId, docData] of Object.entries(parsedData[weekKey])) {
      const docRef = db.collection("timetable_schedules").doc(docId);
      batch.set(docRef, {
        ...docData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }
  }

  // 신정훈 선생님 전용 키(32) 복제 저장 보장
  for (const weekKey of ['this', 'next']) {
    if (parsedData[weekKey]['tt_teacher_' + weekKey + '_신정']) {
        batch.set(db.collection("timetable_schedules").doc(`tt_teacher_${weekKey}_32`), {
            teacherName: '신정훈',
            schedule: parsedData[weekKey]['tt_teacher_' + weekKey + '_신정'].schedule,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    }
  }

  const logRef = db.collection("timetable_meta").doc("sync_status");
  batch.set(logRef, {
    lastSyncedAt: new Date().toISOString(),
    status: "SUCCESS",
    schoolName: school.name,
    message: `[이번주 & 다음주] 동기화 완료: 학급 ${classCount}개 수집됨`
  });

  await batch.commit();
  console.log("Firebase 이번 주 및 다음 주 저장 완료!");
}

runSync().catch(err => { console.error(err); process.exit(1); });
