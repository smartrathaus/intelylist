"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function RealtimeRefresh({ channel, table, filter }: { channel: string; table: string; filter: string }) {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    const subscription = supabase.channel(channel).on("postgres_changes", {
      event: "*", schema: "public", table, filter
    }, () => router.refresh()).subscribe();
    return () => { void supabase.removeChannel(subscription); };
  }, [channel, filter, router, table]);
  return null;
}