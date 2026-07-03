"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Slide } from "@/components/player/slide";
import { CONTENT_TYPE_LABELS } from "@/lib/content";
import { darken, withAlpha } from "@/lib/color";
import type { PlayerData } from "@/lib/player-types";

const REFRESH_INTERVAL_MS = 60_000;
const HEARTBEAT_INTERVAL_MS = 60_000;
const RELOAD_HOUR = 3; // nachtelijke herstart om 03:00

function storageKey(slug: string) {
  return `narrowcast-player-${slug}`;
}

function msUntilNextReload(): number {
  const now = new Date();
  const next = new Date(now);
  next.setHours(RELOAD_HOUR, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
}

export function PlayerClient({ slug }: { slug: string }) {
  const [data, setData] = useState<PlayerData | null>(null);
  const [offline, setOffline] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [index, setIndex] = useState(0);
  const [now, setNow] = useState<Date | null>(null);
  const dataRef = useRef<PlayerData | null>(null);

  // 1. Playlistdata ophalen; localStorage-cache als eerste beeld (offline-fallback)
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/player/${slug}`, { cache: "no-store" });
      if (res.status === 404) {
        setNotFound(true);
        setOffline(false);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const fresh = (await res.json()) as PlayerData;
      dataRef.current = fresh;
      setData(fresh);
      setNotFound(false);
      setOffline(false);
      try {
        window.localStorage.setItem(storageKey(slug), JSON.stringify(fresh));
      } catch {
        // opslag vol of niet beschikbaar: geen probleem
      }
    } catch {
      // API tijdelijk onbereikbaar: laatst bekende playlist blijven tonen
      setOffline(true);
    }
  }, [slug]);

  useEffect(() => {
    // Uitgesteld starten (geen synchrone setState tijdens de effect-fase):
    // eerst de laatst bekende playlist uit localStorage, daarna vers ophalen.
    const start = setTimeout(() => {
      try {
        const cached = window.localStorage.getItem(storageKey(slug));
        if (cached && !dataRef.current) {
          const parsed = JSON.parse(cached) as PlayerData;
          dataRef.current = parsed;
          setData(parsed);
        }
      } catch {
        // corrupte cache negeren
      }
      fetchData();
    }, 0);
    const interval = setInterval(fetchData, REFRESH_INTERVAL_MS);
    return () => {
      clearTimeout(start);
      clearInterval(interval);
    };
  }, [slug, fetchData]);

  // 3. Heartbeat elke 60 seconden
  useEffect(() => {
    const sendHeartbeat = () => {
      fetch("/api/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      }).catch(() => {
        // offline: refresh-lus signaleert dit al
      });
    };
    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [slug]);

  // 4. Klok (per seconde, pas na mount om hydration-verschillen te voorkomen)
  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = setTimeout(tick, 0);
    const interval = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, []);

  // 5. Nachtelijke herstart om 03:00
  useEffect(() => {
    const timeout = setTimeout(
      () => window.location.reload(),
      msUntilNextReload()
    );
    return () => clearTimeout(timeout);
  }, []);

  // 6. Doorschakelen naar het volgende item
  const items = useMemo(() => data?.items ?? [], [data]);
  const safeIndex = items.length > 0 ? index % items.length : 0;
  const currentItem = items[safeIndex] ?? null;

  useEffect(() => {
    if (!currentItem) return;
    const timeout = setTimeout(
      () => setIndex((i) => (i + 1) % Math.max(items.length, 1)),
      Math.max(currentItem.durationSeconds, 3) * 1000
    );
    return () => clearTimeout(timeout);
  }, [currentItem, items.length, safeIndex]);

  const branding = data?.organization;

  const dateLabel = now
    ? new Intl.DateTimeFormat("nl-NL", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(now)
    : "";
  const timeLabel = now
    ? new Intl.DateTimeFormat("nl-NL", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(now)
    : "";

  if (notFound && !data) {
    return (
      <FullScreenMessage
        title="Scherm niet gevonden"
        message="Controleer de player-URL of activeer het scherm in de beheeromgeving."
      />
    );
  }

  if (!data || !branding) {
    return (
      <FullScreenMessage
        title="Verbinden…"
        message={
          offline
            ? "Geen verbinding met de server. Opnieuw proberen…"
            : "Playlist wordt geladen."
        }
      />
    );
  }

  return (
    <div
      className="flex h-screen w-screen cursor-none select-none flex-col overflow-hidden"
      style={{
        backgroundColor: branding.backgroundColor,
        color: branding.textColor,
        containerType: "size",
      }}
    >
      {/* Bovenbalk */}
      <header
        className="relative z-10 flex shrink-0 items-center justify-between"
        style={{
          background: `linear-gradient(90deg, ${branding.primaryColor} 0%, ${darken(branding.primaryColor, 0.25)} 100%)`,
          borderBottom: "1px solid rgba(255,255,255,0.14)",
          boxShadow: "0 0.4cqh 2cqh rgba(0,0,0,0.25)",
          padding: "0.9cqh 2.5cqw",
          minHeight: "7cqh",
        }}
      >
        <div className="flex min-w-0 items-center" style={{ gap: "1.2cqw" }}>
          {branding.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={branding.logoUrl}
              alt=""
              style={{ maxHeight: "4.5cqh", width: "auto" }}
            />
          )}
          <span
            className="truncate font-semibold"
            style={{
              fontSize: "2.6cqh",
              color: "#ffffff",
              letterSpacing: "0.02em",
            }}
          >
            {branding.name}
          </span>
        </div>
        <div
          className="flex items-baseline"
          style={{ gap: "1.5cqw", color: "#ffffff" }}
        >
          <span style={{ fontSize: "2.1cqh", opacity: 0.85 }}>{dateLabel}</span>
          <span
            className="font-semibold tabular-nums"
            style={{ fontSize: "3cqh" }}
          >
            {timeLabel}
          </span>
        </div>
      </header>

      {/* Hoofdvlak */}
      <main className="relative min-h-0 flex-1">
        {currentItem ? (
          <div key={`${currentItem.id}-${safeIndex}`} className="player-slide-fade h-full w-full">
            <Slide item={currentItem} branding={branding} />
          </div>
        ) : (
          <div
            className="flex h-full w-full flex-col items-center justify-center text-center"
            style={{ gap: "2cqh", padding: "5cqw" }}
          >
            <p className="font-semibold" style={{ fontSize: "4cqh" }}>
              Welkom bij {branding.name}
            </p>
            <p style={{ fontSize: "2.4cqh", opacity: 0.7 }}>
              Er zijn op dit moment geen berichten om te tonen.
            </p>
          </div>
        )}
      </main>

      {/* Onderbalk */}
      <footer
        className="flex shrink-0 items-center justify-between"
        style={{
          backgroundColor: "rgba(0,0,0,0.3)",
          borderTop: "1px solid rgba(255,255,255,0.09)",
          padding: "0.8cqh 2.5cqw",
          minHeight: "5cqh",
        }}
      >
        <span className="flex items-center" style={{ gap: "1.2cqw" }}>
          <span
            className="flex items-center rounded-full font-semibold uppercase tracking-wider"
            style={{
              gap: "0.6cqw",
              fontSize: "1.5cqh",
              border: `1px solid ${withAlpha(branding.secondaryColor, "66")}`,
              backgroundColor: withAlpha(branding.secondaryColor, "1f"),
              padding: "0.35cqh 1.2cqw",
            }}
          >
            <span
              className="rounded-full"
              style={{
                width: "0.9cqh",
                height: "0.9cqh",
                backgroundColor: branding.secondaryColor,
              }}
            />
            {currentItem
              ? CONTENT_TYPE_LABELS[currentItem.type]
              : data.screen.name}
          </span>
          {data.screen.location && (
            <span style={{ fontSize: "1.8cqh", opacity: 0.7 }}>
              {data.screen.location}
            </span>
          )}
        </span>
        <div className="flex items-center" style={{ gap: "1cqw" }}>
          {items.length > 1 && (
            <div className="flex items-center" style={{ gap: "0.5cqw" }}>
              {items.map((item, i) => (
                <span
                  key={`${item.id}-${i}`}
                  className="rounded-full"
                  style={{
                    width: "0.9cqh",
                    height: "0.9cqh",
                    backgroundColor:
                      i === safeIndex
                        ? branding.secondaryColor
                        : "rgba(255,255,255,0.3)",
                  }}
                />
              ))}
            </div>
          )}
          {offline && (
            <span
              className="flex items-center rounded-full"
              style={{
                gap: "0.5cqw",
                fontSize: "1.6cqh",
                opacity: 0.8,
                border: "1px solid rgba(255,255,255,0.3)",
                padding: "0.3cqh 1cqw",
              }}
            >
              <span
                className="rounded-full"
                style={{
                  width: "0.9cqh",
                  height: "0.9cqh",
                  backgroundColor: "#f59e0b",
                }}
              />
              Offline — laatst bekende playlist
            </span>
          )}
        </div>
      </footer>
    </div>
  );
}

function FullScreenMessage({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center gap-3 bg-slate-900 text-slate-100">
      <p className="text-4xl font-semibold">{title}</p>
      <p className="text-xl text-slate-400">{message}</p>
    </div>
  );
}
