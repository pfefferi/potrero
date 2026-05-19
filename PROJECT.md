# Potrero — Compañera de Campo para El Potrero

## Contexto

Aplicación web **100% offline-first** para la salida de campo a la Reserva Experimental El Potrero (Cátedra de Ecología General, UNLP). Los alumnos trabajan durante 3 días en 4 ambientes estudiando 5 grupos taxonómicos. La app reemplaza las planillas de papel, provee guías de identificación y toda la información de campo sin necesidad de conexión a internet.

## Origen de los datos

Todos los archivos originales están en:
```
/sdcard/SalidaPotrero/
```

| Archivo | Contenido | Uso en la app |
|---------|-----------|---------------|
| `Guia-El-Potrero (1).pdf` (77 páginas) | Catálogo completo: aves (200+), mamíferos, reptiles, flora | `src/data/species/` — extraer listas por grupo |
| `Aves y Hongos de El Potrero.pdf` (18 páginas) | Resumen de aves y hongos | Complemento al catálogo |
| `Clave generos de hormigas 2023 version celular.pdf` (25 págs) | Clave dicotómica de géneros de hormigas | **Ya implementada en setae.js** — linkear |
| `Clave Hongos El Potrero.pdf` (8 páginas) | Clave visual de hongos con fotos | `src/data/keys/` — abrir como PDF |
| `guia telas araña.pdf` (19 páginas) | Guía visual de tipos de telarañas | `src/data/keys/` — abrir como PDF |
| `Hormigas salida de campo 2023.pdf` | Guía complementaria de hormigas | Referencia |
| `Planilla ARAÑAS alumnos .docx` | Formulario de datos de arañas | `src/data/forms/spiders.json` |
| `Planilla HONGOS alumnos.docx` | Formulario de datos de hongos | `src/data/forms/fungi.json` |
| `Planilla aves alumnos 2024.docx` | Formulario de datos de aves | `src/data/forms/birds.json` |
| `Planilla va ambientales alumnos 2024.docx` | Formulario de variables ambientales | `src/data/forms/environment.json` |
| `Planillas hormigas alumnos 2024.docx` | Formulario de datos de hormigas | `src/data/forms/ants.json` |
| `Power explicacion potrero 2026.pptx` (34 slides) | Presentación del curso, metodología | `src/data/projects.json` |
| `cronograma detallado por grupos 2026 (1).doc` | Cronograma de 3 días, 4 grupos | `src/data/schedule.json` |
| `Plan de Trabajo_Anahí Vaccaro.pdf` | Plan de investigación posdoctoral | Contexto |
| `Proyecto Posdoc Vaccaro 2019-1-5.pdf` | Proyecto posdoctoral | Contexto |
| `Reserva-El-Potrero-Ano-2025.pdf` (64 MB) | Guía ampliada de la reserva | Catálogo de especies (versión nueva) |

## Estructura propuesta

```
potrero/
├── src/
│   ├── App.jsx                  ← Navegación por tabs, tema claro/oscuro
│   ├── App.css                  ← Temas reutilizados de setae.js
│   ├── index.css
│   ├── main.jsx
│   ├── components/
│   │   ├── Hoy.jsx              ← "Hoy": qué toca según cronograma + grupo
│   │   ├── Claves.jsx           ← 4 claves (hormiga→setae.js, otras→PDF)
│   │   ├── Guia.jsx             ← Catálogo de especies (buscar/filtrar)
│   │   ├── Planillas.jsx        ← Formularios digitales de datos
│   │   ├── Cronograma.jsx       ← Plan de 3 días con rotación de grupos
│   │   └── Proyectos.jsx        ← 7 proyectos de investigación
│   └── data/
│       ├── schedule.json        ← Cronograma + grupos + ambientes
│       ├── projects.json        ← 7 proyectos (hipótesis, métodos, datos)
│       ├── species/
│       │   ├── aves.json
│       │   ├── mamiferos.json
│       │   ├── reptiles.json
│       │   └── flora.json
│       ├── forms/
│       │   ├── ants.json        ← Schema del formulario de hormigas
│       │   ├── birds.json
│       │   ├── spiders.json
│       │   ├── fungi.json
│       │   └── environment.json
│       └── images/              ← Fotos de especies (del catálogo PDF)
├── public/
│   ├── pdf/                     ← PDFs embebidos (hongos, telarañas)
│   │   ├── clave-hongos.pdf
│   │   └── guia-telaranas.pdf
│   └── sw.js                    ← Service worker para offline
├── vite.config.js
└── package.json
```

