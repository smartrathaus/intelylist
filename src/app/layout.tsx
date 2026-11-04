import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegistration } from "@/components/service-worker";

export const metadata: Metadata = {
  title: "intelylist – Gemeinsam organisieren",
  description: "Aufgaben und Einkaufslisten gemeinsam im Blick.",
  applicationName: "intelylist",
  icons: { icon: "/icon.svg" },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "intelylist" },
  robots: { index: false, follow: false }
};
export const viewport: Viewport = { themeColor: "#f5f8fa", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="de"><body><ServiceWorkerRegistration/>{children}</body></html>;
}