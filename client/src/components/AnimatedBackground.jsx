export default function AnimatedBackground() {
  return (
    <div className="animated-bg">
      {/* Floating gradient orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />
      <div className="orb orb-4" />

      {/* Slowly rotating dot grid */}
      <div className="dot-grid" />

      {/* Shimmer particles */}
      <div className="particles">
        <div className="particle" />
        <div className="particle" />
        <div className="particle" />
        <div className="particle" />
        <div className="particle" />
        <div className="particle" />
        <div className="particle" />
        <div className="particle" />
      </div>

      {/* Soft vignette */}
      <div className="vignette" />
    </div>
  );
}
