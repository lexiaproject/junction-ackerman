// Anuncio de Relevo (50 s, 1920×1080, 60 fps). Lee todo el contenido de ../script.ts y las capturas de public/shots.
import { AbsoluteFill, Audio, Easing, Img, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadGrotesk } from "@remotion/google-fonts/SpaceGrotesk";
import { COLORS, DURATION, FPS, MUSIC, SCENES, type Accent, type Scene, type Shot } from "../script";
import SHOTS from "../public/shots/shots.json";

const { fontFamily: INTER } = loadInter("normal", { weights: ["400", "600"], subsets: ["latin"] });
const { fontFamily: GROTESK } = loadGrotesk("normal", { weights: ["600", "700"], subsets: ["latin"] });

type Box = { x: number; y: number; w: number; h: number };
type Meta = { w: number; h: number; boxes: Record<string, Box> };
const META = SHOTS as unknown as Record<string, Meta>;

// Un único easing en todo el vídeo, sin rebotes
const EASE = Easing.bezier(0.22, 1, 0.36, 1);
const tween = (f: number, from: number, to: number, a: number, b: number) =>
  interpolate(f, [from, to], [a, b], { easing: EASE, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const sec = (s: number) => Math.round(s * FPS);

/* ---------- Tipografía cinética: palabras que suben 20 px y aparecen con 60 ms de diferencia ---------- */
function Words({ text, accents = {}, size, slow = false, frames, align = "center" }: { text: string; accents?: Record<string, Accent>; size: number; slow?: boolean; frames: number; align?: "center" }) {
  const f = useCurrentFrame();
  const words = text.split(" ");
  const stagger = slow ? 0.1 : 0.06;
  const dur = slow ? 0.8 : 0.55;
  const out = tween(f, frames - sec(0.2), frames, 1, 0); // salida corta, justo antes del corte
  return (
    <div style={{ fontFamily: INTER, fontWeight: 600, fontSize: size, lineHeight: 1.1, letterSpacing: "-0.028em", color: COLORS.ink, textAlign: align, maxWidth: size > 100 ? 1560 : 1500, opacity: out, textWrap: "balance" as never }}>
      {words.map((w, i) => {
        const t0 = sec(i * stagger) - sec(0.1);
        const p = tween(f, t0, t0 + sec(dur), 0, 1);
        const c = accents[w];
        return (
          <span key={i} style={{ display: "inline-block", whiteSpace: "pre", opacity: p, transform: `translateY(${20 * (1 - p)}px)`, color: c ? COLORS[c] : undefined }}>
            {w}{i < words.length - 1 ? " " : ""}
          </span>
        );
      })}
    </div>
  );
}

function TextScene({ s }: { s: Extract<Scene, { kind: "text" }> }) {
  const frames = sec(s.to - s.from);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: "0 180px" }}>
      <Words text={s.text} accents={s.accents} size={s.size ?? 116} slow={s.slow} frames={frames} />
    </AbsoluteFill>
  );
}

function LogoScene({ s }: { s: Extract<Scene, { kind: "logo" }> }) {
  const f = useCurrentFrame();
  const frames = sec(s.to - s.from);
  const letters = "Relevo".split("");
  const sub = tween(f, sec(0.55), sec(1.2), 0, 1);
  const out = s.to >= DURATION ? 1 : tween(f, frames - sec(0.2), frames, 1, 0);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: out }}>
      <div style={{ fontFamily: GROTESK, fontWeight: 700, fontSize: 210, letterSpacing: "-0.04em", color: COLORS.ink, display: "flex", lineHeight: 1 }}>
        {letters.map((l, i) => {
          const p = tween(f, sec(0.05 + i * 0.06), sec(0.65 + i * 0.06), 0, 1);
          return <span key={i} style={{ display: "inline-block", opacity: p, transform: `translateY(${20 * (1 - p)}px)` }}>{l}</span>;
        })}
        <span style={{ color: COLORS.teal, opacity: tween(f, sec(0.45), sec(0.9), 0, 1) }}>.</span>
      </div>
      <div style={{ marginTop: 26, fontFamily: INTER, fontWeight: 400, fontSize: 52, color: COLORS.muted, opacity: sub, transform: `translateY(${20 * (1 - sub)}px)` }}>{s.sub}</div>
    </AbsoluteFill>
  );
}

