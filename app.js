const $ = id => document.getElementById(id);
const fmt = n => Math.round(n).toLocaleString("ko-KR");
const H = Array.from({length: 24}, (_, i) => i);
let dongs = [];

let staticData = null;
async function getStaticData() {
  if (!staticData) {
    const res = await fetch("data.json");
    staticData = await res.json();
  }
  return staticData;
}

async function loadList() {
  try { 
    const r = await fetch("/api/dongs"); 
    if (!r.ok) throw 0; 
    return await r.json(); 
  } catch(e) {
    const data = await getStaticData();
    if (Array.isArray(data.dongs)) return data.dongs;
    return Object.entries(data.dongs).map(([code, item]) => ({
      code,
      gu: item.gu,
      name: item.name
    }));
  }
}

async function loadDong(code) {
  try { 
    const r = await fetch("/api/dong/" + code); 
    if (!r.ok) throw 0; 
    const res = await r.json();
    if (!res.hour) res.hour = H;
    return res;
  } catch(e) {
    const data = await getStaticData();
    const item = (data.series && data.series[code]) || (data.dongs && data.dongs[code]);
    if (!item) return null;
    return {
      hour: item.hour || H,
      total: item.total,
      weekday: item.weekday,
      weekend: item.weekend,
      male: item.male,
      female: item.female
    };
  }
}

async function loadGu(guCode) {
  try { 
    const r = await fetch("/api/gu/" + guCode); 
    if (!r.ok) throw 0; 
    const res = await r.json();
    if (!res.hour) res.hour = H;
    return res;
  } catch(e) {
    const data = await getStaticData();
    const item = data.gus ? data.gus[guCode] : null;
    if (!item) return null;
    return {
      hour: item.hour || H,
      total: item.total,
      weekday: item.weekday,
      weekend: item.weekend,
      male: item.male,
      female: item.female
    };
  }
}

async function loadSeoul() {
  let seoulData = null;
  try { 
    const r = await fetch("/api/seoul"); 
    if (r.ok) seoulData = await r.json(); 
  } catch(e) {}
  
  if (!seoulData) {
    const data = await getStaticData();
    seoulData = data.seoul;
  }
  if (seoulData) {
    if (!seoulData.hour) seoulData.hour = H;
    renderSeoulChart(seoulData);
  }
}

let seoulChartInstance = null;
function renderSeoulChart(d) {
  const hourArr = d.hour || H;
  const avg = d.total.reduce((a, b) => a + b, 0) / d.total.length;
  const maxVal = Math.max(...d.total);
  const peakHour = hourArr[d.total.indexOf(maxVal)] ?? d.total.indexOf(maxVal);
  const wdAvg = d.weekday.reduce((a, b) => a + b, 0) / d.weekday.length;
  const weAvg = d.weekend.reduce((a, b) => a + b, 0) / d.weekend.length;

  $("seoulKpi").innerHTML = `
    <div class="badge">🏛️ 서울시 동평균 유동인구 <b>${fmt(avg)}명</b></div>
    <div class="badge">🔥 서울시 최다 인구 시간대 <b>${peakHour}시 (${fmt(maxVal)}명)</b></div>
    <div class="badge">📅 서울시 주중 vs 주말 <b>${fmt(wdAvg)}명 vs ${fmt(weAvg)}명</b></div>
  `;

  if (seoulChartInstance) seoulChartInstance.destroy();
  seoulChartInstance = new Chart($("seoulChart"), {
    type: "line",
    data: {
      labels: H.map(h => h + "시"),
      datasets: [
        { label: "서울시 전체 평균", data: d.total, borderColor: "#3b82f6", backgroundColor: "rgba(59,130,246,0.1)", fill: true, tension: 0.3, borderWidth: 3 },
        { label: "주중 평균", data: d.weekday, borderColor: "#10b981", tension: 0.3, borderWidth: 2, borderDash: [4, 4] },
        { label: "주말 평균", data: d.weekend, borderColor: "#f59e0b", tension: 0.3, borderWidth: 2, borderDash: [4, 4] }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "top" },
        title: { display: false }
      },
      scales: {
        y: { beginAtZero: false, ticks: { callback: v => fmt(v) + "명" } }
      }
    }
  });

  $("seoulNotes").innerHTML = `
    <p>🔹 <b>서울시 전체 평균 인구 패러다임:</b> 서울시 전체 행정동 평균 유동인구는 <b>${peakHour}시</b>에 최고 <b>${fmt(maxVal)}명</b>에 달하며, 출근 시간대인 08시부터 유동인구가 급증한 뒤 18시 이후 주거지역으로 분산되는 양상을 보입니다.</p>
  `;
}

