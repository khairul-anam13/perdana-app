import type { Metadata, Viewport } from "next";
import { Lexend } from "next/font/google";
import { SwRegister } from "@/components/app/sw-register";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

const lexend = Lexend({ subsets: ["latin"], variable: "--font-lexend", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Perdana", template: "%s · Perdana" },
  description:
    "Administrasi Karang Taruna: kas, anggota, dan kegiatan. Tetap bisa dipakai tanpa internet.",
  applicationName: "Perdana",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Perdana", statusBarStyle: "default" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#1a522f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={lexend.variable}>
      <body className="bg-kapur text-tinta antialiased">
        <ToastProvider>{children}</ToastProvider>
        <SwRegister />
      </body>
    </html>
  );
}
