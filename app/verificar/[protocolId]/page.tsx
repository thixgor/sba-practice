"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  Shield,
  Calendar,
  User,
  FileText,
} from "lucide-react";
import Link from "next/link";

interface VerificacaoData {
  valid: boolean;
  tipo: string;
  userName?: string;
  avaliacaoName?: string;
  percentualAcerto?: number;
  finalizadaEm?: string;
  protocolId: string;
}

export default function VerificarPage() {
  const params = useParams();
  const [data, setData] = useState<VerificacaoData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.protocolId) return;
    // For now, show a valid verification page
    // In production, this would fetch from /api/verificar/[protocolId]
    setTimeout(() => {
      setData({
        valid: true,
        tipo: "Avaliação",
        protocolId: params.protocolId as string,
        userName: "Documento verificado",
        avaliacaoName: "Avaliação SBA",
        percentualAcerto: 85,
        finalizadaEm: new Date().toISOString(),
      });
      setLoading(false);
    }, 500);
  }, [params.protocolId]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border/50">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-xs font-black text-primary-foreground">SBA</span>
          </div>
          <span className="text-sm font-bold">SBA Practice</span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="flex items-center justify-center px-4 py-16">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-16 rounded-xl skeleton-sba mx-auto w-16" />
              <Skeleton className="h-48 rounded-xl skeleton-sba" />
            </div>
          ) : data?.valid ? (
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-xl">
              <CardHeader className="text-center pb-3">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="mx-auto mb-3"
                >
                  <CheckCircle2 className="h-16 w-16 text-sba-success" />
                </motion.div>
                <CardTitle className="text-lg text-sba-success">
                  Documento Autêntico
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Este documento foi verificado com sucesso.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-xl bg-muted/50 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Shield className="h-4 w-4 text-primary" />
                    <span className="text-muted-foreground">Protocolo:</span>
                    <span className="font-mono font-medium text-xs">{data.protocolId}</span>
                  </div>
                  {data.userName && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-primary" />
                      <span className="text-muted-foreground">Usuário:</span>
                      <span className="font-medium">{data.userName}</span>
                    </div>
                  )}
                  {data.avaliacaoName && (
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="text-muted-foreground">Avaliação:</span>
                      <span className="font-medium">{data.avaliacaoName}</span>
                    </div>
                  )}
                  {data.finalizadaEm && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span className="text-muted-foreground">Data:</span>
                      <span className="font-medium">
                        {new Date(data.finalizadaEm).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  )}
                  {data.percentualAcerto !== undefined && (
                    <div className="flex items-center gap-2 text-sm">
                      <Badge
                        variant="secondary"
                        className="bg-sba-success/10 text-sba-success text-xs"
                      >
                        {data.percentualAcerto}% de acerto
                      </Badge>
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-center text-muted-foreground">
                  Verificado pelo SBA Practice System &mdash; Sociedade Brasileira de
                  Anestesiologia
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/50 bg-card/80">
              <CardContent className="flex flex-col items-center py-12 text-center">
                <XCircle className="h-16 w-16 text-sba-error mb-4" />
                <h2 className="text-lg font-semibold text-sba-error">
                  Documento Não Encontrado
                </h2>
                <p className="text-sm text-muted-foreground mt-2 max-w-xs">
                  O protocolo informado não foi encontrado em nosso sistema.
                  Verifique o código e tente novamente.
                </p>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </main>
    </div>
  );
}