## Decisiones de arquitectura

### 1. Solo en español
No hay traducción al inglés. Toda la UI, datos y contenido están en español.

### 2. Temas claro/oscuro
Reutilizar **exactamente** los mismos temas de setae.js para consistencia visual.
Copiar las variables CSS de `setae.js/src/App.css`:
```css
:root {
  --bg: #ffffff;
  --text: #1a1a1a;
  --card: #f5f5f5;
  --border: #e0e0e0;
  --primary: #2d7d46;
  --primary-light: #e8f5e9;
  --danger: #c62828;
}
.dark {
  --bg: #1a1a1a;
  --text: #e0e0e0;
  --card: #2a2a2a;
  --border: #3a3a3a;
  --primary: #4caf50;
  --primary-light: #1b3a1f;
  --danger: #ef5350;
}
```

### 3. Claves de identificación
- **Hormigas**: Si hay conexión → link a `https://pfefferi.github.io/Setae.js` con la clave de hormigas. Si no hay → mensaje "Sin conexión, la clave de hormigas no está disponible offline".
- **Hongos**: Embeber `Clave Hongos El Potrero.pdf` en `public/pdf/` y abrirlo con `<object>` o link de descarga.
- **Telarañas**: Igual que hongos — embeber PDF.
- **NO** recrear las claves como en setae.js, solo abrir los PDFs.

### 4. Planillas digitales
Cada planilla (hormigas, aves, arañas, hongos, variables ambientales) se convierte en un schema JSON que un `FormEngine` renderiza como formulario. El usuario llena campos tocando celdas. Al final del día, exporta todo como CSV.

Schema de ejemplo:
```json
{
  "id": "ants",
  "title": "Planilla de Hormigas",
  "fields": [
    { "key": "fecha", "label": "Fecha", "type": "date" },
    { "key": "ambiente", "label": "Ambiente", "type": "select", "options": ["Protegido", "Eucalipto joven", "Eucalipto intermedio", "Eucalipto maduro"] },
    { "key": "grupo", "label": "Grupo", "type": "select", "options": ["1", "2", "3", "4"] },
    { "key": "genero", "label": "Género", "type": "text" },
    { "key": "subfamilia", "label": "Subfamilia", "type": "text" },
    { "key": "abundancia", "label": "Abundancia", "type": "number" },
    { "key": "notas", "label": "Notas", "type": "textarea" }
  ]
}
```

### 5. Offline-first
- **Todo** el contenido va embebido como JSON/PDF/images estáticos.
- No hay llamadas a APIs externas.
- Service worker cachea todo para funcionamiento sin red.
- Deploy en GitHub Pages.

### 6. Relación con setae.js
setae.js vive en `~/pi-workspace/Projects/setae.js/` y ya tiene la clave de hormigas de El Potrero (`ant-genera-pampas`). La app potrero linkea a setae.js cuando hay internet para la clave de hormigas. No duplicar esa funcionalidad.

## Estado actual

