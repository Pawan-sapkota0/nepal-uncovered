import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { admin } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, Tag, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface Category {
  slug: string; name: string; description?: string; icon?: string; sortOrder: number;
}

const empty = { slug: "", name: "", description: "", icon: "", sortOrder: 0 };

const CategoriesAdmin = () => {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState(empty);

  const { data: cats = [], isLoading } = useQuery<Category[]>({
    queryKey: ["admin-categories"],
    queryFn: () => admin.categories(),
  });

  const createMut = useMutation({
    mutationFn: () => admin.createCategory({ slug: form.slug, name: form.name, description: form.description, icon: form.icon, sortOrder: Number(form.sortOrder) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-categories"] }); qc.invalidateQueries({ queryKey: ["categories"] }); setCreating(false); setForm(empty); toast.success("Category created"); },
    onError: (e: any) => toast.error(e?.message ?? "Failed to create"),
  });

  const updateMut = useMutation({
    mutationFn: () => admin.updateCategory(editing!.slug, { name: form.name, description: form.description, icon: form.icon, sortOrder: Number(form.sortOrder) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-categories"] }); qc.invalidateQueries({ queryKey: ["categories"] }); setEditing(null); toast.success("Category updated"); },
    onError: () => toast.error("Failed to update"),
  });

  const deleteMut = useMutation({
    mutationFn: (slug: string) => admin.deleteCategory(slug),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-categories"] }); qc.invalidateQueries({ queryKey: ["categories"] }); toast.success("Category deleted"); },
    onError: () => toast.error("Failed to delete — category may have places attached"),
  });

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setForm({ slug: cat.slug, name: cat.name, description: cat.description ?? "", icon: cat.icon ?? "", sortOrder: cat.sortOrder });
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="text-xs uppercase tracking-[0.2em] text-accent font-semibold mb-2">Catalogue</div>
      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">Categories</h1>
          <p className="text-muted-foreground mt-1">Manage place categories shown across the site.</p>
        </div>
        <Button onClick={() => { setForm(empty); setCreating(true); }} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" /> New category
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-muted-foreground font-semibold">Category</th>
                <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-muted-foreground font-semibold hidden sm:table-cell">Description</th>
                <th className="px-4 py-3 text-center text-xs uppercase tracking-wider text-muted-foreground font-semibold">Order</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {cats.map((cat) => (
                <tr key={cat.slug} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{cat.icon ?? "📌"}</span>
                      <div>
                        <div className="font-medium">{cat.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{cat.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground text-sm hidden sm:table-cell max-w-xs truncate">
                    {cat.description ?? <span className="italic text-muted-foreground/50">—</span>}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <Badge variant="secondary">{cat.sortOrder}</Badge>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(cat)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => { if (confirm(`Delete "${cat.name}"?`)) deleteMut.mutate(cat.slug); }}
                        disabled={deleteMut.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {cats.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-16 text-center text-muted-foreground">
                    <Tag className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    No categories yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={creating || !!editing} onOpenChange={(o) => { if (!o) { setCreating(false); setEditing(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">{editing ? "Edit category" : "New category"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!editing && (
              <div>
                <label className="text-sm font-medium mb-1.5 block">Slug <span className="text-muted-foreground text-xs">(URL key, cannot change later)</span></label>
                <Input placeholder="e.g. waterfalls" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") }))} />
              </div>
            )}
            <div className="grid grid-cols-[1fr_80px] gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Name</label>
                <Input placeholder="Waterfalls" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Icon</label>
                <Input placeholder="💧" value={form.icon} onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))} className="text-center text-lg" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Description</label>
              <Textarea rows={2} placeholder="Short description of this category" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Sort order <span className="text-muted-foreground text-xs">(lower = first)</span></label>
              <Input type="number" value={form.sortOrder} onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))} className="w-28" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreating(false); setEditing(null); }}>Cancel</Button>
            <Button
              disabled={!form.name.trim() || (!editing && !form.slug.trim()) || createMut.isPending || updateMut.isPending}
              onClick={() => editing ? updateMut.mutate() : createMut.mutate()}
            >
              {(createMut.isPending || updateMut.isPending) ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? "Save changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CategoriesAdmin;
