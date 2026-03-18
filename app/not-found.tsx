"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-primary/10"
        >
          <span className="text-5xl font-black text-primary">404</span>
        </motion.div>
        <h1 className="text-2xl font-bold tracking-tight">Página não encontrada</h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
          A página que você está procurando não existe ou foi movida.
        </p>
        <div className="mt-6 flex gap-3 justify-center">
          <Link href="/">
            <Button variant="outline" size="sm">
              <Home className="mr-2 h-4 w-4" />
              Início
            </Button>
          </Link>
          <Button
            variant="default"
            size="sm"
            onClick={() => window.history.back()}
            className="bg-primary hover:bg-primary/90"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
