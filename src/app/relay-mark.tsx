// Logo de Relay: dos círculos que se pasan el relevo (se usa para generar los iconos)
export function RelayMark({ px }: { px: number }) {
  const r = px * 0.26;
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#1e3b35" }}>
      <div style={{ width: r * 2, height: r * 2, borderRadius: r, background: "#eef0eb", marginRight: -r * 0.55 }} />
      <div style={{ width: r * 2, height: r * 2, borderRadius: r, background: "#d9952b", opacity: 0.92 }} />
    </div>
  );
}
