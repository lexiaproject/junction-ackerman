"use client";

// Visita guiada automática (solo en la vista de demo). Sigue la guía para los mentores del reto
// (.equipo/GUIA-MENTORES-RETO.md): cada paso va a un momento de la historia, resalta una columna, puede abrir la capa
// "Show how Relevo decides" o pedir al móvil de Pablo una acción, y enseña (y si se quiere, lee en voz alta) la frase.
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "../kit";

export type TourCol = "luis" | "mentor" | "clinic" | "layer" | null;
type Step = {
  moment?: string; // clave del momento de la demo (src/lib/relevo/demo.ts); sin clave = se queda donde está
  col: TourCol; // qué se resalta (las demás columnas se atenúan)
  look: string; // dónde mirar
  say: string; // la frase (en inglés: es lo que se enseña a los mentores)
  explain?: boolean; // abre o cierra la capa de abajo
  action?: "m0-role" | "ideas"; // lo que hace el móvil de Pablo en este paso
  hold?: number; // ms extra (p. ej. mientras la IA prepara las ideas)
};

export const TOUR: Step[] = [
  { col: null, explain: false, look: "Three screens: Luis, his companion Pablo, and the clinic", say: "This is Relevo. After TMS for depression, people often go home feeling they've lost their support. Relevo pairs each of them with someone who finished TMS a few months earlier. On the left is Luis, who has just finished. In the middle is Pablo, his companion. On the right, the clinic." },
  { moment: "match", col: "layer", explain: true, look: "Bottom layer · how the clinic matches people", say: "The clinic matches people by how their last relapse started. Pablo scores 87 percent with Luis: both started by sleeping more and going out less." },
  { moment: "match", col: "mentor", explain: false, action: "m0-role", look: "Middle · Pablo's invitation", say: "Before accepting, Pablo sees what is not on him. He's not a therapist, he never sees health data, anything serious goes to the clinic, and he can pause or stop at any time. A companion, not a guide." },
  { moment: "baseline", col: "luis", look: "Left · Luis's phone", say: "Luis gives three separate consents. Then, for four weeks, Relevo only learns his usual. It never compares him with anyone else." },
  { moment: "copilot", col: "mentor", look: "Middle · a private tip for Pablo", say: "Luis has sent three notes about the same worries. Pablo gets a private tip on how to reply. Luis sees nothing." },
  { moment: "copilot", col: "mentor", action: "ideas", hold: 4000, look: "Middle · reply ideas for Pablo", say: "If Pablo isn't sure what to say, he can ask for ideas. They're warm peer-support techniques, like validation or suggesting a small shared step. Never clinical advice." },
  { moment: "spike", col: "clinic", look: "Right · the clinic", say: "One unusual day does nothing. Relevo waits for a clear change that lasts." },
  { moment: "l1", col: "clinic", look: "Right · Luis at level 1", say: "After three days in a row, Luis enters level one. Only the clinic sees this. Nothing appears on either phone." },
  { moment: "v1", col: "mentor", look: "Middle · Pablo is asked first", say: "Pablo is asked first, in private: would you like to talk to Luis today? He can say no." },
  { moment: "yes", col: "luis", look: "Left · what Luis sees", say: "Pablo said yes. Luis never sees an alarm, only: Pablo would like to talk to you." },
  { moment: "in", col: "luis", look: "Left · the plan", say: "Pablo suggests a short walk in a voice note, and Luis says he's in." },
  { moment: "good", col: "layer", explain: true, look: "Bottom layer · what Relevo learned", say: "Luis said the walk went well, so Relevo learns that walks work for this pair, not for the average person." },
  { moment: "cant", col: "mentor", explain: false, look: "Middle · Pablo can't today", say: "A few days later things get harder. Pablo answers that he can't today, and that's respected: he gets nothing to do." },
  { moment: "call", col: "clinic", look: "Right · the clinic steps in", say: "Luis is now at high risk, so the clinic steps in and calls him. Luis gets at most one notification a day." },
  { moment: "pl1", col: "mentor", look: "Middle · Marta, Pablo's own companion", say: "Companions are still recovering too, so Relevo looks after them exactly like Luis. When Pablo's routine drifts, his own companion, Marta, is asked first." },
  { moment: "pl1", col: null, look: "Content note", say: "Content note: the next moment involves a message with a suicidal thought. We'll show what the system does, not the message." },
  { moment: "crisis", col: "luis", look: "Left · help opens on Luis's phone", say: "A phrase from a fixed list moves Luis straight to level three. Help opens on his phone, and the clinic gets a severe alert." },
  { moment: "crisis", col: "mentor", look: "Middle · what Pablo is told", say: "Pablo doesn't even receive the message. He's told that Luis's clinic team knows, and that he doesn't need to do anything else." },
  { moment: "pl2", col: "mentor", look: "Middle · a pause for Pablo", say: "When Pablo's own data drift further, he's offered a pause, ideas for Luis stop, and the clinic can find a temporary companion." },
  { moment: "close", col: "layer", explain: true, look: "Bottom layer · what the simulation shows", say: "We tested the logic on two hundred synthetic people we generated: 88 percent of simulated relapses caught, about five days early. That shows the logic works as designed, not clinical accuracy. That needs a pilot study." },
  { moment: "close", col: null, look: "Thank you", say: "Relevo offers company, never treatment. The clinic keeps clinical responsibility, and every patient who recovers can become the next companion, when they're ready. Thank you." },
];

