"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, UserPlus, AlertCircle, Mail } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface InviteData {
  email: string | null;
  role: string;
  expiresAt: string;
}

export default function ConvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [invite, setInvite] = useState<InviteData | null>(null);
  const [validating, setValidating] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    cpf: "",
    crm: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/invites/${token}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || "Convite invalido.");
        }
        return res.json();
      })
      .then((data) => {
        setInvite(data.invite);
        if (data.invite.email) {
          setForm((prev) => ({ ...prev, email: data.invite.email }));
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Convite invalido.");
      })
      .finally(() => setValidating(false));
  }, [token]);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      toast.error("Preencha todos os campos obrigatorios");
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error("As senhas nao coincidem");
      return;
    }
    // Client-side password complexity validation
    const pwErrors: string[] = [];
    if (form.password.length < 8) pwErrors.push("A senha deve ter pelo menos 8 caracteres.");
    if (!/[A-Z]/.test(form.password)) pwErrors.push("A senha deve conter pelo menos uma letra maiuscula.");
    if (!/[a-z]/.test(form.password)) pwErrors.push("A senha deve conter pelo menos uma letra minuscula.");
    if (!/[0-9]/.test(form.password)) pwErrors.push("A senha deve conter pelo menos um numero.");
    if (!/[^A-Za-z0-9]/.test(form.password)) pwErrors.push("A senha deve conter pelo menos um caractere especial.");
    if (pwErrors.length > 0) {
      pwErrors.forEach((msg) => toast.error(msg));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/invites/${token}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          confirmPassword: form.confirmPassword,
          cpf: form.cpf || undefined,
          crm: form.crm || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (data.messages && Array.isArray(data.messages)) {
          data.messages.forEach((msg: string) => toast.error(msg));
          throw new Error("_handled_");
        }
        throw new Error(data.message || "Erro ao aceitar convite");
      }

      toast.success("Conta criada com sucesso! Faca login.");
      router.push("/login");
    } catch (err) {
      if (err instanceof Error && err.message !== "_handled_") {
        toast.error(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClasses =
    "h-[40px] rounded-md border-[#E2E8F0] bg-white text-[14px] text-[#0A2463] placeholder:text-[#4A5568]/50 focus:border-[#00A896] focus:ring-1 focus:ring-[#00A896]/20";

  // Loading state
  if (validating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F9FA]">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#00A896]" />
          <p className="mt-3 text-[14px] text-[#4A5568]">Validando convite...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !invite) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F9FA] px-5">
        <div className="w-full max-w-[400px] text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="text-[22px] font-bold text-[#0A2463]">
            Convite Invalido
          </h1>
          <p className="mt-2 text-[14px] text-[#4A5568]">
            {error || "Este convite nao e valido, ja foi utilizado ou expirou."}
          </p>
          <div className="mt-6 space-y-3">
            <Link href="/login">
              <Button className="w-full bg-[#00A896] text-white hover:bg-[#008A78]">
                Ir para Login
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="w-full">
                Pagina Inicial
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Left Panel */}
      <div className="relative hidden lg:flex lg:w-[46%] xl:w-[50%] flex-col justify-between bg-gradient-to-br from-[#0A2463] to-[#0D3B66] p-10 xl:p-14 overflow-hidden">
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
            Voce foi convidado
            <span className="block text-[#00A896]">para a plataforma SBA</span>
          </h2>
          <p className="mt-4 max-w-md text-[14px] leading-[1.7] text-[#B0BEC5]">
            Complete seu cadastro para acessar avaliacoes, acompanhar sua
            evolucao e participar das atividades da Sociedade Brasileira de
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

      {/* Right Panel — Registration form */}
      <div className="flex flex-1 flex-col items-center justify-center bg-[#F8F9FA] px-5 py-10 sm:px-8">
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
                <span className="block text-[11px] text-[#4A5568]">Sistema de Avaliacoes</span>
              </div>
            </Link>
          </div>

          {/* Invite badge */}
          <div className="mb-4 flex items-center gap-2">
            <Badge className="bg-[#00A896]/10 text-[#00A896] border-[#00A896]/20">
              <Mail className="mr-1 h-3 w-3" />
              Convite
            </Badge>
            {invite.email && (
              <span className="text-[12px] text-[#4A5568]">{invite.email}</span>
            )}
          </div>

          {/* Heading */}
          <div className="mb-6">
            <h1 className="text-[24px] font-bold tracking-[-0.4px] text-[#0A2463]">
              Aceitar Convite
            </h1>
            <p className="mt-1 text-[14px] text-[#4A5568]">
              Preencha seus dados para criar sua conta.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-[12px] font-semibold text-[#0A2463]">
                Nome Completo <span className="text-[#DC2626]">*</span>
              </Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Seu nome completo"
                className={inputClasses}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="inv-email" className="text-[12px] font-semibold text-[#0A2463]">
                E-mail <span className="text-[#DC2626]">*</span>
              </Label>
              <Input
                id="inv-email"
                type="email"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="seu@email.com"
                className={inputClasses}
                required
                disabled={!!invite.email}
              />
              {invite.email && (
                <p className="text-[11px] text-[#4A5568]/60">
                  O email foi definido pelo administrador e nao pode ser alterado.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 opacity-60">
              <div className="space-y-1.5">
                <Label htmlFor="cpf" className="text-[12px] font-semibold text-[#0A2463]">
                  CPF <span className="font-normal text-[#4A5568]/60">(opcional)</span>
                </Label>
                <Input
                  id="cpf"
                  value={form.cpf}
                  onChange={(e) => handleChange("cpf", e.target.value)}
                  placeholder="000.000.000-00"
                  className={inputClasses}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="crm" className="text-[12px] font-semibold text-[#0A2463]">
                  CRM <span className="font-normal text-[#4A5568]/60">(opcional)</span>
                </Label>
                <Input
                  id="crm"
                  value={form.crm}
                  onChange={(e) => handleChange("crm", e.target.value)}
                  placeholder="CRM/UF 000000"
                  className={inputClasses}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="inv-password" className="text-[12px] font-semibold text-[#0A2463]">
                Senha <span className="text-[#DC2626]">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="inv-password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  placeholder="Minimo 8 caracteres"
                  className={`${inputClasses} pr-10`}
                  required
                  minLength={8}
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
              <p className="text-[11px] text-[#4A5568]/60">
                Minuscula, maiuscula, numero e caractere especial.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm-password" className="text-[12px] font-semibold text-[#0A2463]">
                Confirmar Senha <span className="text-[#DC2626]">*</span>
              </Label>
              <Input
                id="confirm-password"
                type="password"
                value={form.confirmPassword}
                onChange={(e) => handleChange("confirmPassword", e.target.value)}
                placeholder="Repita a senha"
                className={inputClasses}
                required
              />
            </div>

            {/* Honeypot */}
            <input type="text" name="company" className="hidden" tabIndex={-1} autoComplete="off" />

            <Button
              type="submit"
              className="h-[44px] w-full rounded-md bg-[#00A896] text-[14px] font-semibold text-white transition-colors hover:bg-[#008A78] shadow-none"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="mr-2 h-4 w-4" strokeWidth={2} />
              )}
              {loading ? "Criando conta..." : "Aceitar Convite e Criar Conta"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <span className="text-[14px] text-[#4A5568]">
              Ja tem uma conta?{" "}
              <Link href="/login" className="font-semibold text-[#00A896] hover:text-[#008A78] transition-colors">
                Fazer login
              </Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
