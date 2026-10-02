"""핫플레이스 분석 서버: 정적 파일 + SQLite JSON API
실행: python server.py  ->  http://localhost:8000
"""
import json, sqlite3
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

DB = "population.db"
SERIES = "SELECT hour,total,weekday,weekend,male,female FROM hourly WHERE code=? ORDER BY hour"
GU_SERIES = """
    SELECT hourly.hour, AVG(hourly.total), AVG(hourly.weekday), AVG(hourly.weekend), AVG(hourly.male), AVG(hourly.female)
    FROM hourly 
    JOIN dong ON hourly.code = dong.code 
    WHERE dong.gu_code=? 
    GROUP BY hourly.hour 
    ORDER BY hourly.hour
"""
SEOUL_SERIES = """
    SELECT hourly.hour, AVG(hourly.total), AVG(hourly.weekday), AVG(hourly.weekend), AVG(hourly.male), AVG(hourly.female)
    FROM hourly 
    GROUP BY hourly.hour 
    ORDER BY hourly.hour
"""

class Handler(SimpleHTTPRequestHandler):
    def send_json(self, obj, status=200):
        body = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = urlparse(self.path).path
        con = sqlite3.connect(DB)
        try:
            if path == "/api/dongs":
                rows = con.execute("SELECT code,gu_name,name FROM dong ORDER BY code").fetchall()
                return self.send_json([{"code": c, "gu": g, "name": n} for c, g, n in rows])
            if path == "/api/seoul":
                rows = con.execute(SEOUL_SERIES).fetchall()
                if not rows:
                    return self.send_json({"error": "데이터가 없습니다."}, 404)
                keys = ["hour", "total", "weekday", "weekend", "male", "female"]
                return self.send_json({k: [round(r[i], 1) if k != "hour" else int(r[i]) for r in rows] for i, k in enumerate(keys)})
            if path.startswith("/api/dong/"):
                code = path.rsplit("/", 1)[1]
                rows = con.execute(SERIES, (code,)).fetchall()
                if not rows:
                    return self.send_json({"error": "존재하지 않는 동 코드입니다."}, 404)
                keys = ["hour", "total", "weekday", "weekend", "male", "female"]
                return self.send_json({k: [r[i] for r in rows] for i, k in enumerate(keys)})
            if path.startswith("/api/gu/"):
                gu_code = path.rsplit("/", 1)[1]
                rows = con.execute(GU_SERIES, (gu_code,)).fetchall()
                if not rows:
                    return self.send_json({"error": "존재하지 않는 자치구 코드입니다."}, 404)
                keys = ["hour", "total", "weekday", "weekend", "male", "female"]
                return self.send_json({k: [round(r[i], 1) for r in rows] for i, k in enumerate(keys)})
        finally:
            con.close()
        super().do_GET()

if __name__ == "__main__":
    print("http://localhost:8000 서버 실행 중 (종료: Ctrl+C)")
    ThreadingHTTPServer(("", 8000), Handler).serve_forever()
