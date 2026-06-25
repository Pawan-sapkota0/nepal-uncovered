import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { admin, categories as categoriesApi, type ApiPlace } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PROVINCES } from "@/lib/constants";

interface Props {
  placeId: string | null;
  open: boolean;
  onClose: () => void;
}

const DIFFICULTIES = ["Easy", "Moderate", "Challenging", "Extreme"] as const;
const STATUSES = [
  { value: "pending", label: "Pending review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "changes_requested", label: "Changes requested" },
] as const;

export const EditPlaceModal = ({ placeId, open, onClose }: Props) => {
  const qc = useQueryClient();

  const { data: place, isLoading } = useQuery({
    queryKey: ["admin-place", placeId],
    queryFn: () => admin.getPlace(placeId!),
    enabled: !!placeId && open,
  });

  const { data: cats = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoriesApi.list(),
    staleTime: 300_000,
  });

  const [form, setForm] = useState<Partial<ApiPlace> & { status?: string }>({});

  useEffect(() => {
    if (place) {
      setForm({
        title: place.title,
        shortDescription: place.shortDescription,
        description: place.description,
        history: place.history ?? "",
        categorySlug: place.categorySlug ?? "",
        district: place.district,
        province: place.province,
        lat: place.lat,
        lng: place.lng,
        hidden: place.hidden,
        featured: place.featured,
        bestSeason: place.bestSeason ?? "",
        difficulty: place.difficulty ?? "Moderate",
        costEstimate: place.costEstimate ?? "",
        permits: place.permits ?? "",
        durationDays: place.durationDays,
        nearbyHospital: place.nearbyHospital ?? "",
        emergency: place.emergency ?? "",
        localSupport: place.localSupport ?? "",
        status: place.status,
      });
    }
  }, [place]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => admin.updatePlace(placeId!, form),
    onSuccess: () => {
      toast.success("Place updated");
      qc.invalidateQueries({ queryKey: ["admin-places"] });
      qc.invalidateQueries({ queryKey: ["places"] });
      qc.invalidateQueries({ queryKey: ["admin-place", placeId] });
      onClose();
    },
    onError: () => toast.error("Failed to save changes"),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            Edit place {place ? `— ${place.title}` : ""}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-8 py-2">

            {/* Status & flags */}
            <Section title="Status">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Review status">
                  <Select value={form.status} onValueChange={(v) => set("status", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <div className="space-y-3 pt-1">
                  <div className="flex items-center gap-3">
                    <Switch checked={!!form.featured} onCheckedChange={(v) => set("featured", v)} />
                    <span className="text-sm">Featured on homepage</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={!!form.hidden} onCheckedChange={(v) => set("hidden", v)} />
                    <span className="text-sm">Hidden gem</span>
                  </div>
                </div>
              </div>
            </Section>

            {/* Basics */}
            <Section title="Basics">
              <Field label="Title" required>
                <Input value={form.title ?? ""} onChange={(e) => set("title", e.target.value)} />
              </Field>
              <Field label="Short description" required>
                <Textarea rows={2} value={form.shortDescription ?? ""} onChange={(e) => set("shortDescription", e.target.value)} />
              </Field>
              <Field label="Full description" required>
                <Textarea rows={5} value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} />
              </Field>
              <Field label="History & culture">
                <Textarea rows={3} value={form.history ?? ""} onChange={(e) => set("history", e.target.value)} />
              </Field>
              <Field label="Category">
                <Select value={form.categorySlug ?? ""} onValueChange={(v) => set("categorySlug", v)}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {cats.map((c) => (
                      <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </Section>

            {/* Location */}
            <Section title="Location">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Province">
                  <Select value={form.province ?? ""} onValueChange={(v) => set("province", v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PROVINCES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="District">
                  <Input value={form.district ?? ""} onChange={(e) => set("district", e.target.value)} />
                </Field>
                <Field label="Latitude">
                  <Input value={form.lat ?? ""} onChange={(e) => set("lat", e.target.value)} />
                </Field>
                <Field label="Longitude">
                  <Input value={form.lng ?? ""} onChange={(e) => set("lng", e.target.value)} />
                </Field>
              </div>
            </Section>

            {/* Travel */}
            <Section title="Travel info">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Best season">
                  <Input value={form.bestSeason ?? ""} onChange={(e) => set("bestSeason", e.target.value)} />
                </Field>
                <Field label="Difficulty">
                  <Select value={form.difficulty ?? "Moderate"} onValueChange={(v) => set("difficulty", v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DIFFICULTIES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Cost estimate">
                  <Input value={form.costEstimate ?? ""} onChange={(e) => set("costEstimate", e.target.value)} />
                </Field>
                <Field label="Permits">
                  <Input value={form.permits ?? ""} onChange={(e) => set("permits", e.target.value)} />
                </Field>
                <Field label="Duration (days)">
                  <Input type="number" min={1} value={form.durationDays ?? ""} onChange={(e) => set("durationDays", e.target.value ? Number(e.target.value) : undefined)} />
                </Field>
              </div>
            </Section>

            {/* Safety */}
            <Section title="Safety & support">
              <Field label="Nearby hospital">
                <Input value={form.nearbyHospital ?? ""} onChange={(e) => set("nearbyHospital", e.target.value)} />
              </Field>
              <Field label="Emergency contact">
                <Input value={form.emergency ?? ""} onChange={(e) => set("emergency", e.target.value)} />
              </Field>
              <Field label="Local support">
                <Input value={form.localSupport ?? ""} onChange={(e) => set("localSupport", e.target.value)} />
              </Field>
            </Section>
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button onClick={() => save()} disabled={isPending || isLoading}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3 pb-2 border-b border-border">
      {title}
    </h3>
    <div className="space-y-3">{children}</div>
  </div>
);

const Field = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label>{label}{required && <span className="text-destructive ml-1">*</span>}</Label>
    {children}
  </div>
);
