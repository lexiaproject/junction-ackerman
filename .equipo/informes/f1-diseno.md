# F1 · Diseño visual y sistema de diseño (Relevo)

Rol: diseñador visual / sistema de diseño. Fase de diagnóstico, solo lectura (no se ha tocado código).
Fecha: 14/11/2026. Servidor local http://localhost:3000 sin clave de Gemini. Mundo propio: `w=dzn7k3q9w2`.

## Cómo lo he revisado
- Capturas con Playwright en un contexto de navegador propio (para no chocar con otros agentes que usaban la misma
  ventana) a 1440x900 y 390x844; también medí 1920x1080. Moví el reloj con `POST /api/relevo/act {type:"clock"}`.
- Momentos capturados: 0 08:10 (emparejamiento), 27 20:00, 40 21:10 (copiloto), 47 03:15 / 08:30 / 08:41, 48 11:30,
  54 10:10, 55 12:00, 56 09:02 (Marta), 57 21:12 (crisis), 60 08:30, 62 12:00 (cierre).
- Estados de error: bloqueé todas las llamadas a `/api/relevo/**`. Estado de carga: retrasé las llamadas 8 s.
- Medí en la página: escala real del `Fit`, solapes de los puntos de la línea de tiempo, tamaños de letra calculados,
  estilos calculados (`getComputedStyle`) y contrastes WCAG con la fórmula oficial.
- Las capturas están en `.claude/.playwright-mcp/` (`d-*.png` = 1440, `m-*.png` = 390). Ojo: esa carpeta **no está en
  `.gitignore`** (sale como "sin seguimiento" en git); no la he borrado porque otros agentes también escriben ahí.

## Resumen
La dirección visual está bien llevada y se nota que hay una especificación: los colores base, las tarjetas de 20 px, los
botones en pastilla, el naranja de ayuda (no rojo), las etiquetas de nivel siempre con texto y la tipografía Space
Grotesk + Inter se respetan. No parece una plantilla. Los problemas están en tres sitios:
1. **La vista de demo en pantalla grande**: los teléfonos y la clínica se dibujan al 45 % y su texto queda en 5-6 px.
   El jurado lee bien la capa de explicación, pero no el producto.
2. **No hay estado de error**: si falla la red, todas las vistas se quedan en "Loading…" para siempre.
3. **Detalles "a medio hacer" que se ven en la demo**: la línea de tiempo tiene la mitad de los puntos encima de otros,
   el registro del motor enseña claves internas en castellano (`paseo_juntos`, `movilidad`), los gráficos tienen
   marcas del eje con números raros (3.03, 1.2, −0.63), y al final de la demo el botón principal se queda apagado.
También hay un fallo de CSS que afecta a todo: los estilos `.rv-*` y una regla global para `<p>` ganan a las clases de
Tailwind, así que varios hover, colores y `truncate` no funcionan (verificado midiendo los estilos).

---

## Tokens

### Lo que hay definido (`src/app/globals.css:21-37`)
| Token | Valor | Uso |
|---|---|---|
| `--color-rv-bg` | `#F5F6F3` | fondo |
| `--color-rv-card` | `#FFFFFF` | tarjetas (**no se usa**: el código escribe `#fff` / `bg-white` directamente) |
| `--color-rv-ink` | `#16211C` | texto principal |
| `--color-rv-ink2` | `#55635D` | texto secundario (6.31:1 sobre blanco, 5.82:1 sobre el fondo: bien) |
| `--color-rv-teal` | `#0E6B5C` | principal (blanco encima: 6.41:1) |
| `--color-rv-teal-deep` | `#0A5247` | hover del principal |
| `--color-rv-sage` | `#E7F0EC` | fondo seleccionado |
| `--color-rv-notice` / `-notice-ink` | `#EAF0FA` / `#1E2F4D` | avisos amables (11.69:1) |
| `--color-rv-help` | `#9A3412` | ayuda (7.31:1) |
| `--color-rv-line` | `#E2E6E1` | bordes |
| `--color-rv-l0..l3` | `#6B7280 #B45309 #C2410C #B91C1C` | niveles (todos ≥ 4.8:1 sobre blanco) |
| `--font-rv-display` / `--font-rv-body` | Space Grotesk / Inter | tipografías (la clase `font-rv-display` existe pero **no se usa nunca**) |

Componentes en `src/app/relevo/relevo.css`: `.rv-btn` (44 px, pastilla), `-lg` (52 px), `-sm` (36 px), `.rv-card`
(radio 20 + sombra en 3 capas), `.rv-notice` (radio 20), `.rv-chip`, `.rv-input` (radio 14), `.rv-level`.

