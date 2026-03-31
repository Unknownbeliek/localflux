import { motion } from "framer-motion";

export default function FallingPattern({ className = "" }) {
  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`}>
      <motion.div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(0,0,0,0.16) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
          opacity: 0.38,
        }}
        animate={{
          backgroundPosition: ["0px 0px", "0px 120px"],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      <motion.div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(0,0,0,0.12) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          opacity: 0.29,
        }}
        animate={{
          backgroundPosition: ["0px 0px", "0px 190px"],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      <motion.div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(0,0,0,0.1) 1px, transparent 1px)",
          backgroundSize: "26px 26px",
          opacity: 0.23,
        }}
        animate={{
          backgroundPosition: ["0px 0px", "0px 260px"],
        }}
        transition={{
          duration: 14,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      <motion.div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(0,0,0,0.08) 1px, transparent 1px)",
          backgroundSize: "30px 30px",
          opacity: 0.18,
        }}
        animate={{
          backgroundPosition: ["0px 0px", "0px 340px"],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "linear",
        }}
      />
    </div>
  );
}
