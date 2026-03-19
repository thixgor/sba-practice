"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  MapPin,
  Phone,
  Clock,
  Mail,
  Activity,
  ShieldCheck,
  FileText,
  MonitorDot,
  LogIn,
  UserPlus,
  GraduationCap,
  Award,
  CreditCard,
  Users,
  BookOpen,
  Stethoscope,
  Heart,
  Syringe,
  Menu,
  X,
} from "lucide-react";

/* ──────────────────────────────────────────────────────────────────────
   CONSTANTS
   ────────────────────────────────────────────────────────────────────── */

const STATS = [
  { value: 78, suffix: "", label: "Anos de História", icon: Award },
  { value: 121, suffix: "", label: "Centros de Ensino e Treinamento", icon: GraduationCap },
  { value: 700, suffix: "+", label: "Novos Anestesiologistas/Ano", icon: Users },
  { value: 100, suffix: "%", label: "TEA e TSA Oficiais", icon: ShieldCheck },
];

const FEATURES = [
  {
    icon: Activity,
    title: "Cursos Estruturados",
    description:
      "Acompanhamento longitudinal de performance com pré e pós-testes vinculados aos cursos oficiais da SBA.",
  },
  {
    icon: ShieldCheck,
    title: "Avaliações Seguras",
    description:
      "Ambiente protegido com criptografia ponta-a-ponta, controle de acesso por protocolo e validação antifraude.",
  },
  {
    icon: MonitorDot,
    title: "Provas de Vídeo",
    description:
      "Avaliações interativas com conteúdo audiovisual controlado e questões contextualizadas em tempo real.",
  },
  {
    icon: FileText,
    title: "Relatórios & Certificados",
    description:
      "Relatórios detalhados com gráficos de evolução, PDF oficial com QR code e protocolo de verificação.",
  },
];

const TIMELINE_EVENTS = [
  { year: "1948", label: "Fundação da SBA", description: "Rio de Janeiro" },
  { year: "1964", label: "Primeiro CET", description: "Centro de Ensino e Treinamento" },
  { year: "1968", label: "Primeiro CBA", description: "Congresso Brasileiro de Anestesiologia" },
  { year: "1981", label: "TEA / TSA", description: "Título e Certificação Oficial" },
];

const COURSES = [
  {
    title: "Controle da Via Aérea para Anestesistas",
    description: "Técnicas avançadas de manejo da via aérea em cenários de rotina e emergência.",
    icon: Stethoscope,
    tag: "Presencial",
  },
  {
    title: "TIVA — Anestesia Venosa Total",
    description: "Fundamentos e prática clínica da anestesia intravenosa total com modelos farmacocinéticos.",
    icon: Syringe,
    tag: "Híbrido",
  },
  {
    title: "ETTI — Ecocardiografia Transesofágica",
    description: "Treinamento intensivo em ecocardiografia perioperatória para anestesiologistas.",
    icon: Heart,
    tag: "Presencial",
  },
  {
    title: "Simulação em Anestesiologia",
    description: "Cenários de alta fidelidade com debriefing estruturado e avaliação de competências.",
    icon: MonitorDot,
    tag: "Online",
  },
];

const BENEFITS = [
  { icon: GraduationCap, title: "Educação Contínua", description: "Acesso aos cursos e eventos oficiais da SBA com conteúdo atualizado." },
  { icon: Award, title: "Certificações Oficiais", description: "TEA, TSA e certificações reconhecidas em todo o território nacional." },
  { icon: ShieldCheck, title: "Defesa Profissional", description: "Representação e defesa dos interesses da classe anestesiológica." },
  { icon: CreditCard, title: "Clube de Benefícios", description: "Descontos exclusivos em produtos, serviços e eventos parceiros." },
  { icon: Users, title: "Carteirinha Digital", description: "Identificação profissional digital com QR code de verificação." },
  { icon: BookOpen, title: "Publicações Científicas", description: "Acesso à BJAN e acervo científico com indexação internacional." },
];

