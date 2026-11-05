import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegistration } from "@/components/service-worker";
import { ThemeProvider } from "@/components/theme-provider";
import { createClient } from "@/lib/supabase/server";

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

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  let preferences = null;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from("user_preferences").select("theme,color_mode,accent_color").eq("user_id", user.id).maybeSingle();
      if (data) preferences = { theme: data.theme, colorMode: data.color_mode, accentColor: data.accent_color };
    }
  } catch {
    // The public/auth shell remains renderable when Supabase is not configured locally.
  }
  return <html lang="de"><body><ThemeProvider initial={preferences}><ServiceWorkerRegistration/>{children}</ThemeProvider></body></html>;
}
