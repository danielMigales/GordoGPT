export function validateDraws(input) {
  if (!Array.isArray(input)) throw new Error("El archivo debe contener una lista JSON de sorteos.");
  const seenDates = new Set();
  const draws = input.map((draw, i) => {
    if (!draw || typeof draw !== "object") throw new Error(`Sorteo ${i + 1}: formato inválido.`);
    if (typeof draw.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(draw.date) || Number.isNaN(Date.parse(draw.date))) {
      throw new Error(`Sorteo ${i + 1}: fecha inválida; usa YYYY-MM-DD.`);
    }
    if (seenDates.has(draw.date)) throw new Error(`Fecha duplicada: ${draw.date}.`);
    seenDates.add(draw.date);
    if (!Array.isArray(draw.numbers) || draw.numbers.length !== 5) throw new Error(`Sorteo ${draw.date}: deben ser cinco números.`);
    const numbers = draw.numbers.map(Number);
    if (numbers.some(n => !Number.isInteger(n) || n < 1 || n > 54) || new Set(numbers).size !== 5) {
      throw new Error(`Sorteo ${draw.date}: números únicos entre 1 y 54.`);
    }
    const clave = Number(draw.clave);
    if (!Number.isInteger(clave) || clave < 0 || clave > 9) throw new Error(`Sorteo ${draw.date}: clave entre 0 y 9.`);
    return { date: draw.date, numbers: [...numbers].sort((a,b)=>a-b), clave };
  });
  return draws.sort((a,b)=>a.date.localeCompare(b.date));
}

function normalized(counts, total, categories, alpha = 1) {
  return counts.map(c => (c + alpha) / (total + alpha * categories));
}

function rankedScores(draws) {
  const counts = Array(55).fill(0);
  const transition = Array.from({length:55}, () => Array(55).fill(0));
  let appearances = 0;
  for (let i = 0; i < draws.length; i++) {
    const current = draws[i].numbers;
    for (const n of current) { counts[n]++; appearances++; }
    if (i > 0) {
      for (const from of draws[i-1].numbers) {
        for (const to of current) transition[from][to]++;
      }
    }
  }
  const prior = Array.from({length:55}, (_,n) => n === 0 ? 0 : (counts[n] + 1) / (draws.length + 54));
  const last = draws.at(-1)?.numbers ?? [];
  const totalTransitions = Math.max(1, last.length * draws.length);
  const scores = Array.from({length:55}, (_,n) => {
    if (n === 0) return -1;
    const conditional = last.length
      ? last.reduce((sum, from) => sum + (transition[from][n] + 0.5) / (draws.length + 27), 0) / last.length
      : 0;
    return 0.65 * prior[n] + 0.35 * conditional;
  });
  return { scores, counts, appearances, prior, totalTransitions };
}

export function predictNext(draws) {
  if (!Array.isArray(draws) || draws.length < 2) throw new Error("Se necesitan al menos dos sorteos válidos para estimar transiciones.");
  const { scores, counts } = rankedScores(draws);
  const numbers = Array.from({length:54}, (_,i)=>i+1)
    .sort((a,b)=>scores[b]-scores[a] || counts[b]-counts[a] || a-b)
    .slice(0,5).sort((a,b)=>a-b);
  const keyCounts = Array(10).fill(0);
  const keyTransitions = Array.from({length:10},()=>Array(10).fill(0));
  draws.forEach((d,i)=>{
    keyCounts[d.clave]++;
    if (i>0) keyTransitions[draws[i-1].clave][d.clave]++;
  });
  const previousKey = draws.at(-1).clave;
  const key = Array.from({length:10},(_,k)=>k)
    .sort((a,b)=>{
      const sa = 0.6*(keyCounts[a]+1)/(draws.length+10)+0.4*(keyTransitions[previousKey][a]+0.5)/(draws.length+5);
      const sb = 0.6*(keyCounts[b]+1)/(draws.length+10)+0.4*(keyTransitions[previousKey][b]+0.5)/(draws.length+5);
      return sb-sa || a-b;
    })[0];
  return { numbers, clave:key };
}

export function backtest(draws, minHistory = 10) {
  if (!Number.isInteger(minHistory) || minHistory < 2) throw new Error("minHistory debe ser un entero >= 2.");
  const rows = [];
  for (let i = minHistory; i < draws.length; i++) {
    const prediction = predictNext(draws.slice(0,i));
    const actual = draws[i];
    const hits = prediction.numbers.filter(n=>actual.numbers.includes(n)).length;
    rows.push({ date:actual.date, predicted:prediction.numbers, actual:actual.numbers, keyPredicted:prediction.clave, keyActual:actual.clave, hits, keyHit:prediction.clave===actual.clave });
  }
  const meanHits = rows.length ? rows.reduce((s,r)=>s+r.hits,0)/rows.length : null;
  return { rows, meanHits, maxHits:rows.length?Math.max(...rows.map(r=>r.hits)):null, tests:rows.length };
}
