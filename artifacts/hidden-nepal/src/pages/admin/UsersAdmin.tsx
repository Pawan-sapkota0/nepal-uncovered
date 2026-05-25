import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { admin } from "@/lib/api";
import { useAuth } from "@/store/useAuth";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const roleColor: Record<string, string> = {
  admin: "bg-accent text-accent-foreground border-0",
  moderator: "bg-saffron text-saffron-foreground border-0",
  contributor: "bg-secondary text-secondary-foreground border-0",
  viewer: "bg-muted text-muted-foreground border-0",
};

const UsersAdmin = () => {
  const { user: currentUser } = useAuth();
  const qc = useQueryClient();
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => admin.users(),
  });

  const updateRole = useMutation({
    mutationFn: ({ id, roles }: { id: string; roles: string[] }) => admin.updateUserRoles(id, roles),
    onSuccess: (_, { roles }) => {
      toast.success(`Role updated to ${roles.join(", ")}`);
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: () => toast.error("Failed to update role"),
  });

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="text-xs uppercase tracking-[0.2em] text-accent font-semibold mb-2">Community</div>
      <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">Users</h1>
      <p className="text-muted-foreground mt-1">Manage roles and permissions.</p>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="mt-8 rounded-2xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Joined</th>
                <th className="px-4 py-3 font-medium text-right">Contributions</th>
                <th className="px-4 py-3 font-medium">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => {
                const topRole = u.roles.includes("admin") ? "admin"
                  : u.roles.includes("moderator") ? "moderator"
                  : u.roles.includes("contributor") ? "contributor" : "viewer";
                return (
                  <tr key={u.id} className="hover:bg-muted/30 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-gradient-sunset text-accent-foreground grid place-items-center font-semibold text-sm">
                          {(u.name ?? u.email).charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate">
                            {u.name ?? "—"} {currentUser?.id === u.id && <span className="text-xs text-muted-foreground">(you)</span>}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                      {u.joinedAt ? new Date(u.joinedAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{u.contributionsCount ?? 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Badge className={roleColor[topRole] ?? ""}>{topRole}</Badge>
                        {currentUser?.roles?.includes("admin") && currentUser.id !== u.id && (
                          <Select value={topRole} onValueChange={(v) => {
                            const base = ["viewer"];
                            if (v === "contributor") base.push("contributor");
                            if (v === "moderator") base.push("moderator");
                            if (v === "admin") base.push("contributor", "moderator", "admin");
                            updateRole.mutate({ id: u.id, roles: base });
                          }}>
                            <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="viewer">Viewer</SelectItem>
                              <SelectItem value="contributor">Contributor</SelectItem>
                              <SelectItem value="moderator">Moderator</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default UsersAdmin;
