import test from "node:test";
import assert from "node:assert/strict";
import { validateDraws, predictNext, generateAlternative, analyzeDraws, backtest } from "../src/model.mjs";

const sample = Array.from({length:14},(_,i)=>({
  date:new Date(Date.UTC(2026,0,1+i*7)).toISOString().slice(0,10),
  numbers:[1+i%10,12+i%10,23+i%10,34+i%10,45+i%10].map(n=>((n-1)%54)+1),
  clave:i%10
})).map(d=>({...d,numbers:[...new Set(d.numbers)].slice(0,5)}));

test("valida y ordena el historial por fecha",()=>{
  const valid = validateDraws([...sample].reverse());
  assert.equal(valid.length,sample.length);
  assert.ok(valid[0].date < valid.at(-1).date);
});

test("rechaza sorteos con números duplicados",()=>{
  assert.throws(()=>validateDraws([{date:"2026-01-01",numbers:[1,1,2,3,4],clave:2}]),/únicos/);
});

test("rechaza clave fuera de rango",()=>{
  assert.throws(()=>validateDraws([{date:"2026-01-01",numbers:[1,2,3,4,5],clave:10}]),/clave/);
});

test("la predicción contiene cinco números únicos válidos y una clave",()=>{
  const result = predictNext(validateDraws(sample));
  assert.equal(result.numbers.length,5);
  assert.equal(new Set(result.numbers).size,5);
  assert.ok(result.numbers.every(n=>Number.isInteger(n)&&n>=1&&n<=54));
  assert.ok(Number.isInteger(result.clave)&&result.clave>=0&&result.clave<=9);
});

test("backtesting evalúa sorteos posteriores sin incluirlos en el historial de predicción",()=>{
  const data = validateDraws(sample);
  const result = backtest(data,10);
  assert.equal(result.tests,data.length-10);
  assert.equal(result.rows[0].date,data[10].date);
  assert.ok(result.rows.every(r=>r.hits>=0&&r.hits<=5));
});

test("no produce filas si el historial no supera la ventana inicial",()=>{
  assert.equal(backtest(validateDraws(sample.slice(0,10)),10).tests,0);
});


test("rechaza fechas imposibles aunque tengan formato ISO",()=>{
  assert.throws(()=>validateDraws([{date:"2026-02-30",numbers:[1,2,3,4,5],clave:1}]),/fecha/);
});

test("el análisis devuelve frecuencias, pares/impares y rangos coherentes",()=>{
  const stats=analyzeDraws(validateDraws(sample));
  assert.equal(stats.draws,sample.length);
  assert.equal(stats.even+stats.odd,sample.length*5);
  assert.equal(stats.ranges.reduce((sum,r)=>sum+r.count,0),sample.length*5);
  assert.equal(stats.frequencies.length,54);
  assert.equal(stats.keyFrequencies.length,10);
});

test("las alternativas tienen cinco números únicos y clave válida",()=>{
  for(const mode of ["equilibrada","frecuencia","menos-frecuentes"]){
    const result=generateAlternative(validateDraws(sample),mode);
    assert.equal(result.numbers.length,5);
    assert.equal(new Set(result.numbers).size,5);
    assert.ok(result.numbers.every(n=>n>=1&&n<=54));
    assert.ok(result.clave>=0&&result.clave<=9);
  }
});

test("la referencia aleatoria del backtesting es la esperanza matemática",()=>{
  const result=backtest(validateDraws(sample),10);
  assert.equal(result.randomExpectedHits,25/54);
  assert.equal(result.randomExpectedKeyRate,0.1);
});
