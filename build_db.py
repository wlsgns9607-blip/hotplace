"""생활인구 CSV -> SQLite(population.db) + data.json 변환 (pandas 사용)
사용법: python build_db.py
"""
import json, sqlite3, datetime
import pandas as pd

CSV = "data/LOCAL_PEOPLE_DONG_201912.csv"
GU = {"11110":"종로구","11140":"중구","11170":"용산구","11200":"성동구","11215":"광진구",
      "11230":"동대문구","11260":"중랑구","11290":"성북구","11305":"강북구","11320":"도봉구",
      "11350":"노원구","11380":"은평구","11410":"서대문구","11440":"마포구","11470":"양천구",
      "11500":"강서구","11530":"구로구","11545":"금천구","11560":"영등포구","11590":"동작구",
      "11620":"관악구","11650":"서초구","11680":"강남구","11710":"송파구","11740":"강동구"}

df = pd.read_csv(CSV, encoding="utf-8-sig", index_col=False,   # 행 끝 쉼표 때문에 index_col=False 필수
                 dtype={"시간대구분": str, "행정동코드": str})
df["hour"] = df["시간대구분"].astype(int)
df["date"] = pd.to_datetime(df["기준일ID"].astype(str), format="%Y%m%d")
df["is_weekend"] = df["date"].dt.weekday >= 5          # 토(5)·일(6)

cols = list(df.columns)
male_cols, female_cols = cols[4:18], cols[18:32]        # 열 인덱스 [4]~[17], [18]~[31]
df["male"] = df[male_cols].sum(axis=1)
df["female"] = df[female_cols].sum(axis=1)

days = df["date"].nunique()
wk_days = df.loc[~df["is_weekend"], "date"].nunique()
we_days = df.loc[df["is_weekend"], "date"].nunique()
print(f"일수 {days} = 주중 {wk_days} + 주말 {we_days}")

g = df.groupby(["행정동코드", "hour"])
out = pd.DataFrame({
    "total":  g["총생활인구수"].sum() / days,
    "male":   g["male"].sum() / days,
    "female": g["female"].sum() / days,
    "weekday": df[~df["is_weekend"]].groupby(["행정동코드", "hour"])["총생활인구수"].sum() / wk_days,
    "weekend": df[df["is_weekend"]].groupby(["행정동코드", "hour"])["총생활인구수"].sum() / we_days,
}).round(1).reset_index().rename(columns={"행정동코드": "code"})

names = json.load(open("dong_names.json", encoding="utf-8"))
dongs = sorted(out["code"].unique())

con = sqlite3.connect("population.db")
con.executescript(open("schema.sql", encoding="utf-8").read())
con.executemany("INSERT INTO dong VALUES (?,?,?,?)",
    [(c, c[:5], GU.get(c[:5], c[:5]), names.get(c)) for c in dongs])
con.executemany("INSERT INTO hourly VALUES (?,?,?,?,?,?,?)",
    out[["code","hour","total","weekday","weekend","male","female"]].itertuples(index=False, name=None))
con.commit()

# 정적 배포/폴백용 JSON
data = {"period": "2019-12", "days": {"all": days, "weekday": wk_days, "weekend": we_days}, "dongs": {}}
for c, grp in out.groupby("code"):
    grp = grp.sort_values("hour")
    data["dongs"][c] = {
        "gu": GU.get(c[:5], c[:5]), "name": names.get(c),
        **{k: grp[k].tolist() for k in ["total","weekday","weekend","male","female"]}}
json.dump(data, open("data.json", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print("완료:", len(dongs), "개 동 / DB 행", len(out))
