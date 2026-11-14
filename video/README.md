# Anuncio de Relevo (50 s)

Vídeo para el pitch: 1920×1080, 60 fps, MP4 H.264. Hecho con Remotion a partir de pantallas reales de la app.

- **Texto, tiempos, colores y música:** `script.ts`
- **Regenerarlo entero** (capturas + música + render + revisión), desde la raíz del proyecto:

  ```bash
  npm --prefix video run ad
  ```

  Las capturas se hacen contra `http://localhost:3000` si está arrancado; si no, contra la web publicada.
- **Resultado:** `video/out/relevo-ad.mp4` (no se sube a GitHub). Revisión: `video/out/frames/sheet.png`.
- **Música:** compuesta por código (`scripts/music.cjs`, 120 BPM, libre de derechos). Para usar otra pista, cambia `MUSIC.src` y `MUSIC.bpm` en `script.ts`.

## Vídeo de 35 s (estilo del vídeo largo: estudio con la app real)

Móviles y clínica reales de la web publicada, cámara, tarjetas de día y cierre con la cadena. Sin música.

```bash
node video/studio/film35.cjs
```

Resultado: `video/out/relevo-35s.mp4` (1920×1080, 30 fps, H.264). Ensayo sin grabar: añade `--rehearse`.
