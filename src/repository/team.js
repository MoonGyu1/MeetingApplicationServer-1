const convertSnakeToCamel = require('../lib/convertSnakeToCamel');

const saveUserOurteam = async (conn, params) => {
  // 1. 우리팀 정보 저장
  await conn.query(
    'INSERT INTO `user_ourteam` (user_id, gender, num, age, height, drink, intro) VALUES (?, ?, ?, ?, ?, ?, ?);',
    [params.userId, params.gender, params.num, params.age, params.height, params.drink, params.intro],
  );

  [newOurteamId] = await conn.query('SELECT LAST_INSERT_ID();');
  newOurteamId = newOurteamId[0]['LAST_INSERT_ID()'];

  // 배열 자료형 params 테이블에 저장
  await conn.query('INSERT INTO `ourteam_job` (ourteam_id, job) VALUES ?;', [params.job.map((j) => [newOurteamId, j])]);
  await conn.query('INSERT INTO `ourteam_university` (ourteam_id, university) VALUES ?;', [
    params.university.map((u) => [newOurteamId, u]),
  ]);
  await conn.query('INSERT INTO `ourteam_area` (ourteam_id, area) VALUES ?;', [
    params.area.map((a) => [newOurteamId, a]),
  ]);
  await conn.query('INSERT INTO `ourteam_day` (ourteam_id, day) VALUES ?;', [params.day.map((d) => [newOurteamId, d])]);
  await conn.query('INSERT INTO `ourteam_appearance` (ourteam_id, appearance) VALUES ?;', [
    params.appearance.map((a) => [newOurteamId, a]),
  ]);
  await conn.query('INSERT INTO `ourteam_mbti` (ourteam_id, mbti) VALUES ?;', [
    params.mbti.map((m) => [newOurteamId, m]),
  ]);
  await conn.query('INSERT INTO `ourteam_fashion` (ourteam_id, fashion) VALUES ?;', [
    params.fashion.map((f) => [newOurteamId, f]),
  ]);
  await conn.query('INSERT INTO `ourteam_role` (ourteam_id, role) VALUES ?;', [
    params.role.map((r) => [newOurteamId, r]),
  ]);

  // 2. 우리팀 선호 정보 저장
  await conn.query(
    'INSERT INTO `ourteam_preference` (ourteam_id, start_age, end_age, start_height, end_height, same_university) VALUES (?, ?, ?, ?, ?, ?);',
    [
      newOurteamId,
      params.preferenceAge[0],
      params.preferenceAge[1],
      params.preferenceHeight[0],
      params.preferenceHeight[1],
      params.sameUniversity,
    ],
  );

  // 배열 자료형 params를 테이블에 저장
  await conn.query('INSERT INTO `ourteam_preference_job` (ourteam_id, preference_job) VALUES ?;', [
    params.preferenceJob.map((j) => [newOurteamId, j]),
  ]);
  await conn.query('INSERT INTO `ourteam_preference_vibe` (ourteam_id, preference_vibe) VALUES ?;', [
    params.vibe.map((v) => [newOurteamId, v]),
  ]);

  return convertSnakeToCamel.keysToCamel(newOurteamId);
};

const getIsMatchingByUserId = async (conn, userId) => {
  const [row] = await conn.query('SELECT * FROM `user_ourteam` WHERE user_id = (?) and is_deleted = false;', [userId]);
  if (!row[0]) return false;
  else return true;
};

const getOurteamByOurteamId = async (conn, ourteamId) => {
  const [row] = await conn.query('SELECT * FROM `user_ourteam` WHERE id = (?) and is_deleted = false;', [ourteamId]);

  return convertSnakeToCamel.keysToCamel(row[0]);
};

// 현재의 경우 is_deleted=false인 경우 모두 신청 인원에 포함
const getMaleApplyNum = async (conn) => {
  const [row] = await conn.query(
    'SELECT COUNT(*) AS male_apply_num FROM `user_ourteam` WHERE gender=1 AND is_deleted=false;',
  );

  return convertSnakeToCamel.keysToCamel(row[0]['male_apply_num']);
};

const getFemaleApplyNum = async (conn) => {
  const [row] = await conn.query(
    'SELECT COUNT(*) AS female_apply_num FROM `user_ourteam` WHERE gender=2 AND is_deleted=false;',
  );

  return convertSnakeToCamel.keysToCamel(row[0]['female_apply_num']);
};

// 대기중인 팀 수 조회
// 현재 is_delete=false인 경우 모두 대기중인 팀으로 간주
const getWaitingTeam = async (conn) => {
  const [row] = await conn.query('SELECT COUNT(*) AS waiting_team FROM `user_ourteam` WHERE is_deleted=false;');

  return convertSnakeToCamel.keysToCamel(row[0]['waiting_team']);
};

const getOurteamIdByUserId = async (conn, userId) => {
  const [row] = await conn.query('SELECT id FROM `user_ourteam` WHERE user_id=(?) and is_deleted=false;', [userId]);

  // 매칭 진행중인 팀 정보가 없는 경우
  if (!row[0]) {
    return -1;
  }

  return convertSnakeToCamel.keysToCamel(row[0]['id']);
};

module.exports = {
  saveUserOurteam,
  getIsMatchingByUserId,
  getOurteamByOurteamId,
  getMaleApplyNum,
  getFemaleApplyNum,
  getWaitingTeam,
  getOurteamIdByUserId,
};
