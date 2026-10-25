# GordoGPT

Laboratorio estadístico experimental e independiente para **El Gordo de la Primitiva**. Explora resultados, evalúa métodos y documenta su rendimiento sin prometer premios.

## Funciones

- Estadísticas de pares/impares, tres rangos, frecuencia de los 54 números y frecuencia de la clave (0–9).
- Modelo experimental con frecuencia histórica y transiciones entre sorteos anteriores.
- Combinación alternativa aleatoria sobre el universo completo, los números más frecuentes o los menos frecuentes.
- Backtesting walk-forward: cada predicción usa solo sorteos anteriores.
- Referencia matemática: una selección aleatoria de cinco números de 54 tiene una esperanza de 25/54 ≈ 0,463 aciertos principales por sorteo; la probabilidad aleatoria de acertar la clave es 10%.
- Importación JSON validada, almacenamiento local del historial importado y exportación JSON/CSV.
- Script de verificación para descargar resultados desde las páginas oficiales de SELAE, validar el historial y actualizar los archivos de datos.
- Pruebas automáticas de JavaScript y del lector de resultados oficiales.

## Estado y procedencia de los datos

El historial incluido en `data/sorteos.json` contiene 42 sorteos de 2026, del 4 de enero al 18 de octubre. Los 42 registros se contrastaron manualmente con las páginas oficiales de SELAE, una por cada sorteo. La verificación está documentada en `data/metadata.json`.

Se probó la descarga desde GitHub Actions, pero SELAE respondió HTTP 403 a los runners alojados de GitHub. Para evitar presentar un proceso fallido como una automatización funcional, no hay una tarea programada activa. El historial actual está verificado manualmente; las actualizaciones futuras necesitan ejecutarse desde un entorno con acceso permitido a SELAE.

- [Resultados oficiales de El Gordo de la Primitiva](https://www.loteriasyapuestas.es/es/gordo-primitiva/resultados)
- [Workflow de despliegue](https://github.com/danielMigales/GordoGPT/actions)

### Ejecutar el verificador manualmente

En un equipo con Python 3.12 o superior y acceso permitido a la web de SELAE:

```bash
python scripts/update_results.py
```

El proceso consulta las páginas oficiales de resultados del año en curso. Valida fechas, cinco números distintos entre 1 y 54 y clave entre 0 y 9. Solo después de validar el historial completo escribe `data/sorteos.json` y `data/metadata.json`. Si falla la lectura, conserva los datos anteriores.

La aplicación es estática: después de una actualización local, hay que publicar los cambios en GitHub para que se reflejen en GitHub Pages. No se usa Vercel.

## Formato de importación manual

El JSON debe ser una lista de objetos con fecha ISO, cinco números únicos de 1 a 54 y clave de 0 a 9:

```json
[
  {"date":"2026-01-04","numbers":[7,8,22,32,45],"clave":4}
]
```

La aplicación ordena los registros cronológicamente y rechaza fechas duplicadas, fechas de calendario imposibles, números repetidos o fuera de rango y claves inválidas. La validación de formato no demuestra por sí sola que un resultado importado manualmente sea oficial.

## Pruebas

Requiere Node.js 20 o superior y Python 3.12 o superior para ejecutar todas las pruebas:

```bash
npm test
python -m unittest discover -s tests -p "test_*.py"
```

## Publicación en GitHub Pages

1. Abre **Settings → Pages** en el repositorio.
2. En **Build and deployment → Source**, selecciona **GitHub Actions**.
3. Comprueba el workflow **Deploy GordoGPT to GitHub Pages**.
4. La web publicada es https://danielmigales.github.io/GordoGPT/.

## Limitaciones

Los sorteos son aleatorios. Las frecuencias y transiciones describen el pasado y no implican ventaja futura. El backtesting es descriptivo y debe interpretarse con cautela. Ni el modelo ni una combinación garantizan premios. Juega responsablemente.