const PARTNERS = [
  {
    name: "Cristália",
    href: "https://www.cristalia.com.br/",
    imageUrl: "https://www.sbahq.org/wp-content/uploads/2024/11/logo-cristalia.jpg",
  },
  {
    name: "BBraun",
    href: "https://www.bbraun.com.br/",
    imageUrl: "https://www.sbahq.org/wp-content/uploads/2024/11/logo-bbraun.jpg",
  },
  {
    name: "FRESENIUS KABI",
    href: "https://www.fresenius-kabi.com/br/",
    imageUrl: "https://www.sbahq.org/wp-content/uploads/2024/11/logo-freseniuskbi.jpg",
  },
  {
    name: "CEI Group",
    href: "https://www.ceigroup.com.br/pt-br",
    imageUrl: "https://www.sbahq.org/wp-content/uploads/2024/11/logo-cei.jpg",
  },
];

const AFFILIATES = [
  {
    name: "Afiliado 1",
    imageUrl: "https://www.sbahq.org/wp-content/themes/artedigitalv1/dist/images/afiliado1.png",
  },
  {
    name: "Afiliado 2",
    imageUrl: "https://www.sbahq.org/wp-content/themes/artedigitalv1/dist/images/afiliado2.png",
  },
  {
    name: "Afiliado 3",
    imageUrl: "https://www.sbahq.org/wp-content/themes/artedigitalv1/dist/images/afiliado3.png",
  },
];

const SOCIAL_LINKS = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/sba.anestesiologia/",
    svg: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z",
  },
  {
    label: "Facebook",
    href: "https://www.facebook.com/sba.sociedade/",
    svg: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/user/SBAwebtv",
    svg: "M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/sba-sociedade/",
    svg: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
  },
  {
    label: "X",
    href: "https://x.com/SbaSociedade",
    svg: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  },
];

const NAV_LINKS = [
  { label: "Sobre", href: "#sobre" },
  { label: "Estatísticas", href: "#estatisticas" },
  { label: "Academia", href: "#academia" },
  { label: "Benefícios", href: "#beneficios" },
  { label: "Contato", href: "#contato" },
];

/* ──────────────────────────────────────────────────────────────────────
   HOOKS
   ────────────────────────────────────────────────────────────────────── */

/** Scroll-reveal via IntersectionObserver */
function useFadeIn() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.classList.add("landing-visible");
          io.unobserve(el);
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

