"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isChunkError =
    error?.message?.includes("ChunkLoadError") ||
    error?.message?.includes("Loading chunk") ||
    (error?.name === "ChunkLoadError");

  useEffect(() => {
    console.error("Client error caught by ErrorBoundary:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 text-center space-y-4">
        <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-900">
            {isChunkError ? "Application Update Detected" : "Something went wrong"}
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            {isChunkError
              ? "A newer version of Cortex HMS was deployed. Please reload the page to apply the latest updates."
              : error?.message || "An unexpected error occurred while loading this page."}
          </p>
        </div>
        <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
          <button
            type="button"
            onClick={() => {
              sessionStorage.removeItem("chunk_reload_ts");
              if (isChunkError) {
                try {
                  const url = new URL(window.location.href);
                  url.searchParams.set("_v", String(Date.now()));
                  window.location.href = url.toString();
                } catch {
                  window.location.reload();
                }
              } else {
                reset();
              }
            }}
            className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" /> {isChunkError ? "Refresh Page" : "Try Again"}
          </button>
          <Link
            href="/admin/opd"
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" /> Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