### Lo que se usa sin token (medido con grep sobre `src/app/relevo`)
**Colores sueltos** (≈ 45 valores hex distintos fuera de tokens, sin contar los avatares). Agrupados por función, con
el token que propongo para cada grupo:

| Grupo | Valores encontrados | Dónde (ejemplos) | Token propuesto |
|---|---|---|---|
| Fondo "simulado" (arena) | `#F1EDE4` + texto `#6B5A2E` (5.75:1) | `demo/page.tsx:128,147`, `ClinicWeb.tsx:79`, `MenteeApp.tsx:396` | `--color-rv-sand: #F1EDE4`, `--color-rv-sand-ink: #6B5A2E` |
| Fondo suave de ayuda | `#FDF0E6`, `#FDF3EE`, `#FDF0EE` (+ texto `#8A3A12`) | `ClinicWeb.tsx:157,343,372`, `relevo.css:99` | `--color-rv-help-soft: #FDF0E6` (uno solo) |
| Fondo de clínica | `#F3F5F2` (casi igual que rv-bg `#F5F6F3`) | `ClinicWeb.tsx:63,492` | usar `bg-rv-bg` |
| Hover / cabecera tabla | `#FAFBF9`, `#FBFCFA` | `ClinicWeb.tsx:137,144,509`, `page.tsx:21`, `relevo.css:83` | `--color-rv-subtle: #FAFBF9` |
| Pistas y rejilla | `#EEF1EE`, `#E7EBE7` | `charts.tsx:67,131`, `demo/page.tsx:259` | `--color-rv-track: #EEF1EE` |
| Bordes fuertes / interruptor apagado | `#CDD3CE`, `#CFD5CF`, `#D5DBD6`, `#C3CAC5`, `#C7CEC8` | `demo/page.tsx:141`, `kit.tsx:259`, `MenteeApp.tsx:389,450,506`, `relevo.css:82,215` | `--color-rv-line-strong: #CDD3CE` |
| Gris terciario (texto pequeño) | `#7B8782` (3.73:1), `#7C8883` (3.68:1), `#9AA39E` (2.59:1) | `charts.tsx:68,80,94`, `MentorApp.tsx:147`, `MenteeApp.tsx:389` | `--color-rv-ink3: #66726C` (5.01:1 blanco, 4.62:1 fondo) |
| Verde "conectado" | `#2F8A5B` (un quinto verde) | `MenteeApp.tsx:389` | usar `bg-rv-teal` |
| Colores repetidos a mano | `#0E6B5C` ×10, `#16211C` ×5, `#B91C1C`, `#C2410C`… | `charts.tsx`, `ClinicWeb.tsx:111,114,121,131,250`, `demo/page.tsx:31,204,360` | `var(--color-rv-teal)` etc. |
| Áreas de los gráficos | `#3B6EA8 #0E6B5C #8A5AA8 #B7791F #8D99A0` | `demo/page.tsx:31` | dejar como paleta de datos, pero `#8D99A0` → `#7D8A91` (ver D-07) |
| Marco del teléfono | `#1B2420`, `#3A4540` | `kit.tsx:569,572` | aceptable (es el aparato, no la interfaz) |

**Escala tipográfica real: 20 tamaños distintos** (`text-[..px]`, recuento de usos):
13 px ×56 · 12.5 ×30 · 12 ×26 · 14 ×19 · 16 ×13 · 13.5 ×13 · 17 ×10 · 15 ×9 · 28 ×8 · 11.5 ×7 · 30 ×5 · 20 ×5 ·
14.5 ×4 · 26 ×3 · 24 ×3 · 22 ×3 · 19 ×2 · 11 ×2 · 60 ×1 · 44 ×1 (+ 10 y 9.5 dentro de los SVG).
Los títulos `h1` del móvil van de 24 a 30 px según la pantalla (`MenteeApp.tsx:85` 24, `:513` 30, `:522` 28, `:536` 26).

Escala propuesta (8 pasos, sustituye a los 20):
| Token (`@theme`) | Valor | Sustituye a |
|---|---|---|
| `--text-rv-cap` | 12px / 1.35 | 11, 11.5, 12, 12.5 |
| `--text-rv-sm` | 13px / 1.4 | 13, 13.5 |
| `--text-rv-base` | 15px / 1.45 | 14, 14.5, 15 (en la clínica se puede dejar 14) |
| `--text-rv-lead` | 17px / 1.4 | 16, 17 |
| `--text-rv-h3` | 20px / 1.2 | 19, 20, 22 |
| `--text-rv-h2` | 24px / 1.15 | 24, 26 |
| `--text-rv-h1` | 28px / 1.1 | 28, 30 |
| `--text-rv-hero` | 44px → 60px | portada |

