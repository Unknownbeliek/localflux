export function LightBackground() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #030712 0%, #020617 45%, #030712 100%)",
        }}
      />

      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 35%, rgba(3,7,18,0.45) 100%)",
        }}
      />
    </div>
  );
}