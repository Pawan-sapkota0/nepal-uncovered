import { useApp } from "@/store/useApp";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { UserRole } from "@/types";
import { toast } from "sonner";

const roleColor: Record<UserRole, string> = {
  admin: "bg-accent text-accent-foreground border-0",
  moderator: "bg-saffron text-saffron-foreground border-0",
  contributor: "bg-secondary text-secondary-foreground border-0",
  viewer: "bg-muted text-muted-foreground border-0",
};

const UsersAdmin = () => {
  const { users, setUserRole, currentUser } = useApp();

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="text-xs uppercase tracking-[0.2em] text-accent font-semibold mb-2">Community</div>
      <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">Users</h1>
      <p className="text-muted-foreground mt-1">Manage roles and permissions.</p>

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
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-muted/30 transition">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-gradient-sunset text-accent-foreground grid place-items-center font-semibold text-sm">
                      {u.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{u.name} {currentUser?.id === u.id && <span className="text-xs text-muted-foreground">(you)</span>}</div>
                      <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{u.joinedAt}</td>
                <td className="px-4 py-3 text-right tabular-nums">{u.contributions}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Badge className={roleColor[u.role]}>{u.role}</Badge>
                    {currentUser?.role === "admin" && currentUser.id !== u.id && (
                      <Select value={u.role} onValueChange={(v: UserRole) => {
                        setUserRole(u.id, v);
                        toast.success(`Role updated to ${v}`);
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UsersAdmin;
