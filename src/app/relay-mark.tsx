// Logo: dos círculos que se pasan el relevo (se usa para generar los iconos). Con los colores de Relevo
export function RelayMark({ px }: { px: number }) {
  const r = px * 0.26;
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0e6b5c" }}>
      <div style={{ width: r * 2, height: r * 2, borderRadius: r, background: "#f5f6f3", marginRight: -r * 0.55 }} />
      <div style={{ width: r * 2, height: r * 2, borderRadius: r, background: "#9fd3c4", opacity: 0.92 }} />
    </div>
  );
}
