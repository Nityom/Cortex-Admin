import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import ConvexClientProvider from "@/components/providers/ConvexClientProvider";

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
  title: "Svasth-HMS",
  description: "Hospital Management System",
  icons: {
    icon: "/Svasth_favicon.png",
    shortcut: "/Svasth_favicon.png",
    apple: "/Svasth_favicon.png",
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
        <link rel="icon" href="/Svasth_favicon.png" />
      </head>
      <body
        className={`${inter.variable} ${geistMono.variable} font-sans antialiased text-slate-900 bg-slate-50/50`}
      >
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
