import type { Metadata } from "next";
import { Inter, Sora, IBM_Plex_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "SBA Practice - Plataforma de Prática da Sociedade Brasileira de Anestesiologia",
    template: "%s | SBA Practice",
  },
  description:
    "Plataforma oficial de avaliações e prática cognitiva da Sociedade Brasileira de Anestesiologia (SBA). Sistema completo para provas, simulações, provas de vídeo, pré e pós-testes, relatórios de desempenho com certificados oficiais e acompanhamento de evolução profissional. Desenvolvido para médicos anestesiologistas, residentes e profissionais de saúde que buscam excelência na formação continuada em anestesiologia.",
  keywords: [
    "SBA",
    "Sociedade Brasileira de Anestesiologia",
    "anestesiologia",
    "avaliação médica",
    "prova de anestesiologia",
    "residência médica",
    "educação médica continuada",
    "prática cognitiva",
    "simulação médica",
    "certificação médica",
    "pré-teste",
    "pós-teste",
    "prova de vídeo",
    "relatório de desempenho",
    "medicina",
    "anestesista",
  ],
  authors: [{ name: "Sociedade Brasileira de Anestesiologia", url: "https://www.sbahq.org" }],
  creator: "SBA - Sociedade Brasileira de Anestesiologia",
  publisher: "SBA - Sociedade Brasileira de Anestesiologia",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://sba-practice.vercel.app"),
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "SBA Practice - Sociedade Brasileira de Anestesiologia",
    title: "SBA Practice - Plataforma de Prática da Sociedade Brasileira de Anestesiologia",
    description:
      "Plataforma oficial de avaliações e prática cognitiva da SBA. Provas, simulações, provas de vídeo interativas, pré e pós-testes com relatórios detalhados de desempenho. A ferramenta essencial para médicos anestesiologistas e residentes que buscam excelência profissional.",
    images: [
      {
        url: "https://i.imgur.com/PSiAea3.png",
        width: 1200,
        height: 630,
        alt: "SBA Practice - Plataforma de Prática da Sociedade Brasileira de Anestesiologia",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SBA Practice - Plataforma de Prática da Sociedade Brasileira de Anestesiologia",
    description:
      "Plataforma oficial de avaliações e prática cognitiva da SBA. Provas, simulações, provas de vídeo, relatórios de desempenho e certificados oficiais para médicos anestesiologistas.",
    images: ["https://i.imgur.com/PSiAea3.png"],
    creator: "@SbaSociedade",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  category: "education",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${sora.variable} ${ibmPlexMono.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <QueryProvider>
            <AuthProvider>
              <TooltipProvider delayDuration={300}>
                {children}
                <Toaster
                  position="top-right"
                  richColors
                  closeButton
                  toastOptions={{
                    duration: 4000,
                  }}
                />
              </TooltipProvider>
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
