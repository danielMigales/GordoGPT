import { validateDraws, predictNext, generateAlternative, analyzeDraws, backtest } from "./src/model.mjs";

const $ = id => document.getElementById(id);
const STORAGE_KEY = "gordogpt-history-v2";
let draws = [];
let bundledDraws = [];
const esc = value => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmtDate = date => new Intl.DateTimeFormat("es-ES",{dateStyle:"medium",timeZone:"UTC"}).format(new Date(date+"T12:00:00Z"));
const fmtPercent = value => new Intl.NumberFormat("es-ES",{maximumFractionDigits:1}).format(value)+"%";
const fmtNum = value => new Intl.NumberFormat("es-ES",{minimumFractionDigits:2,maximumFractionDigits:2}).format(value);

function balls(numbers, key = null) {
  return numbers.map(n=>`<span class="ball">${n}</span>`).join("") +
    (key === null ? "" : `<span class="key-label">Clave</span><span class="ball key-ball">${key}</span>`);
}
function saveHistory() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(draws)); return true; }
  catch { return false; }
}
function download(filename, content, type) {
  const url=URL.createObjectURL(new Blob([content],{type}));
  const a=document.createElement("a");
  a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
function renderRanks(target, items, keyName) {
  $(target).innerHTML = items.length ? items.map(item=>
    `<span class="rank-chip"><b>${item[keyName]}</b><small>${item.count} ${item.count===1?"vez":"veces"}</small></span>`
  ).join("") : '<p class="muted">Sin datos.</p>';
}
function renderBars(target, items, labelKey, maxValue) {
  $(target).innerHTML = items.length ? items.map(item=>`
    <div class="bar-row"><div class="bar-label"><span>${esc(item[labelKey])}</span><strong>${item.count}${item.percent===undefined?"":" · "+fmtPercent(item.percent)}</strong></div>
    <div class="bar-track"><span style="width:${maxValue?Math.max(0,Math.min(100,item.count/maxValue*100)):0}%"></span></div></div>`).join("") : '<p class="muted">Sin datos.</p>';
}
function renderAnalysis() {
  if (!draws.length) {
    ["even-stat","odd-stat","hot-key"].forEach(id=>$(id).textContent="—");
    $("even-bar").style.width="0%"; $("odd-bar").style.width="0%";
    $("range-stats").innerHTML='<p class="muted">Importa datos para ver el análisis.</p>';
    $("hot-numbers").innerHTML=$("cold-numbers").innerHTML=$("key-stats").innerHTML='<p class="muted">Sin datos.</p>';
    return;
  }
  const stats=analyzeDraws(draws);
  $("even-stat").textContent=`${stats.even} · ${fmtPercent(stats.evenPercent)}`;
  $("odd-stat").textContent=`${stats.odd} · ${fmtPercent(stats.oddPercent)}`;
  $("even-bar").style.width=stats.evenPercent+"%"; $("odd-bar").style.width=stats.oddPercent+"%";
  $("hot-key").textContent=`${stats.hottestKeys[0].key} · ${stats.hottestKeys[0].count} veces`;
  renderBars("range-stats",stats.ranges,"label",Math.max(...stats.ranges.map(x=>x.count)));
  renderRanks("hot-numbers",stats.hottest,"number");
  renderRanks("cold-numbers",stats.coldest,"number");
  renderBars("key-stats",stats.keyFrequencies.map(k=>({...k,label:String(k.key)})),"label",Math.max(...stats.keyFrequencies.map(x=>x.count)));
}
function render() {
  $("draw-count").textContent=draws.length;
  $("last-date").textContent=draws.length?fmtDate(draws.at(-1).date):"Sin datos";
  $("data-status").textContent=draws.length
    ? `Historial cargado: ${draws.length} sorteos con formato válido. La validación de formato no confirma que los resultados sean oficiales.`
    : "Historial vacío: importa resultados comprobados con la fuente oficial.";
  $("data-status").classList.toggle("status-ready",draws.length>0);
  if(draws.length>=2){
    const p=predictNext(draws);
    $("prediction").innerHTML=balls(p.numbers,p.clave);
    $("model-note").textContent=`Modelo experimental calculado con ${draws.length} sorteos. La combinación no tiene una probabilidad garantizada superior a otra.`;
  } else {
    $("prediction").innerHTML='<p class="muted">Se necesitan al menos dos sorteos validados.</p>';
    $("model-note").textContent="El modelo necesita historial suficiente para estimar transiciones.";
  }
  const result=backtest(draws,10);
  $("backtest-count").textContent=result.tests;
  $("bt-tests").textContent=result.tests;
  $("bt-mean").textContent=result.meanHits===null?"—":fmtNum(result.meanHits);
  $("bt-random").textContent=fmtNum(result.randomExpectedHits);
  $("bt-max").textContent=result.maxHits===null?"—":result.maxHits+"/5";
  const keyRate=result.tests?result.rows.filter(r=>r.keyHit).length/result.tests*100:null;
  $("bt-key-rate").textContent=keyRate===null?"—":fmtPercent(keyRate);
  $("bt-rows").innerHTML=result.rows.length
    ? result.rows.slice(-15).reverse().map(r=>`<tr><td>${esc(fmtDate(r.date))}</td><td>${esc(r.predicted.join(" · "))} <span class="muted">/ ${r.keyPredicted}</span></td><td>${esc(r.actual.join(" · "))} <span class="muted">/ ${r.keyActual}</span></td><td><strong>${r.hits}/5</strong>${r.keyHit?" + clave":""}</td></tr>`).join("")
    : '<tr><td colspan="4" class="muted">Se requieren al menos 11 sorteos para el backtesting inicial.</td></tr>';
  renderAnalysis();
}
async function loadInitial() {
  try {
    const response=await fetch("./data/sorteos.json",{cache:"no-store"});
    if(!response.ok) throw new Error("No se pudo leer data/sorteos.json");
    bundledDraws=validateDraws(await response.json());
    let stored=null;
    try { stored=localStorage.getItem(STORAGE_KEY); } catch {}
    if(stored){
      try { draws=validateDraws(JSON.parse(stored)); $("import-status").textContent="Se ha recuperado el historial guardado en este navegador."; }
      catch { draws=[...bundledDraws]; $("import-status").textContent="El historial local guardado no era válido; se ha cargado el archivo incluido."; }
    } else { draws=[...bundledDraws]; $("import-status").textContent="Historial incluido cargado. Los datos tienen formato válido, pero no están verificados automáticamente con SELAE."; }
  } catch(error) {
    $("import-status").textContent=`No se pudo cargar el historial inicial: ${error.message}`;
    draws=[];
  }
  render();
}
$("file-input").addEventListener("change",async event=>{
  const file=event.target.files?.[0];
  if(!file)return;
  try {
    const parsed=JSON.parse(await file.text());
    const validated=validateDraws(parsed);
    if(!validated.length) throw new Error("El archivo no contiene sorteos.");
    draws=validated;
    const saved=saveHistory();
    $("import-status").textContent=`Importación correcta: ${draws.length} sorteos. ${saved?"Historial guardado en este navegador.":"No se pudo guardar localmente; seguirá disponible mientras no cierres o recargues la página."}`;
    render();
  } catch(error) { $("import-status").textContent=`Error de importación: ${error.message}`; }
  finally { event.target.value=""; }
});
$("refresh-btn").addEventListener("click",()=>{ render(); $("import-status").textContent="Análisis actualizado con el historial actual."; });
$("alternative-btn").addEventListener("click",()=>{
  try {
    const alternative=generateAlternative(draws,$("alternative-mode").value);
    $("alternative").innerHTML=balls(alternative.numbers,alternative.clave);
  } catch(error) { $("alternative").textContent=error.message; }
});
$("export-json-btn").addEventListener("click",()=>{
  if(!draws.length){$("import-status").textContent="No hay sorteos para exportar.";return;}
  download("gordogpt-historial.json",JSON.stringify(draws,null,2),"application/json;charset=utf-8");
});
$("export-csv-btn").addEventListener("click",()=>{
  if(!draws.length){$("import-status").textContent="No hay sorteos para exportar.";return;}
  const lines=["fecha,n1,n2,n3,n4,n5,clave",...draws.map(d=>[d.date,...d.numbers,d.clave].join(","))];
  download("gordogpt-historial.csv","\uFEFF"+lines.join("\n"),"text/csv;charset=utf-8");
});
$("reset-btn").addEventListener("click",()=>{
  draws=[...bundledDraws];
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
  $("import-status").textContent="Se ha recuperado el historial incluido en la aplicación.";
  render();
});
loadInitial();
