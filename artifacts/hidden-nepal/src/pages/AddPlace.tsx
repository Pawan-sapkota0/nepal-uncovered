import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/store/useAuth";
import { places as placesApi, categories as categoriesApi } from "@/lib/api";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { provinces } from "@/data/mock";
import type { Difficulty, Province } from "@/types";
import { ArrowLeft, ImageIcon, Send } from "lucide-react";
import { toast } from "sonner";

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const AddPlace = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  useEffect(() => {
    if (currentUser === null) navigate("/auth");
  }, [currentUser, navigate]);

  const { data: apiCategories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoriesApi.list(),
    staleTime: 300_000,
  });

  const [form, setForm] = useState({
    title: "", shortDescription: "", description: "", history: "",
    category: "lakes",
    district: "", province: "Bagmati" as Province,
    lat: "27.7", lng: "85.3",
    coverImage: "",
    hidden: false,
    bestSeason: "Oct – Apr",
    difficulty: "Moderate" as Difficulty,
    costEstimate: "NPR 10,000 – 25,000",
    permits: "None",
    durationDays: 2,
    nearbyHospital: "",
    emergency: "Tourist Police: 1144",
    localSupport: "",
  });

  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => set("coverImage", reader.result as string);
    reader.readAsDataURL(file);
  };

  const { mutate: submitPlace, isPending } = useMutation({
    mutationFn: () =>
      placesApi.create({
        slug: slugify(form.title) + "-" + Date.now().toString(36),
        title: form.title,
        shortDescription: form.shortDescription,
        description: form.description,
        history: form.history || "Local history to be added.",
        categorySlug: form.category,
        district: form.district || "Unknown",
        province: form.province as any,
        lat: form.lat || "27.7",
        lng: form.lng || "85.3",
        coverImage: form.coverImage || undefined,
        hidden: form.hidden,
        bestSeason: form.bestSeason,
        difficulty: form.difficulty as any,
        costEstimate: form.costEstimate,
        permits: form.permits,
        durationDays: form.durationDays,
        nearbyHospital: form.nearbyHospital || "Nearest district hospital",
        emergency: form.emergency,
        localSupport: form.localSupport || "Local community support",
      }),
    onSuccess: () => {
      toast.success("Submitted! A moderator will review it shortly.");
      navigate("/contribute");
    },
    onError: (err: any) => {
      toast.error(err?.message ?? "Failed to submit. Please try again.");
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.shortDescription || !form.description) {
      toast.error("Please fill in title and descriptions");
      return;
    }
    submitPlace();
  };

  if (!currentUser) return null;

  return (
    <div className="pt-28 pb-20">
      <div className="container max-w-3xl">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="text-xs uppercase tracking-[0.2em] text-accent font-semibold mb-3">Add a place</div>
        <h1 className="font-display text-4xl font-semibold tracking-tight">Share a piece of Nepal</h1>
        <p className="mt-2 text-muted-foreground">Your submission will be reviewed by a moderator before it appears in the atlas.</p>

        <form onSubmit={onSubmit} className="mt-10 space-y-10">
          <Section title="Basics">
            <Field label="Place name" required>
              <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Khaptad National Park" />
            </Field>
            <Field label="Short description" required help="2–3 lines that appear on the card.">
              <Textarea rows={2} value={form.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} />
            </Field>
            <Field label="Full story" required>
              <Textarea rows={6} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="What makes this place special?" />
            </Field>
            <Field label="History & culture">
              <Textarea rows={4} value={form.history} onChange={(e) => set("history", e.target.value)} />
            </Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Category">
                <Select value={form.category} onValueChange={(v) => set("category", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {apiCategories.map((c) => (
                      <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Hidden gem?">
                <div className="flex items-center gap-3 h-10">
                  <Switch checked={form.hidden} onCheckedChange={(v) => set("hidden", v)} />
                  <span className="text-sm text-muted-foreground">Mark as a hidden gem</span>
                </div>
              </Field>
            </div>
          </Section>

          <Section title="Location">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Province">
                <Select value={form.province} onValueChange={(v) => set("province", v as Province)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {provinces.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="District">
                <Input value={form.district} onChange={(e) => set("district", e.target.value)} placeholder="e.g. Mugu" />
              </Field>
              <Field label="Latitude">
                <Input value={form.lat} onChange={(e) => set("lat", e.target.value)} placeholder="27.7" />
              </Field>
              <Field label="Longitude">
                <Input value={form.lng} onChange={(e) => set("lng", e.target.value)} placeholder="85.3" />
              </Field>
            </div>
          </Section>

          <Section title="Cover image">
            <div className="flex items-start gap-4">
              <label className="flex-1 cursor-pointer rounded-xl border-2 border-dashed border-border bg-muted/30 hover:bg-muted transition p-6 text-center">
                <ImageIcon className="h-6 w-6 mx-auto text-muted-foreground" />
                <div className="mt-2 text-sm font-medium">Upload cover image</div>
                <div className="text-xs text-muted-foreground">PNG or JPG, up to 5MB</div>
                <input type="file" accept="image/*" onChange={onFile} className="hidden" />
              </label>
              {form.coverImage && (
                <div className="h-32 w-44 overflow-hidden rounded-lg border border-border">
                  <img src={form.coverImage} alt="preview" className="h-full w-full object-cover" />
                </div>
              )}
            </div>
          </Section>

          <Section title="Travel info">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Best season">
                <Input value={form.bestSeason} onChange={(e) => set("bestSeason", e.target.value)} />
              </Field>
              <Field label="Difficulty">
                <Select value={form.difficulty} onValueChange={(v) => set("difficulty", v as Difficulty)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Easy">Easy</SelectItem>
                    <SelectItem value="Moderate">Moderate</SelectItem>
                    <SelectItem value="Challenging">Challenging</SelectItem>
                    <SelectItem value="Extreme">Extreme</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Cost estimate">
                <Input value={form.costEstimate} onChange={(e) => set("costEstimate", e.target.value)} />
              </Field>
              <Field label="Permits">
                <Input value={form.permits} onChange={(e) => set("permits", e.target.value)} />
              </Field>
              <Field label="Suggested days">
                <Input type="number" min={1} value={form.durationDays} onChange={(e) => set("durationDays", Number(e.target.value))} />
              </Field>
            </div>
          </Section>

          <Section title="Safety & support">
            <Field label="Nearest hospital">
              <Input value={form.nearbyHospital} onChange={(e) => set("nearbyHospital", e.target.value)} />
            </Field>
            <Field label="Emergency contact">
              <Input value={form.emergency} onChange={(e) => set("emergency", e.target.value)} />
            </Field>
            <Field label="Local support">
              <Input value={form.localSupport} onChange={(e) => set("localSupport", e.target.value)} placeholder="Community group, homestay coordinator…" />
            </Field>
          </Section>

          <div className="flex flex-col sm:flex-row gap-3 sm:justify-end pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => navigate("/contribute")}>Cancel</Button>
            <Button type="submit" variant="hero" size="lg" disabled={isPending}>
              <Send className="h-4 w-4" /> {isPending ? "Submitting…" : "Submit for review"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section>
    <h2 className="font-display text-xl font-semibold mb-4">{title}</h2>
    <div className="space-y-4">{children}</div>
  </section>
);

const Field = ({ label, help, required, children }: { label: string; help?: string; required?: boolean; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label>
      {label} {required && <span className="text-destructive">*</span>}
    </Label>
    {children}
    {help && <p className="text-xs text-muted-foreground">{help}</p>}
  </div>
);

export default AddPlace;
