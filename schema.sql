-- 핫플레이스 생활인구 DB 스키마 (SQLite)
DROP TABLE IF EXISTS hourly;
DROP TABLE IF EXISTS dong;

CREATE TABLE dong (
  code     TEXT PRIMARY KEY,   -- 행정동코드 8자리
  gu_code  TEXT NOT NULL,      -- 앞 5자리 (구)
  gu_name  TEXT NOT NULL,
  name     TEXT                -- 동 이름 (dong_names.json에 등록된 경우만)
);

CREATE TABLE hourly (
  code    TEXT NOT NULL REFERENCES dong(code),
  hour    INTEGER NOT NULL CHECK (hour BETWEEN 0 AND 23),
  total   REAL NOT NULL,       -- 하위목표1: 31일 평균 총생활인구
  weekday REAL NOT NULL,       -- 하위목표2: 주중 평균
  weekend REAL NOT NULL,       -- 하위목표2: 주말 평균
  male    REAL NOT NULL,       -- 하위목표3: 남성 평균
  female  REAL NOT NULL,       -- 하위목표3: 여성 평균
  PRIMARY KEY (code, hour)
);
CREATE INDEX idx_dong_gu ON dong(gu_code);
