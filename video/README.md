# Anuncio de Relevo (52 s, 3D)

Proyecto aparte de la app: Remotion + Three.js. Sale `out/relevo-ad.mp4` (1920×1080, H.264, 60 fps) con música compuesta por código.

## Regenerar el vídeo (un solo comando)

Desde la carpeta `video/`:

```bash
npm install
npm run build
```

`npm run build` compone la música (`public/music.wav`) y renderiza `out/relevo-ad.mp4`. Tarda unos minutos.

## Otros comandos

- `npm run preview`: versión en baja calidad para revisar (`out/revision-completa.mp4`).
- `npm run capture`: vuelve a capturar las pantallas reales de la app (necesita la app arrancada en `http://localhost:3000`; si no, usa la web publicada).
- `npm run studio`: abre el editor de Remotion para ver el anuncio fotograma a fotograma.

## Qué es real y qué no

- Las pantallas de los móviles y de la clínica son **capturas reales** de la app (`public/shots`).
- La gráfica del plano 8 usa **datos reales** de la demo (`public/shots/pablo-series.json`).
- Todo lo demás (cerebro, silla, siluetas, móvil 3D, música) está generado por código.

## Dónde está cada cosa

- `src/shotsDark.tsx`: planos 1-5 (cerebro, silla, red de personas, móvil en la mesa, logo).
- `src/shotsLight.tsx`: planos 6-12 (Luis, Pablo, gráfica, pantallas, "I'm in", ventana, final).
- `src/kit.tsx`: piezas 3D (móvil tipo iPhone, partículas, fondos, corazón…).
- `src/overlay.tsx`: textos de pantalla y desenfoques.
- `scripts/music.cjs`: la música (120 BPM; cada segundo entero cae en un beat).
