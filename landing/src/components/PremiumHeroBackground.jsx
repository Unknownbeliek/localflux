// import { motion } from "framer-motion";

// /* ✅ PRE-GENERATED DATA (CRITICAL FIX) */
// const particles = Array.from({ length: 50 }).map(() => ({
//   size: 2 + Math.random() * 4,
//   left: Math.random() * 100,
//   top: Math.random() * 100,
//   moveY: -60 - Math.random() * 40,
//   moveX1: -10 + Math.random() * 20,
//   moveX2: 10 + Math.random() * 20,
//   duration: 8 + Math.random() * 4,
//   delay: Math.random() * 5,
//   type: Math.floor(Math.random() * 3),
// }));

// const orbs = Array.from({ length: 6 }).map(() => ({
//   size: 150 + Math.random() * 250,
//   left: Math.random() * 100,
//   top: Math.random() * 100,
//   moveX: 30 - Math.random() * 60,
//   moveY: 30 - Math.random() * 60,
//   duration: 15 + Math.random() * 10,
//   delay: Math.random() * 5,
//   type: Math.floor(Math.random() * 3),
// }));

// const nodes = Array.from({ length: 12 }).map(() => ({
//   x: 10 + Math.random() * 80,
//   y: 10 + Math.random() * 80,
// }));

// export default function PremiumHeroBackground() {
//   return (
//     <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">

//       {/* Base */}
//       <div
//         className="absolute inset-0"
//         style={{
//           background: "linear-gradient(180deg, #050816 0%, #0B1220 50%, #050816 100%)",
//         }}
//       />

//       {/* Vignette */}
//       <div
//         className="absolute inset-0"
//         style={{
//           background:
//             "radial-gradient(ellipse at center, transparent 0%, rgba(5,8,22,0.8) 80%, rgba(5,8,22,1) 100%)",
//         }}
//       />

//       {/* Grid */}
//       <div className="absolute inset-0 opacity-10">
//         <div
//           className="absolute inset-0"
//           style={{
//             backgroundImage: `
//               linear-gradient(to right, rgba(0,255,198,0.15) 1px, transparent 1px),
//               linear-gradient(to bottom, rgba(0,255,198,0.15) 1px, transparent 1px)
//             `,
//             backgroundSize: "100px 100px",
//             maskImage: "radial-gradient(ellipse at center, black 0%, transparent 70%)",
//             WebkitMaskImage: "radial-gradient(ellipse at center, black 0%, transparent 70%)",
//           }}
//         />
//       </div>

//       {/* Main Glow */}
//       <motion.div
//         className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[800px]"
//         style={{
//           background:
//             "radial-gradient(ellipse at center, rgba(0,255,198,0.15), rgba(0,224,255,0.1), transparent)",
//           filter: "blur(80px)",
//         }}
//         animate={{ scale: [1, 1.1, 1], opacity: [0.6, 0.8, 0.6] }}
//         transition={{ duration: 4, repeat: Infinity }}
//       />

//       {/* Secondary Glow */}
//       <motion.div
//         className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px]"
//         style={{
//           background: "radial-gradient(circle, rgba(0,224,255,0.2), transparent)",
//           filter: "blur(100px)",
//         }}
//         animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.6, 0.4] }}
//         transition={{ duration: 5, repeat: Infinity }}
//       />

//       {/* Purple Glow */}
//       <motion.div
//         className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px]"
//         style={{
//           background: "radial-gradient(circle, rgba(139,92,246,0.08), transparent)",
//           filter: "blur(120px)",
//         }}
//         animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
//         transition={{ duration: 6, repeat: Infinity }}
//       />

//       {/* Light Rays */}
//       {[...Array(5)].map((_, i) => (
//         <motion.div
//           key={i}
//           className="absolute top-0 left-1/2"
//           style={{
//             width: "2px",
//             height: "100%",
//             background: `linear-gradient(180deg, transparent, rgba(0,255,198,${0.1 +
//               i * 0.05}), transparent)`,
//             transform: `translateX(-50%) rotate(${-20 + i * 10}deg)`,
//           }}
//           animate={{ opacity: [0.2, 0.4, 0.2] }}
//           transition={{ duration: 3 + i * 0.5, repeat: Infinity }}
//         />
//       ))}

//       {/* PARTICLES (FIXED) */}
//       {particles.map((p, i) => (
//         <motion.div
//           key={i}
//           className="absolute rounded-full"
//           style={{
//             width: p.size,
//             height: p.size,
//             left: `${p.left}%`,
//             top: `${p.top}%`,
//             background:
//               p.type === 0
//                 ? "rgba(0,255,198,0.8)"
//                 : p.type === 1
//                 ? "rgba(0,224,255,0.8)"
//                 : "rgba(139,92,246,0.6)",
//             boxShadow:
//               p.type === 0
//                 ? "0 0 15px rgba(0,255,198,1)"
//                 : p.type === 1
//                 ? "0 0 15px rgba(0,224,255,1)"
//                 : "0 0 15px rgba(139,92,246,0.8)",
//           }}
//           animate={{
//             y: [0, p.moveY, 0],
//             x: [p.moveX1, p.moveX2, p.moveX1],
//             opacity: [0.2, 0.8, 0.2],
//           }}
//           transition={{
//             duration: p.duration,
//             repeat: Infinity,
//             delay: p.delay,
//           }}
//         />
//       ))}

//       {/* NETWORK NODES */}
//       <svg className="absolute inset-0 w-full h-full opacity-30">
//         {nodes.map((n, i) => (
//           <motion.circle
//             key={i}
//             cx={`${n.x}%`}
//             cy={`${n.y}%`}
//             r="3"
//             fill="rgba(0,255,198,0.8)"
//             animate={{ opacity: [0.3, 0.8, 0.3], r: [3, 5, 3] }}
//             transition={{ duration: 3, repeat: Infinity }}
//           />
//         ))}
//       </svg>

//       {/* ORBS */}
//       {orbs.map((o, i) => (
//         <motion.div
//           key={i}
//           className="absolute rounded-full"
//           style={{
//             width: o.size,
//             height: o.size,
//             left: `${o.left}%`,
//             top: `${o.top}%`,
//             background:
//               o.type === 0
//                 ? "radial-gradient(circle, rgba(0,255,198,0.15), transparent)"
//                 : o.type === 1
//                 ? "radial-gradient(circle, rgba(0,224,255,0.15), transparent)"
//                 : "radial-gradient(circle, rgba(139,92,246,0.1), transparent)",
//             filter: "blur(70px)",
//           }}
//           animate={{
//             x: [0, o.moveX, 0],
//             y: [0, o.moveY, 0],
//             scale: [1, 1.2, 1],
//           }}
//           transition={{
//             duration: o.duration,
//             repeat: Infinity,
//             delay: o.delay,
//           }}
//         />
//       ))}

//       {/* Bloom */}
//       <motion.div
//         className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[1400px] h-[1000px]"
//         style={{
//           background:
//             "radial-gradient(ellipse, rgba(0,255,198,0.05), transparent)",
//           filter: "blur(150px)",
//         }}
//         animate={{ scale: [1, 1.3, 1] }}
//         transition={{ duration: 8, repeat: Infinity }}
//       />

//       {/* Fades */}
//       <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-[#050816] to-transparent" />
//       <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#050816] to-transparent" />

//       {/* Scanlines */}
//       <div
//         className="absolute inset-0 opacity-5"
//         style={{
//           backgroundImage:
//             "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,198,0.03) 2px)",
//         }}
//       />
//     </div>
//   );
// }