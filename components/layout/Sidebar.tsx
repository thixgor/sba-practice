"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  BarChart3,
  User,
  Shield,
  Users,
  FolderOpen,
  FileText,
  X,
  ChevronRight,
  KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const userNavItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Cursos",
    href: "/cursos",
    icon: BookOpen,
  },
  {
    label: "Avaliações",
    href: "/avaliacoes",
    icon: ClipboardList,
  },
  {
    label: "Relatórios",
    href: "/relatorios",
    icon: BarChart3,
  },
  {
    label: "Meu Perfil",
    href: "/perfil",
    icon: User,
  },
];

const adminNavItems = [
  {
    label: "Admin Dashboard",
    href: "/admin/dashboard",
    icon: Shield,
  },
  {
    label: "Usuários",
    href: "/admin/usuarios",
    icon: Users,
  },
  {
    label: "Cursos",
    href: "/admin/cursos",
    icon: FolderOpen,
  },
  {
    label: "Avaliações",
    href: "/admin/avaliacoes",
    icon: FileText,
  },
  {
    label: "Serial Keys",
    href: "/admin/serial-keys",
    icon: KeyRound,
  },
  {
    label: "Relatórios",
    href: "/admin/relatorios",
    icon: BarChart3,
  },
];

export function Sidebar({ open, onClose }: SidebarProps) {
  const { user } = useAuth();
  const pathname = usePathname();
  const isAdmin = user?.role === "admin";

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-border/50 px-5">
        <Image
          src="https://www.sbahq.org/wp-content/themes/artedigitalv1/dist/images/logo-w.svg"
          alt="SBA"
          width={36}
          height={36}
          className="h-9 w-9 rounded-lg bg-[#0A2463] object-contain p-1.5"
          unoptimized
        />
        <div className="flex flex-col">
          <span className="text-sm font-bold tracking-tight">SBA Practice</span>
          <span className="text-[10px] text-muted-foreground leading-tight">
            Sistema de Avaliações
          </span>
        </div>
        {/* Mobile close */}
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto md:hidden h-8 w-8"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-1">
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Principal
          </p>
          {userNavItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                <span className="truncate">{item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="ml-auto"
                    initial={false}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  >
                    <ChevronRight className="h-3 w-3 text-primary" />
                  </motion.div>
                )}
              </Link>
            );
          })}
        </div>

        {isAdmin && (
          <div className="mt-6 space-y-1">
            <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Administração
            </p>
            {adminNavItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-sba-orange/10 text-sba-orange"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      isActive
                        ? "text-sba-orange"
                        : "text-muted-foreground group-hover:text-foreground"
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                  {isActive && (
                    <ChevronRight className="ml-auto h-3 w-3 text-sba-orange" />
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      {/* Bottom */}
      <div className="border-t border-border/50 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <span className="text-xs font-bold text-primary">
              {user?.name
                ?.split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2) || "??"}
            </span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-medium truncate">{user?.name}</span>
            <span className="text-[10px] text-muted-foreground truncate">
              {user?.role === "admin" ? "Administrador" : "Usuário"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex h-screen w-64 flex-col border-r border-border/50 bg-card/50 backdrop-blur-sm">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 w-72 bg-card md:hidden"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
