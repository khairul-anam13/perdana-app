import type { Metadata, Viewport } from "next";
import { Schibsted_Grotesk, Besley } from "next/font/google";
import { SwRegister } from "@/components/app/sw-register";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

// Schibsted Grotesk: teks dan angka (tabular) yang tegas dan mudah dibaca di luar ruangan.
// Besley (Clarendon, huruf khas kuitansi dan stempel): judul dan angka besar.
const schibsted = Schibsted_Grotesk({
  subsets: ["latin"],
  variable: "--font-schibsted",
  display: "swap",
});
const besley = Besley({ subsets: ["latin"], variable: "--font-besley", display: "swap" });

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
  themeColor: "#0f1a33",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${schibsted.variable} ${besley.variable}`}>
      <body className="bg-kertas text-tinta antialiased">
        <ToastProvider>{children}</ToastProvider>
        <SwRegister />
      </body>
    </html>
  );
}
