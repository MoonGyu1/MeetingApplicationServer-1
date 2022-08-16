const convertSnakeToCamel = require('../lib/convertSnakeToCamel');

const saveUserOurteam = async (conn, params) => {
  await conn.query('INSERT INTO `user_ourteam` (user_id, gender, num, age, intro) VALUES (?, ?, ?, ?, ?);', [
    params.userId,
    params.gender,
    params.num,
    params.age,
    params.intro,
  ]);

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

  return convertSnakeToCamel.keysToCamel(newOurteamId);
};

const getUserByKakaoUid = async (conn, kakaoUid) => {
  const [row] = await conn.query(
    'SELECT id, kakao_uid, nickname, phone, gender, birthday, refresh_token FROM `user` WHERE kakao_uid = (?) and is_deleted = false;',
    [kakaoUid],
  );

  return convertSnakeToCamel.keysToCamel(row[0]);
};

const saveUser = async (conn, kakaoUid, properties, kakaoAccount) => {
  await conn.query('INSERT INTO `user` (kakao_uid, nickname, birthday, gender) VALUES (?, ?, ?, ?);', [
    kakaoUid,
    properties.nickname,
    !!kakaoAccount && !!kakaoAccount.birthday ? kakaoAccount.birthday : null,
    !!kakaoAccount && !!kakaoAccount.gender ? kakaoAccount.gender : null,
  ]);

  // 가장 마지막에 저장한 유저 id 가져오기 (== 마지막 auto_increment id)
  [newUserId] = await conn.query('SELECT LAST_INSERT_ID();');
  newUserId = newUserId[0]['LAST_INSERT_ID()'];

  const [row] = await conn.query(
    'SELECT id, kakao_uid, nickname, phone, gender, birthday, refresh_token FROM `user` WHERE id = (?) and is_deleted = false;',
    [newUserId],
  );

  return convertSnakeToCamel.keysToCamel(row[0]);
};

const getRefreshTokenByUserId = async (conn, userId) => {
  const [row] = await conn.query('SELECT refresh_token FROM `user` WHERE id = (?)', [userId]);

  // 토큰이 존재하지 않는 경우
  if (!row[0]) return 0;

  const result = row[0]['refresh_token'];
  return convertSnakeToCamel.keysToCamel(result);
};

const saveRefreshToken = async (conn, refreshToken, userId) => {
  await conn.query('UPDATE `user` SET refresh_token = (?) WHERE id = (?);', [refreshToken, userId]);
};

const getUserById = async (conn, userId) => {
  const [row] = await conn.query(
    'SELECT id, kakao_uid, nickname, phone, gender, birthday, refresh_token FROM `user` WHERE id = (?) and is_deleted = false;',
    [userId],
  );

  return convertSnakeToCamel.keysToCamel(row[0]);
};

const getIsMatchingByUserId = async (conn, userId) => {
  const [row] = await conn.query('SELECT * FROM `user_ourteam` WHERE user_id = (?) and is_deleted = false;', [userId]);
  if (!row[0]) return false;
  else return true;
};

module.exports = {
  saveUserOurteam,
  getUserByKakaoUid,
  saveUser,
  getRefreshTokenByUserId,
  saveRefreshToken,
  getUserById,
  getIsMatchingByUserId,
};
