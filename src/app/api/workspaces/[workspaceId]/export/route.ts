import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: workspace, error: workspaceError } = await supabase.from("workspaces").select("*").eq("id", workspaceId).single();
  if (workspaceError || !workspace) return Response.json({ error: "Not found" }, { status: 404 });

  const [{ data: lists, error: listsError }, { data: members, error: membersError }] = await Promise.all([
    supabase.from("lists").select("*").eq("workspace_id", workspaceId).order("created_at"),
    supabase.from("workspace_members").select("user_id,role,joined_at").eq("workspace_id", workspaceId)
  ]);
  if (listsError || membersError) return Response.json({ error: "Export failed" }, { status: 500 });

  const listIds = (lists ?? []).map((list) => list.id);
  const memberIds = (members ?? []).map((member) => member.user_id);
  const [{ data: entries, error: entriesError }, { data: profiles, error: profilesError }] = await Promise.all([
    listIds.length ? supabase.from("list_entries").select("*").in("list_id", listIds) : Promise.resolve({ data: [], error: null }),
    memberIds.length ? supabase.from("profiles").select("user_id,display_name").in("user_id", memberIds) : Promise.resolve({ data: [], error: null })
  ]);
  if (entriesError || profilesError) return Response.json({ error: "Export failed" }, { status: 500 });

  const exportData = {
    format: "intelylist-workspace-export",
    version: 1,
    exportedAt: new Date().toISOString(),
    workspace,
    members: (members ?? []).map((member) => ({
      ...member,
      displayName: (profiles ?? []).find((profile) => profile.user_id === member.user_id)?.display_name ?? null
    })),
    lists: (lists ?? []).map((list) => ({
      ...list,
      entries: (entries ?? []).filter((entry) => entry.list_id === list.id)
    }))
  };

  return new Response(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="intelylist-${workspaceId}-export.json"`,
      "Cache-Control": "private, no-store, max-age=0"
    }
  });
}
