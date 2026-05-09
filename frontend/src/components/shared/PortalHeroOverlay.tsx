import { useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useLocation } from "react-router";

/**
 * PortalHeroOverlay
 * Animated heartbeat / ECG background for patient, doctor, and admin portals.
 * Fully pointer-events-none — never blocks UI interaction.
 */
export default function PortalHeroOverlay() {
  const location = useLocation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  const isPatient = location.pathname.startsWith("/patient");
  const isDoctor  = location.pathname.startsWith("/doctor");
  const isAdmin   = location.pathname.startsWith("/admin");

  // Role-based accent color
  const accent = useMemo(() => {
    if (isAdmin) return { r: 139, g: 92,  b: 246 };  // purple
    if (isDoctor) return { r: 14,  g: 165, b: 233 };  // sky
    return { r: 13,  g: 148, b: 136 }; // teal
  }, [isAdmin, isDoctor]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const { r, g, b } = accent;

    // ── ECG / heartbeat path generator ──────────────────────────
    // Returns an array of {x, y} points for one ECG cycle
    const ecgCycle = (startX: number, y: number, scale: number) => {
      const s = scale;
      return [
        { x: startX,          y },
        { x: startX + 20 * s, y },
        { x: startX + 25 * s, y: y - 8  * s },
        { x: startX + 30 * s, y: y + 4  * s },
        { x: startX + 35 * s, y: y - 40 * s }, // P wave
        { x: startX + 40 * s, y: y + 60 * s }, // QRS spike
        { x: startX + 45 * s, y: y - 20 * s }, // S wave
        { x: startX + 55 * s, y: y + 10 * s }, // T wave
        { x: startX + 65 * s, y },
        { x: startX + 100 * s, y },
      ];
    };

    // Multiple ECG lines at different vertical positions
    type EcgLine = {
      y: number;
      offset: number;
      speed: number;
      scale: number;
      alpha: number;
    };

    const lines: EcgLine[] = Array.from({ length: 5 }, (_, i) => ({
      y:      (canvas.height / 6) * (i + 1),
      offset: Math.random() * 600,
      speed:  0.6 + Math.random() * 0.8,
      scale:  0.4 + Math.random() * 0.5,
      alpha:  0.06 + Math.random() * 0.08,
    }));

    // Floating particles
    const particles = Array.from({ length: 20 }, () => ({
      x:      Math.random() * window.innerWidth,
      y:      Math.random() * window.innerHeight,
      vx:     (Math.random() - 0.5) * 0.25,
      vy:     (Math.random() - 0.5) * 0.25,
      radius: Math.random() * 1.8 + 0.4,
      alpha:  Math.random() * 0.15 + 0.04,
      pulse:  Math.random() * Math.PI * 2,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // ── Draw ECG lines ──────────────────────────────────────
      lines.forEach((line) => {
        line.offset += line.speed;
        if (line.offset > 700) line.offset = -200;

        const cycleWidth = 100 * line.scale;
        const startX = line.offset - cycleWidth;

        ctx.beginPath();
        ctx.strokeStyle = `rgba(${r},${g},${b},${line.alpha})`;
        ctx.lineWidth = 1.2;
        ctx.lineJoin = "round";
        ctx.lineCap  = "round";

        // Draw 3 cycles across the screen
        for (let c = -1; c < Math.ceil(canvas.width / cycleWidth) + 2; c++) {
          const pts = ecgCycle(startX + c * cycleWidth, line.y, line.scale);
          pts.forEach((pt, i) => {
            if (i === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          });
        }
        ctx.stroke();

        // Glowing dot at the "live" position
        const liveX = line.offset % canvas.width;
        const glowAlpha = line.alpha * 4;
        ctx.beginPath();
        ctx.arc(liveX, line.y, 3 * line.scale, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${glowAlpha})`;
        ctx.fill();

        // Glow halo
        const grad = ctx.createRadialGradient(liveX, line.y, 0, liveX, line.y, 12 * line.scale);
        grad.addColorStop(0, `rgba(${r},${g},${b},${glowAlpha * 0.5})`);
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.beginPath();
        ctx.arc(liveX, line.y, 12 * line.scale, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      });

      // ── Draw particles ──────────────────────────────────────
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.pulse += 0.015;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        const a = p.alpha * (0.6 + 0.4 * Math.sin(p.pulse));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
        ctx.fill();
      });

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [location.pathname, accent]);

  if (!isPatient && !isDoctor && !isAdmin) return null;

  const { r, g, b } = accent;

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* ECG canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Ambient gradient blobs — fade in/out on route change */}
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="absolute inset-0"
        >
          <motion.div
            className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full blur-[130px]"
            style={{ background: `rgba(${r},${g},${b},0.06)` }}
            animate={{ scale: [1, 1.1, 1], x: [0, 15, 0] }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -bottom-40 -right-40 w-[700px] h-[700px] rounded-full blur-[150px]"
            style={{ background: `rgba(${r},${g},${b},0.04)` }}
            animate={{ scale: [1, 1.08, 1], x: [0, -12, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 3 }}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