let lineChart, barChart, pieChart, guChart;

function renderKpis(d) {
  const hourArr = d.hour || H;
  const avg = d.total.reduce((a,b)=>a+b,0)/d.total.length;
  const maxVal = Math.max(...d.total);
  const peakHour = hourArr[d.total.indexOf(maxVal)] ?? d.total.indexOf(maxVal);
  const minVal = Math.min(...d.total);
  const lowHour = hourArr[d.total.indexOf(minVal)] ?? d.total.indexOf(minVal);
  
  $("kpiContainer").innerHTML = `
    <div class="badge">📊 24시간 평균 <b>${fmt(avg)}명</b></div>
    <div class="badge">🔥 피크 시간 <b>${peakHour}시 (${fmt(maxVal)}명)</b></div>
    <div class="badge">🌙 최저 시간 <b>${lowHour}시 (${fmt(minVal)}명)</b></div>
  `;
}

function renderLine(d) {
  if (lineChart) lineChart.destroy();
  lineChart = new Chart($("lineChart"), {
    type: "line",
    data: {
      labels: H.map(h => h + "시"),
      datasets: [{
        label: "총 생활인구",
        data: d.total,
        borderColor: "#4f46e5",
        backgroundColor: "rgba(79, 70, 229, 0.1)",
        fill: true,
        tension: 0.3,
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { ticks: { callback: v => fmt(v) + "명" } } }
    }
  });
}

function renderBar(d) {
  if (barChart) barChart.destroy();
  barChart = new Chart($("barChart"), {
    type: "bar",
    data: {
      labels: H.map(h => h + "시"),
      datasets: [
        { label: "주중", data: d.weekday, backgroundColor: "#3b82f6" },
        { label: "주말", data: d.weekend, backgroundColor: "#10b981" }
      ]
    },
    options: {
      responsive: true,
      scales: { y: { ticks: { callback: v => fmt(v) + "명" } } }
    }
  });
}

function renderPie(d) {
  const sumM = d.male.reduce((a,b)=>a+b,0);
  const sumF = d.female.reduce((a,b)=>a+b,0);
  if (pieChart) pieChart.destroy();
  pieChart = new Chart($("pieChart"), {
    type: "doughnut",
    data: {
      labels: ["남성", "여성"],
      datasets: [{
        data: [sumM, sumF],
        backgroundColor: ["#0284c7", "#ec4899"]
      }]
    },
    options: { responsive: true }
  });
}

async function renderGuComparison(d, guCode, guName) {
  const guData = await loadGu(guCode);
  if (!guData) return;

  if (guChart) guChart.destroy();
  guChart = new Chart($("guChart"), {
    type: "line",
    data: {
      labels: H.map(h => h + "시"),
      datasets: [
        {
          label: "선택 행정동",
          data: d.total,
          borderColor: "#4f46e5",
          backgroundColor: "rgba(79, 70, 229, 0.1)",
          tension: 0.3,
          borderWidth: 2
        },
        {
          label: guName + " 평균",
          data: guData.total,
          borderColor: "#94a3b8",
          backgroundColor: "rgba(148, 163, 184, 0.1)",
          borderDash: [5, 5],
          tension: 0.3,
          borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: "top" } },
      scales: { y: { ticks: { callback: v => fmt(v) + "명" } } }
    }
  });

  const dongAvg = d.total.reduce((a,b)=>a+b,0) / d.total.length;
  const guAvg = guData.total.reduce((a,b)=>a+b,0) / guData.total.length;
  const ratio = ((dongAvg / guAvg) * 100).toFixed(1);
  const diffWord = dongAvg >= guAvg ? "높습니다" : "낮습니다";

  $("guNotes").innerHTML = `
    <p>🏢 <b>${guName} 평균 대비 유동인구 비율:</b> 선택하신 행정동의 24시간 평균 유동인구는 <b>${fmt(dongAvg)}명</b>으로, ${guName} 전체 평균(<b>${fmt(guAvg)}명</b>) 대비 <b>${ratio}%</b> 수준(${diffWord}).</p>
  `;
}

function renderNotes(d, dongName, guName) {
  const hourArr = d.hour || H;
  const avg = d.total.reduce((a,b)=>a+b,0)/d.total.length;
  const maxVal = Math.max(...d.total);
  const peakHour = hourArr[d.total.indexOf(maxVal)] ?? d.total.indexOf(maxVal);
  const minVal = Math.min(...d.total);
  const lowHour = hourArr[d.total.indexOf(minVal)] ?? d.total.indexOf(minVal);

  // 새벽 1~6시 평균
  const dawnSlice = d.total.slice(1, 7);
  const dawnAvg = dawnSlice.reduce((a, b) => a + b, 0) / dawnSlice.length;

  // 오후 12~18시 평균
  const noonSlice = d.total.slice(12, 19);
  const noonAvg = noonSlice.reduce((a, b) => a + b, 0) / noonSlice.length;

  const wdAvg = d.weekday.reduce((a,b)=>a+b,0)/d.weekday.length;
  const weAvg = d.weekend.reduce((a,b)=>a+b,0)/d.weekend.length;
  const sumM = d.male.reduce((a,b)=>a+b,0);
  const sumF = d.female.reduce((a,b)=>a+b,0);
  
  const mainType = wdAvg > weAvg ? "오피스/상업형 (주중 우세)" : "주거/휴양형 (주말 우세)";
  const genderType = sumM > sumF ? "남성 우세" : "여성 우세";

  $("notes").innerHTML = `
    <div style="background: linear-gradient(135deg, rgba(79, 70, 229, 0.05), rgba(59, 130, 246, 0.05)); border: 1px solid rgba(79, 70, 229, 0.2); border-radius: 12px; padding: 20px; margin-bottom: 16px;">
      <h3 style="color: #4f46e5; margin: 0 0 12px; font-size: 1.15rem; display: flex; align-items: center; gap: 8px;">
        <span>🎯</span> [하위목표 1 결과 분석] ${guName} ${dongName} 핫플레이스 방문 전략 가이드
      </h3>
      
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px; margin-bottom: 14px;">
        <div style="background: white; padding: 14px 16px; border-radius: 8px; border-left: 4px solid #3b82f6; box-shadow: 0 2px 4px rgba(0,0,0,0.03);">
          <b style="color: #1e40af; font-size: 0.95rem;">🌙 새벽 1~6시 인구 분석 (상주 거주자 추정)</b>
          <p style="margin: 6px 0 0; color: #475569; font-size: 0.88rem; line-height: 1.5;">
            새벽 평균 <b>${fmt(dawnAvg)}명</b> (최저 <b>${lowHour}시: ${fmt(minVal)}명</b>)을 기록합니다.<br>
            이 시간대는 외부 유동인구가 거의 없으므로 <b>${dongName}에 실제 거주하는 상주인구</b>로 추정됩니다.
          </p>
        </div>

        <div style="background: white; padding: 14px 16px; border-radius: 8px; border-left: 4px solid #ef4444; box-shadow: 0 2px 4px rgba(0,0,0,0.03);">
          <b style="color: #b91c1c; font-size: 0.95rem;">🔥 12~18시 최대 인구 밀집 (오후 피크 타임)</b>
          <p style="margin: 6px 0 0; color: #475569; font-size: 0.88rem; line-height: 1.5;">
            오후 평균 <b>${fmt(noonAvg)}명</b>, 최고 <b>${peakHour}시(${fmt(maxVal)}명)</b>로 치솟습니다.<br>
            상주인구 대비 대규모 외부 인파가 집중 유입되는 핵심 혼잡 시간대입니다.
          </p>
        </div>
      </div>

      <div style="background: white; padding: 14px 16px; border-radius: 8px; border-left: 4px solid #10b981; box-shadow: 0 2px 4px rgba(0,0,0,0.03);">
        <b style="color: #065f46; font-size: 0.95rem;">💡 실전 방문 &amp; 약속 골든타임 가이드</b>
        <p style="margin: 6px 0 0; color: #334155; font-size: 0.88rem; line-height: 1.6;">
          • <b>브런치/카페 약속:</b> 인파가 본격 몰리기 직전인 <b>10~11시쯤</b> 방문하면 웨이팅 없이 여유로운 이용이 가능합니다.<br>
          • <b>저녁 모임 약속:</b> 퇴근 및 쇼핑 인파가 점차 빠져나가는 <b>19시 이후</b>에 잡으면 혼잡도가 크게 낮아져 쾌적합니다.
        </p>
      </div>
    </div>

    <p>📌 <b>[${dongName}] 기본 입지 속성:</b></p>
    <ul>
      <li><b>상권 유형:</b> ${mainType} (주중 평균 ${fmt(wdAvg)}명 vs 주말 ${fmt(weAvg)}명)</li>
      <li><b>피크 및 최저:</b> 24시간 중 최고점은 <b>${peakHour}시 (${fmt(maxVal)}명)</b>, 최저점은 <b>${lowHour}시 (${fmt(minVal)}명)</b>입니다.</li>
      <li><b>성별 비중:</b> 성별 분포는 <b>${genderType}</b> 특성을 보입니다. (남성 ${Math.round(sumM/(sumM+sumF)*100)}% : 여성 ${Math.round(sumF/(sumM+sumF)*100)}%)</li>
    </ul>
  `;
}

async function updateDong(code) {
  const d = await loadDong(code);
  if (!d) return;
  const target = dongs.find(x => x.code === code);
  const name = target ? target.name : "";
  const guCode = code.substring(0, 5);
  const guName = target ? target.gu : "";

  renderKpis(d);
  renderLine(d);
  renderBar(d);
  renderPie(d);
  renderGuComparison(d, guCode, guName);
  renderNotes(d, name, guName);
}

function updateDongSelect(guName, targetDongCode = null) {
  const filtered = dongs.filter(d => d.gu === guName);
  const dongSel = $("dongSelect");
  dongSel.innerHTML = filtered.map(d => `<option value="${d.code}">${d.name}</option>`).join("");
  
  if (targetDongCode && filtered.some(d => d.code === targetDongCode)) {
    dongSel.value = targetDongCode;
    updateDong(targetDongCode);
  } else if (filtered.length > 0) {
    updateDong(filtered[0].code);
  }
}

function selectApgujeong() {
  const apgu = dongs.find(d => d.name.includes("압구정"));
  if (apgu) {
    $("guSelect").value = apgu.gu;
    updateDongSelect(apgu.gu, apgu.code);
    window.scrollTo({ top: $("kpiContainer").offsetTop - 120, behavior: "smooth" });
  }
}

async function init() {
  dongs = await loadList();
  
  // Extract unique Gus
  const gus = [...new Set(dongs.map(d => d.gu))];
  const guSel = $("guSelect");
  guSel.innerHTML = gus.map(g => `<option value="${g}">${g}</option>`).join("");
  
  guSel.addEventListener("change", e => updateDongSelect(e.target.value));
  $("dongSelect").addEventListener("change", e => updateDong(e.target.value));

  const quickBtn = $("quickApgujeongBtn");
  if (quickBtn) {
    quickBtn.addEventListener("click", selectApgujeong);
  }

  await loadSeoul();
  
  // Default to Apgujeong if available, otherwise first gu
  const apgu = dongs.find(d => d.name.includes("압구정"));
  if (apgu) {
    guSel.value = apgu.gu;
    updateDongSelect(apgu.gu, apgu.code);
  } else if (gus.length > 0) {
    guSel.value = gus[0];
    updateDongSelect(gus[0]);
  }
}

window.addEventListener("DOMContentLoaded", init);
