"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ChevronRight } from "lucide-react";
import { ProtectedVideoPlayer } from "./ProtectedVideoPlayer";

interface QuestaoDiscursivaProps {
  numero: number;
  total: number;
  enunciado: string;
  onResponder: (resposta: string) => void;
  disabled?: boolean;
  imagemUrl?: string;
  videoUrl?: string;
}

export function QuestaoDiscursiva({
  numero,
  total,
  enunciado,
  onResponder,
  disabled = false,
  imagemUrl,
  videoUrl,
}: QuestaoDiscursivaProps) {
  const [resposta, setResposta] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!resposta.trim() || submitted) return;
    setSubmitted(true);
    onResponder(resposta.trim());
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-5"
    >
      <div className="flex items-center justify-between">
        <Badge variant="secondary" className="text-xs font-semibold">
          Questão {numero} de {total}
        </Badge>
        <span className="text-xs text-muted-foreground">Discursiva</span>
      </div>

      <Card className="border-border/50 bg-card/80">
        <CardContent className="p-5 space-y-4">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{enunciado}</p>
          {imagemUrl && (
            <div className="rounded-lg overflow-hidden border border-border/30">
              <img
                src={imagemUrl}
                alt="Imagem da questão"
                className="w-full max-h-96 object-contain bg-muted/30"
                loading="lazy"
              />
            </div>
          )}
          {videoUrl && (
            <ProtectedVideoPlayer url={videoUrl} />
          )}
        </CardContent>
      </Card>

      <div className="space-y-2">
        <Textarea
          value={resposta}
          onChange={(e) => setResposta(e.target.value)}
          placeholder="Digite sua resposta..."
          rows={6}
          disabled={submitted || disabled}
          className="bg-muted/50 border-border/50 resize-none focus:bg-background"
        />
        <p className="text-xs text-muted-foreground text-right">
          {resposta.length} caracteres
        </p>
      </div>

      {!submitted && (
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={!resposta.trim() || disabled}
            className="bg-primary hover:bg-primary/90 shadow-md shadow-primary/20"
          >
            Confirmar Resposta
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}
    </motion.div>
  );
}
