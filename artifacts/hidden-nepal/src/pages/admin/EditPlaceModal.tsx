import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { admin, categories as categoriesApi, type ApiPlace } from "@/lib/api";
import { getImageUrl } from "@/lib/imageUrl";
import {
  PLACE_IMAGE_ACCEPT,
  PLACE_IMAGE_UPLOAD_RULES,
  useMultiImageUpload,
  useSingleImageUpload,
  validateImageFile,
} from "@/hooks/useImageUpload";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AlertCircle, CheckCircle2, ImageIcon, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { PROVINCES } from "@/lib/constants";
import { cn } from "@/lib/utils";

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
  const cover = useSingleImageUpload(PLACE_IMAGE_UPLOAD_RULES);
  const gallery = useMultiImageUpload(10, PLACE_IMAGE_UPLOAD_RULES);

  useEffect(() => {
    if (place) {
      cover.clear();
      gallery.clear();
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
        coverImage: place.coverImage ?? null,
        images: [...(place.images ?? [])],
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

  const existingGallery = form.images ?? [];
  const galleryItems = [
    ...existingGallery.map((path) => ({
      path,
      src: getImageUrl(path),
      name: path.split("/").pop() || "Existing image",
      existing: true,
    })),
    ...gallery.images.map((image) => ({
      path: image.objectPath,
      src: image.previewUrl,
      name: image.name,
      existing: false,
    })),
  ];

  const onCoverFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const validationError = validateImageFile(file, PLACE_IMAGE_UPLOAD_RULES);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const uploaded = await cover.upload(file);
    if (uploaded) set("coverImage", uploaded.objectPath);
  };

  const onGalleryFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    if (existingGallery.length + gallery.images.length + files.length > 10) {
      toast.error("Maximum 10 gallery images allowed");
      return;
    }

    for (const file of files) {
      const validationError = validateImageFile(file, PLACE_IMAGE_UPLOAD_RULES);
      if (validationError) {
        toast.error(`${file.name}: ${validationError}`);
        return;
      }
    }

    await gallery.upload(files);
  };

  const removeGalleryImage = (path: string) => {
    if (existingGallery.includes(path)) {
      set("images", existingGallery.filter((image) => image !== path));
    } else {
      gallery.remove(path);
    }
  };

  const replaceGalleryImage = async (path: string, file: File) => {
    const validationError = validateImageFile(file, PLACE_IMAGE_UPLOAD_RULES);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const uploaded = await gallery.upload([file]);
    if (!uploaded?.[0]) return;

    if (existingGallery.includes(path)) {
      set("images", existingGallery.filter((image) => image !== path));
    } else {
      gallery.remove(path);
    }
  };

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => admin.updatePlace(placeId!, {
      ...form,
      coverImage: form.coverImage ?? null,
      images: [
        ...(form.images ?? []),
        ...gallery.images.map((image) => image.objectPath),
      ],
    }),
    onSuccess: () => {
      toast.success("Place updated");
      qc.invalidateQueries({ queryKey: ["admin-places"] });
      qc.invalidateQueries({ queryKey: ["places"] });
      qc.invalidateQueries({ queryKey: ["admin-place", placeId] });
      qc.invalidateQueries({ queryKey: ["place"] });
      onClose();
    },
    onError: (error: any) => toast.error(error?.message ?? "Failed to save changes"),
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

            <Section title="Images">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Field label="Cover image">
                    <p className="text-xs text-muted-foreground">
                      Replace the cover without changing it unless you choose a new file.
                    </p>
                  </Field>
                  <span className="text-xs text-muted-foreground shrink-0">JPG, PNG, WebP, AVIF · 8MB</span>
                </div>

                {cover.image?.previewUrl || form.coverImage ? (
                  <div className="relative h-48 overflow-hidden rounded-xl border border-border bg-muted">
                    <img
                      src={cover.image?.previewUrl ?? getImageUrl(form.coverImage)}
                      alt="Place cover preview"
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-background/90 px-2 py-1 text-xs font-medium">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        {cover.image ? "New cover uploaded" : "Current cover"}
                      </span>
                      <div className="flex gap-1.5">
                        <label
                          htmlFor={`edit-cover-${placeId}`}
                          className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-full border border-border bg-background/90 px-2.5 text-xs font-medium hover:bg-background"
                        >
                          <Upload className="h-3 w-3" /> Replace
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            cover.clear();
                            set("coverImage", null);
                          }}
                          className="inline-flex h-7 items-center gap-1 rounded-full border border-border bg-background/90 px-2.5 text-xs font-medium hover:bg-destructive hover:text-destructive-foreground"
                        >
                          <X className="h-3 w-3" /> Remove
                        </button>
                      </div>
                    </div>
                    <input
                      id={`edit-cover-${placeId}`}
                      type="file"
                      accept={PLACE_IMAGE_ACCEPT}
                      className="sr-only"
                      onChange={onCoverFile}
                      disabled={cover.state === "uploading"}
                    />
                  </div>
                ) : (
                  <label className={cn(
                    "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors",
                    cover.state === "uploading" ? "border-accent/50 bg-accent/5" : "border-border bg-muted/30 hover:border-accent/40 hover:bg-muted",
                  )}>
                    {cover.state === "uploading" ? (
                      <Loader2 className="h-7 w-7 animate-spin text-accent" />
                    ) : (
                      <>
                        <Upload className="h-7 w-7 text-accent" />
                        <span className="text-sm font-medium">Upload a cover image</span>
                      </>
                    )}
                    <input
                      id={`edit-cover-${placeId}`}
                      type="file"
                      accept={PLACE_IMAGE_ACCEPT}
                      className="sr-only"
                      onChange={onCoverFile}
                      disabled={cover.state === "uploading"}
                    />
                  </label>
                )}
                {cover.error && (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" /> {cover.error}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">Gallery images</div>
                    <p className="text-xs text-muted-foreground">
                      Existing images stay until you remove or replace them.
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">{galleryItems.length} / 10</span>
                </div>

                {galleryItems.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {galleryItems.map((image, index) => (
                      <div key={`${image.path}-${index}`} className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted">
                        <img src={image.src} alt={image.name} className="h-full w-full object-cover" />
                        <div className="absolute inset-x-1 bottom-1 flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <label
                            htmlFor={`edit-gallery-replace-${placeId}-${index}`}
                            className="grid h-6 w-6 cursor-pointer place-items-center rounded-full border border-border bg-background/90 hover:bg-background"
                            title="Replace image"
                          >
                            <Upload className="h-3 w-3" />
                          </label>
                          <button
                            type="button"
                            onClick={() => removeGalleryImage(image.path)}
                            className="grid h-6 w-6 place-items-center rounded-full border border-border bg-background/90 hover:bg-destructive hover:text-destructive-foreground"
                            title="Remove image"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                        <input
                          id={`edit-gallery-replace-${placeId}-${index}`}
                          type="file"
                          accept={PLACE_IMAGE_ACCEPT}
                          className="sr-only"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            event.target.value = "";
                            if (file) void replaceGalleryImage(image.path, file);
                          }}
                          disabled={gallery.uploading}
                        />
                      </div>
                    ))}
                    {galleryItems.length < 10 && (
                      <label className="grid aspect-square cursor-pointer place-items-center rounded-lg border-2 border-dashed border-border text-muted-foreground hover:border-accent/40 hover:bg-muted">
                        {gallery.uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImageIcon className="h-5 w-5" />}
                        <input
                          type="file"
                          accept={PLACE_IMAGE_ACCEPT}
                          multiple
                          className="sr-only"
                          onChange={onGalleryFiles}
                          disabled={gallery.uploading}
                        />
                      </label>
                    )}
                  </div>
                ) : (
                  <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 p-8 text-center hover:border-accent/40 hover:bg-muted">
                    {gallery.uploading ? <Loader2 className="h-7 w-7 animate-spin text-accent" /> : <ImageIcon className="h-7 w-7 text-accent" />}
                    <span className="text-sm font-medium">Upload gallery images</span>
                    <span className="text-xs text-muted-foreground">Up to 10 images · 8MB each</span>
                    <input
                      type="file"
                      accept={PLACE_IMAGE_ACCEPT}
                      multiple
                      className="sr-only"
                      onChange={onGalleryFiles}
                      disabled={gallery.uploading}
                    />
                  </label>
                )}
                {gallery.error && (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" /> {gallery.error}
                  </div>
                )}
              </div>
            </Section>
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button
            onClick={() => save()}
            disabled={isPending || isLoading || cover.state === "uploading" || gallery.uploading}
          >
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
