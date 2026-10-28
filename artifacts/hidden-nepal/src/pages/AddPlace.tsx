import { useEffect, useRef } from "react";
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
import { PROVINCES } from "@/lib/constants";
import { getImageUrl } from "@/lib/imageUrl";
import { CategoryIcon } from "@/components/categories/CategoryIcon";
import type { Difficulty, Province } from "@/types";
import {
  useSingleImageUpload,
  useMultiImageUpload,
  PLACE_IMAGE_ACCEPT,
  PLACE_IMAGE_UPLOAD_RULES,
  validateImageFile,
} from "@/hooks/useImageUpload";
import { ArrowLeft, ImageIcon, Send, X, Loader2, Upload, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { cn } from "@/lib/utils";

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const AddPlace = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const galleryInputRef = useRef<HTMLInputElement>(null);

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

  const cover = useSingleImageUpload(PLACE_IMAGE_UPLOAD_RULES);
  const gallery = useMultiImageUpload(10, PLACE_IMAGE_UPLOAD_RULES);

  const onCoverFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateImageFile(file, PLACE_IMAGE_UPLOAD_RULES);
    if (err) { toast.error(err); return; }
    await cover.upload(file);
    e.target.value = "";
  };

  const onGalleryFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    for (const f of Array.from(files)) {
      const err = validateImageFile(f, PLACE_IMAGE_UPLOAD_RULES);
      if (err) { toast.error(`${f.name}: ${err}`); return; }
    }
    await gallery.upload(files);
    e.target.value = "";
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
        coverImage: cover.image!.objectPath,
        images: gallery.images.map((i) => i.objectPath),
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
    if (!cover.image) {
      toast.error("A cover image is required");
      return;
    }
    if (gallery.images.length < 2) {
      toast.error("Please upload at least 2 gallery images");
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
                      <SelectItem key={c.slug} value={c.slug}>
                        <span className="inline-flex items-center gap-2">
                          <CategoryIcon icon={c.icon} className="text-base leading-none" />
                          {c.name}
                        </span>
                      </SelectItem>
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
                    {PROVINCES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
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

          {/* ── Cover image ── */}
          <Section title="Cover image" badge="Required">
            <p className="text-sm text-muted-foreground -mt-2">This image appears on cards across the site — choose one that captures the spirit of the place.</p>

            {cover.image ? (
              <div className="relative rounded-xl overflow-hidden border border-border h-56 bg-muted">
                <img src={cover.image.previewUrl} alt="Cover preview" className="h-full w-full object-cover" />
                <div className="absolute top-2 right-2 flex gap-1.5">
                  <span className="inline-flex items-center gap-1 text-xs bg-emerald-600 text-white px-2 py-1 rounded-full font-medium">
                    <CheckCircle2 className="h-3 w-3" /> Uploaded
                  </span>
                  <button
                    type="button"
                    onClick={cover.clear}
                    className="h-7 w-7 grid place-items-center rounded-full bg-background/90 border border-border hover:bg-destructive hover:text-destructive-foreground transition"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <label className={cn(
                "flex flex-col items-center justify-center gap-3 cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-colors",
                cover.state === "uploading" ? "border-accent/50 bg-accent/5" : "border-border bg-muted/30 hover:bg-muted hover:border-accent/40"
              )}>
                {cover.state === "uploading" ? (
                  <>
                    <Loader2 className="h-8 w-8 animate-spin text-accent" />
                    <div className="text-sm text-muted-foreground">Uploading…</div>
                  </>
                ) : (
                  <>
                    <div className="h-12 w-12 rounded-xl bg-accent/10 grid place-items-center">
                      <Upload className="h-6 w-6 text-accent" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">Click to upload cover image</div>
                      <div className="text-xs text-muted-foreground mt-0.5">JPG, PNG, WebP, AVIF — up to 8MB</div>
                    </div>
                  </>
                )}
                <input type="file" accept={PLACE_IMAGE_ACCEPT} onChange={onCoverFile} className="hidden" disabled={cover.state === "uploading"} />
              </label>
            )}

            {cover.error && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" /> {cover.error}
              </div>
            )}
          </Section>

          {/* ── Gallery images ── */}
          <Section title="Gallery images" badge="2–10 required">
            <p className="text-sm text-muted-foreground -mt-2">These appear in the gallery carousel on the place detail page. Upload at least 2 to show the full character of the place.</p>

            {gallery.images.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {gallery.images.map((img) => (
                  <div key={img.objectPath} className="relative aspect-square rounded-lg overflow-hidden border border-border group">
                    <img src={img.previewUrl} alt={img.name} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => gallery.remove(img.objectPath)}
                      className="absolute top-1 right-1 h-6 w-6 rounded-full bg-background/90 border border-border grid place-items-center opacity-0 group-hover:opacity-100 transition hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}

                {gallery.images.length < 10 && (
                  <label className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-accent/40 hover:bg-muted cursor-pointer flex items-center justify-center transition">
                    {gallery.uploading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    ) : (
                      <span className="text-2xl text-muted-foreground">+</span>
                    )}
                    <input ref={galleryInputRef} type="file" accept={PLACE_IMAGE_ACCEPT} multiple onChange={onGalleryFiles} className="hidden" disabled={gallery.uploading} />
                  </label>
                )}
              </div>
            )}

            {gallery.images.length === 0 && (
              <label className={cn(
                "flex flex-col items-center justify-center gap-3 cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-colors",
                gallery.uploading ? "border-accent/50 bg-accent/5" : "border-border bg-muted/30 hover:bg-muted hover:border-accent/40"
              )}>
                {gallery.uploading ? (
                  <>
                    <Loader2 className="h-8 w-8 animate-spin text-accent" />
                    <div className="text-sm text-muted-foreground">Uploading…</div>
                  </>
                ) : (
                  <>
                    <div className="h-12 w-12 rounded-xl bg-accent/10 grid place-items-center">
                      <ImageIcon className="h-6 w-6 text-accent" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">Click to upload gallery images</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Select up to 10 images · JPG, PNG, WebP, AVIF — up to 8MB each</div>
                    </div>
                  </>
                )}
                <input type="file" accept={PLACE_IMAGE_ACCEPT} multiple onChange={onGalleryFiles} className="hidden" disabled={gallery.uploading} />
              </label>
            )}

            <div className="flex items-center gap-3 text-sm">
              <span className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                gallery.images.length >= 2
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                  : "bg-muted text-muted-foreground"
              )}>
                {gallery.images.length >= 2 ? <CheckCircle2 className="h-3.5 w-3.5" /> : <ImageIcon className="h-3.5 w-3.5" />}
                {gallery.images.length} / 10 images
                {gallery.images.length < 2 && " (need at least 2)"}
              </span>
            </div>

            {gallery.error && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" /> {gallery.error}
              </div>
            )}
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

          {/* Validation summary */}
          {(!cover.image || gallery.images.length < 2) && (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-4 text-sm text-amber-800 dark:text-amber-400 space-y-1">
              <div className="font-medium mb-2">Before you can submit:</div>
              {!cover.image && <div className="flex items-center gap-2"><AlertCircle className="h-3.5 w-3.5 shrink-0" /> Upload a cover image</div>}
              {gallery.images.length < 2 && <div className="flex items-center gap-2"><AlertCircle className="h-3.5 w-3.5 shrink-0" /> Upload at least {2 - gallery.images.length} more gallery image{2 - gallery.images.length === 1 ? "" : "s"}</div>}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 sm:justify-end pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => navigate("/contribute")}>Cancel</Button>
            <Button
              type="submit"
              variant="hero"
              size="lg"
              disabled={isPending || cover.state === "uploading" || gallery.uploading || !cover.image || gallery.images.length < 2}
            >
              <Send className="h-4 w-4" />
              {isPending ? "Submitting…" : "Submit for review"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Section = ({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) => (
  <section>
    <div className="flex items-center gap-3 mb-4">
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      {badge && (
        <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-accent/15 text-accent">{badge}</span>
      )}
    </div>
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