/* ---------- Pantalla de la app: marco flotante, giro 3D que se endereza, zoom de cámara y cursor ---------- */
const AX = 960;
const AY = 700; // punto de pantalla donde queda lo que se enfoca (debajo del titular)

function Device({ shot }: { shot: Shot }) {
  const f = useCurrentFrame();
  const frames = sec(shot.to - shot.from);
  const meta = META[shot.img];
  const box = meta.boxes[shot.focus];
  const phone = (shot.device ?? "phone") === "phone";
  const s0 = shot.s0 ?? 1.75;
  const s1 = shot.s1 ?? 2.6;
  const enter = tween(f, -sec(0.25), sec(0.9), 0, 1);
  const zoom = tween(f, sec(0.25), frames, s0, s1);
  const pan = shot.pan ? tween(f, sec(0.15), frames - sec(0.1), 0, 1) : 0;
  const fx = shot.pan ? shot.pan.from.x + (shot.pan.to.x - shot.pan.from.x) * pan : box.x + box.w / 2;
  const fy = shot.pan ? shot.pan.from.y + (shot.pan.to.y - shot.pan.from.y) * pan : box.y + box.h / 2;
  const toScreen = (x: number, y: number) => ({ x: AX + (x - fx) * zoom, y: AY + (y - fy) * zoom });

  // Pulsación: cursor con curva suave, onda y cambio a la captura de después
  let tapUi = null;
  let after = 0;
  if (shot.tap) {
    const tf = sec(shot.tap.at - shot.from);
    const tb = meta.boxes[shot.tap.box];
    const target = toScreen(tb.x + tb.w / 2, tb.y + tb.h / 2);
    const k = tween(f, tf - sec(0.8), tf, 0, 1);
    const start = { x: target.x + 300, y: target.y + 260 };
    const ctrl = { x: target.x + 40, y: target.y + 330 }; // curva cuadrática
    const cx = (1 - k) * (1 - k) * start.x + 2 * (1 - k) * k * ctrl.x + k * k * target.x;
    const cy = (1 - k) * (1 - k) * start.y + 2 * (1 - k) * k * ctrl.y + k * k * target.y;
    const vis = Math.min(tween(f, tf - sec(0.95), tf - sec(0.7), 0, 1), tween(f, tf + sec(0.5), tf + sec(0.8), 1, 0));
    const press = f >= tf && f < tf + sec(0.14) ? 0.86 : 1;
    const ring = tween(f, tf, tf + sec(0.55), 0, 1);
    after = tween(f, tf + sec(0.06), tf + sec(0.22), 0, 1);
    tapUi = (
      <>
        {f >= tf && ring < 1 && (
          <div style={{ position: "absolute", left: target.x - 60, top: target.y - 60, width: 120, height: 120, borderRadius: "50%", border: `6px solid ${COLORS.teal}`, opacity: 0.7 * (1 - ring), transform: `scale(${0.4 + ring * 1.6})` }} />
        )}
        <svg width="54" height="54" viewBox="0 0 24 24" style={{ position: "absolute", left: cx - 6, top: cy - 4, opacity: vis, transform: `scale(${press})`, transformOrigin: "6px 4px", filter: "drop-shadow(0 6px 10px rgba(22,33,28,.35))" }}>
          <path d="M5 3L19 12L12 13L9 20L5 3Z" fill="#fff" stroke={COLORS.ink} strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      </>
    );
  }

  const W = meta.w;
  const H = meta.h;
  const frame = phone
    ? { pad: 12, radius: 58, inner: 46, bar: 0 }
    : { pad: 0, radius: 18, inner: 0, bar: 38 };
  return (
    <AbsoluteFill style={{ perspective: 2200, perspectiveOrigin: `${AX}px ${AY}px` }}>
      <AbsoluteFill style={{ transformOrigin: `${AX}px ${AY}px`, transform: `translateY(${70 * (1 - enter)}px) rotateY(${-6 * (1 - enter)}deg) rotateX(${4 * (1 - enter)}deg)`, opacity: enter }}>
        <div style={{ position: "absolute", left: AX - (fx + frame.pad) * zoom, top: AY - (fy + frame.pad + frame.bar) * zoom, transformOrigin: "0 0", transform: `scale(${zoom})` }}>
          <div style={{ width: W + frame.pad * 2, padding: frame.pad, borderRadius: frame.radius, background: phone ? COLORS.bezel : "#fff", boxShadow: "0 60px 110px -40px rgba(22,33,28,.42), 0 18px 40px -20px rgba(22,33,28,.25), 0 0 0 1px rgba(22,33,28,.08)" }}>
            {!phone && (
              <div style={{ height: frame.bar, display: "flex", alignItems: "center", gap: 8, padding: "0 16px", background: "#EEF1EE", borderRadius: "18px 18px 0 0", borderBottom: "1px solid #E2E6E1" }}>
                {[0, 1, 2].map((i) => <span key={i} style={{ width: 11, height: 11, borderRadius: "50%", background: "#D6DBD7" }} />)}
                <span style={{ marginLeft: 16, fontFamily: INTER, fontSize: 13, color: COLORS.muted, background: "#fff", borderRadius: 8, padding: "3px 14px" }}>Aalto TMS Clinic · Relevo</span>
              </div>
            )}
            <div style={{ position: "relative", width: W, height: H, borderRadius: phone ? frame.inner : "0 0 18px 18px", overflow: "hidden", background: COLORS.bg }}>
              <Img src={staticFile(`shots/${shot.img}.png`)} style={{ position: "absolute", inset: 0, width: W, height: H }} />
              {shot.tap && <Img src={staticFile(`shots/${shot.tap.after}.png`)} style={{ position: "absolute", inset: 0, width: W, height: H, opacity: after }} />}
            </div>
          </div>
        </div>
        {tapUi}
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

function UiScene({ s }: { s: Extract<Scene, { kind: "ui" }> }) {
  const frames = sec(s.to - s.from);
  return (
    <AbsoluteFill>
      {/* Luz suave detrás de la pantalla */}
      <AbsoluteFill style={{ background: `radial-gradient(900px 620px at ${AX}px ${AY}px, rgba(14,107,92,.07), rgba(14,107,92,0) 70%)` }} />
      {s.shots.map((shot, i) => (
        <Sequence key={i} from={sec(shot.from - s.from)} durationInFrames={sec(shot.to - shot.from)} layout="none">
          <Device shot={shot} />
        </Sequence>
      ))}
      {/* El titular siempre se lee: la pantalla se funde con el fondo por arriba */}
      <AbsoluteFill style={{ background: `linear-gradient(180deg, ${COLORS.bg} 0px, ${COLORS.bg} 250px, rgba(245,246,243,0) 340px)` }} />
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 92 }}>
        <Words text={s.text} accents={s.accents} size={96} frames={frames} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

export function Ad() {
  return (
    <AbsoluteFill style={{ background: COLORS.bg }}>
      <Audio
        src={staticFile(MUSIC.src)}
        volume={(f) => MUSIC.volume * interpolate(f, [sec(DURATION - MUSIC.fadeOutSec), sec(DURATION)], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
      />
      {SCENES.map((s, i) => (
        <Sequence key={i} from={sec(s.from)} durationInFrames={sec(s.to - s.from)}>
          {s.kind === "text" ? <TextScene s={s} /> : s.kind === "logo" ? <LogoScene s={s} /> : <UiScene s={s} />}
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}