**Radios** (mismo papel, valores distintos): tarjeta 20 (`.rv-card`), puerta de portada 22 (`page.tsx:21`), burbuja 20
(`kit.tsx:225`), paneles internos 16 (`rounded-2xl` ×14) y 12 (`rounded-xl` ×7), input 14, elementos de menú 8
(`rounded-lg` ×7), hoja inferior 26 (`kit.tsx:258`), etiqueta del deslizador 6 (`rounded-md`).
Propuesta: `--radius-rv-card: 20px` (tarjeta, aviso, burbuja, puerta de portada), `--radius-rv-inner: 14px` (input y
paneles dentro de una tarjeta: sustituye 16 y 12), `--radius-rv-sm: 8px` (elementos de menú), `--radius-rv-sheet: 26px`.

**Sombras**: 5 sombras escritas a mano (tarjeta `relevo.css:114`, botón principal `:71`, botón grabar `kit.tsx:464`,
marco clínica `demo/page.tsx:130`, teléfono `kit.tsx:569`). Propuesta: `--shadow-rv-card` (la de `.rv-card`) y
`--shadow-rv-raise: 0 10px 24px -12px rgb(14 107 92 / 0.8)` (botón grabar y principal), el resto se queda.

**Espaciado**: coherente en general (escala de Tailwind de 4 px). Las tarjetas usan `p-4`/`p-5`, la clínica `px-7 py-6`.
No encontré problemas de espaciado que merezcan cambio salvo los anotados en hallazgos.

> Recomendación de alcance: **no** hacer una migración total a tokens durante el hackathon (riesgo de romper cosas por
> estética invisible). Añadir los tokens a `@theme` (S, riesgo bajo) y usarlos solo en los arreglos de abajo.

---

## Estados de cada vista (cargando · vacío · error · con datos)

| Vista | Cargando | Vacío | Error de red | Con datos |
|---|---|---|---|---|
| Luis (A0-A5) | "Loading…" centrado, texto gris (VERIFICADO) | Día 0: bienvenida; luego "Hi, Luis" + grabar (VERIFICADO, digno) | **No hay**: "Loading…" para siempre (VERIFICADO) | Bien (VERIFICADO) |
| Pablo / Marta (M0-M7) | "Loading…" centrado (VERIFICADO) | "Nothing pending today. If you feel like it, send Luis a note." (VERIFICADO, bueno) | **No hay**: "Loading…" para siempre (VERIFICADO) | Bien (VERIFICADO) |
| Clínica (C1-C6) | "Loading…" **arriba a la izquierda**, distinto al resto (VERIFICADO) | "Nobody matches these filters." (INFERIDO, `ClinicWeb.tsx:167`) | **No hay**: "Loading…" para siempre (VERIFICADO) | Bien (VERIFICADO) |
| Demo | "Loading the demo…" centrado (VERIFICADO) | Antes del primer momento: "Before the demo starts" (INFERIDO) | **No hay** (VERIFICADO). Si la red cae *después* de cargar, se ven datos viejos sin aviso (INFERIDO: `kit.tsx:54-56` guarda el error y nadie lo lee) | Bien |
| Entrada `/relevo` | Estática | — | — | Bien |

`useView` devuelve `error` (`kit.tsx:71`) pero **ninguna** vista lo usa (`MenteeApp.tsx:31`, `MentorApp.tsx:42`,
`ClinicWeb.tsx:55`, `demo/page.tsx:41`). Además el botón "Next moment" se traga los errores (`demo/page.tsx:47`).

---

## Hallazgos