function FadeIn({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useFadeIn();
  return (
    <div
      ref={ref}
      className={`landing-fade-in ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/** Animated counter — counts up when element enters viewport */
function useAnimatedCounter(target: number, duration = 2000) {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !hasStarted) {
          setHasStarted(true);
          io.unobserve(el);
        }
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasStarted]);

  useEffect(() => {
    if (!hasStarted) return;
    const start = performance.now();
    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo for a satisfying deceleration
      const eased = 1 - Math.pow(2, -10 * progress);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [hasStarted, target, duration]);

  return { count, ref };
}

/* ──────────────────────────────────────────────────────────────────────
   SUB-COMPONENTS
   ────────────────────────────────────────────────────────────────────── */

/** ECG wave SVG — elegant heartbeat line */
function ECGWaveLine({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 600 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <path
        d="M0 40 L80 40 L95 40 L105 15 L115 65 L125 10 L135 55 L145 40 L160 40 L240 40 L255 40 L265 15 L275 65 L285 10 L295 55 L305 40 L320 40 L400 40 L415 40 L425 15 L435 65 L445 10 L455 55 L465 40 L480 40 L560 40 L600 40"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="ecg-path"
      />
    </svg>
  );
}

/** Deterministic pseudo-random seed for SSR-safe particles */
function seededRandom(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

/** Pre-computed particle data (deterministic — avoids hydration mismatch) */
const PARTICLES = Array.from({ length: 20 }).map((_, i) => ({
  width: 3 + seededRandom(i * 4 + 1) * 5,
  height: 3 + seededRandom(i * 4 + 2) * 5,
  left: seededRandom(i * 4 + 3) * 100,
  bottom: seededRandom(i * 4 + 4) * 10,
  duration: 12 + seededRandom(i * 4 + 5) * 18,
  delay: seededRandom(i * 4 + 6) * 15,
}));

/** Floating particles — CSS driven, subtle oxygen bubbles */
function FloatingParticles() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {PARTICLES.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white/[0.07]"
          style={{
            width: `${p.width}px`,
            height: `${p.height}px`,
            left: `${p.left}%`,
            bottom: `-${p.bottom}%`,
            animation: `particle-float ${p.duration}s linear infinite`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

/** Stat counter card */
function StatCard({ stat, index }: { stat: typeof STATS[0]; index: number }) {
  const { count, ref } = useAnimatedCounter(stat.value);
  const Icon = stat.icon;
  return (
    <FadeIn delay={index * 100}>
      <div ref={ref} className="group text-center p-6 sm:p-8">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[#00A896]/10 transition-all duration-300 group-hover:bg-[#00A896]/20 group-hover:scale-105">
          <Icon
            className="h-7 w-7 text-[#00A896] animate-breathing"
            strokeWidth={1.5}
          />
        </div>
        <span className="block font-[var(--font-display)] text-[36px] font-bold tracking-[-1px] text-[#0A2463] sm:text-[42px] counter-glow">
          {count.toLocaleString("pt-BR")}
          {stat.suffix}
        </span>
        <span className="mt-1 block text-[13px] font-medium uppercase tracking-[0.8px] text-[#4A5568]">
          {stat.label}
        </span>
      </div>
    </FadeIn>
  );
}

/* ──────────────────────────────────────────────────────────────────────
   MAIN PAGE
   ────────────────────────────────────────────────────────────────────── */

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [headerScrolled, setHeaderScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setHeaderScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on nav link click
  const handleNavClick = useCallback(() => setMobileMenuOpen(false), []);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* ─── HEADER (Fixed Navbar) ───────────────────────────────────── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          headerScrolled
            ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-[#E2E8F0]"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 sm:px-8">
          {/* Logo — SBA institutional + SBA Practice */}
          <Link href="/" className="flex items-center gap-3 group">
            <Image
              src="https://www.sbahq.org/wp-content/themes/artedigitalv1/dist/images/logo-w.svg"
              alt="SBA — Sociedade Brasileira de Anestesiologia"
              width={40}
              height={40}
              className="h-10 w-10 rounded-lg object-contain bg-[#0A2463] p-1.5 transition-transform duration-300 group-hover:scale-105"
              unoptimized
            />
            <div
              className={`hidden sm:block h-8 w-px transition-colors duration-300 ${
                headerScrolled ? "bg-[#E2E8F0]" : "bg-white/20"
              }`}
              aria-hidden="true"
            />
            <Image
              src="https://i.imgur.com/OlRtvYB.png"
              alt="SBA Practice"
              width={110}
              height={32}
              className="hidden sm:block h-8 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
              unoptimized
            />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-8">
            {NAV_LINKS.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className={`text-[13px] font-medium transition-colors duration-200 hover:text-[#00A896] ${
                  headerScrolled ? "text-[#0A2463]" : "text-white/90"
                }`}
              >
                {l.label}
              </a>
            ))}
          </nav>

          {/* Auth Buttons + Mobile Toggle */}
          <div className="flex items-center gap-2">
            <a
              href="https://anuidade.sbahq.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#E15B07] bg-transparent px-4 text-[12px] font-semibold text-[#E15B07] transition-all duration-200 hover:bg-[#E15B07] hover:text-white"
            >
              <UserPlus className="h-3.5 w-3.5" strokeWidth={2} />
              Associe-se
            </a>
            <Link
              href="/login"
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#00A896] px-5 text-[13px] font-semibold text-white transition-all duration-200 hover:bg-[#008A78] hover:shadow-lg hover:shadow-[#00A896]/20"
            >
              <LogIn className="h-4 w-4" strokeWidth={2} />
              Acesse a Academia
            </Link>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`lg:hidden ml-2 p-2 rounded-lg transition-colors ${
                headerScrolled ? "text-[#0A2463] hover:bg-[#F1F5F9]" : "text-white hover:bg-white/10"
              }`}
              aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav Dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-[#E2E8F0] shadow-lg">
            <nav className="mx-auto max-w-7xl px-5 py-4 flex flex-col gap-1">
              {NAV_LINKS.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  onClick={handleNavClick}
                  className="text-[14px] font-medium text-[#0A2463] py-2.5 px-3 rounded-lg transition-colors hover:bg-[#F1F5F9] hover:text-[#00A896]"
                >
                  {l.label}
                </a>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* ─── HERO SECTION (Full Height) ─────────────────────────────── */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-[#071B4A] via-[#0A2463] to-[#0D3B66]">
        {/* Background image overlay — surgical room ambiance */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-[0.08]"
          style={{
            backgroundImage: `url("https://images.unsplash.com/photo-1551190822-a9ce113ac100?w=1920&q=80")`,
          }}
          aria-hidden="true"
        />
        {/* Dark overlay for contrast */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#071B4A]/60 via-transparent to-[#071B4A]/80" aria-hidden="true" />

        {/* Hexagonal subtle molecular pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='49' viewBox='0 0 28 49'%3E%3Cg fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9zM0 15l12.98-7.5V0h-2v6.35L0 12.69v2.3zm0 18.5L12.98 41v8h-2v-6.85L0 35.81v-2.3zM15 0v7.5L27.99 15H28v-2.31h-.01L17 6.35V0h-2zm0 49v-8l12.99-7.5H28v2.31h-.01L17 42.15V49h-2z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
          aria-hidden="true"
        />

        {/* Floating particles */}
        <FloatingParticles />

        {/* ECG wave line — bottom of hero */}
        <div className="absolute bottom-0 left-0 right-0 h-20 text-[#00A896]/20 overflow-hidden">
          <ECGWaveLine className="w-full h-full" />
        </div>

        {/* Hero content */}
        <div className="relative z-10 mx-auto max-w-7xl w-full px-5 sm:px-8 pt-24 pb-20 lg:pt-32 lg:pb-28">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Left — Copy */}
            <div>
              <FadeIn>
                <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#00A896]/30 bg-[#00A896]/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[1.5px] text-[#00A896]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#00A896] animate-pulse" />
                  Plataforma Oficial de Prática
                </span>
              </FadeIn>

              <FadeIn delay={100}>
                <h1 className="mt-4 text-[32px] font-bold leading-[1.15] tracking-[-0.5px] text-white sm:text-[42px] lg:text-[52px]">
                  Sociedade Brasileira{" "}
                  <span className="text-[#00A896]">de Anestesiologia</span>
                </h1>
              </FadeIn>

              <FadeIn delay={200}>
                <p className="mt-6 max-w-xl text-[17px] leading-[1.7] text-[#B0C4DE] sm:text-[18px]">
                  Há 78 anos, a casa da Anestesiologia Brasileira. Plataforma
                  oficial para prática cognitiva, avaliações e acompanhamento de
                  performance nos cursos da SBA.
                </p>
              </FadeIn>

              <FadeIn delay={320}>
                <div className="mt-10 flex flex-wrap gap-4">
                  <a
                    href="https://anuidade.sbahq.org/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-[48px] items-center gap-2.5 rounded-lg bg-[#E15B07] px-7 text-[15px] font-semibold text-white transition-all duration-200 hover:bg-[#C94E06] hover:shadow-lg hover:shadow-[#E15B07]/25"
                  >
                    Associe-se agora
                    <ArrowRight className="h-4.5 w-4.5" strokeWidth={2} />
                  </a>
                  <Link
                    href="/login"
                    className="inline-flex h-[48px] items-center gap-2.5 rounded-lg bg-[#00A896] px-7 text-[15px] font-semibold text-white transition-all duration-200 hover:bg-[#008A78] hover:shadow-lg hover:shadow-[#00A896]/25"
                  >
                    Acesse a Academia SBA
                    <ArrowRight className="h-4.5 w-4.5" strokeWidth={2} />
                  </Link>
                </div>
              </FadeIn>
            </div>

            {/* Right — Hero illustration (prática simulacionista) */}
            <FadeIn delay={250} className="hidden lg:block">
              <div className="relative">
                <div className="absolute -inset-4 rounded-2xl bg-gradient-to-br from-[#00A896]/20 to-[#0A2463]/20 blur-2xl" aria-hidden="true" />
                <Image
                  src="https://i.imgur.com/bybhVIw.png"
                  alt="Prática simulacionista em anestesiologia — SBA Practice"
                  width={800}
                  height={450}
                  className="relative w-full rounded-xl border border-white/10 shadow-2xl shadow-black/30"
                  priority
                  unoptimized
                />
              </div>
            </FadeIn>
          </div>
        </div>

        {/* Subtle bottom gradient fade into next section */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#F8FAFC] to-transparent" aria-hidden="true" />
      </section>

      {/* ─── STATISTICS ──────────────────────────────────────────────── */}
      <section id="estatisticas" className="relative bg-white py-16 sm:py-24 -mt-1">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <FadeIn>
            <div className="mx-auto max-w-2xl text-center mb-12">
              <h2 className="text-[22px] font-bold tracking-[-0.4px] text-[#0A2463] sm:text-[28px]">
                Referência Nacional em Anestesiologia
              </h2>
              <p className="mt-3 text-[15px] leading-[1.6] text-[#4A5568]">
                Números que traduzem décadas de compromisso com a formação e a excelência.
              </p>
            </div>
          </FadeIn>

          <div className="grid grid-cols-2 gap-6 lg:grid-cols-4 lg:gap-8">
            {STATS.map((s, i) => (
              <StatCard key={s.label} stat={s} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── ABOUT / TIMELINE ────────────────────────────────────────── */}
      <section id="sobre" className="bg-[#F8FAFC] py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <FadeIn>
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-[22px] font-bold tracking-[-0.4px] text-[#0A2463] sm:text-[28px]">
                Sobre a SBA
              </h2>
              <p className="mt-5 text-[16px] leading-[1.75] text-[#4A5568]">
                Fundada em 1948 no Rio de Janeiro, a SBA é a entidade que forma,
                certifica, representa e inspira toda a anestesiologia brasileira.
                Com mais de sete décadas de atuação, a Sociedade é referência na
                formação de especialistas e na defesa da especialidade.
              </p>
            </div>
          </FadeIn>

          {/* Timeline */}
          <div className="relative mt-16 sm:mt-20">
            {/* Horizontal line (desktop) */}
            <div className="hidden sm:block absolute top-6 left-0 right-0 h-[2px] bg-[#E2E8F0]" aria-hidden="true" />

            <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 sm:gap-6">
              {TIMELINE_EVENTS.map((event, i) => (
                <FadeIn key={event.year} delay={i * 120}>
                  <div className="relative text-center group">
                    {/* Dot */}
                    <div className="relative z-10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border-[3px] border-[#00A896] bg-white transition-all duration-300 group-hover:bg-[#00A896] group-hover:scale-110">
                      <span className="text-[12px] font-bold text-[#00A896] transition-colors group-hover:text-white">
                        {event.year.slice(2)}
                      </span>
                    </div>
                    <h3 className="text-[20px] font-bold text-[#0A2463]">{event.year}</h3>
                    <p className="mt-1 text-[14px] font-semibold text-[#00A896]">{event.label}</p>
                    <p className="mt-1 text-[12px] text-[#4A5568]">{event.description}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── FEATURES ────────────────────────────────────────────────── */}
      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <FadeIn>
            <div className="mx-auto max-w-xl text-center">
              <h2 className="text-[22px] font-bold tracking-[-0.4px] text-[#0A2463] sm:text-[28px]">
                Funcionalidades da Plataforma
              </h2>
              <p className="mt-3 text-[15px] leading-[1.6] text-[#4A5568]">
                Ferramentas desenvolvidas para garantir excelência na formação
                continuada em anestesiologia.
              </p>
            </div>
          </FadeIn>

          <div className="mx-auto mt-12 grid max-w-5xl gap-5 sm:grid-cols-2 sm:mt-16">
            {FEATURES.map((f, i) => (
              <FadeIn key={f.title} delay={i * 80}>
                <div className="group rounded-xl border border-[#E2E8F0] bg-white p-7 sm:p-8 medical-glow">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#0A2463]/5 transition-colors duration-300 group-hover:bg-[#00A896]/10">
                    <f.icon
                      className="h-6 w-6 text-[#0A2463] transition-colors duration-300 group-hover:text-[#00A896]"
                      strokeWidth={1.5}
                    />
                  </div>
                  <h3 className="text-[16px] font-bold tracking-[-0.2px] text-[#0A2463]">
                    {f.title}
                  </h3>
                  <p className="mt-2 text-[14px] leading-[1.65] text-[#4A5568]">
                    {f.description}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ─── ACADEMIA / COURSES ──────────────────────────────────────── */}
      <section id="academia" className="bg-[#F8FAFC] py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <FadeIn>
            <div className="mx-auto max-w-xl text-center">
              <h2 className="text-[22px] font-bold tracking-[-0.4px] text-[#0A2463] sm:text-[28px]">
                Academia e Formação
              </h2>
              <p className="mt-3 text-[15px] leading-[1.6] text-[#4A5568]">
                Cursos em destaque desenvolvidos por especialistas reconhecidos
                nacionalmente.
              </p>
            </div>
          </FadeIn>

          <div className="mx-auto mt-12 grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-4 sm:mt-16">
            {COURSES.map((c, i) => (
              <FadeIn key={c.title} delay={i * 90}>
                <div className="group relative rounded-xl border border-[#E2E8F0] bg-white p-6 transition-all duration-300 hover:border-[#00A896]/30 hover:shadow-xl hover:shadow-[#00A896]/5 hover:-translate-y-1">
                  {/* Tag */}
                  <span className="absolute top-4 right-4 inline-flex items-center rounded-md bg-[#0A2463]/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.5px] text-[#0A2463]">
                    {c.tag}
                  </span>
                  {/* Icon */}
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-[#00A896]/10 transition-all duration-300 group-hover:bg-[#00A896]/20">
                    <c.icon className="h-5.5 w-5.5 text-[#00A896]" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-[15px] font-bold leading-snug text-[#0A2463] pr-12">
                    {c.title}
                  </h3>
                  <p className="mt-2 text-[13px] leading-[1.6] text-[#4A5568]">
                    {c.description}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ─── WHY JOIN / BENEFITS ──────────────────────────────────────── */}
      <section id="beneficios" className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <FadeIn>
            <div className="mx-auto max-w-xl text-center">
              <h2 className="text-[22px] font-bold tracking-[-0.4px] text-[#0A2463] sm:text-[28px]">
                Por que ser Associado SBA?
              </h2>
              <p className="mt-3 text-[15px] leading-[1.6] text-[#4A5568]">
                Benefícios exclusivos para quem faz parte da maior sociedade de
                anestesiologia do país.
              </p>
            </div>
          </FadeIn>

          <div className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3 sm:mt-16">
            {BENEFITS.map((b, i) => (
              <FadeIn key={b.title} delay={i * 70}>
                <div className="group flex gap-4 rounded-xl border border-[#E2E8F0] bg-white p-5 sm:p-6 transition-all duration-300 hover:border-[#00A896]/20 hover:shadow-md hover:shadow-[#00A896]/5">
                  <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-lg bg-[#00A896]/10 transition-colors group-hover:bg-[#00A896]/15">
                    <b.icon className="h-5 w-5 text-[#00A896]" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-bold text-[#0A2463]">{b.title}</h3>
                    <p className="mt-1 text-[13px] leading-[1.6] text-[#4A5568]">
                      {b.description}
                    </p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>

          {/* CTA */}
          <FadeIn delay={500}>
            <div className="mt-14 text-center">
              <a
                href="https://anuidade.sbahq.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-[48px] items-center gap-2.5 rounded-lg bg-[#E15B07] px-8 text-[15px] font-semibold text-white transition-all duration-200 hover:bg-[#C94E06] hover:shadow-lg hover:shadow-[#E15B07]/20"
              >
                Torne-se Associado
                <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </a>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ─── CTA BAND ────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0A2463] to-[#0D3B66]">
        {/* ECG line decoration */}
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-16 text-[#00A896]/10 overflow-hidden">
          <ECGWaveLine className="w-full h-full" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24">
          <FadeIn>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-[24px] font-bold text-white sm:text-[30px]">
                Pronto para começar?
              </h2>
              <p className="mt-4 text-[16px] leading-[1.65] text-[#B0C4DE]">
                Acesse a plataforma oficial de avaliações da SBA e acompanhe sua
                evolução profissional com relatórios detalhados e certificações.
              </p>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/login"
                  className="inline-flex h-[48px] items-center justify-center gap-2 rounded-lg bg-[#00A896] px-8 text-[15px] font-semibold text-white transition-all duration-200 hover:bg-[#008A78] hover:shadow-lg hover:shadow-[#00A896]/30"
                >
                  Acessar Sistema
                  <ArrowRight className="h-4 w-4" strokeWidth={2} />
                </Link>
                <a
                  href="https://www.sbahq.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-[48px] items-center justify-center gap-2 rounded-lg border border-white/20 px-8 text-[15px] font-medium text-white/90 transition-all duration-200 hover:bg-white/10 hover:border-white/40"
                >
                  Conheça o Portal SBA
                </a>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ─── PARTNERS ────────────────────────────────────────────────── */}
      <section className="bg-white py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <FadeIn>
            <div className="mx-auto max-w-xl text-center">
              <h2 className="text-[22px] font-bold tracking-[-0.4px] text-[#0A2463] sm:text-[26px]">
                Parceiros
              </h2>
              <p className="mt-3 text-[14px] leading-[1.6] text-[#4A5568]">
                Empresas que apoiam a excelência na formação em anestesiologia.
              </p>
            </div>
          </FadeIn>

          <div className="mx-auto mt-10 flex flex-wrap items-center justify-center gap-8 sm:gap-12 lg:gap-16">
            {PARTNERS.map((p, i) => (
              <FadeIn key={p.name} delay={i * 80}>
                <a
                  href={p.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-center rounded-xl p-4 transition-all duration-300 hover:bg-[#F8F9FA]"
                >
                  <Image
                    src={p.imageUrl}
                    alt={p.name}
                    width={140}
                    height={56}
                    className="h-[56px] w-[140px] object-contain grayscale opacity-70 transition-all duration-300 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-105"
                    unoptimized
                  />
                </a>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ─── AFFILIATES ──────────────────────────────────────────────── */}
      <section className="border-t border-[#E2E8F0] bg-[#F8FAFC] py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <FadeIn>
            <div className="mx-auto max-w-xl text-center">
              <h2 className="text-[18px] font-bold tracking-[-0.3px] text-[#0A2463] sm:text-[22px]">
                Afiliados
              </h2>
              <p className="mt-2 text-[13px] leading-[1.6] text-[#4A5568]">
                Instituições afiliadas e certificações de qualidade.
              </p>
            </div>
          </FadeIn>

          <div className="mx-auto mt-8 flex flex-wrap items-center justify-center gap-8 sm:gap-12">
            {AFFILIATES.map((a, i) => (
              <FadeIn key={a.name} delay={i * 80}>
                <div className="flex items-center justify-center p-3">
                  <Image
                    src={a.imageUrl}
                    alt={a.name}
                    width={100}
                    height={48}
                    className="h-[48px] w-[100px] object-contain grayscale opacity-60 transition-all duration-300 hover:grayscale-0 hover:opacity-100"
                    unoptimized
                  />
                </div>
              </FadeIn>
            ))}
            <FadeIn delay={AFFILIATES.length * 80}>
              <div className="flex items-center justify-center p-3">
                <Image
                  src="https://www.sbahq.org/wp-content/uploads/2025/09/cert-iso9001.png"
                  alt="Certificação ISO 9001"
                  width={80}
                  height={80}
                  className="h-[64px] w-auto object-contain grayscale opacity-60 transition-all duration-300 hover:grayscale-0 hover:opacity-100"
                  unoptimized
                />
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ──────────────────────────────────────────────────── */}
      <footer id="contato" className="border-t border-[#E2E8F0] bg-white">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {/* Col 1 — Brand */}
            <div>
              <div className="flex items-center gap-3">
                <Image
                  src="https://www.sbahq.org/wp-content/themes/artedigitalv1/dist/images/logo-w.svg"
                  alt="SBA"
                  width={36}
                  height={36}
                  className="h-9 w-9 rounded-lg bg-[#0A2463] object-contain p-1.5"
                  unoptimized
                />
                <div className="h-7 w-px bg-[#E2E8F0]" aria-hidden="true" />
                <Image
                  src="https://i.imgur.com/OlRtvYB.png"
                  alt="SBA Practice"
                  width={100}
                  height={28}
                  className="h-7 w-auto object-contain"
                  unoptimized
                />
              </div>
              <p className="mt-4 text-[13px] leading-[1.6] text-[#4A5568]">
                Plataforma oficial de avaliações e prática cognitiva para
                profissionais e residentes de anestesiologia.
              </p>
              <div className="mt-5 flex items-center gap-2">
                {SOCIAL_LINKS.map((l) => (
                  <a
                    key={l.label}
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={l.label}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-[#4A5568] transition-all duration-200 hover:bg-[#0A2463]/5 hover:text-[#0A2463]"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-[18px] w-[18px]">
                      <path d={l.svg} />
                    </svg>
                  </a>
                ))}
              </div>
            </div>

            {/* Col 2 — Sede Botafogo */}
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-[1px] text-[#0A2463]">
                Sede Botafogo
              </h4>
              <ul className="mt-4 space-y-3">
                <li className="flex items-start gap-2 text-[13px] leading-[1.5] text-[#4A5568]">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#00A896]" strokeWidth={1.6} />
                  R. Professor Alfredo Gomes, 36 — Botafogo, Rio de Janeiro — RJ
                </li>
                <li className="flex items-center gap-2 text-[13px] text-[#4A5568]">
                  <Phone className="h-3.5 w-3.5 flex-shrink-0 text-[#00A896]" strokeWidth={1.6} />
                  (21) 3528-1050
                </li>
                <li className="flex items-center gap-2 text-[13px] text-[#4A5568]">
                  <Clock className="h-3.5 w-3.5 flex-shrink-0 text-[#00A896]" strokeWidth={1.6} />
                  Seg–Sex, 9h às 18h
                </li>
              </ul>
            </div>

            {/* Col 3 — Sede Barra */}
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-[1px] text-[#0A2463]">
                Sede Barra da Tijuca
              </h4>
              <ul className="mt-4 space-y-3">
                <li className="flex items-start gap-2 text-[13px] leading-[1.5] text-[#4A5568]">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#00A896]" strokeWidth={1.6} />
                  Av. das Américas, 3.500 — Bl. 03, 5o andar, Le Monde — Barra da Tijuca, RJ
                </li>
              </ul>
            </div>

            {/* Col 4 — Links */}
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-[1px] text-[#0A2463]">
                Links Úteis
              </h4>
              <ul className="mt-4 space-y-2.5">
                {[
                  { label: "Portal SBA", href: "https://www.sbahq.org", ext: true },
                  { label: "Fale Conosco", href: "https://apps.sbahq.org/contato/", ext: true },
                  { label: "Seja Membro SBA", href: "https://anuidade.sbahq.org/", ext: true },
                  { label: "Login", href: "/login", ext: false },
                ].map((lk) =>
                  lk.ext ? (
                    <li key={lk.label}>
                      <a
                        href={lk.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[13px] text-[#4A5568] transition-colors hover:text-[#00A896]"
                      >
                        {lk.label}
                      </a>
                    </li>
                  ) : (
                    <li key={lk.label}>
                      <Link
                        href={lk.href}
                        className="text-[13px] text-[#4A5568] transition-colors hover:text-[#00A896]"
                      >
                        {lk.label}
                      </Link>
                    </li>
                  )
                )}
              </ul>
              <div className="mt-5 flex items-center gap-2 text-[13px] text-[#4A5568]">
                <Mail className="h-3.5 w-3.5 flex-shrink-0 text-[#00A896]" strokeWidth={1.6} />
                <a
                  href="https://apps.sbahq.org/contato/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-[#00A896]"
                >
                  apps.sbahq.org/contato
                </a>
              </div>
            </div>
          </div>

          {/* Bottom */}
          <div className="mt-10 border-t border-[#E2E8F0] pt-6">
            <p className="text-center text-[12px] text-[#4A5568]/60">
              &copy; {new Date().getFullYear()} Todos os direitos reservados — SBA
              &bull; Sociedade Brasileira de Anestesiologia.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
