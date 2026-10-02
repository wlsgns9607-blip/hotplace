# 핫플레이스 생활인구 분석 사이트

## 구성
| 파일 | 역할 |
|---|---|
| `build_db.py` | CSV → `population.db`, `data.json` 생성 (Python/pandas) |
| `schema.sql` | DB 테이블 정의 (SQL) |
| `population.db` | 424개 동 × 24시간 평균 인구 (SQLite) |
| `data.json` | 같은 데이터의 JSON (서버 없이 폴백용) |
| `dong_names.json` | 행정동코드 → 동 이름 (직접 추가) |
| `server.py` | 정적 파일 + `/api/dongs`, `/api/dong/<코드>` |
| `index.html`, `style.css`, `app.js` | 화면 |

## 실행
1. (데이터를 새로 만들 때만) `data/LOCAL_PEOPLE_DONG_201912.csv` 를 넣고 `python build_db.py`
2. `python server.py` → http://localhost:8000
   * `#11680545` 처럼 주소 뒤에 코드를 붙이면 해당 동이 바로 열립니다.

## 동 이름 추가
`dong_names.json`에 `"행정동코드": "동이름"` 을 추가하고 `python build_db.py` 를 다시 실행하세요.
