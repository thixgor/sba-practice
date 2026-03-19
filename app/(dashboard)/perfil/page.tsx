"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  User,
  Mail,
  Shield,
  Save,
  Loader2,
  KeyRound,
  QrCode,
  Camera,
  CheckCircle,
  BookOpen,
  Clock,
  X,
} from "lucide-react";

export default function PerfilPage() {
  const { user, refreshUser } = useAuth();
  const searchParams = useSearchParams();
  const [name, setName] = useState(user?.name || "");
  const [saving, setSaving] = useState(false);

  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [changingPassword, setChangingPassword] = useState(false);

  // Serial key activation
  const [serialKey, setSerialKey] = useState("");
  const [activating, setActivating] = useState(false);
  const [activationResult, setActivationResult] = useState<{
    success: boolean;
    cursosGranted?: Array<{ name: string; accessDurationMinutes: number | null }>;
  } | null>(null);

  // QR Scanner
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-fill serial key from URL params (?serial=...)
  useEffect(() => {
    const serialFromUrl = searchParams.get("serial");
    if (serialFromUrl) {
      setSerialKey(serialFromUrl);
    }
  }, [searchParams]);

  const initials =
    user?.name
      ?.split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "??";

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      toast.error("Nome e obrigatorio");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
        credentials: "include",
      });
      if (res.ok) {
        toast.success("Perfil atualizado!");
        refreshUser();
      } else {
        toast.error("Erro ao atualizar perfil");
      }
    } catch {
      toast.error("Erro ao atualizar perfil");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwords.new !== passwords.confirm) {
      toast.error("As senhas nao coincidem");
      return;
    }
    if (passwords.new.length < 8) {
      toast.error("A nova senha deve ter pelo menos 8 caracteres");
      return;
    }
    setChangingPassword(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwords.current,
          newPassword: passwords.new,
        }),
        credentials: "include",
      });
      if (res.ok) {
        toast.success("Senha alterada com sucesso!");
        setPasswords({ current: "", new: "", confirm: "" });
      } else {
        const data = await res.json();
        toast.error(data.message || "Erro ao alterar senha");
      }
    } catch {
      toast.error("Erro ao alterar senha");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleActivateSerialKey = async (keyToActivate?: string) => {
    const key = keyToActivate || serialKey;
    if (!key.trim()) {
      toast.error("Insira uma chave serial");
      return;
    }
    setActivating(true);
    setActivationResult(null);
    try {
      const res = await fetch("/api/serial-keys/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: key.trim() }),
        credentials: "include",
      });
      const data = await res.json();

      if (res.ok) {
        setActivationResult({
          success: true,
          cursosGranted: data.cursosGranted,
        });
        toast.success("Chave serial ativada com sucesso!");
        setSerialKey("");
        refreshUser();
      } else {
        toast.error(data.message || "Erro ao ativar chave serial");
        setActivationResult({ success: false });
      }
    } catch {
      toast.error("Erro ao ativar chave serial");
      setActivationResult({ success: false });
    } finally {
      setActivating(false);
    }
  };

  // QR Scanner using native BarcodeDetector or canvas-based scanning
  const startScanner = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      setScanning(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      // Start scanning frames
      scanIntervalRef.current = setInterval(() => {
        scanFrame();
      }, 500);
    } catch (err) {
      console.error("Camera error:", err);
      toast.error(
        "Nao foi possivel acessar a camera. Verifique as permissoes."
      );
    }
  };

  const stopScanner = () => {
    setScanning(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
  };

  const scanFrame = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Try BarcodeDetector API (supported in Chrome/Edge)
    if ("BarcodeDetector" in window) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const detector = new (window as any).BarcodeDetector({
          formats: ["qr_code"],
        });
        const barcodes = await detector.detect(canvas);
        if (barcodes.length > 0) {
          const value = barcodes[0].rawValue;
          handleQRResult(value);
          return;
        }
      } catch {
        // BarcodeDetector failed, continue
      }
    }
  };

  const handleQRResult = (value: string) => {
    stopScanner();

    // Extract serial key from URL or direct key
    let key = value;
    try {
      const url = new URL(value);
      const serialParam = url.searchParams.get("serial");
      if (serialParam) {
        key = serialParam;
      }
    } catch {
      // Not a URL, treat as direct key
    }

    setSerialKey(key);
    toast.success("QR Code lido com sucesso!");
    // Auto-activate
    handleActivateSerialKey(key);
  };

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-1">
          <User className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Meu Perfil</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Gerencie suas informacoes pessoais e seguranca.
        </p>
      </motion.div>

      {/* Profile Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border-border/50 bg-card/80">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">
              Informacoes Pessoais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{user?.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-[10px]">
                    {user?.role === "admin" ? "Administrador" : "Usuario"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    ID: {user?.protocolId}
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Nome
                </Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-10 bg-muted/50 border-border/50"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  E-mail
                </Label>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{user?.email}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Papel
                </Label>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm capitalize">{user?.role}</span>
                </div>
              </div>
            </div>

            <Button
              onClick={handleSaveProfile}
              disabled={saving}
              className="bg-primary hover:bg-primary/90"
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {saving ? "Salvando..." : "Salvar Alteracoes"}
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Serial Key Activation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <Card className="border-border/50 bg-card/80 overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" />
              Ativar Serial Key
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Insira sua chave serial para liberar acesso a cursos, ou escaneie
              o QR Code.
            </p>

            {/* QR Scanner */}
            <AnimatePresence>
              {scanning && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="relative rounded-lg overflow-hidden bg-black"
                >
                  <video
                    ref={videoRef}
                    className="w-full aspect-square object-cover"
                    playsInline
                    muted
                  />
                  <canvas ref={canvasRef} className="hidden" />
                  {/* Scanner overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-48 h-48 border-2 border-primary rounded-2xl relative">
                      <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                      <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-lg" />
                      {/* Scan line animation */}
                      <motion.div
                        className="absolute left-2 right-2 h-0.5 bg-primary/80"
                        animate={{ top: ["10%", "90%", "10%"] }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      />
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white"
                    onClick={stopScanner}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <p className="absolute bottom-3 left-0 right-0 text-center text-xs text-white/80">
                    Aponte a camera para o QR Code
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex gap-2">
              <Input
                placeholder="Cole a chave serial aqui..."
                value={serialKey}
                onChange={(e) => setSerialKey(e.target.value)}
                className="h-10 bg-muted/50 border-border/50 font-mono text-xs"
                disabled={activating}
              />
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={scanning ? stopScanner : startScanner}
                title={scanning ? "Parar scanner" : "Escanear QR Code"}
              >
                {scanning ? (
                  <X className="h-4 w-4" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </Button>
            </div>

            <Button
              onClick={() => handleActivateSerialKey()}
              disabled={activating || !serialKey.trim()}
              className="w-full bg-primary hover:bg-primary/90"
            >
              {activating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Ativando...
                </>
              ) : (
                <>
                  <KeyRound className="mr-2 h-4 w-4" />
                  Ativar Chave
                </>
              )}
            </Button>

            {/* Activation Result */}
            <AnimatePresence>
              {activationResult?.success && activationResult.cursosGranted && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-lg border border-sba-success/30 bg-sba-success/5 p-4 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-sba-success" />
                    <p className="text-sm font-medium text-sba-success">
                      Acesso liberado!
                    </p>
                  </div>
                  <div className="space-y-1">
                    {activationResult.cursosGranted.map((c, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="flex items-center gap-1.5">
                          <BookOpen className="h-3 w-3 text-primary" />
                          {c.name}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] gap-1"
                        >
                          <Clock className="h-2.5 w-2.5" />
                          {c.accessDurationMinutes
                            ? c.accessDurationMinutes < 60
                              ? `${c.accessDurationMinutes} min`
                              : c.accessDurationMinutes < 1440
                                ? `${(c.accessDurationMinutes / 60).toFixed(0)}h`
                                : `${(c.accessDurationMinutes / 1440).toFixed(0)} dias`
                            : "Ilimitado"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>

      {/* Change Password */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="border-border/50 bg-card/80">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">
              Alterar Senha
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Senha Atual
              </Label>
              <Input
                type="password"
                value={passwords.current}
                onChange={(e) =>
                  setPasswords((p) => ({ ...p, current: e.target.value }))
                }
                className="h-10 bg-muted/50 border-border/50"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Nova Senha
                </Label>
                <Input
                  type="password"
                  value={passwords.new}
                  onChange={(e) =>
                    setPasswords((p) => ({ ...p, new: e.target.value }))
                  }
                  className="h-10 bg-muted/50 border-border/50"
                  minLength={8}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Confirmar Nova Senha
                </Label>
                <Input
                  type="password"
                  value={passwords.confirm}
                  onChange={(e) =>
                    setPasswords((p) => ({ ...p, confirm: e.target.value }))
                  }
                  className="h-10 bg-muted/50 border-border/50"
                />
              </div>
            </div>
            <Button
              onClick={handleChangePassword}
              disabled={
                changingPassword || !passwords.current || !passwords.new
              }
              variant="outline"
            >
              {changingPassword ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {changingPassword ? "Alterando..." : "Alterar Senha"}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