```
D-01 · En la demo, los teléfonos y la clínica son ilegibles en pantalla grande
Gravedad: alta     Evidencia: VERIFICADO
Dónde: src/app/relevo/demo/page.tsx:111 (rejilla), :138 (capa de explicación lg:h-[38vh]), :129 (Fit 1280x820); kit.tsx:584 (Fit)
Qué pasa y a quién afecta: a 1440x900 el Fit dibuja el teléfono de Luis al 45,3 %, el de Pablo al 43,5 % y la clínica
al 46,3 % (medido). El texto de 12 px del producto queda en ~5,4 px y el de 14 px en ~6,5 px. A 1920x1080 sube solo al
58 % (12 px → 7 px). El jurado ve con claridad la capa de explicación (13-19 px) pero no puede leer lo que ven Luis,
Pablo y la clínica, que es el producto. La causa es el alto: cabecera ~135 px + capa de explicación 38vh (342 px).
Criterio del jurado afectado: demo / experiencia de usuario / "se entiende la solución".
Arreglo propuesto (concreto, con valores):
  1) Modo foco (recomendado): al pulsar el título de una columna (o las teclas 1, 2, 3), esa columna ocupa toda la
     anchura y las otras se ocultan; Esc vuelve a las tres. Con la capa abierta el teléfono pasa a ~0,45 → solo el alto
     limita, así que combinar con 2). La clínica pasa de 0,46 a ~0,83 (limitada por el alto 679/820 con la capa cerrada).
  2) Capa de explicación: `lg:h-[38vh] lg:min-h-[260px]` → `lg:h-[30vh] lg:min-h-[220px]` y tecla "E" para abrir/cerrar.
     Con la capa cerrada el área útil es ~679 px → teléfonos al 0,80 (12 px → 9,6 px).
  3) Clínica: `Fit width={1280}` y `w-[1280px]` → 1100 (la página de clínica ya trabaja con min-w-[1100px],
     clinic/page.tsx:11): escala de 0,46 a 0,585 sin tocar nada más.
Esfuerzo: M (1+2+3)     Riesgo de romper algo: bajo (solo maquetación de la demo)
```

```
D-02 · No hay estado de error: si falla la red, "Loading…" para siempre
Gravedad: alta     Evidencia: VERIFICADO (bloqueando /api/relevo/**)
Dónde: src/app/relevo/kit.tsx:37-72 (useView), MenteeApp.tsx:57, MentorApp.tsx:49, ClinicWeb.tsx:60, demo/page.tsx:77
Qué pasa y a quién afecta: con la Wi-Fi del recinto, cualquier corte deja las cuatro vistas en un texto gris sin
explicación ni botón. Si el corte llega después de cargar, se ven datos viejos sin ningún aviso (el sondeo sigue fallando
en silencio). Afecta al presentador y al jurado si prueba el enlace en su móvil.
Criterio del jurado afectado: calidad técnica / robustez de la demo.
Arreglo propuesto: un componente `Status` en kit.tsx usado en los 4 sitios:
  - error y sin datos: tarjeta `rv-card` centrada, max-w-[320px], p-5: título 17px/600 "Can't reach Relevo right now",
    texto 13px rv-muted "We'll keep trying every few seconds.", botón `rv-btn rv-btn-secondary` "Try again" → reload().
  - error con datos: pastilla fija arriba (absolute top-2 left-1/2 -translate-x-1/2) `rv-chip bg-rv-notice
    text-rv-notice-ink` "Offline · showing the last update". Nunca rojo.
Esfuerzo: M     Riesgo de romper algo: bajo
```

