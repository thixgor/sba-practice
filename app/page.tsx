"use client";

import { useEffect, useRef } from "react";
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
} from "lucide-react";

/* ──────────────────────────────────────────────────────────────────────
   CONSTANTS
   ────────────────────────────────────────────────────────────────────── */

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

/* ──────────────────────────────────────────────────────────────────────
   FADE-IN (IntersectionObserver, no library)
   ────────────────────────────────────────────────────────────────────── */

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
      { threshold: 0.12, rootMargin: "0px 0px -30px 0px" }
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

/* ──────────────────────────────────────────────────────────────────────
   PAGE
   ────────────────────────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* ─── HEADER ────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-[#E2E8F0] bg-white/98 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 sm:px-8">
          {/* Logo — transparent bg, no white box */}
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="https://www.sbahq.org/wp-content/themes/artedigitalv1/dist/images/logo-w.svg"
              alt="SBA — Sociedade Brasileira de Anestesiologia"
              width={36}
              height={36}
              className="h-9 w-9 rounded object-contain bg-[#0A2463] p-1"
              unoptimized
            />
            <div className="hidden sm:block leading-none">
              <span className="block text-[13px] font-bold tracking-[-0.3px] text-[#0A2463]">
                Sociedade Brasileira
              </span>
              <span className="block text-[11px] font-medium text-[#4A5568]">
                de Anestesiologia
              </span>
            </div>
          </Link>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-7">
            {["Sobre", "Funcionalidades", "Contato"].map((l) => (
              <a
                key={l}
                href={`#${l.toLowerCase()}`}
                className="text-[13px] font-medium text-[#0A2463] transition-colors hover:text-[#00A896]"
              >
                {l}
              </a>
            ))}
          </nav>

          {/* Auth */}
          <div className="flex items-center gap-2">
            <a
              href="https://anuidade.sbahq.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex h-8 items-center gap-1.5 rounded-md bg-[#E15B07] px-3 text-[11px] font-semibold text-white transition-colors hover:bg-[#C94E06]"
            >
              <UserPlus className="h-3.5 w-3.5" strokeWidth={2} />
              Seja Membro
            </a>
            <Link
              href="/login"
              className="inline-flex h-9 items-center gap-2 rounded-md bg-[#00A896] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#008A78]"
            >
              <LogIn className="h-4 w-4" strokeWidth={2} />
              Login
            </Link>
          </div>
        </div>
      </header>

      {/* ─── HERO ──────────────────────────────────────────────────── */}
      <section id="sobre" className="relative overflow-hidden bg-gradient-to-br from-[#0A2463] to-[#0D3B66]">
        {/* Hexagonal subtle pattern (molecular structure — anesthetics) */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='49' viewBox='0 0 28 49'%3E%3Cg fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9zM0 15l12.98-7.5V0h-2v6.35L0 12.69v2.3zm0 18.5L12.98 41v8h-2v-6.85L0 35.81v-2.3zM15 0v7.5L27.99 15H28v-2.31h-.01L17 6.35V0h-2zm0 49v-8l12.99-7.5H28v2.31h-.01L17 42.15V49h-2z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            {/* Left — Copy */}
            <div>
              <FadeIn>
                <span className="mb-4 inline-block text-[11px] font-semibold uppercase tracking-[1.5px] text-[#00A896]">
                  Plataforma Oficial de Ensino
                </span>
              </FadeIn>

              <FadeIn delay={80}>
                <h1 className="text-[28px] font-bold leading-[1.2] tracking-[-0.5px] text-white sm:text-[34px] lg:text-[40px]">
                  Sistema de Avaliações{" "}
                  <span className="text-[#00A896]">da SBA</span>
                </h1>
              </FadeIn>

              <FadeIn delay={160}>
                <p className="mt-5 max-w-lg text-[15px] leading-[1.7] text-[#B0BEC5]">
                  Plataforma oficial para prática cognitiva, provas e
                  acompanhamento de performance nos cursos da Sociedade
                  Brasileira de Anestesiologia.
                </p>
              </FadeIn>

              <FadeIn delay={240}>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href="/login"
                    className="inline-flex h-[44px] items-center gap-2 rounded-md bg-[#00A896] px-6 text-[14px] font-semibold text-white transition-colors hover:bg-[#008A78]"
                  >
                    Acessar Sistema
                    <ArrowRight className="h-4 w-4" strokeWidth={2} />
                  </Link>
                </div>
              </FadeIn>
            </div>

            {/* Right — Hero image */}
            <FadeIn delay={200} className="hidden lg:block">
              <div className="relative">
                <Image
                  src="https://i.imgur.com/bybhVIw.png"
                  alt="Sistema de Avaliações da SBA — Interface da plataforma"
                  width={1376}
                  height={674}
                  className="w-full rounded-xl border border-[rgba(0,168,150,0.2)]"
                  style={{ boxShadow: "inset 0 0 20px rgba(0,0,0,0.1)" }}
                  priority
                  unoptimized
                />
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ─── STATISTICS ────────────────────────────────────────────── */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-16">
          <FadeIn>
            <div className="flex flex-wrap items-center justify-center gap-x-16 gap-y-8 sm:gap-x-24">
              {[
                { value: "60+", label: "Anos de Tradição" },
                { value: "15.000+", label: "Associados" },
                { value: "100%", label: "Digital & Seguro" },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <span className="block font-[var(--font-mono)] text-[28px] font-semibold tracking-[-0.5px] text-[#00A896] sm:text-[32px]">
                    {s.value}
                  </span>
                  <span className="mt-1 block text-[12px] font-semibold uppercase tracking-[1px] text-[#4A5568]">
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ─── FEATURES ──────────────────────────────────────────────── */}
      <section id="funcionalidades" className="bg-[#F8F9FA] py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <FadeIn>
            <div className="mx-auto max-w-xl text-center">
              <h2 className="text-[22px] font-bold tracking-[-0.4px] text-[#0A2463] sm:text-[26px]">
                Funcionalidades da Plataforma
              </h2>
              <p className="mt-3 text-[14px] leading-[1.6] text-[#4A5568]">
                Ferramentas desenvolvidas para garantir excelência na formação
                continuada em anestesiologia.
              </p>
            </div>
          </FadeIn>

          <div className="mx-auto mt-12 grid max-w-5xl gap-5 sm:grid-cols-2 sm:mt-16">
            {FEATURES.map((f, i) => (
              <FadeIn key={f.title} delay={i * 70}>
                <div className="group rounded-lg border border-[#E2E8F0] bg-white p-6 transition-colors hover:border-l-[3px] hover:border-l-[#00A896] hover:border-t-[#E2E8F0] hover:border-r-[#E2E8F0] hover:border-b-[#E2E8F0] sm:p-7">
                  <f.icon
                    className="mb-4 h-6 w-6 text-[#0A2463] transition-colors group-hover:text-[#00A896]"
                    strokeWidth={1.6}
                  />
                  <h3 className="text-[15px] font-bold tracking-[-0.2px] text-[#0A2463]">
                    {f.title}
                  </h3>
                  <p className="mt-2 text-[13px] leading-[1.65] text-[#4A5568]">
                    {f.description}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ──────────────────────────────────────────── */}
      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <FadeIn>
            <div className="mx-auto max-w-xl text-center">
              <h2 className="text-[22px] font-bold tracking-[-0.4px] text-[#0A2463] sm:text-[26px]">
                Como Funciona
              </h2>
              <p className="mt-3 text-[14px] leading-[1.6] text-[#4A5568]">
                Em três etapas, acesse todo o sistema de avaliações da SBA.
              </p>
            </div>
          </FadeIn>

          <div className="mx-auto mt-12 grid max-w-3xl gap-10 sm:mt-16 sm:grid-cols-3 sm:gap-8">
            {[
              {
                step: "01",
                title: "Cadastre-se",
                desc: "Crie sua conta com seus dados profissionais — nome, e-mail e CRM.",
              },
              {
                step: "02",
                title: "Acesse os Cursos",
                desc: "Inscreva-se nos cursos disponíveis e realize os pré-testes de nivelamento.",
              },
              {
                step: "03",
                title: "Avalie e Evolua",
                desc: "Complete avaliações, acompanhe evolução com relatórios e certificados oficiais.",
              },
            ].map((item, i) => (
              <FadeIn key={item.step} delay={i * 90}>
                <div className="text-center">
                  <span className="block font-[var(--font-mono)] text-[36px] font-semibold text-[#00A896]/15 sm:text-[42px]">
                    {item.step}
                  </span>
                  <h3 className="mt-1 text-[15px] font-bold text-[#0A2463]">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-[13px] leading-[1.65] text-[#4A5568]">
                    {item.desc}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA BAND ──────────────────────────────────────────────── */}
      <section className="bg-[#0A2463]">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20">
          <FadeIn>
            <div className="mx-auto max-w-xl text-center">
              <h2 className="text-[22px] font-bold text-white sm:text-[26px]">
                Pronto para começar?
              </h2>
              <p className="mt-3 text-[14px] leading-[1.6] text-[#B0BEC5]">
                Acesse a plataforma oficial de avaliações e acompanhe sua
                evolução profissional.
              </p>
              <div className="mt-8 flex justify-center">
                <Link
                  href="/login"
                  className="inline-flex h-[44px] items-center justify-center gap-2 rounded-md bg-[#00A896] px-6 text-[14px] font-semibold text-white transition-colors hover:bg-[#008A78]"
                >
                  Acessar Sistema
                  <ArrowRight className="h-4 w-4" strokeWidth={2} />
                </Link>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ─── PARTNERS ────────────────────────────────────────────── */}
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
                    className="h-[56px] w-[140px] object-contain transition-transform duration-300 group-hover:scale-105"
                    unoptimized
                  />
                </a>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ─── AFFILIATES ──────────────────────────────────────────── */}
      <section className="border-t border-[#E2E8F0] bg-[#F8F9FA] py-12 sm:py-16">
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

      {/* ─── FOOTER ────────────────────────────────────────────────── */}
      <footer id="contato" className="border-t border-[#E2E8F0] bg-white">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {/* Col 1 — Brand */}
            <div>
              <div className="flex items-center gap-3">
                <Image
                  src="https://www.sbahq.org/wp-content/themes/artedigitalv1/dist/images/logo-w.svg"
                  alt="SBA"
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded bg-[#0A2463] object-contain p-1"
                  unoptimized
                />
                <div className="leading-none">
                  <span className="block text-[13px] font-bold text-[#0A2463]">SBA</span>
                  <span className="block text-[11px] text-[#4A5568]">
                    Sociedade Brasileira de Anestesiologia
                  </span>
                </div>
              </div>
              <p className="mt-4 text-[13px] leading-[1.6] text-[#4A5568]">
                Plataforma oficial de avaliações e prática cognitiva para
                profissionais e residentes de anestesiologia.
              </p>
              <div className="mt-5 flex items-center gap-2.5">
                {SOCIAL_LINKS.map((l) => (
                  <a
                    key={l.label}
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={l.label}
                    className="flex h-8 w-8 items-center justify-center rounded text-[#4A5568] transition-colors hover:bg-[#F8F9FA] hover:text-[#0A2463]"
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
                  <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#4A5568]/50" strokeWidth={1.6} />
                  R. Professor Alfredo Gomes, 36 — Botafogo, Rio de Janeiro — RJ
                </li>
                <li className="flex items-center gap-2 text-[13px] text-[#4A5568]">
                  <Phone className="h-3.5 w-3.5 flex-shrink-0 text-[#4A5568]/50" strokeWidth={1.6} />
                  (21) 3528-1050
                </li>
                <li className="flex items-center gap-2 text-[13px] text-[#4A5568]">
                  <Clock className="h-3.5 w-3.5 flex-shrink-0 text-[#4A5568]/50" strokeWidth={1.6} />
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
                  <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#4A5568]/50" strokeWidth={1.6} />
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
                <Mail className="h-3.5 w-3.5 flex-shrink-0 text-[#4A5568]/50" strokeWidth={1.6} />
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
