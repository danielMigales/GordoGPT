# GordoGPT

Aplicación experimental para analizar El Gordo de la Primitiva.

## Estado actual
- Interfaz estática lista para GitHub Pages o Vercel.
- Modelo de transición tipo Markov con suavizado.
- Backtesting cronológico: cada predicción utiliza únicamente sorteos anteriores.
- Pruebas automáticas con Node.js.
- **El historial empieza vacío deliberadamente**: no se inventan resultados. Importa un JSON validado con sorteos oficiales antes de interpretar predicciones.

## Formato de datos

Cada sorteo debe tener:
```json
[
  {"date":"2026-01-04","numbers":[3,12,21,34,51],"clave":7}
]
```
Reglas: fecha ISO `YYYY-MM-DD`, cinco números enteros únicos entre 1 y 54, y clave entera entre 0 y 9. Orden cronológico ascendente recomendado. Comprueba los datos con una fuente oficial antes de importarlos.

## Ejecutar pruebas
Requiere Node.js 20 o superior:
```bash
npm test
```

## Publicar en Vercel
1. Entra en https://vercel.com/ e inicia sesión con GitHub.
2. Importa `danielMigales/GordoGPT`.
3. Framework preset: **Other**; build command vacío; output directory `.`.
4. Pulsa Deploy.

## Limitaciones
Las loterías son procesos aleatorios. Markov y las frecuencias históricas no garantizan aciertos ni demuestran una ventaja predictiva. El backtesting es descriptivo y debe compararse con una línea base aleatoria. No apuestes dinero que no puedas permitirte perder.
