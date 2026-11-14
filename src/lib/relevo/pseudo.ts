// Seudónimos: el texto de las notas se transcribe en el móvil y, antes de salir de él, los nombres se cambian por
// seudónimos. Al servidor y a Gemini solo llega el texto seudonimizado; cada app vuelve a poner los nombres al mostrarlo.
export const PSEUDO: Record<string, string> = {
  Luis: "⟨P-41⟩", Pablo: "⟨P-17⟩", Marta: "⟨P-08⟩", Sara: "⟨P-23⟩", Helmi: "⟨P-52⟩", Eero: "⟨P-66⟩", Sanna: "⟨P-31⟩", Juho: "⟨P-74⟩", Noora: "⟨P-90⟩",
};
export function hideNames(text: string) {
  let out = text;
  for (const [name, token] of Object.entries(PSEUDO)) out = out.replace(new RegExp(`\\b${name}\\b`, "gi"), token);
  return out;
}
export function revealNames(text: string) {
  let out = text;
  for (const [name, token] of Object.entries(PSEUDO)) out = out.split(token).join(name);
  return out;
}
