import type { Metadata } from "next";
import { DM_Sans, Manrope, Geist_Mono } from "next/font/google";
import "./globals.css";
import ConvexClientProvider from "@/components/providers/ConvexClientProvider";
import { hospitalConfig } from "@/config/hospital";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
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
        className={`${dmSans.variable} ${manrope.variable} ${geistMono.variable} font-sans antialiased text-slate-900`}
      >
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