// Tiempo de lectura: ~2,6 palabras por segundo, con mínimo y máximo
const readMs = (s: Step) => Math.min(32000, Math.max(5500, s.say.split(/\s+/).length * 385 + 1800)) + (s.hold ?? 0);

function pickVoice() {
  const vs = typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis.getVoices() : [];
  const en = vs.filter((v) => /^en[-_]/i.test(v.lang));
  return en.find((v) => /Google UK English Female|Google US English|Natural|Samantha|Daniel/i.test(v.name)) ?? en[0] ?? null;
}

export function TourBar({
  index, moments, onMoment, onExplain, onCol, onExit,
}: {
  index: number; // momento actual de la demo
  moments: { key: string }[];
  onMoment: (key: string) => void;
  onExplain: (on: boolean) => void;
  onCol: (c: TourCol) => void;
  onExit: () => void;
}) {
  const [i, setI] = useState(0);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [voice, setVoice] = useState(true);
  const fired = useRef<number | null>(null); // paso cuya acción ya se lanzó
  const step = TOUR[i];
  const target = step.moment ? moments.findIndex((m) => m.key === step.moment) : -2;
  const ready = target === -2 || index === target; // la demo ya llegó al momento del paso
  const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;

  // Al entrar en un paso: mover la demo, la capa y el resaltado
  useEffect(() => {
    if (!started) return;
    const s = TOUR[i];
    if (s.moment) onMoment(s.moment);
    if (s.explain !== undefined) onExplain(s.explain);
    onCol(s.col);
  }, [i, started, onMoment, onExplain, onCol]);

  // Cuando la demo ha llegado al momento: la acción del móvil de Pablo (una vez por paso)
  useEffect(() => {
    if (!started || !ready || !step.action || fired.current === i) return;
    fired.current = i;
    const t = setTimeout(() => window.dispatchEvent(new CustomEvent("relevo:tour", { detail: { as: "pablo", do: step.action } })), 700);
    return () => clearTimeout(t);
  }, [started, ready, step.action, i]);

  const next = useCallback(() => setI((x) => Math.min(TOUR.length - 1, x + 1)), []);
  const prev = useCallback(() => { fired.current = null; setI((x) => Math.max(0, x - 1)); }, []);

  // Reproducir: voz (frase a frase: algunas voces se cortan con textos largos) y avance automático
  useEffect(() => {
    if (!started || !playing || !ready) return;
    const last = i === TOUR.length - 1;
    let done = false;
    const advance = () => {
      if (done) return;
      done = true;
      if (last) setPlaying(false);
      else next();
    };
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (voice && canSpeak) {
      const synth = window.speechSynthesis;
      synth.cancel();
      const parts = step.say.match(/[^.!?:]+[.!?:]?/g)?.map((p) => p.trim()).filter(Boolean) ?? [step.say];
      const v = pickVoice();
      parts.forEach((p, k) => {
        const u = new SpeechSynthesisUtterance(p);
        u.lang = v?.lang ?? "en-GB";
        if (v) u.voice = v;
        u.rate = 1;
        if (k === parts.length - 1) u.onend = () => timers.push(setTimeout(advance, 900 + (step.hold ?? 0)));
        synth.speak(u);
      });
      timers.push(setTimeout(advance, readMs(step) * 1.8)); // por si la voz no avisa al terminar
    } else timers.push(setTimeout(advance, readMs(step)));
    return () => {
      done = true;
      timers.forEach(clearTimeout);
      if (canSpeak) window.speechSynthesis.cancel();
    };
  }, [started, playing, ready, i, voice, canSpeak, step, next]);

  // Teclado mientras dura la visita: → ← pasos, espacio pausa, Esc sale (antes que las teclas normales de la demo)
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) || el.isContentEditable) return;
      const map: Record<string, () => void> = {
        ArrowRight: next,
        ArrowLeft: prev,
        " ": () => (started ? setPlaying((p) => !p) : (setStarted(true), setPlaying(true))),
        Escape: onExit,
      };
      const f = map[e.key];
      if (!f) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      f();
    };
    window.addEventListener("keydown", k, true);
    return () => window.removeEventListener("keydown", k, true);
  }, [next, prev, started, onExit]);

  // Al salir de la visita: nada de voz suelta ni resaltado
  useEffect(() => () => { if (canSpeak) window.speechSynthesis.cancel(); onCol(null); }, [canSpeak, onCol]);

  const btn = "rv-btn rv-btn-ghost rv-btn-sm !min-h-9 !px-2.5";
  return (
    <div className="mt-2 rounded-2xl bg-rv-sage px-4 py-3" role="region" aria-label="Guided tour">
      <div className="flex items-center gap-3">
        <p className="shrink-0 text-[13px] font-semibold text-rv-teal">Guided tour</p>
        <p className="rv-num rv-muted shrink-0 text-[12.5px]">{started ? `Step ${i + 1} of ${TOUR.length}` : `${TOUR.length} steps · about 5 minutes`}</p>
        <div className="h-1.5 min-w-0 flex-1 rounded-full bg-white" aria-hidden>
          <div className="h-full rounded-full bg-rv-teal transition-[width] duration-500" style={{ width: `${started ? ((i + 1) / TOUR.length) * 100 : 0}%` }} />
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {started && (
            <>
              <button className={btn} onClick={prev} disabled={i === 0} aria-label="Previous step"><Icon name="back" size={18} /></button>
              <button className={btn} onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause" : "Play"}><Icon name={playing ? "pause" : "play"} size={18} /></button>
              <button className={btn} onClick={next} disabled={i === TOUR.length - 1} aria-label="Next step"><Icon name="chevron" size={18} /></button>
            </>
          )}
          {canSpeak && (
            <button className={btn} onClick={() => setVoice((v) => !v)} aria-pressed={voice} aria-label={voice ? "Turn the voice off" : "Turn the voice on"}>
              <Icon name={voice ? "volume" : "mute"} size={18} />
            </button>
          )}
          <button className={btn} onClick={onExit} aria-label="End the tour"><Icon name="x" size={18} /></button>
        </div>
      </div>
      {started ? (
        <div className="mt-2" aria-live="polite">
          <p className="rv-muted text-[12.5px]">{step.look}{!ready && " · getting there…"}</p>
          <p className="mt-0.5 max-w-[95ch] text-[17px] leading-snug text-rv-ink" style={{ textWrap: "pretty" }}>{step.say}</p>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <p className="text-[15px] text-rv-ink">The demo runs by itself and explains each moment.{canSpeak ? " The voice reads it aloud; you can turn it off." : ""} Space pauses, arrows skip, Esc ends.</p>
          <button className="rv-btn rv-btn-primary ml-auto" onClick={() => { setStarted(true); setPlaying(true); }}>Start the tour<Icon name="play" size={16} filled /></button>
        </div>
      )}
    </div>
  );
}
