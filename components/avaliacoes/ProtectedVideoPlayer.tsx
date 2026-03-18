"use client";

import { useEffect, useRef, useMemo } from "react";
import { Film } from "lucide-react";

interface ProtectedVideoPlayerProps {
  url: string;
  className?: string;
}

/**
 * Extract embed URL from YouTube/Vimeo links.
 * Returns a restricted embed URL with controls disabled.
 */
function getEmbedUrl(url: string): string | null {
  // YouTube patterns
  const ytMatch =
    url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/) ||
    url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (ytMatch) {
    return `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?controls=0&disablekb=1&fs=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3`;
  }

  // Vimeo patterns
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}?title=0&byline=0&portrait=0&controls=0`;
  }

  // Already an embed URL
  if (url.includes("youtube.com/embed/") || url.includes("youtube-nocookie.com/embed/")) {
    return url;
  }
  if (url.includes("player.vimeo.com/video/")) {
    return url;
  }

  return null;
}

export function ProtectedVideoPlayer({ url, className = "" }: ProtectedVideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const embedUrl = useMemo(() => getEmbedUrl(url), [url]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const preventDefault = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const preventKeys = (e: KeyboardEvent) => {
      // Block video control keys
      const blockedKeys = [
        " ", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
        "k", "f", "m", "j", "l", "c", "t",
      ];
      if (blockedKeys.includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Block context menu, selection, drag, copy on the container
    container.addEventListener("contextmenu", preventDefault);
    container.addEventListener("selectstart", preventDefault);
    container.addEventListener("dragstart", preventDefault);
    container.addEventListener("copy", preventDefault);
    document.addEventListener("keydown", preventKeys);

    return () => {
      container.removeEventListener("contextmenu", preventDefault);
      container.removeEventListener("selectstart", preventDefault);
      container.removeEventListener("dragstart", preventDefault);
      container.removeEventListener("copy", preventDefault);
      document.removeEventListener("keydown", preventKeys);
    };
  }, []);

  if (!embedUrl) {
    return (
      <div className={`flex items-center justify-center rounded-xl bg-muted/50 border border-border/50 p-6 ${className}`}>
        <div className="text-center text-muted-foreground">
          <Film className="mx-auto h-8 w-8 mb-2 opacity-50" />
          <p className="text-xs">Formato de vídeo não suportado</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative rounded-xl overflow-hidden border border-border/50 bg-black ${className}`}
      style={{ userSelect: "none", WebkitUserSelect: "none" }}
    >
      {/* The iframe with pointer-events disabled */}
      <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
        <iframe
          src={embedUrl}
          className="absolute inset-0 w-full h-full"
          style={{ pointerEvents: "none" }}
          allow="autoplay; encrypted-media"
          allowFullScreen={false}
          referrerPolicy="no-referrer"
          sandbox="allow-scripts allow-same-origin allow-presentation"
          title="Vídeo da questão"
        />
        {/* Transparent overlay to block all direct interactions */}
        <div
          className="absolute inset-0 z-10"
          style={{ pointerEvents: "auto" }}
          onContextMenu={(e) => e.preventDefault()}
          onClick={(e) => e.preventDefault()}
        />
      </div>
      {/* Play indicator */}
      <div className="absolute bottom-2 right-2 z-20 flex items-center gap-1 rounded-md bg-black/60 px-2 py-1">
        <Film className="h-3 w-3 text-white/70" />
        <span className="text-[10px] text-white/70">Vídeo protegido</span>
      </div>
    </div>
  );
}
