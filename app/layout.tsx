import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import ConvexClientProvider from "@/components/providers/ConvexClientProvider";
import { hospitalConfig } from "@/config/hospital";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: `${hospitalConfig.name} | Svasth-HMS`,
  description: `${hospitalConfig.legalName} - Powered by Svasth-HMS Hospital Management System`,
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
      </head>
      <body
        className={`${inter.variable} ${geistMono.variable} font-sans antialiased text-slate-900 bg-slate-50/50`}
      >
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
