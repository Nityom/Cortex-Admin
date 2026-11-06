import type { Metadata } from "next";
import "./globals.css";
import ConvexClientProvider from "@/components/providers/ConvexClientProvider";
import { hospitalConfig } from "@/config/hospital";

export const metadata: Metadata = {
  title: `${hospitalConfig.name} | Svaasth-HMS`,
  description: `${hospitalConfig.legalName} - Powered by Svaasth-HMS Hospital Management System`,
  icons: {
    icon: hospitalConfig.branding.faviconUrl,
    shortcut: hospitalConfig.branding.faviconUrl,
    apple: hospitalConfig.branding.faviconUrl,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href={hospitalConfig.branding.faviconUrl} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400..700;1,9..40,400..700&family=Manrope:wght@400..800&family=Geist+Mono:wght@400..700&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function reloadOnChunkError(err) {
                  var message = (err && (err.message || (err.reason && err.reason.message))) || '';
                  var isChunkErr =
                    message.indexOf('ChunkLoadError') !== -1 ||
                    message.indexOf('Loading chunk') !== -1 ||
                    message.indexOf("Unexpected token '<'") !== -1 ||
                    (err && err.name === 'ChunkLoadError');
                  if (isChunkErr) {
                    var lastReload = sessionStorage.getItem('chunk_reload_ts');
                    var now = Date.now();
                    if (!lastReload || now - parseInt(lastReload, 10) > 8000) {
                      sessionStorage.setItem('chunk_reload_ts', String(now));
                      window.location.reload();
                    }
                  }
                }
                window.addEventListener('error', reloadOnChunkError, true);
                window.addEventListener('unhandledrejection', function(e) {
                  reloadOnChunkError(e && e.reason);
                });
              })();
            `,
          }}
        />
      </head>
      <body className="font-sans antialiased text-slate-900">
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