- ✅ Proyecto scaffold con Vite
- ✅ `npm install` completado
- ✅ Todos los componentes creados: Cronograma, Claves, Guía, Planillas, Proyectos
- ✅ Datos extraídos de los archivos originales (.doc, .docx)
- ✅ PDFs embebidos (hongos, telarañas, aves)
- ✅ IndexedDB para almacenamiento offline de registros + fotos
- ✅ Captura de fotos desde cámara en cada registro
- ✅ Exportación CSV con conteo de fotos
- ✅ Comando `potrero` para dev/build/preview desde cualquier directorio
- ✅ Service worker para offline
- ❌ Datos de especies placeholder (Guía) — pendiente extracción del catálogo PDF

## Lo que necesita hacer el próximo agente

### Paso 1: Instalar dependencias
```bash
cd ~/pi-workspace/Projects/potrero
npm install
```

### Paso 2: Copiar temas de setae.js
```bash
# Leer src/App.css de setae.js para copiar variables CSS
cat ~/pi-workspace/Projects/setae.js/src/App.css
```

### Paso 3: Extraer datos de los PDFs
- Usar la skill `pdf` para extraer texto de los PDFs en `/sdcard/SalidaPotrero/`
- Extraer el cronograma del `.doc` → crear `schedule.json`
- Extraer los 7 proyectos del `.pptx` → crear `projects.json`
- Extraer las 5 planillas de los `.docx` → crear schemas en `forms/`
- Extraer especies del catálogo PDF → crear `species/`

### Paso 4: Crear componentes
Orden de prioridad:
1. **Cronograma** (fácil, datos ya están en contexto) — mostrar plan de 3 días
2. **Claves** (fácil) — links a setae.js + abrir PDFs
3. **Planillas** (medio) — formularios con schemas JSON
4. **Guía de especies** (difícil, mucho contenido) — catálogo searchable
5. **Proyectos** (fácil) — mostrar 7 proyectos

### Paso 5: Configurar deploy
- Agregar `base: '/potrero/'` a `vite.config.js`
- Crear `.github/workflows/deploy.yml` (copiar de setae.js)
- Push a nuevo repo `pfefferi/potrero`

### Paso 6: Copiar PDFs a public/
```bash
mkdir -p public/pdf
cp "/sdcard/SalidaPotrero/Clave Hongos El Potrero.pdf" public/pdf/clave-hongos.pdf
cp "/sdcard/SalidaPotrero/guia telas araña.pdf" public/pdf/guia-telaranas.pdf
```

## Contenido extraído hasta ahora

### Cronograma (3 días, 4 grupos, 4 ambientes)
Del cronograma detallado:
- **Lunes**: Llegada, colocación de trampas. Grupo 1: Protegido (hormigas), Grupo 2: Eucalipto joven, Grupo 3: Eucalipto intermedio, Grupo 4: Eucalipto maduro
- **Martes**: Muestreo completo. Rotaciones entre ambientes. Aves + arañas + hongos
- **Miércoles**: Último día. Aves + arañas. Retiro de trampas. Cierre.

### 7 Proyectos de investigación
1. Diversidad de hormigas en gradientes de eucalipto
2. Aves como indicadores de calidad ambiental
3. Tipos de telarañas según ambiente
4. Hongos como descomponedores
5. Variables microclimáticas
6. (Ver diapositivas del Power explicacion potrero 2026.pptx para detalles)
7. (Ver diapositivas)

### Ambientes
1. **Área protegida** — Bosque nativo
2. **Eucalipto joven** — Plantación reciente
3. **Eucalipto intermedio** — Plantación en desarrollo
4. **Eucalipto maduro** — Plantación establecida

### Grupos
4 grupos de alumnos rotando entre ambientes.

## Stack técnico
- React 19 + Vite (mismo que setae.js)
- Deploy: GitHub Pages (`pfefferi.github.io/potrero`)
- PWA con service worker para offline
- Sin dependencias pesadas — vanilla CSS, sin framework UI

## Notas importantes
- El usuario está en la salida de campo ahora — priorizar funcionalidad sobre perfección
- No inventar datos. Extraer todo de los archivos originales
- Mantener la app liviana — va a correr en celulares con datos limitados
- Todo en español
