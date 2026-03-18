"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { TimerBar } from "./TimerBar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  Video,
  Loader2,
  Volume2,
  VolumeX,
  Info,
  CheckCircle,
  XCircle,
  ChevronRight,
} from "lucide-react";

interface VideoQuestao {
  _id: string;
  enunciado: string;
  alternativas: Array<{ letra: string; texto: string }>;
  tempoResposta: number;
}

interface ProvaVideoProps {
  tentativaId: string;
  avaliacaoId: string;
  legendaVideo?: string | null;
  modoFinalizacao?: string | null;
  onComplete: () => void;
}

declare global {
  interface Window {
    YT: {
      Player: new (
        el: string | HTMLElement,
        config: Record<string, unknown>
      ) => YTPlayer;
      PlayerState: { PLAYING: number; PAUSED: number; ENDED: number };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  setVolume: (v: number) => void;
  getVolume: () => number;
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
  destroy: () => void;
  getPlayerState: () => number;
}

export function ProvaVideo({
  tentativaId,
  avaliacaoId,
  legendaVideo,
  modoFinalizacao,
  onComplete,
}: ProvaVideoProps) {
  const playerRef = useRef<YTPlayer | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const pollingBusyRef = useRef(false);
  const isMountedRef = useRef(false);

  // Container ref for dynamically creating the YouTube player div
  // (avoids issues with React Strict Mode double-mount)
  const ytContainerRef = useRef<HTMLDivElement>(null);

  const [currentQuestion, setCurrentQuestion] = useState<VideoQuestao | null>(
    null
  );
  const [videoReady, setVideoReady] = useState(false);
  const [loading, setLoading] = useState(true);

  // Volume control
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);

  // Progress tracking
  const [questionProgress, setQuestionProgress] = useState({
    total: 0,
    answered: 0,
  });

  // Feedback after answer
  const [feedbackState, setFeedbackState] = useState<{
    show: boolean;
    correct: boolean | null;
  }>({ show: false, correct: null });

  // Video ended state (for continuar-video mode)
  const [videoEnded, setVideoEnded] = useState(false);

  // Inline question selection state
  const [selectedLetra, setSelectedLetra] = useState<string | null>(null);
  const [submittedAnswer, setSubmittedAnswer] = useState(false);

  // Ref to hold a question triggered on init (before player is ready)
  const initialTriggerRef = useRef<VideoQuestao | null>(null);

  // ---------- Portal overlay positioned over the video ----------
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [portalReady, setPortalReady] = useState(false);
  const [videoRect, setVideoRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  // Track video container bounding rect when question is showing
  useEffect(() => {
    if (!currentQuestion && !feedbackState.show) {
      setVideoRect(null);
      return;
    }

    const el = videoContainerRef.current;
    if (!el) return;

    const update = () => {
      const r = el.getBoundingClientRect();
      setVideoRect({
        top: r.top,
        left: r.left,
        width: r.width,
        height: r.height,
      });
    };

    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("scroll", update, { passive: true });

    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", update);
    };
  }, [currentQuestion, feedbackState.show]);

  // Block keyboard and context menu events
  useEffect(() => {
    const blockEvent = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };
    const blockKeydown = (e: KeyboardEvent) => {
      if (
        [
          " ",
          "ArrowLeft",
          "ArrowRight",
          "ArrowUp",
          "ArrowDown",
          "k",
          "f",
          "m",
        ].includes(e.key)
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener("contextmenu", blockEvent);
    document.addEventListener("keydown", blockKeydown);
    document.addEventListener("selectstart", blockEvent);
    document.addEventListener("dragstart", blockEvent);
    document.addEventListener("copy", blockEvent);

    return () => {
      document.removeEventListener("contextmenu", blockEvent);
      document.removeEventListener("keydown", blockKeydown);
      document.removeEventListener("selectstart", blockEvent);
      document.removeEventListener("dragstart", blockEvent);
      document.removeEventListener("copy", blockEvent);
    };
  }, []);

  // ---------------------------------------------------------------
  // Polling: sends currentTime to server, receives triggerQuestion
  // ---------------------------------------------------------------
  const startPolling = useCallback(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    console.log("[ProvaVideo] Starting polling...");

    pollingRef.current = setInterval(async () => {
      if (pollingBusyRef.current || !playerRef.current || !isMountedRef.current) return;

      pollingBusyRef.current = true;
      try {
        let state: number;
        let currentTime: number;
        try {
          state = playerRef.current.getPlayerState();
          currentTime = playerRef.current.getCurrentTime();
        } catch {
          // Player might have been destroyed
          return;
        }

        // Only poll when PLAYING (1) or BUFFERING (3)
        if (state !== 1 && state !== 3) return;

        console.log("[ProvaVideo] Polling - time:", currentTime.toFixed(1), "state:", state);

        const res = await fetch(
          `/api/avaliacoes/${avaliacaoId}/video-timestamp`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tentativaId, currentTime }),
            credentials: "include",
          }
        );

        if (!isMountedRef.current) return;

        if (res.ok) {
          const data = await res.json();
          console.log("[ProvaVideo] API response:", JSON.stringify({
            triggerQuestion: !!data.triggerQuestion,
            nextTimestamp: data.nextTimestamp,
            answered: data.answeredCount,
            total: data.totalQuestions,
            finished: data.finished,
          }));

          if (data.totalQuestions) {
            setQuestionProgress({
              total: data.totalQuestions,
              answered: data.answeredCount || 0,
            });
          }

          if (data.triggerQuestion) {
            console.log("[ProvaVideo] TRIGGER QUESTION! Pausing video...");
            try {
              playerRef.current?.pauseVideo();
            } catch {
              // Ignore pause errors
            }
            if (pollingRef.current) clearInterval(pollingRef.current);
            pollingRef.current = null;
            setCurrentQuestion(data.triggerQuestion);
          }

          if (data.finished && !data.triggerQuestion) {
            console.log("[ProvaVideo] All questions answered, finished!");
            if (pollingRef.current) clearInterval(pollingRef.current);
            pollingRef.current = null;
            if (modoFinalizacao !== "continuar-video") {
              onComplete();
            }
          }
        } else {
          console.warn("[ProvaVideo] API error:", res.status, res.statusText);
        }
      } catch (err) {
        console.warn("[ProvaVideo] Polling error:", err);
      } finally {
        pollingBusyRef.current = false;
      }
    }, 1500);
  }, [avaliacaoId, tentativaId, onComplete, modoFinalizacao]);

  // ---------------------------------------------------------------
  // Initialize YouTube player (resilient to React Strict Mode)
  // ---------------------------------------------------------------
  useEffect(() => {
    isMountedRef.current = true;
    pollingBusyRef.current = false;

    console.log("[ProvaVideo] Mount - avaliacaoId:", avaliacaoId, "tentativaId:", tentativaId);

    const initPlayer = async () => {
      try {
        // Step 1: Fetch video config from server
        console.log("[ProvaVideo] Fetching video config...");
        const res = await fetch(
          `/api/avaliacoes/${avaliacaoId}/video-timestamp`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tentativaId, currentTime: 0 }),
            credentials: "include",
          }
        );

        // CRITICAL: Bail out if component was unmounted during fetch
        if (!isMountedRef.current) {
          console.log("[ProvaVideo] Unmounted during fetch, bailing out");
          return;
        }

        if (!res.ok) throw new Error(`Failed to load video config: ${res.status}`);
        const data = await res.json();

        console.log("[ProvaVideo] Got config - videoId:", data.videoId ? "YES" : "NO",
          "totalQuestions:", data.totalQuestions,
          "triggerQuestion:", !!data.triggerQuestion);

        if (data.totalQuestions) {
          setQuestionProgress({
            total: data.totalQuestions,
            answered: data.answeredCount || 0,
          });
        }

        // Save triggerQuestion from init for after player is ready
        if (data.triggerQuestion) {
          initialTriggerRef.current = data.triggerQuestion;
        }

        if (!data.videoId) {
          console.error("[ProvaVideo] No videoId returned from API!");
          setLoading(false);
          return;
        }

        // Step 2: Ensure YouTube IFrame API is loaded
        if (!window.YT || !window.YT.Player) {
          // Only add script tag if not already in the DOM
          if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
            console.log("[ProvaVideo] Loading YouTube IFrame API script...");
            const tag = document.createElement("script");
            tag.src = "https://www.youtube.com/iframe_api";
            document.head.appendChild(tag);
          }

          // Poll for YT.Player availability (more reliable than onYouTubeIframeAPIReady)
          console.log("[ProvaVideo] Waiting for YT.Player...");
          await new Promise<void>((resolve) => {
            const check = () => {
              if (window.YT && window.YT.Player) {
                resolve();
              } else {
                setTimeout(check, 100);
              }
            };
            check();
          });
        }

        // CRITICAL: Bail out if component was unmounted while waiting for YT API
        if (!isMountedRef.current) {
          console.log("[ProvaVideo] Unmounted while waiting for YT API, bailing out");
          return;
        }

        // Step 3: Create a fresh div inside the container for the player
        const container = ytContainerRef.current;
        if (!container) {
          console.error("[ProvaVideo] ytContainerRef is null!");
          setLoading(false);
          return;
        }

        // Clear any leftover content from previous mount
        container.innerHTML = "";
        const playerDiv = document.createElement("div");
        playerDiv.style.width = "100%";
        playerDiv.style.height = "100%";
        container.appendChild(playerDiv);

        console.log("[ProvaVideo] Creating YouTube Player on fresh div...");

        // Step 4: Create the YouTube player
        // NOTE: We do NOT assign the constructor return value to playerRef
        // because it may not have methods yet. We use event.target in onReady.
        new window.YT.Player(playerDiv, {
          videoId: data.videoId,
          playerVars: {
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            rel: 0,
            showinfo: 0,
            iv_load_policy: 3,
            playsinline: 1,
          },
          events: {
            onReady: (event: { target: YTPlayer }) => {
              if (!isMountedRef.current) {
                console.log("[ProvaVideo] onReady fired but component unmounted, destroying");
                try { event.target.destroy(); } catch {}
                return;
              }

              console.log("[ProvaVideo] ✅ Player READY!");
              playerRef.current = event.target;
              setVideoReady(true);
              setLoading(false);

              try {
                event.target.setVolume(80);
              } catch {}

              if (initialTriggerRef.current) {
                console.log("[ProvaVideo] Initial trigger question detected, showing it");
                setCurrentQuestion(initialTriggerRef.current);
                initialTriggerRef.current = null;
              } else {
                console.log("[ProvaVideo] Playing video and starting polling");
                event.target.playVideo();
                startPolling();
              }
            },
            onStateChange: (event: { data: number }) => {
              if (!isMountedRef.current) return;
              console.log("[ProvaVideo] State change:", event.data);
              if (event.data === 0) {
                // Video ended
                setVideoEnded(true);
                if (pollingRef.current) {
                  clearInterval(pollingRef.current);
                  pollingRef.current = null;
                }
                if (modoFinalizacao === "continuar-video") {
                  onComplete();
                }
              }
            },
            onError: (event: { data: number }) => {
              console.error("[ProvaVideo] YouTube Player error:", event.data);
              if (isMountedRef.current) setLoading(false);
            },
          },
        } as unknown as Record<string, unknown>);
      } catch (err) {
        console.error("[ProvaVideo] Init error:", err);
        if (isMountedRef.current) setLoading(false);
      }
    };

    initPlayer();

    // Cleanup: prevents stale async operations from affecting the component
    return () => {
      console.log("[ProvaVideo] Cleanup - destroying player and stopping polling");
      isMountedRef.current = false;

      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }

      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {}
        playerRef.current = null;
      }

      // Clear container so next mount gets a fresh div
      if (ytContainerRef.current) {
        ytContainerRef.current.innerHTML = "";
      }

      initialTriggerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avaliacaoId, tentativaId]);

  // ---------------------------------------------------------------
  // Handle answer submission
  // ---------------------------------------------------------------
  const handleResponder = async (letra: string) => {
    if (!currentQuestion) return;
    setSubmittedAnswer(true);

    console.log("[ProvaVideo] Submitting answer:", letra, "for question:", currentQuestion._id);

    try {
      const res = await fetch(`/api/avaliacoes/${avaliacaoId}/responder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tentativaId,
          questaoId: currentQuestion._id,
          alternativaSelecionada: letra || null,
        }),
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        if (data.correta !== undefined) {
          setFeedbackState({ show: true, correct: data.correta });
          await new Promise((r) => setTimeout(r, 1200));
          setFeedbackState({ show: false, correct: null });
        }
      } else {
        console.warn("[ProvaVideo] Answer submission failed:", res.status);
      }
    } catch (err) {
      console.warn("[ProvaVideo] Answer submission error:", err);
    }

    setQuestionProgress((prev) => ({
      ...prev,
      answered: prev.answered + 1,
    }));

    setSelectedLetra(null);
    setSubmittedAnswer(false);
    setCurrentQuestion(null);

    // Resume video and polling
    if (isMountedRef.current && playerRef.current) {
      try {
        playerRef.current.playVideo();
      } catch {}
      startPolling();
    }
  };

  // Volume handlers
  const handleVolumeChange = (values: number[]) => {
    const v = values[0] ?? 80;
    setVolume(v);
    if (playerRef.current) {
      playerRef.current.setVolume(v);
      if (v === 0) {
        playerRef.current.mute();
        setIsMuted(true);
      } else if (isMuted) {
        playerRef.current.unMute();
        setIsMuted(false);
      }
    }
  };

  const toggleMute = () => {
    if (!playerRef.current) return;
    if (isMuted) {
      playerRef.current.unMute();
      playerRef.current.setVolume(volume || 80);
      setIsMuted(false);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  };

  // -----------------------------------------------------------------------
  // Question overlay — rendered via portal, positioned exactly over video
  // Portal escapes YouTube iframe stacking context; getBoundingClientRect
  // keeps it visually "on the video" for both mobile and desktop.
  // -----------------------------------------------------------------------
  const overlay =
    portalReady && videoRect
      ? createPortal(
          <>
            {/* QUESTION — positioned over the video embed */}
            <AnimatePresence>
              {currentQuestion && (
                <motion.div
                  key="video-question-overlay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    position: "fixed",
                    top: videoRect.top,
                    left: videoRect.left,
                    width: videoRect.width,
                    height: videoRect.height,
                  }}
                  className="z-[9999] overflow-hidden rounded-lg"
                >
                  {/* Dim */}
                  <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px]" />

                  {/* Centered compact question */}
                  <motion.div
                    initial={{ y: 16, scale: 0.97 }}
                    animate={{ y: 0, scale: 1 }}
                    exit={{ y: -10, scale: 0.97 }}
                    transition={{
                      type: "spring",
                      damping: 28,
                      stiffness: 350,
                    }}
                    className="absolute inset-0 flex flex-col items-center justify-center p-2 sm:p-3 lg:p-4"
                  >
                    <div className="w-full max-w-lg flex flex-col gap-1.5 sm:gap-2">
                      {/* Header: badge + timer */}
                      <div className="flex items-center justify-between gap-2">
                        <Badge className="bg-white/95 text-foreground text-[10px] sm:text-[11px] shadow-sm px-2 py-0.5 shrink-0">
                          {questionProgress.answered + 1}/
                          {questionProgress.total}
                        </Badge>
                        {currentQuestion.tempoResposta > 0 && (
                          <div className="flex-1 min-w-0">
                            <TimerBar
                              totalSeconds={currentQuestion.tempoResposta}
                              onTimeUp={() => handleResponder("")}
                            />
                          </div>
                        )}
                      </div>

                      {/* Enunciado */}
                      <div className="rounded-lg bg-white/95 dark:bg-card/95 shadow-lg px-2.5 py-1.5 sm:px-3 sm:py-2">
                        <p className="text-[11px] sm:text-xs lg:text-sm leading-snug text-foreground line-clamp-3 sm:line-clamp-4">
                          {currentQuestion.enunciado}
                        </p>
                      </div>

                      {/* Alternatives — 2 cols on sm+, 1 col on tiny mobile */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-1.5">
                        {currentQuestion.alternativas.map((alt) => {
                          const isSelected = selectedLetra === alt.letra;
                          return (
                            <motion.button
                              key={alt.letra}
                              onClick={() => {
                                if (!submittedAnswer)
                                  setSelectedLetra(alt.letra);
                              }}
                              disabled={submittedAnswer}
                              whileHover={
                                !submittedAnswer ? { scale: 1.02 } : {}
                              }
                              whileTap={
                                !submittedAnswer ? { scale: 0.97 } : {}
                              }
                              className={cn(
                                "flex items-center gap-2 rounded-lg px-2 py-1.5 sm:px-2.5 sm:py-2 text-left transition-all shadow-sm",
                                "bg-white/90 dark:bg-card/90 hover:bg-white dark:hover:bg-card",
                                isSelected &&
                                  "ring-2 ring-primary bg-primary/10 dark:bg-primary/20 shadow-md shadow-primary/15",
                                !isSelected && "border border-white/30",
                                submittedAnswer && "cursor-default opacity-70"
                              )}
                            >
                              <span
                                className={cn(
                                  "flex h-5 w-5 sm:h-6 sm:w-6 shrink-0 items-center justify-center rounded-md text-[9px] sm:text-[10px] font-bold transition-colors",
                                  isSelected
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground"
                                )}
                              >
                                {alt.letra}
                              </span>
                              <span className="text-[10px] sm:text-xs leading-snug text-foreground flex-1 line-clamp-2">
                                {alt.texto}
                              </span>
                            </motion.button>
                          );
                        })}
                      </div>

                      {/* Confirm */}
                      <div className="flex justify-center">
                        <Button
                          onClick={() => {
                            if (selectedLetra && !submittedAnswer) {
                              handleResponder(selectedLetra);
                            }
                          }}
                          disabled={!selectedLetra || submittedAnswer}
                          size="sm"
                          className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg h-7 sm:h-8 px-4 sm:px-6 text-[11px] sm:text-xs font-semibold"
                        >
                          {submittedAnswer ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <>
                              Confirmar
                              <ChevronRight className="ml-1 h-3.5 w-3.5" />
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* FEEDBACK — positioned over the video embed */}
            <AnimatePresence>
              {feedbackState.show && (
                <motion.div
                  key="video-feedback-overlay"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ type: "spring", damping: 20, stiffness: 300 }}
                  style={{
                    position: "fixed",
                    top: videoRect.top,
                    left: videoRect.left,
                    width: videoRect.width,
                    height: videoRect.height,
                  }}
                  className="z-[9999] flex items-center justify-center pointer-events-none rounded-lg"
                >
                  <div
                    className={`flex items-center gap-2 sm:gap-3 px-5 sm:px-6 py-3 sm:py-4 rounded-2xl shadow-2xl backdrop-blur-md ${
                      feedbackState.correct
                        ? "bg-sba-success/25 border border-sba-success/50"
                        : "bg-sba-error/25 border border-sba-error/50"
                    }`}
                  >
                    {feedbackState.correct ? (
                      <>
                        <CheckCircle className="h-7 w-7 sm:h-8 sm:w-8 text-sba-success" />
                        <span className="text-sm sm:text-base font-bold text-sba-success">
                          Correto!
                        </span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-7 w-7 sm:h-8 sm:w-8 text-sba-error" />
                        <span className="text-sm sm:text-base font-bold text-sba-error">
                          Incorreto
                        </span>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>,
          document.body
        )
      : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Video className="h-5 w-5 text-sba-orange" />
          <h2 className="text-lg font-semibold">Prova de Vídeo</h2>
          <Badge
            variant="secondary"
            className="bg-sba-orange/10 text-sba-orange text-[10px]"
          >
            Interativa
          </Badge>
        </div>

        {questionProgress.total > 0 && (
          <Badge variant="outline" className="text-xs font-mono">
            {questionProgress.answered < questionProgress.total
              ? `Questão ${questionProgress.answered + 1} de ${questionProgress.total}`
              : `${questionProgress.total} de ${questionProgress.total} ✓`}
          </Badge>
        )}
      </div>

      {/* Video Container — ref tracked for portal overlay positioning */}
      <Card className="border-border/50 bg-black overflow-hidden">
        <CardContent className="p-0">
          <div ref={videoContainerRef} className="relative aspect-video">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black z-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            {/* Dynamic container for YouTube player - NOT a static id */}
            <div ref={ytContainerRef} className="w-full h-full" />
            <div className="video-overlay-protection" />
          </div>
        </CardContent>
      </Card>

      {/* Volume Control */}
      {videoReady && (
        <div className="flex items-center gap-3 px-1">
          <button
            onClick={toggleMute}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </button>
          <Slider
            value={[isMuted ? 0 : volume]}
            max={100}
            step={1}
            onValueChange={handleVolumeChange}
            className="flex-1 max-w-[200px]"
          />
          <span className="text-[10px] text-muted-foreground w-8 text-right">
            {isMuted ? 0 : volume}%
          </span>
        </div>
      )}

      {legendaVideo && (
        <div className="flex items-start gap-2 rounded-lg bg-primary/5 border border-primary/20 px-3 py-2.5">
          <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-foreground/80 leading-relaxed">
            {legendaVideo}
          </p>
        </div>
      )}

      {videoEnded && !currentQuestion && (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground">
            Vídeo concluído. Processando resultado...
          </p>
          <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto mt-2" />
        </div>
      )}

      {/* Portal-rendered overlays (question + feedback) positioned over video */}
      {overlay}
    </div>
  );
}
