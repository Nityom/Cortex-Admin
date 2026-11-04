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
      </head>
      <body className="font-sans antialiased text-slate-900">
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
