"use client";

import { useMemo, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";

interface ECGParams {
  ondaP: { amplitude: number; duracao: number };
  complexoQRS: { amplitude: number; duracao: number };
  ondaT: { amplitude: number; duracao: number };
  segmentoST: { desvio: number };
  status: string;
}

interface ECGMonitorProps {
  ecg: ECGParams;
  frequenciaCardiaca: number;
  width?: number;
  height?: number;
  className?: string;
  /** Show compact version (e.g., inside a card) */
  compact?: boolean;
}

// ---------------------------------------------------------------------------
// Realistic ECG waveform generator using cubic bezier curves
// ---------------------------------------------------------------------------

/** Generate a single realistic PQRST complex as [x, y] points */
function generatePQRSTPoints(
  ecg: ECGParams,
  startX: number,
  baseline: number,
  cycleWidth: number,
): [number, number][] {
  const points: [number, number][] = [];

  // Scale factors from real ECG parameters
  const pAmp = ecg.ondaP.amplitude * 10;       // P wave height (mV → px)
  const pDur = ecg.ondaP.duracao * 80;          // P wave width (s → px)
  const qrsAmp = ecg.complexoQRS.amplitude * 18; // QRS height
  const qrsDur = ecg.complexoQRS.duracao * 80;  // QRS width
  const tAmp = ecg.ondaT.amplitude * 12;        // T wave height
  const tDur = ecg.ondaT.duracao * 60;          // T wave width
  const stDev = ecg.segmentoST.desvio * 6;      // ST deviation

  let x = startX;
  const segmentGap = cycleWidth * 0.04;

  // TP segment (flat baseline at start)
  const tpLen = cycleWidth * 0.08;
  for (let i = 0; i <= 8; i++) {
    points.push([x + (tpLen / 8) * i, baseline]);
  }
  x += tpLen;

  // --- P wave (smooth dome) ---
  const pSteps = 20;
  for (let i = 0; i <= pSteps; i++) {
    const t = i / pSteps;
    const px = x + t * pDur;
    // Gaussian-like shape for P wave
    const gaussian = Math.exp(-Math.pow((t - 0.5) * 3.5, 2));
    const py = baseline - pAmp * gaussian;
    points.push([px, py]);
  }
  x += pDur;

  // PR segment (flat)
  const prLen = segmentGap + cycleWidth * 0.04;
  for (let i = 0; i <= 4; i++) {
    points.push([x + (prLen / 4) * i, baseline]);
  }
  x += prLen;

  // --- QRS complex ---
  const qSteps = 6;
  const qDepth = qrsAmp * 0.12;

  // Q wave (small dip)
  const qLen = qrsDur * 0.15;
  for (let i = 1; i <= qSteps; i++) {
    const t = i / qSteps;
    const qx = x + t * qLen;
    const qy = baseline + qDepth * Math.sin(t * Math.PI);
    points.push([qx, qy]);
  }
  x += qLen;

  // R wave (sharp spike up)
  const rUpLen = qrsDur * 0.2;
  const rSteps = 8;
  for (let i = 1; i <= rSteps; i++) {
    const t = i / rSteps;
    const rx = x + t * rUpLen;
    // Steep rise with slight curve
    const ry = baseline + qDepth * (1 - t) - qrsAmp * Math.pow(t, 0.8);
    points.push([rx, ry]);
  }
  x += rUpLen;

  // R peak to S wave (sharp descent)
  const rDownLen = qrsDur * 0.35;
  const sDepth = qrsAmp * 0.2;
  const sSteps = 10;
  for (let i = 1; i <= sSteps; i++) {
    const t = i / sSteps;
    const sx = x + t * rDownLen;
    // From R peak through baseline to S depth
    const peak = baseline - qrsAmp;
    const sTarget = baseline + sDepth;
    const sy = peak + (sTarget - peak) * Math.pow(t, 0.7);
    points.push([sx, sy]);
  }
  x += rDownLen;

  // S wave recovery to baseline (+ ST deviation)
  const sRecLen = qrsDur * 0.3;
  const sRecSteps = 6;
  for (let i = 1; i <= sRecSteps; i++) {
    const t = i / sRecSteps;
    const srx = x + t * sRecLen;
    const sry = baseline + sDepth * (1 - Math.pow(t, 0.5)) - stDev * t;
    points.push([srx, sry]);
  }
  x += sRecLen;

  // --- ST segment (flat, may be deviated) ---
  const stLen = cycleWidth * 0.08;
  for (let i = 0; i <= 6; i++) {
    const t = i / 6;
    points.push([x + t * stLen, baseline - stDev]);
  }
  x += stLen;

  // --- T wave (broader, asymmetric dome) ---
  const tSteps = 24;
  for (let i = 0; i <= tSteps; i++) {
    const t = i / tSteps;
    const tx = x + t * tDur;
    // Asymmetric bell: rises faster than it falls
    const skew = t < 0.4
      ? Math.pow(t / 0.4, 1.2)
      : Math.pow((1 - t) / 0.6, 1.5);
    const tDeviation = stDev * (1 - t); // smooth return from ST deviation
    const ty = baseline - tAmp * skew - tDeviation;
    points.push([tx, ty]);
  }
  x += tDur;

  // --- U wave (optional, very small) ---
  const uLen = cycleWidth * 0.05;
  const uAmp = pAmp * 0.2;
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    const ux = x + t * uLen;
    const uy = baseline - uAmp * Math.exp(-Math.pow((t - 0.5) * 4, 2));
    points.push([ux, uy]);
  }
  x += uLen;

  // Trailing baseline to end of cycle
  const remaining = startX + cycleWidth - x;
  if (remaining > 0) {
    for (let i = 0; i <= 4; i++) {
      points.push([x + (remaining / 4) * i, baseline]);
    }
  }

  return points;
}