```
D-03 · Los estilos .rv-* y la regla global de <p> ganan a Tailwind: hover, colores y gaps que no se aplican
Gravedad: media     Evidencia: VERIFICADO (getComputedStyle)
Dónde: src/app/relevo/relevo.css (todo el archivo está fuera de @layer); src/app/globals.css:58-62 (p, li, dd { text-wrap: pretty })
Qué pasa y a quién afecta: en Tailwind v4 las utilidades viven en @layer utilities y cualquier CSS sin capa les gana.
Medido: (a) puertas de la portada: `hover:bg-[#fbfcfa]` nunca se ve (fondo calculado en hover = rgb(255,255,255),
page.tsx:21); (b) "Not now" del aviso de Luis lleva `text-rv-notice-ink` pero sale en `#55635D` (MenteeApp.tsx:110,
igual en MentorApp.tsx:200); (c) `gap-1.5` del botón Help sale a 8 px (MenteeApp.tsx:92). Es el motivo de varios
"esto no se ve como debería".
Criterio del jurado afectado: acabado visual.
Arreglo propuesto: envolver todo el contenido de relevo.css (líneas 4-228) en `@layer components { ... }`.
Comprobar después con capturas: botones, tarjetas y chips de las 3 superficies.
Esfuerzo: S     Riesgo de romper algo: medio (algún sitio podría depender de la prioridad actual; revisar capturas)
```

```
D-04 · `truncate` no funciona en ningún <p>: la cabecera de Pablo se parte y su teléfono sale más pequeño que el de Luis
Gravedad: media     Evidencia: VERIFICADO
Dónde: src/app/globals.css:58-62; src/app/relevo/demo/page.tsx:90, :165
Qué pasa y a quién afecta: `text-wrap: pretty` (sin capa) reinicia el ajuste de línea y anula el `white-space: nowrap`
de `truncate` (calculado: white-space normal). En la demo "Luis's mentor · 4 months after TMS" ocupa dos líneas
(36 px de alto), la columna de Pablo pierde alto y su teléfono se dibuja al 43,5 % frente al 45,3 % del de Luis:
los dos teléfonos tienen tamaños distintos uno al lado del otro. También puede partir la etiqueta del momento (:90).
Criterio del jurado afectado: acabado visual de la demo.
Arreglo propuesto: en relevo.css añadir `.rv .truncate { white-space: nowrap; }` (gana por especificidad, no toca el
Relay antiguo). Además, acortar el subtítulo de :117 a "Luis's mentor · 4 months on".
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
D-05 · Línea de tiempo: 13 de 27 puntos de momento están encima de otro
Gravedad: media     Evidencia: VERIFICADO (medido a 1440: 13 solapes; a 390: 23)
Dónde: src/app/relevo/demo/page.tsx:180-192 (puntos) y :194-205 (deslizador debajo)
Qué pasa y a quién afecta: varios momentos caen el mismo día (día 0 ×3, día 47 ×5, día 54 ×4…). Los puntos de 16 px
con borde se amontonan en "bolas" ilegibles; el presentador no puede pulsar el que quiere y en pantalla grande parece
un fallo. Además hay dos pistas paralelas (puntos arriba, deslizador abajo) que se leen como dos controles.
Criterio del jurado afectado: acabado de la demo.
Arreglo propuesto: agrupar por día: un punto por día (12 px: `h-3 w-3 border-[1.5px] top-1`), con `title` que lista
los momentos de ese día; el punto del momento actual 16 px. Poner los puntos sobre la pista del deslizador
(`top-[11px]` sobre el input) para que sea un único control.
Esfuerzo: M     Riesgo de romper algo: bajo
```

```
D-06 · El registro "What just happened" enseña claves internas en castellano
Gravedad: media     Evidencia: VERIFICADO
Dónde: src/lib/relevo/demo.ts:120 (texto del trace generado en sim.ts:218, :297, :395)
Qué pasa y a quién afecta: el jurado lee "Idea for Pablo about Luis: paseo_juntos (context movilidad)",
"ancla_manana gets reward 1", "llamada_o_quedar", "most changed: fisiologia". Parece código sin terminar y mezcla idiomas.
Criterio del jurado afectado: acabado / claridad de la explicación.
Arreglo propuesto: sin tocar sim.ts, en demo.ts:120 traducir el texto con los diccionarios que ya existen:
`text: e.text.replace(/\b(actividad_con_sentido|paseo_juntos|llamada_o_quedar|ancla_manana|desconexion_nocturna|calma_acompanada)\b/g, (k) => ACTION_LABEL[k]).replace(/\b(sueno|movilidad|ritmo|movil_vinculo|fisiologia)\b/g, (k) => DOMAIN_LABEL[k])`.
Esfuerzo: S     Riesgo de romper algo: bajo (comprobar que relevo-check no lee ese texto)
```

```
D-07 · Gráficos de la capa: marcas del eje con números raros, texto de eje con poco contraste, etiquetas pisadas y una leyenda que falta
Gravedad: media     Evidencia: VERIFICADO (capturas día 56 y 57)
Dónde: src/app/relevo/charts.tsx:49 (ticks), :68/:80/:94 (texto #7B8782 a 10 px), :79-80 (etiqueta de umbral);
       demo/page.tsx:31 (color de fisiología), :306 vs :383 (leyenda), :317 (etiquetas en minúscula)
Qué pasa y a quién afecta: (a) las marcas salen en 15/50/85 % del rango: "3.03 · 1.2 · −0.63", "2.19 · 0.91 · −0.38";
(b) el texto del eje `#7B8782` a 10 px tiene 3.73:1 (WCAG pide 4.5:1); (c) "area threshold 1.5" queda tachado por las
líneas; (d) el gráfico de Pablo (momento 7) no tiene leyenda y el de Luis sí; (e) la línea de fisiología `#8D99A0` tiene
2.92:1 (gráficos piden 3:1); (f) la tabla dice "sleep, mobility" en minúscula y la leyenda "Sleep, Mobility"; los
negativos usan guion "-0.44" y no signo menos.
Criterio del jurado afectado: claridad de la explicación técnica.
Arreglo propuesto:
  - ticks: valores redondos fijos para estos gráficos de desviación: `[-1, 0, 1.5, 3]` filtrados al rango (o paso 1).
  - texto de eje y umbral: `fill="#66726C"`, fontSize 11.
  - etiqueta del umbral con halo: `paintOrder="stroke" stroke="#fff" strokeWidth={3}`.
  - copiar la fila de leyenda de demo/page.tsx:306 debajo del gráfico de :383.
  - fisiología: `#8D99A0` → `#7D8A91` (3.55:1).
  - :317 añadir `capitalize` a la celda; mostrar negativos con `−` (U+2212).
Esfuerzo: M     Riesgo de romper algo: bajo
```

```
D-08 · El botón "Help" de Luis y de los mentores mide 36 px (la especificación pide mínimo 44)
Gravedad: media     Evidencia: VERIFICADO (alto medido ≈ 34-36 px)
Dónde: src/app/relevo/MenteeApp.tsx:92, MentorApp.tsx:67 (`rv-btn-sm`); relevo.css:63-67
Qué pasa y a quién afecta: es la entrada a la ayuda en crisis, la acción más importante para alguien que lo pasa mal,
y es el botón más pequeño de la pantalla. También usan 36 px: "Previous moment" y "More" de la demo
(demo/page.tsx:93,96), los botones de dispositivos (MenteeApp.tsx:416-423) y los de la clínica.
Criterio del jurado afectado: accesibilidad / cuidado del usuario vulnerable.
Arreglo propuesto: Help → quitar `rv-btn-sm` (queda 44 px, 15 px de letra); mantener el contorno naranja 1.5 px.
En móvil, el resto de `rv-btn-sm` → `min-height: 44px` (dejar 36 solo en la clínica de escritorio, documentado).
Esfuerzo: S     Riesgo de romper algo: bajo (zona de crisis: solo cambio visual, permitido)
```

```
D-09 · Etiquetas de la barra de pestañas del mentor con contraste insuficiente
Gravedad: baja     Evidencia: VERIFICADO (contraste calculado)
Dónde: src/app/relevo/MentorApp.tsx:147
Qué pasa y a quién afecta: pestañas inactivas en `#7C8883` a 11 px: 3.68:1 (AA pide 4.5:1).
Criterio del jurado afectado: accesibilidad.
Arreglo propuesto: `text-[#7c8883]` → `text-[#66726c]` (5.01:1) y `text-[11px]` → `text-[12px]`.
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
D-10 · Final de la demo: el botón principal se apaga y no hay cierre
Gravedad: media     Evidencia: VERIFICADO (captura día 62 12:00)
Dónde: src/app/relevo/demo/page.tsx:94, :394-403
Qué pasa y a quién afecta: en el momento con los números del contrato (88 % · 5 días · 2,45) el botón "Next moment"
queda al 45 % de opacidad y parece roto; es la última imagen que ve el jurado.
Criterio del jurado afectado: impresión final del pitch.
Arreglo propuesto: en el último momento sustituir el botón por `rv-btn rv-btn-secondary` "Restart demo" que llama a
`setClock(490)`. En el bloque de cierre, subir las cifras de `text-[30px]` a `text-[44px]` y el fondo de las tres
tarjetas de `bg-rv-bg` a `bg-rv-sage`.
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
D-11 · "Next moment" falla en silencio
Gravedad: media     Evidencia: INFERIDO
Dónde: src/app/relevo/demo/page.tsx:47 (`.catch(() => {})`)
Qué pasa y a quién afecta: si la llamada al reloj falla, el presentador pulsa y no pasa nada, sin pista de por qué.
Criterio del jurado afectado: robustez de la demo en directo.
Arreglo propuesto: guardar el error en estado y mostrar 4 s junto al botón un `rv-chip bg-rv-notice text-rv-notice-ink`
"Couldn't move the clock. Try again." (encaja con D-02).
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
D-12 · Pantallas de carga poco cuidadas y distintas entre sí
Gravedad: baja     Evidencia: VERIFICADO
Dónde: MenteeApp.tsx:57, MentorApp.tsx:49, ClinicWeb.tsx:60 (`p-10`, arriba a la izquierda), demo/page.tsx:77
Qué pasa y a quién afecta: texto gris suelto; la clínica lo pone arriba a la izquierda y el resto centrado. En la demo,
las tres columnas dicen "Loading…" a la vez dentro de marcos vacíos.
Criterio del jurado afectado: acabado.
Arreglo propuesto: componente `Loading` común: centrado, icono `ring` de 20 px en `text-rv-teal` con `animate-pulse`
y texto 13 px rv-muted; en el teléfono, además, dos siluetas de tarjeta `rv-card h-[96px] opacity-60` (mx-4 mt-4).
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
D-13 · La capa de explicación no se adapta al móvil
Gravedad: baja     Evidencia: VERIFICADO (captura 390 px)
Dónde: src/app/relevo/demo/page.tsx:139-147 (barra), :243, :301, :350, :379 (grid-cols-2 fijo), :396 (grid-cols-3)
Qué pasa y a quién afecta: a 390 px las tablas quedan en columnas de 60 px, "Show how Relevo decides" se parte en 3
líneas y la clínica se dibuja al 30 % (mínimo del Fit). Solo afecta si alguien del jurado abre la demo en el móvil.
Criterio del jurado afectado: acabado.
Arreglo propuesto: `grid-cols-2` → `grid-cols-1 lg:grid-cols-2` (igual con las variantes de 1.25fr/1.3fr y la de 3
columnas → `grid-cols-1 sm:grid-cols-3`); la descripción de :146 con `max-lg:hidden`; en móvil ocultar la columna de
clínica y mostrar un enlace "Open the clinic web" (`max-sm:hidden` en :128 + enlace).
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
D-14 · Numeración de la capa de explicación distinta del guion
Gravedad: baja     Evidencia: VERIFICADO
Dónde: src/app/relevo/demo/page.tsx:245, :272, :281, :303, :352, :381, :397
Qué pasa y a quién afecta: en pantalla: 1 Matching, 2 Learning, (Copilot sin número), 3 Detecting, 4 Solution,
5 High risk, 6 Severe, 7 Mentor, 8 Simulation. El guion (MAPA.md) es 1 emparejamiento, 2 copiloto, 3 día 47… El
presentador dice "paso 2" y la pantalla enseña otro.
Criterio del jurado afectado: claridad del pitch.
Arreglo propuesto: :272 "Before · Learning Luis's usual" (sin número), :281 "2 · Copilot: …"; el resto se queda.
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
D-15 · "Simulated sensor data" aparece tres veces a la vez
Gravedad: baja     Evidencia: VERIFICADO
Dónde: src/app/relevo/demo/page.tsx:128 y :147, ClinicWeb.tsx:79
Qué pasa y a quién afecta: la misma pastilla en la cabecera de la clínica, en la barra de la capa y dentro de la
clínica. Ruido visual; la honestidad sobre lo simulado ya queda clara con una.
Arreglo propuesto: quitar la de :147; dejar :128 y la de la propia clínica (es parte del producto).
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
D-16 · Contadores de la clínica en color aunque valgan 0
Gravedad: baja     Evidencia: VERIFICADO (captura clínica 1440)
Dónde: src/app/relevo/ClinicWeb.tsx:112-113
Qué pasa y a quién afecta: "0 Need a call" sale en naranja; el color debería señalar algo que atender. "Severe" ya lo
hace bien (:114 solo colorea si > 0).
Arreglo propuesto: `color: c.needCall > 0 ? LEVEL_COLOR[2] : "#16211C"` y lo mismo con `c.early` / `LEVEL_COLOR[1]`.
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
D-17 · Dos estilos distintos para el mismo control segmentado
Gravedad: baja     Evidencia: VERIFICADO
Dónde: src/app/relevo/demo/page.tsx:119-121 (seleccionado verde, `py-1` ≈ 26 px de alto); ClinicWeb.tsx:175-179 (seleccionado negro)
Qué pasa y a quién afecta: el selector Pablo/Marta y los filtros de la clínica son el mismo control con colores
distintos, uno al lado del otro en la demo. Además 26 px es muy poco para pulsar.
Arreglo propuesto: reutilizar `Seg` de ClinicWeb en la demo; seleccionado `bg-rv-ink text-white`; botón
`min-h-[32px] px-3 text-[13px]` (escritorio).
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
D-18 · Escala tipográfica dispersa (20 tamaños) y fuente de títulos escrita a mano
Gravedad: baja     Evidencia: VERIFICADO (grep)
Dónde: todo src/app/relevo; `style={{ fontFamily: "var(--rv-display)" }}` en page.tsx:14,22, demo/page.tsx:87,89,164,399,
       app/page.tsx:66, ClinicWeb.tsx:66,122, MentorApp.tsx:245
Qué pasa y a quién afecta: 12 / 12.5 / 13 / 13.5 conviven en la misma pantalla y se perciben como "casi iguales"
(ruido); los h1 del móvil cambian de 24 a 30 px entre pantallas hermanas.
Arreglo propuesto: añadir a `@theme` la escala de la sección Tokens; ahora solo unificar los h1 del móvil a 28px
(MenteeApp.tsx:85,513,522,536,561 y MentorApp.tsx:63,379,389,413) y cambiar los `style` por `className="font-rv-display"`.
No migrar el resto durante el hackathon.
Esfuerzo: S (h1 + fuente) / L (migración completa)     Riesgo de romper algo: bajo / medio
```

```
D-19 · Colores y radios sueltos fuera de los tokens
Gravedad: baja     Evidencia: VERIFICADO (grep, tabla en "Tokens")
Dónde: ver tabla de la sección Tokens
Qué pasa y a quién afecta: ~45 hex sueltos; 4 grises casi iguales para bordes, 3 rosados para "ayuda suave", 2 casi
blancos; radios 22/20/16/14/12 para piezas equivalentes. Nadie lo ve por separado, pero suma sensación de "casi".
Arreglo propuesto: añadir los 8 tokens nuevos propuestos y, como mínimo, page.tsx:21 `rounded-[22px]` → `rounded-[20px]`,
ClinicWeb.tsx:63,492 `bg-[#f3f5f2]` → `bg-rv-bg`, MenteeApp.tsx:389 `bg-[#2f8a5b]` → `bg-rv-teal`.
Esfuerzo: S (mínimo) / M (todo)     Riesgo de romper algo: bajo
```

```
D-20 · Portada: marca sin logotipo y puertas sin señal de que se pueden pulsar
Gravedad: baja     Evidencia: VERIFICADO
Dónde: src/app/relevo/page.tsx:14, :21-24; mismo texto "Relevo" a 22 px (page.tsx:14), 20 px (demo/page.tsx:87,
       app/page.tsx:66) y 19 px (ClinicWeb.tsx:66)
Qué pasa y a quién afecta: el nombre es texto plano con tamaños distintos en cada sitio; las tarjetas no tienen flecha
y su hover no funciona (D-03).
Arreglo propuesto: componente `Wordmark`: icono `chain` de kit 20 px en `text-rv-teal` + "Relevo" 20px/600 Space
Grotesk, gap 8 px, usado en los 4 sitios. En cada puerta, `Icon name="arrow" size={20}` arriba a la derecha (`ml-auto`),
con `group-hover:translate-x-0.5 transition-transform`.
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
D-21 · Detalles de texto en las apps
Gravedad: baja     Evidencia: VERIFICADO
Dónde: MentorApp.tsx:241; kit.tsx:241 junto a la cabecera de la tarjeta de nota de MenteeApp
Qué pasa y a quién afecta: (a) la pregunta V1 "Would you like to talk to Luis today?" va bajo la etiqueta "Idea for
today · Luis" (no es una idea, es una pregunta); (b) en la tarjeta "Pablo left you a note" la fecha sale dos veces
("Fri 9 Oct" arriba y abajo).
Arreglo propuesto: (a) etiqueta "For today · Luis" cuando la tarjeta es una pregunta; (b) en `VoiceNote` sin burbuja,
no pintar `note.when` (kit.tsx:241) si la tarjeta padre ya lo muestra (prop `hideWhen`).
Esfuerzo: S     Riesgo de romper algo: bajo
```

---

## Lo que está bien (no tocar)
- Paleta base, tarjetas, botones en pastilla, naranja de ayuda: se respeta la especificación en las 3 superficies.
- Hoja de ayuda en crisis (A, día 57): jerarquía clara, "Emergency · 112" relleno naranja, resto en contorno. Bien.
- Etiquetas de nivel solo en la clínica y siempre con texto (punto + "3 Severe"). Contraste correcto.
- Estado vacío del mentor ("Nothing pending today…"): amable, sin culpa. Buen ejemplo para el resto.
- El botón azul marino "Send a note" dentro del aviso azul es coherente con la familia de avisos (no lo cambiaría).
- Iconos de trazo 2 px y sin emojis en todo el recorrido.

## No lo pude comprobar
- Textos generados por Gemini (servidor sin clave): solo vi la plantilla de respaldo.
- Grabadora con micrófono real y reconocimiento de voz.
- La versión desplegada en Vercel (solo local). La insignia "N" de Next.js que tapa la esquina inferior izquierda de
  la demo solo sale en modo desarrollo: **para la presentación usar la versión desplegada o `npm run build && npm start`**.
- Proyector real / 4K: medí 1440x900 y 1920x1080.
- No revisé las pantallas C3-C6 de la clínica una a una (Alerts, Matching, Settings, Consents) más allá del código.

## Orden recomendado (máximo impacto para el jurado con poco riesgo)
1. D-04 + D-03 (S, arreglan de golpe varios detalles) → comprobar con capturas.
2. D-06, D-10, D-14, D-15, D-16 (S cada uno, todo lo que el jurado lee en la demo).
3. D-01 (M, la legibilidad del producto en pantalla grande).
4. D-02 + D-11 + D-12 (estados de error y carga).
5. D-05 y D-07 (línea de tiempo y gráficos).
6. D-08, D-09 (accesibilidad), resto si sobra tiempo.
