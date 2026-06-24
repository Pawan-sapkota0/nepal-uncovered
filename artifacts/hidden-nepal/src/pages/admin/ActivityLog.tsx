import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { admin } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ClipboardList, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActivityEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  meta: Record<string, any> | null;
  createdAt: string;
  actorName: string | null;
  actorEmail: string | null;
}

const ACTION_COLORS: Record<string, string> = {
  create: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  update: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  delete: "bg-red-500/15 text-red-700 dark:text-red-400",
  approve: "bg-accent/20 text-accent-foreground",
  reject: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  login: "bg-muted text-muted-foreground",
  feature: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
};

const actionColor = (action: string) => {
  const key = Object.keys(ACTION_COLORS).find((k) => action.includes(k));
  return key ? ACTION_COLORS[key] : "bg-muted text-muted-foreground";
};

const fmt = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const PAGE_SIZE = 50;
const ACTION_OPTIONS = ["", "create", "update", "delete", "approve", "reject", "feature", "login"];

const ActivityLog = () => {
  const [page, setPage] = useState(0);
  const [actionFilter, setActionFilter] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-activity", page, actionFilter],
    queryFn: () => admin.activity({ limit: PAGE_SIZE, offset: page * PAGE_SIZE, action: actionFilter !== "all" ? actionFilter : undefined }) as Promise<{ data: ActivityEntry[]; total: number }>,
    placeholderData: (prev) => prev,
  });

  const entries = data?.data ?? [];
  const total = data?.total ?? 0;
  const pages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="text-xs uppercase tracking-[0.2em] text-accent font-semibold mb-2">Admin</div>
      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">Activity Log</h1>
          <p className="text-muted-foreground mt-1">Audit trail of all admin and system actions.</p>
        </div>
        <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(0); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            {ACTION_OPTIONS.filter(Boolean).map((a) => (
              <SelectItem key={a} value={a} className="capitalize">{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
          <ClipboardList className="h-10 w-10 opacity-30" />
          <p>No activity recorded yet</p>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-border overflow-hidden bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-muted-foreground font-semibold">Action</th>
                  <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-muted-foreground font-semibold hidden md:table-cell">Entity</th>
                  <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-muted-foreground font-semibold">Actor</th>
                  <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-muted-foreground font-semibold hidden lg:table-cell">Details</th>
                  <th className="px-5 py-3 text-right text-xs uppercase tracking-wider text-muted-foreground font-semibold">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entries.map((e: ActivityEntry) => (
                  <tr key={e.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className={cn("text-xs font-mono px-2 py-0.5 rounded-full font-medium", actionColor(e.action))}>
                        {e.action}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <span className="font-mono text-xs text-muted-foreground">{e.entity}</span>
                      {e.entityId && <span className="text-xs text-muted-foreground/50 ml-2 truncate max-w-[80px] inline-block align-bottom">{e.entityId.slice(0, 8)}…</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-sm leading-tight">{e.actorName ?? "System"}</div>
                      {e.actorEmail && <div className="text-xs text-muted-foreground truncate max-w-[160px]">{e.actorEmail}</div>}
                    </td>
                    <td className="px-5 py-3.5 hidden lg:table-cell">
                      {e.meta && (
                        <span className="text-xs text-muted-foreground font-mono truncate max-w-xs inline-block">
                          {JSON.stringify(e.meta).slice(0, 80)}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right text-xs text-muted-foreground whitespace-nowrap">
                      {fmt(e.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
              <span>{total} events · page {page + 1} of {pages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page === 0}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= pages - 1}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ActivityLog;