/** Convert points to SVG path with smooth curves */
function pointsToSmoothPath(allPoints: [number, number][]): string {
  if (allPoints.length < 2) return "";

  let d = `M${allPoints[0][0].toFixed(1)},${allPoints[0][1].toFixed(1)}`;

  for (let i = 1; i < allPoints.length; i++) {
    const prev = allPoints[i - 1];
    const curr = allPoints[i];
    const next = allPoints[i + 1];

    if (next) {
      // Smooth curve using quadratic bezier
      const cpx = curr[0];
      const cpy = curr[1];
      const endX = (curr[0] + next[0]) / 2;
      const endY = (curr[1] + next[1]) / 2;
      d += ` Q${cpx.toFixed(1)},${cpy.toFixed(1)} ${endX.toFixed(1)},${endY.toFixed(1)}`;
      i++; // skip the next point since we used it
    } else {
      d += ` L${curr[0].toFixed(1)},${curr[1].toFixed(1)}`;
    }
  }

  return d;
}

/** Build multi-cycle ECG path */
function generateECGPath(ecg: ECGParams, width: number, height: number, cycles: number): string {
  const baseline = height * 0.55;
  const cycleWidth = width / cycles;
  const allPoints: [number, number][] = [];

  for (let c = 0; c < cycles; c++) {
    const pts = generatePQRSTPoints(ecg, c * cycleWidth, baseline, cycleWidth);
    allPoints.push(...pts);
  }

  return pointsToSmoothPath(allPoints);
}

function getStatusColor(status: string): string {
  const s = status.toLowerCase();
  if (s.includes("normal") || s.includes("sinusal") || s.includes("estavel") || s.includes("estável")) return "#10B981";
  if (s.includes("alter") || s.includes("warning") || s.includes("pendente")) return "#F59E0B";
  return "#EF4444";
}

