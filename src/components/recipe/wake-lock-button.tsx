"use client";

import { Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const noop = () => () => {};

/** Keeps the screen awake while cooking. Hidden where the Screen Wake Lock API is unavailable. */
export function WakeLockButton({ className }: { className?: string }) {
  const t = useTranslations("recipe");
  const supported = useSyncExternalStore(noop, () => "wakeLock" in navigator, () => false);
  const [active, setActive] = useState(false);
  const sentinel = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;

    const acquire = async () => {
      if (document.visibilityState !== "visible" || sentinel.current) return;
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (cancelled) return void lock.release();
        sentinel.current = lock;
        // The browser drops the lock when the page is hidden; forget it so we can take it again.
        lock.addEventListener("release", () => {
          if (sentinel.current === lock) sentinel.current = null;
        });
      } catch {
        setActive(false);
        toast.error(t("keepAwakeError"));
      }
    };

    acquire();
    document.addEventListener("visibilitychange", acquire);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", acquire);
      sentinel.current?.release();
      sentinel.current = null;
    };
  }, [active, t]);

  if (!supported) return null;

  return (
    <Button
      variant={active ? "default" : "outline"}
      size="sm"
      aria-pressed={active}
      aria-label={t("keepAwake")}
      title={active ? t("keepAwakeOn") : t("keepAwake")}
      onClick={() => setActive((a) => !a)}
      className={cn("no-print", className)}
    >
      <Sun />
      <span className="hidden sm:inline">{t("keepAwake")}</span>
    </Button>
  );
}
