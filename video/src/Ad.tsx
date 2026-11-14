// El anuncio: 12 planos en su sitio (cortes en beat de 120 BPM) y la música.
import React, { useEffect, useState } from "react";
import { delayRender, continueRender } from "remotion";
import { AbsoluteFill, Sequence, staticFile, getStaticFiles } from "remotion";
import { Audio } from "remotion";
import { Shot1, Shot2, Shot3, Shot4, Shot5 } from "./shotsDark";
import { Shot6, Shot7, Shot8, Shot9, Shot10, Shot11, Shot12 } from "./shotsLight";
import { s, preloadAll } from "./lib";

// [inicio, fin] en segundos (dirección del anuncio)
export const SHOTS: [number, number, React.FC][] = [
  [0, 3, Shot1], [3, 6, Shot2], [6, 9, Shot3], [9, 12, Shot4], [12, 14, Shot5], [14, 20, Shot6],
  [20, 26, Shot7], [26, 33, Shot8], [33, 40, Shot9], [40, 45, Shot10], [45, 49, Shot11], [49, 52, Shot12],
];
export const DURATION = s(52);

export const Ad: React.FC<{ from?: number; to?: number }> = ({ from = 1, to = 12 }) => {
  const hasMusic = getStaticFiles().some((f) => f.name === "music.wav");
  // primero fuentes y capturas; así cada fotograma se dibuja ya con todo cargado
  const [ready, setReady] = useState(false);
  useEffect(() => { const h = delayRender("precarga"); preloadAll().then(() => { setReady(true); continueRender(h); }); }, []);
  if (!ready) return <AbsoluteFill style={{ background: "#000" }} />;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {SHOTS.map(([a, b, Shot], i) => (i + 1 >= from && i + 1 <= to ? (
        <Sequence key={i} from={s(a)} durationInFrames={s(b) - s(a)} name={`Plano ${i + 1}`}>
          <Shot />
        </Sequence>
      ) : null))}
      {hasMusic && <Audio src={staticFile("music.wav")} />}
    </AbsoluteFill>
  );
};
