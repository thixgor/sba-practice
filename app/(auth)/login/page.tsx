"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Preencha todos os campos");
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Login realizado com sucesso!");
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* ── Left Panel — Institutional branding ──────────────────── */}
      <div className="relative hidden lg:flex lg:w-[46%] xl:w-[50%] flex-col justify-between bg-gradient-to-br from-[#0A2463] to-[#0D3B66] p-10 xl:p-14 overflow-hidden">
        {/* Hexagonal pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='49' viewBox='0 0 28 49'%3E%3Cg fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9zM0 15l12.98-7.5V0h-2v6.35L0 12.69v2.3zm0 18.5L12.98 41v8h-2v-6.85L0 35.81v-2.3zM15 0v7.5L27.99 15H28v-2.31h-.01L17 6.35V0h-2zm0 49v-8l12.99-7.5H28v2.31h-.01L17 42.15V49h-2z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="https://www.sbahq.org/wp-content/themes/artedigitalv1/dist/images/logo-w.svg"
              alt="SBA"
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
              unoptimized
            />
            <div className="leading-none">
              <span className="block text-[13px] font-bold text-white">
                Sociedade Brasileira
              </span>
              <span className="block text-[11px] font-medium text-white/50">
                de Anestesiologia
              </span>
            </div>
          </Link>
        </div>

        <div className="relative z-10">
          <h2 className="text-[28px] font-bold leading-[1.2] tracking-[-0.5px] text-white xl:text-[32px]">
            Sistema de Avaliações
            <span className="block text-[#00A896]">da SBA</span>
          </h2>
          <p className="mt-4 max-w-md text-[14px] leading-[1.7] text-[#B0BEC5]">
            Plataforma oficial para prática cognitiva, provas e acompanhamento
            de performance nos cursos da Sociedade Brasileira de
            Anestesiologia.
          </p>
        </div>

        <div className="relative z-10">
          <p className="text-[11px] text-white/30">
            &copy; {new Date().getFullYear()} SBA — Sociedade Brasileira de
            Anestesiologia.
          </p>
        </div>
      </div>

      {/* ── Right Panel — Login form ─────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-[#F8F9FA] px-5 py-12 sm:px-8">
        <div className="w-full max-w-[360px]">
          {/* Mobile logo */}
          <div className="mb-8 lg:hidden">
            <Link href="/" className="inline-flex items-center gap-3">
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
                <span className="block text-[11px] text-[#4A5568]">Sistema de Avaliações</span>
              </div>
            </Link>
          </div>

          {/* Heading */}
          <div className="mb-7">
            <h1 className="text-[24px] font-bold tracking-[-0.4px] text-[#0A2463]">
              Entrar
            </h1>
            <p className="mt-1 text-[14px] text-[#4A5568]">
              Acesse sua conta para continuar.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[12px] font-semibold text-[#0A2463]">
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="h-[42px] rounded-md border-[#E2E8F0] bg-white text-[14px] text-[#0A2463] placeholder:text-[#4A5568]/50 focus:border-[#00A896] focus:ring-1 focus:ring-[#00A896]/20"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[12px] font-semibold text-[#0A2463]">
                Senha
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="h-[42px] rounded-md border-[#E2E8F0] bg-white pr-10 text-[14px] text-[#0A2463] placeholder:text-[#4A5568]/50 focus:border-[#00A896] focus:ring-1 focus:ring-[#00A896]/20"
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4A5568]/50 hover:text-[#4A5568] transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Honeypot */}
            <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" />

            <Button
              type="submit"
              className="h-[44px] w-full rounded-md bg-[#00A896] text-[14px] font-semibold text-white transition-colors hover:bg-[#008A78] shadow-none"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="mr-2 h-4 w-4" strokeWidth={2} />
              )}
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <span className="text-[14px] text-[#4A5568]">
              Não tem uma conta?{" "}
              <Link href="/register" className="font-semibold text-[#00A896] hover:text-[#008A78] transition-colors">
                Cadastre-se
              </Link>
            </span>
          </div>

          <div className="mt-3 text-center">
            <Link href="/" className="text-[12px] text-[#4A5568]/60 transition-colors hover:text-[#4A5568]">
              ← Voltar para a página inicial
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