function getStatusLabel(status: string): string {
  const s = status.toLowerCase();
  if (s.includes("normal") || s.includes("sinusal")) return "Ritmo Sinusal";
  if (s.includes("pendente")) return "Pendente";
  if (s.includes("taqui")) return "Taquicardia";
  if (s.includes("bradi")) return "Bradicardia";
  if (s.includes("fibri")) return "Fibrilação";
  if (s.includes("alter")) return "Alterado";
  return status;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ECGMonitor({
  ecg,
  frequenciaCardiaca,
  width = 360,
  height = 120,
  className = "",
  compact = false,
}: ECGMonitorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const offsetRef = useRef(0);

  const color = getStatusColor(ecg.status);
  const statusLabel = getStatusLabel(ecg.status);
  const cycles = compact ? 2 : 3;

  // Generate path points for canvas-based scrolling
  const allPoints = useMemo(() => {
    const baseline = height * 0.55;
    const cycleWidth = width / cycles;
    const pts: [number, number][] = [];
    // Generate extra cycles for seamless scrolling
    for (let c = 0; c < cycles + 2; c++) {
      pts.push(...generatePQRSTPoints(ecg, c * cycleWidth, baseline, cycleWidth));
    }
    return pts;
  }, [ecg, width, height, cycles]);

  // SVG path for static fallback
  const svgPath = useMemo(() => generateECGPath(ecg, width, height, cycles), [ecg, width, height, cycles]);

  // Canvas-based scrolling animation
  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Speed: pixels per frame (faster HR = faster scroll)
    const speed = Math.max(0.4, (frequenciaCardiaca / 75) * 0.8);
    offsetRef.current = (offsetRef.current + speed) % (width);

    ctx.clearRect(0, 0, width, height);

    // Draw grid (ECG paper style)
    // Small squares
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 0.5;
    const smallGrid = height / 20;
    for (let i = 0; i <= 20; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * smallGrid);
      ctx.lineTo(width, i * smallGrid);
      ctx.stroke();
    }
    for (let i = 0; i <= width / smallGrid; i++) {
      ctx.beginPath();
      ctx.moveTo(i * smallGrid, 0);
      ctx.lineTo(i * smallGrid, height);
      ctx.stroke();
    }
    // Large squares (every 5th)
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 0.5;
    const bigGrid = smallGrid * 5;
    for (let i = 0; i <= height / bigGrid; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * bigGrid);
      ctx.lineTo(width, i * bigGrid);
      ctx.stroke();
    }
    for (let i = 0; i <= width / bigGrid; i++) {
      ctx.beginPath();
      ctx.moveTo(i * bigGrid, 0);
      ctx.lineTo(i * bigGrid, height);
      ctx.stroke();
    }

    // Draw ECG trace with scrolling offset
    if (allPoints.length > 1) {
      const off = offsetRef.current;

      // Glow layer
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.strokeStyle = color;
      ctx.lineWidth = 5;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.filter = "blur(3px)";
      ctx.beginPath();
      let first = true;
      for (const [px, py] of allPoints) {
        const sx = px - off;
        if (sx < -20 || sx > width + 20) continue;
        if (first) { ctx.moveTo(sx, py); first = false; }
        else ctx.lineTo(sx, py);
      }
      ctx.stroke();
      ctx.restore();

      // Main trace
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.globalAlpha = 1;
      ctx.beginPath();
      first = true;
      for (const [px, py] of allPoints) {
        const sx = px - off;
        if (sx < -20 || sx > width + 20) continue;
        if (first) { ctx.moveTo(sx, py); first = false; }
        else ctx.lineTo(sx, py);
      }
      ctx.stroke();

      // Leading dot (bright point at the writing edge)
      const leadX = width * 0.92;
      let leadY = height * 0.55;
      let minDist = Infinity;
      for (const [px, py] of allPoints) {
        const sx = px - off;
        const dist = Math.abs(sx - leadX);
        if (dist < minDist) {
          minDist = dist;
          leadY = py;
        }
      }
      ctx.beginPath();
      ctx.arc(leadX, leadY, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.9;
      ctx.fill();

      // Fade-out zone at the leading edge
      const fadeGrad = ctx.createLinearGradient(width * 0.85, 0, width, 0);
      fadeGrad.addColorStop(0, "rgba(0,0,0,0)");
      fadeGrad.addColorStop(1, "rgba(0,0,0,0.9)");
      ctx.fillStyle = fadeGrad;
      ctx.globalAlpha = 1;
      ctx.fillRect(width * 0.85, 0, width * 0.15, height);
    }

    animRef.current = requestAnimationFrame(drawFrame);
  }, [allPoints, width, height, color, frequenciaCardiaca]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(drawFrame);
    return () => cancelAnimationFrame(animRef.current);
  }, [drawFrame]);

  const h = compact ? height * 0.8 : height;

  return (
    <div className={`rounded-lg border border-border/30 bg-black/95 overflow-hidden ${className}`}>
      {/* Monitor header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-black/50">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold tracking-widest" style={{ color }}>
            ECG II
          </span>
          <span className="text-[9px] font-mono text-white/40">
            25mm/s · 10mm/mV
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ color, backgroundColor: `${color}15` }}>
            {statusLabel}
          </span>
        </div>
      </div>

      {/* ECG trace (canvas for smooth scrolling) */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          style={{ width, height: h }}
          className="w-full"
        />

        {/* Fallback SVG for SSR / no canvas */}
        <noscript>
          <svg
            width={width}
            height={h}
            viewBox={`0 0 ${width} ${h}`}
            fill="none"
            className="w-full"
          >
            <path d={svgPath} stroke={color} strokeWidth="2" fill="none" />
          </svg>
        </noscript>
      </div>

      {/* Monitor footer with vitals */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-black/50 border-t border-white/5">
        <div className="flex items-center gap-1.5">
          <motion.div
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 60 / Math.max(frequenciaCardiaca, 40), repeat: Infinity }}
          >
            <Heart className="h-3 w-3" style={{ color, fill: color }} />
          </motion.div>
          <span className="text-sm font-mono font-bold" style={{ color }}>
            {frequenciaCardiaca}
          </span>
          <span className="text-[9px] font-mono text-white/40">bpm</span>
        </div>

        <div className="flex items-center gap-3 text-[9px] font-mono text-white/30">
          {ecg.segmentoST.desvio !== 0 && (
            <span className={ecg.segmentoST.desvio > 0 ? "text-red-400" : "text-yellow-400"}>
              ST {ecg.segmentoST.desvio > 0 ? "+" : ""}{ecg.segmentoST.desvio.toFixed(1)}mm
            </span>
          )}
          <span>P: {ecg.ondaP.amplitude.toFixed(1)}mV</span>
          <span>QRS: {(ecg.complexoQRS.duracao * 1000).toFixed(0)}ms</span>
        </div>
      </div>
    </div>
  );
}
