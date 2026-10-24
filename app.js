import { validateDraws, predictNext, backtest } from "./src/model.mjs";

const $ = id => document.getElementById(id);
let draws = [];
const esc = value => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmtDate = date => new Intl.DateTimeFormat("es-ES",{dateStyle:"medium",timeZone:"UTC"}).format(new Date(date+"T12:00:00Z"));

function balls(numbers, key = null) {
  return numbers.map(n=>`<span class="ball">${n}</span>`).join("") +
    (key === null ? "" : `<span class="key-label">Clave</span><span class="ball key-ball">${key}</span>`);
}
function render() {
  $("draw-count").textContent = draws.length;
  $("last-date").textContent = draws.length ? fmtDate(draws.at(-1).date) : "Sin datos";
  $("data-status").textContent = draws.length
    ? `Historial cargado: ${draws.length} sorteos validados. Verifica su procedencia oficial antes de usarlo.`
    : "Historial vacío: importa resultados oficiales verificados para habilitar el análisis.";
  $("data-status").style.borderColor = draws.length ? "#80e0c255" : "#f7d58b55";
  if (draws.length >= 2) {
    const prediction = predictNext(draws);
    $("prediction").innerHTML = balls(prediction.numbers,prediction.clave);
    $("model-note").textContent = `Estimación experimental basada en ${draws.length} sorteos. No implica mayor probabilidad real de ganar.`;
  } else {
    $("prediction").innerHTML = '<p class="muted">Se necesitan al menos dos sorteos validados.</p>';
    $("model-note").textContent = "El modelo no tiene historial suficiente para estimar transiciones.";
  }
  const result = backtest(draws,10);
  $("backtest-count").textContent = result.tests;
  $("bt-tests").textContent = result.tests;
  $("bt-mean").textContent = result.meanHits === null ? "—" : result.meanHits.toFixed(2);
  $("bt-max").textContent = result.maxHits === null ? "—" : result.maxHits;
  $("bt-rows").innerHTML = result.rows.length
    ? result.rows.slice(-12).reverse().map(r=>`<tr><td>${esc(fmtDate(r.date))}</td><td>${esc(r.predicted.join(" · "))} <span class="muted">/ ${r.keyPredicted}</span></td><td>${esc(r.actual.join(" · "))} <span class="muted">/ ${r.keyActual}</span></td><td><strong>${r.hits}/5</strong>${r.keyHit?" + clave":""}</td></tr>`).join("")
    : '<tr><td colspan="4" class="muted">Se requieren al menos 11 sorteos para el backtesting inicial.</td></tr>';
}
async function loadInitial() {
  try {
    const response = await fetch("./data/sorteos.json",{cache:"no-store"});
    if (!response.ok) throw new Error("No se pudo leer data/sorteos.json");
    draws = validateDraws(await response.json());
  } catch (error) {
    $("import-status").textContent = `No se pudo cargar el archivo inicial: ${error.message}`;
  }
  render();
}
$("file-input").addEventListener("change",async event=>{
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    draws = validateDraws(parsed);
    $("import-status").textContent = `Importación correcta: ${draws.length} sorteos. Se guardan solo durante esta sesión.`;
    render();
  } catch (error) {
    $("import-status").textContent = `Error de importación: ${error.message}`;
  } finally { event.target.value = ""; }
});
$("refresh-btn").addEventListener("click",render);
$("reset-btn").addEventListener("click",async()=>{
  draws = [];
  $("import-status").textContent = "Se ha restablecido el historial de esta sesión.";
  render();
});
loadInitial();
