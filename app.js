const $ = id => document.getElementById(id);
const fmt = n => Math.round(n).toLocaleString("ko-KR");
const H = Array.from({length: 24}, (_, i) => i);
let dongs = [];

let staticData = null;
async function loadList() {
  try { 
    const r = await fetch("/api/dongs"); 
    if (!r.ok) throw 0; 
    return await r.json(); 
  } catch(e) {
    if (!staticData) {
      const res = await fetch("data.json");
      staticData = await res.json();
    }
    return staticData.dongs;
  }
}

async function loadDong(code) {
  try { 
    const r = await fetch("/api/dong/" + code); 
    if (!r.ok) throw 0; 
    return await r.json(); 
  } catch(e) {
    if (!staticData) {
      const res = await fetch("data.json");
      staticData = await res.json();
    }
    return staticData.series[code];
  }
}

async function loadGu(guCode) {
  try { 
    const r = await fetch("/api/gu/" + guCode); 
    if (!r.ok) throw 0; 
    return await r.json(); 
  } catch(e) {
    if (!staticData) {
      const res = await fetch("data.json");
      staticData = await res.json();
    }
    return staticData.gus ? staticData.gus[guCode] : null;
  }
}

async function loadSeoul() {
  let seoulData = null;
  try { 
    const r = await fetch("/api/seoul"); 
    if (r.ok) seoulData = await r.json(); 
  } catch(e) {}
  
  if (!seoulData) {
    if (!staticData) {
      const res = await fetch("data.json");
      staticData = await res.json();
    }
    seoulData = staticData.seoul;
  }
  if (seoulData) renderSeoulChart(seoulData);
}

let seoulChartInstance = null;
function renderSeoulChart(d) {
  const avg = d.total.reduce((a, b) => a + b, 0) / d.total.length;
  const maxVal = Math.max(...d.total);
  const peakHour = d.hour[d.total.indexOf(maxVal)];
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
  const avg = d.total.reduce((a,b)=>a+b,0)/d.total.length;
  const maxVal = Math.max(...d.total);
  const peakHour = d.hour[d.total.indexOf(maxVal)];
  const minVal = Math.min(...d.total);
  const lowHour = d.hour[d.total.indexOf(minVal)];
  
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

function renderNotes(d, dongName) {
  const avg = d.total.reduce((a,b)=>a+b,0)/d.total.length;
  const maxVal = Math.max(...d.total);
  const peakHour = d.hour[d.total.indexOf(maxVal)];
  const wdAvg = d.weekday.reduce((a,b)=>a+b,0)/d.weekday.length;
  const weAvg = d.weekend.reduce((a,b)=>a+b,0)/d.weekend.length;
  const sumM = d.male.reduce((a,b)=>a+b,0);
  const sumF = d.female.reduce((a,b)=>a+b,0);
  
  const mainType = wdAvg > weAvg ? "오피스/상업형 (주중 우세)" : "주거/휴양형 (주말 우세)";
  const genderType = sumM > sumF ? "남성 우세" : "여성 우세";

  $("notes").innerHTML = `
    <p>📌 <b>[${dongName}] 주요 입지 특성:</b></p>
    <ul>
      <li><b>상권 유형:</b> ${mainType} (주중 평균 ${fmt(wdAvg)}명 vs 주말 ${fmt(weAvg)}명)</li>
      <li><b>핵심 피크 타임:</b> 하루 중 유동인구가 가장 몰리는 시간은 <b>${peakHour}시 (${fmt(maxVal)}명)</b>입니다.</li>
      <li><b>타겟 타겟층 비중:</b> 성별 분포는 <b>${genderType}</b> 특성을 가집니다. (남성 ${Math.round(sumM/(sumM+sumF)*100)}% : 여성 ${Math.round(sumF/(sumM+sumF)*100)}%)</li>
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
  renderNotes(d, name);
}

function updateDongSelect(guName) {
  const filtered = dongs.filter(d => d.gu === guName);
  const dongSel = $("dongSelect");
  dongSel.innerHTML = filtered.map(d => `<option value="${d.code}">${d.name}</option>`).join("");
  if (filtered.length > 0) {
    updateDong(filtered[0].code);
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

  await loadSeoul();
  
  if (gus.length > 0) {
    guSel.value = gus[0];
    updateDongSelect(gus[0]);
  }
}

window.addEventListener("DOMContentLoaded", init);
