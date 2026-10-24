# GordoGPT

Aplicación experimental para analizar El Gordo de la Primitiva.

## Estado actual
- Interfaz estática preparada para publicarse en GitHub Pages.
- Modelo de transición tipo Markov con suavizado.
- Backtesting cronológico: cada predicción utiliza únicamente sorteos anteriores.
- Pruebas automáticas con Node.js.
- El archivo `data/sorteos.json` incluye 42 sorteos de 2026 (hasta el 18 de octubre de 2026). Contrasta siempre los resultados con la fuente oficial de SELAE antes de sacar conclusiones.

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

## Publicar en GitHub Pages
El sitio se publica con GitHub Actions, sin necesidad de Vercel.

1. En el repositorio, abre **Settings → Pages**.
2. En **Build and deployment → Source**, selecciona **GitHub Actions** y guarda.
3. Abre **Actions** y comprueba el workflow **Deploy GordoGPT to GitHub Pages**. Cuando termine correctamente, la web estará en https://danielmigales.github.io/GordoGPT/.
4. Los siguientes cambios en `main` se publicarán automáticamente.

El workflow prepara una carpeta estática con `index.html`, `styles.css`, `app.js`, `src/` y `data/`.

## Limitaciones
Las loterías son procesos aleatorios. Markov y las frecuencias históricas no garantizan aciertos ni demuestran una ventaja predictiva. El backtesting es descriptivo y debe compararse con una línea base aleatoria. No apuestes dinero que no puedas permitirte perder.
