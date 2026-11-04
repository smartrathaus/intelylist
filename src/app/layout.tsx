import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "intelylist – Gemeinsam organisieren",
  description: "Aufgaben und Einkaufslisten gemeinsam im Blick.",
  applicationName: "intelylist",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "intelylist" }
};
export const viewport: Viewport = { themeColor: "#f7f8f6", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="de"><body>{children}</body></html>;
}