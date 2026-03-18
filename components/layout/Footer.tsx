"use client";

import Link from "next/link";
import Image from "next/image";

const socialLinks = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/sba.anestesiologia/",
    icon: (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
  },
  {
    label: "Facebook",
    href: "https://www.facebook.com/sba.sociedade/",
    icon: (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/user/SBAwebtv",
    icon: (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/sba-sociedade/",
    icon: (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  {
    label: "X (Twitter)",
    href: "https://x.com/SbaSociedade",
    icon: (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-card/30">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Image
                src="https://www.sbahq.org/wp-content/themes/artedigitalv1/dist/images/logo-w.svg"
                alt="SBA"
                width={32}
                height={32}
                className="h-8 w-8 rounded-lg bg-[#0A2463] object-contain p-1"
                unoptimized
              />
              <div>
                <p className="text-sm font-bold">SBA Practice System</p>
                <p className="text-[10px] text-muted-foreground">
                  Sociedade Brasileira de Anestesiologia
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              {socialLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                  aria-label={link.label}
                >
                  {link.icon}
                </Link>
              ))}
            </div>
          </div>

          {/* Addresses */}
          <div className="space-y-2 text-xs text-muted-foreground">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-foreground">
              Endereços
            </p>
            <p>
              <strong className="text-foreground/80">Botafogo:</strong> R. Professor Alfredo
              Gomes, 36 | Tel: (21) 3528-1050
            </p>
            <p>
              <strong className="text-foreground/80">Barra:</strong> Av. das Américas 3.500,
              Bl. 03, 5º andar, Le Monde, Barra da Tijuca
            </p>
          </div>

          {/* Contact */}
          <div className="space-y-2 text-xs text-muted-foreground">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-foreground">
              Atendimento
            </p>
            <p>Segunda a Sexta, 9h às 18h</p>
            <Link
              href="https://apps.sbahq.org/contato/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              Fale Conosco
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Partners & Affiliates */}
        <div className="mt-8 border-t border-border/30 pt-6">
          <div className="flex flex-col items-center gap-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-foreground">
              Parceiros
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6">
              {[
                { name: "Cristália", src: "https://www.sbahq.org/wp-content/uploads/2024/11/logo-cristalia.jpg", href: "https://www.cristalia.com.br/" },
                { name: "BBraun", src: "https://www.sbahq.org/wp-content/uploads/2024/11/logo-bbraun.jpg", href: "https://www.bbraun.com.br/" },
                { name: "FRESENIUS KABI", src: "https://www.sbahq.org/wp-content/uploads/2024/11/logo-freseniuskbi.jpg", href: "https://www.fresenius-kabi.com/br/" },
                { name: "CEI Group", src: "https://www.sbahq.org/wp-content/uploads/2024/11/logo-cei.jpg", href: "https://www.ceigroup.com.br/pt-br" },
              ].map((p) => (
                <Link
                  key={p.name}
                  href={p.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-opacity hover:opacity-80"
                >
                  <Image
                    src={p.src}
                    alt={p.name}
                    width={100}
                    height={40}
                    className="h-[32px] w-auto object-contain"
                    unoptimized
                  />
                </Link>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-5 mt-2">
              {[
                { name: "Afiliado 1", src: "https://www.sbahq.org/wp-content/themes/artedigitalv1/dist/images/afiliado1.png" },
                { name: "Afiliado 2", src: "https://www.sbahq.org/wp-content/themes/artedigitalv1/dist/images/afiliado2.png" },
                { name: "Afiliado 3", src: "https://www.sbahq.org/wp-content/themes/artedigitalv1/dist/images/afiliado3.png" },
                { name: "ISO 9001", src: "https://www.sbahq.org/wp-content/uploads/2025/09/cert-iso9001.png" },
              ].map((a) => (
                <Image
                  key={a.name}
                  src={a.src}
                  alt={a.name}
                  width={60}
                  height={28}
                  className="h-[24px] w-auto object-contain grayscale opacity-50 transition-all duration-300 hover:grayscale-0 hover:opacity-100"
                  unoptimized
                />
              ))}
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-6 border-t border-border/30 pt-4 text-center text-[11px] text-muted-foreground">
          &copy; {new Date().getFullYear()} Todos os direitos reservados à SBA
          &mdash; Sociedade Brasileira de Anestesiologia.
        </div>
      </div>
    </footer>
  );
}
