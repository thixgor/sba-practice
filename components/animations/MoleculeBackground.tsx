"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface Molecule {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  bonds: number[];
}

export function MoleculeBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const moleculesRef = useRef<Molecule[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Initialize molecules
    const count = Math.floor((canvas.width * canvas.height) / 25000);
    moleculesRef.current = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      radius: Math.random() * 2.5 + 1.5,
      bonds: [],
    }));

    const animate = () => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const molecules = moleculesRef.current;
      const connectionDistance = 150;

      // Update positions
      for (const mol of molecules) {
        mol.x += mol.vx;
        mol.y += mol.vy;

        if (mol.x < 0 || mol.x > canvas.width) mol.vx *= -1;
        if (mol.y < 0 || mol.y > canvas.height) mol.vy *= -1;

        mol.x = Math.max(0, Math.min(canvas.width, mol.x));
        mol.y = Math.max(0, Math.min(canvas.height, mol.y));
      }

      // Draw bonds
      for (let i = 0; i < molecules.length; i++) {
        for (let j = i + 1; j < molecules.length; j++) {
          const dx = molecules[i].x - molecules[j].x;
          const dy = molecules[i].y - molecules[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < connectionDistance) {
            const opacity = (1 - dist / connectionDistance) * 0.15;
            ctx.beginPath();
            ctx.moveTo(molecules[i].x, molecules[i].y);
            ctx.lineTo(molecules[j].x, molecules[j].y);
            ctx.strokeStyle = `rgba(1, 178, 187, ${opacity})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      // Draw molecules
      for (const mol of molecules) {
        // Outer glow
        const gradient = ctx.createRadialGradient(
          mol.x,
          mol.y,
          0,
          mol.x,
          mol.y,
          mol.radius * 4
        );
        gradient.addColorStop(0, "rgba(1, 178, 187, 0.2)");
        gradient.addColorStop(1, "rgba(1, 178, 187, 0)");
        ctx.beginPath();
        ctx.arc(mol.x, mol.y, mol.radius * 4, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Core
        ctx.beginPath();
        ctx.arc(mol.x, mol.y, mol.radius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(1, 178, 187, 0.6)";
        ctx.fill();
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <motion.canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.5 }}
    />
  );
}
