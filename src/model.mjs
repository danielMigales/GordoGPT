export function validateDraws(input) {
  if (!Array.isArray(input)) throw new Error("El archivo debe contener una lista JSON de sorteos.");
  const seenDates = new Set();
  const draws = input.map((draw, i) => {
    if (!draw || typeof draw !== "object") throw new Error(`Sorteo ${i + 1}: formato inválido.`);
    if (typeof draw.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(draw.date)) {
      throw new Error(`Sorteo ${i + 1}: fecha inválida; usa YYYY-MM-DD.`);
    }
    const parsedDate = new Date(`${draw.date}T00:00:00Z`);
    if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0,10) !== draw.date) {
      throw new Error(`Sorteo ${i + 1}: fecha de calendario inválida.`);
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

function rankedScores(draws) {
  const counts = Array(55).fill(0);
  const transition = Array.from({length:55}, () => Array(55).fill(0));
  for (let i = 0; i < draws.length; i++) {
    const current = draws[i].numbers;
    for (const n of current) counts[n]++;
    if (i > 0) for (const from of draws[i-1].numbers) for (const to of current) transition[from][to]++;
  }
  const prior = Array.from({length:55}, (_,n) => n === 0 ? 0 : (counts[n] + 1) / (draws.length + 54));
  const last = draws.at(-1)?.numbers ?? [];
  const scores = Array.from({length:55}, (_,n) => {
    if (n === 0) return -1;
    const conditional = last.length
      ? last.reduce((sum, from) => sum + (transition[from][n] + 0.5) / (draws.length + 27), 0) / last.length
      : 0;
    return 0.65 * prior[n] + 0.35 * conditional;
  });
  return { scores, counts };
}

export function predictNext(draws) {
  if (!Array.isArray(draws) || draws.length < 2) throw new Error("Se necesitan al menos dos sorteos válidos para estimar transiciones.");
  const { scores, counts } = rankedScores(draws);
  const numbers = Array.from({length:54}, (_,i)=>i+1)
    .sort((a,b)=>scores[b]-scores[a] || counts[b]-counts[a] || a-b)
    .slice(0,5).sort((a,b)=>a-b);
  const keyCounts = Array(10).fill(0);
  const keyTransitions = Array.from({length:10},()=>Array(10).fill(0));
  draws.forEach((d,i)=>{ keyCounts[d.clave]++; if (i>0) keyTransitions[draws[i-1].clave][d.clave]++; });
  const previousKey = draws.at(-1).clave;
  const key = Array.from({length:10},(_,k)=>k).sort((a,b)=>{
    const sa = 0.6*(keyCounts[a]+1)/(draws.length+10)+0.4*(keyTransitions[previousKey][a]+0.5)/(draws.length+5);
    const sb = 0.6*(keyCounts[b]+1)/(draws.length+10)+0.4*(keyTransitions[previousKey][b]+0.5)/(draws.length+5);
    return sb-sa || a-b;
  })[0];
  return { numbers, clave:key };
}

export function generateAlternative(draws, mode = "equilibrada") {
  if (!Array.isArray(draws) || draws.length < 2) throw new Error("Se necesitan al menos dos sorteos para generar una combinación.");
  const { scores } = rankedScores(draws);
  const all = Array.from({length:54},(_,i)=>i+1);
  let pool = all;
  if (mode === "frecuencia") {
    pool = [...all].sort((a,b)=>scores[b]-scores[a] || a-b).slice(0,24);
  } else if (mode === "menos-frecuentes") {
    const counts = Array(55).fill(0);
    draws.forEach(d=>d.numbers.forEach(n=>counts[n]++));
    pool = [...all].sort((a,b)=>counts[a]-counts[b] || a-b).slice(0,30);
  }
  const shuffled = [...pool];
  for (let i=shuffled.length-1;i>0;i--) {
    const j=Math.floor(Math.random()*(i+1));
    [shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];
  }
  const numbers=shuffled.slice(0,5).sort((a,b)=>a-b);
  const key=Math.floor(Math.random()*10);
  return {numbers,clave:key,mode};
}

export function analyzeDraws(draws) {
  const valid = validateDraws(draws);
  const counts = Array(55).fill(0);
  const keyCounts = Array(10).fill(0);
  let even = 0;
  const ranges = [{"label":"1–18","count":0},{"label":"19–36","count":0},{"label":"37–54","count":0}];
  for (const draw of valid) {
    keyCounts[draw.clave]++;
    for (const n of draw.numbers) {
      counts[n]++;
      if (n%2===0) even++;
      ranges[Math.floor((n-1)/18)].count++;
    }
  }
  const totalNumbers=valid.length*5;
  const ranking=Array.from({length:54},(_,i)=>({number:i+1,count:counts[i+1],rate:valid.length?counts[i+1]/valid.length:0}))
    .sort((a,b)=>b.count-a.count || a.number-b.number);
  const keyRanking=keyCounts.map((count,key)=>({key,count,rate:valid.length?count/valid.length:0}))
    .sort((a,b)=>b.count-a.count || a.key-b.key);
  return {
    draws:valid.length,
    even,
    odd:totalNumbers-even,
    evenPercent:totalNumbers?even/totalNumbers*100:0,
    oddPercent:totalNumbers?(totalNumbers-even)/totalNumbers*100:0,
    ranges: ranges.map(r=>({...r,percent:totalNumbers?r.count/totalNumbers*100:0})),
    frequencies:ranking,
    keyFrequencies:keyRanking,
    hottest:ranking.slice(0,5),
    coldest:[...ranking].sort((a,b)=>a.count-b.count || a.number-b.number).slice(0,5),
    hottestKeys:keyRanking.slice(0,3),
    latest:valid.at(-1) ?? null
  };
}

export function backtest(draws, minHistory = 10) {
  if (!Array.isArray(draws) || !Number.isInteger(minHistory) || minHistory < 2) throw new Error("minHistory debe ser un entero >= 2.");
  const valid=validateDraws(draws);
  const rows = [];
  for (let i = minHistory; i < valid.length; i++) {
    const prediction = predictNext(valid.slice(0,i));
    const actual = valid[i];
    const hits = prediction.numbers.filter(n=>actual.numbers.includes(n)).length;
    rows.push({ date:actual.date, predicted:prediction.numbers, actual:actual.numbers, keyPredicted:prediction.clave, keyActual:actual.clave, hits, keyHit:prediction.clave===actual.clave });
  }
  const meanHits = rows.length ? rows.reduce((s,r)=>s+r.hits,0)/rows.length : null;
  return { rows, meanHits, maxHits:rows.length?Math.max(...rows.map(r=>r.hits)):null, tests:rows.length, randomExpectedHits:5*5/54, randomExpectedKeyRate:0.1 };
}
