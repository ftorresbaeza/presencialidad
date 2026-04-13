"use client";

import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSBanner, setShowIOSBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Don't show if already running as standalone (already installed)
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    // Don't show if user already dismissed
    if (localStorage.getItem("pwa-banner-dismissed")) return;

    // Android/Chrome: capture the install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // iOS Safari detection
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isSafari = /safari/i.test(navigator.userAgent) && !/chrome/i.test(navigator.userAgent);
    if (isIOS && isSafari) {
      setShowIOSBanner(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    localStorage.setItem("pwa-banner-dismissed", "1");
    setDismissed(true);
    setDeferredPrompt(null);
    setShowIOSBanner(false);
  }

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDismissed(true);
      setDeferredPrompt(null);
    }
  }

  if (dismissed) return null;

  // Android/Chrome install banner
  if (deferredPrompt) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 p-3 safe-area-bottom">
        <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-xl border border-gray-100 p-4 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192.png" alt="App icon" className="w-12 h-12 rounded-xl flex-none" />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 text-sm">Instalar app</p>
            <p className="text-xs text-gray-500">Añade Presencialidad a tu pantalla de inicio</p>
          </div>
          <div className="flex items-center gap-2 flex-none">
            <button onClick={dismiss} className="text-xs text-gray-400 px-2 py-1.5 rounded-lg hover:bg-gray-100">
              No, gracias
            </button>
            <button
              onClick={install}
              className="text-white text-xs px-3 py-1.5 rounded-xl font-semibold"
              style={{ background: "linear-gradient(135deg, #f97316, #ef4444)" }}
            >
              Instalar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // iOS Safari banner (manual instructions)
  if (showIOSBanner) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 p-3 safe-area-bottom">
        <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-xl border border-gray-100 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/icon-192.png" alt="App icon" className="w-12 h-12 rounded-xl flex-none" />
              <div>
                <p className="font-bold text-gray-900 text-sm">Instalar app</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Toca <span className="inline-block font-bold">⬆</span> Compartir y luego{" "}
                  <span className="font-semibold text-gray-700">&quot;Agregar a pantalla de inicio&quot;</span>
                </p>
              </div>
            </div>
            <button onClick={dismiss} className="text-gray-300 hover:text-gray-500 text-xl leading-none flex-none mt-0.5">
              ✕
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
