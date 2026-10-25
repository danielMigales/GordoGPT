# GordoGPT

Laboratorio estadístico experimental e independiente para **El Gordo de la Primitiva**. Está pensado para explorar datos y evaluar modelos, no para prometer aciertos.

## Funciones

- Interfaz adaptable a móvil y escritorio.
- Modelo experimental con frecuencias históricas y transiciones entre sorteos consecutivos.
- Generador de combinaciones alternativas: universo completo, números más frecuentes o menos frecuentes.
- Estadísticas de pares/impares, distribución por tres rangos, frecuencia de los 54 números y de la clave (0–9).
- Backtesting walk-forward: cada predicción utiliza únicamente el historial anterior.
- Referencia matemática para comparar la media del modelo: una combinación aleatoria de cinco números de 54 tiene una esperanza de **25/54 ≈ 0,463 aciertos principales** por sorteo; la probabilidad de acertar la clave aleatoriamente es 10%.
- Importación JSON validada, almacenamiento local del historial en el navegador y exportación JSON/CSV.
- Pruebas automáticas con Node.js y despliegue con GitHub Actions a GitHub Pages.

## Datos y procedencia

El archivo `data/sorteos.json` contiene 42 sorteos de 2026 hasta el 18 de octubre de 2026. El archivo inicial es una muestra de trabajo: **no se ha verificado automáticamente cada registro con SELAE**. Que un sorteo supere la validación de formato no demuestra que sea un resultado oficial. Comprueba los datos con la [web oficial de Loterías y Apuestas del Estado](https://www.loteriasyapuestas.es/) antes de sacar conclusiones.

La aplicación no descarga todavía resultados oficiales automáticamente. Los datos importados se guardan en el almacenamiento local del navegador si este lo permite; no se transmiten a un servidor.

## Formato de importación

El archivo JSON debe ser una lista de objetos con fecha ISO, cinco números únicos de 1 a 54 y clave de 0 a 9:

```json
[
  {"date":"2026-01-04","numbers":[3,12,21,34,51],"clave":7}
]
```

La aplicación ordena los registros cronológicamente y rechaza fechas duplicadas, fechas de calendario imposibles, números repetidos o fuera de rango y claves inválidas.

## Ejecutar pruebas

Requiere Node.js 20 o superior:

```bash
npm test
```

## Publicar en GitHub Pages (sin Vercel)

1. Abre **Settings → Pages** en el repositorio.
2. En **Build and deployment → Source**, selecciona **GitHub Actions**.
3. En **Actions**, comprueba el workflow **Deploy GordoGPT to GitHub Pages** y el workflow de CI.
4. Cuando el despliegue finalice correctamente, abre https://danielmigales.github.io/GordoGPT/.

Los cambios en `main` disparan automáticamente las pruebas y el despliegue.

## Limitaciones importantes

Los sorteos son aleatorios. Frecuencias y transiciones describen el pasado y no implican una ventaja real para el futuro. Las combinaciones alternativas son aleatorias dentro del conjunto elegido. El backtesting es descriptivo y debe evaluarse en una muestra mayor, con datos oficiales y comparación estadística adecuada. No apuestes dinero que no puedas permitirte perder.
