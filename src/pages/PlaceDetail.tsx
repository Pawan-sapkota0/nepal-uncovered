import { Link, useNavigate, useParams } from "react-router-dom";
import { useApp } from "@/store/useApp";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlaceCard } from "@/components/places/PlaceCard";
import {
  ArrowLeft, Bookmark, MapPin, CalendarDays, DollarSign, Mountain, FileCheck,
  Hospital, PhoneCall, LifeBuoy, Sparkles, Eye, Share2, ExternalLink, Navigation, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";

const PlaceDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { places, bookmarks, toggleBookmark } = useApp();
  const place = places.find((p) => p.slug === slug);

  useEffect(() => { window.scrollTo({ top: 0 }); }, [slug]);

  if (!place) {
    return (
      <div className="container pt-32 pb-20 text-center">
        <p className="font-display text-2xl mb-4">We couldn't find that place.</p>
        <Button onClick={() => navigate("/explore")}>Back to Explore</Button>
      </div>
    );
  }

  const saved = bookmarks.includes(place.id);
  const related = places
    .filter((p) => p.status === "approved" && p.id !== place.id && (p.category === place.category || p.province === place.province))
    .slice(0, 3);

  const [lat, lng] = place.coordinates;
  const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.5},${lat - 0.3},${lng + 0.5},${lat + 0.3}&marker=${lat},${lng}&layer=mapnik`;
  const fallbackDirectionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;

  const [locating, setLocating] = useState(false);

  const openDirections = () => {
    const dest = `${lat},${lng}`;
    if (!("geolocation" in navigator)) {
      window.open(fallbackDirectionsUrl, "_blank", "noopener,noreferrer");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const origin = `${pos.coords.latitude},${pos.coords.longitude}`;
        const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&travelmode=driving`;
        window.open(url, "_blank", "noopener,noreferrer");
        toast({
          title: "Route ready",
          description: `Directions from your location to ${place.title}.`,
        });
      },
      (err) => {
        setLocating(false);
        toast({
          title: "Using destination only",
          description:
            err.code === err.PERMISSION_DENIED
              ? "Location access was denied — opening map without an origin."
              : "Couldn't read your location — opening map without an origin.",
        });
        window.open(fallbackDirectionsUrl, "_blank", "noopener,noreferrer");
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 }
    );
  };

  return (
    <article>
      {/* Hero */}
      <section className="relative h-[78vh] min-h-[520px] flex items-end overflow-hidden">
        <div className="absolute inset-0">
          <img src={place.coverImage} alt={place.title} className="h-full w-full object-cover animate-slow-zoom" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/80" />
        </div>

        <div className="relative container pb-12 pt-32 text-primary-foreground">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm text-primary-foreground/85 hover:text-primary-foreground mb-6 transition"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          <div className="flex items-center gap-2 mb-4">
            {place.hidden && (
              <Badge className="bg-saffron text-saffron-foreground border-0 gap-1">
                <Sparkles className="h-3 w-3" /> Hidden gem
              </Badge>
            )}
            <Badge variant="secondary" className="capitalize bg-white/15 text-primary-foreground border-white/20 backdrop-blur">
              {place.category}
            </Badge>
          </div>

          <h1 className="font-display text-5xl md:text-7xl font-semibold tracking-tight max-w-4xl text-balance leading-[1.05]">
            {place.title}
          </h1>

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-primary-foreground/85">
            <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4" /> {place.district}, {place.province}</span>
            <span className="inline-flex items-center gap-2"><Eye className="h-4 w-4" /> {place.views.toLocaleString()} views</span>
            <span className="inline-flex items-center gap-2"><Mountain className="h-4 w-4" /> {place.travel.difficulty}</span>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild variant="hero" size="lg">
              <a href={directionsUrl} target="_blank" rel="noreferrer">
                Get directions <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => toggleBookmark(place.id)}
              className={cn("bg-white/10 border-white/30 text-primary-foreground hover:bg-white/20 hover:text-primary-foreground", saved && "bg-accent border-accent")}
            >
              <Bookmark className={cn("h-4 w-4", saved && "fill-current")} /> {saved ? "Saved" : "Save"}
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href);
              }}
              className="bg-white/10 border-white/30 text-primary-foreground hover:bg-white/20 hover:text-primary-foreground"
            >
              <Share2 className="h-4 w-4" /> Share
            </Button>
          </div>
        </div>
      </section>

      {/* Body */}
      <div className="container py-16 grid gap-12 lg:grid-cols-[1fr_360px]">
        <div className="space-y-14 min-w-0">
          {/* Story */}
          <section>
            <div className="text-xs uppercase tracking-[0.2em] text-accent font-semibold mb-3">The story</div>
            <h2 className="font-display text-3xl font-semibold mb-4">About {place.title}</h2>
            <p className="text-lg leading-relaxed text-foreground/85">{place.description}</p>
          </section>

          {/* Gallery */}
          <section>
            <h2 className="font-display text-2xl font-semibold mb-4">Gallery</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {place.images.map((img, i) => (
                <div key={i} className={cn("overflow-hidden rounded-lg bg-muted", i === 0 && "col-span-2 row-span-2")}>
                  <img src={img} alt={`${place.title} ${i + 1}`} loading="lazy" className="h-full w-full object-cover hover:scale-105 transition-transform duration-700 aspect-[4/3]" />
                </div>
              ))}
            </div>
          </section>

          {/* History */}
          <section>
            <div className="text-xs uppercase tracking-[0.2em] text-accent font-semibold mb-3">History & culture</div>
            <h2 className="font-display text-3xl font-semibold mb-4">A place older than memory</h2>
            <p className="text-lg leading-relaxed text-foreground/85">{place.history}</p>
          </section>

          {/* Map */}
          <section>
            <h2 className="font-display text-2xl font-semibold mb-4">Where it is</h2>
            <div className="overflow-hidden rounded-xl border border-border shadow-soft">
              <iframe
                title={`Map of ${place.title}`}
                src={mapSrc}
                className="w-full h-80"
                loading="lazy"
              />
            </div>
            <div className="mt-3 text-sm text-muted-foreground flex items-center justify-between flex-wrap gap-2">
              <span>Coordinates: {place.coordinates[0].toFixed(4)}°, {place.coordinates[1].toFixed(4)}°</span>
              <a href={directionsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                Open in Google Maps <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </section>

          {/* Safety */}
          <section className="rounded-2xl border border-accent/20 bg-accent-soft p-6 md:p-8">
            <div className="flex items-center gap-2 text-accent font-semibold mb-4">
              <LifeBuoy className="h-5 w-5" />
              <h2 className="font-display text-2xl">Safety & support</h2>
            </div>
            <p className="text-sm text-foreground/80 mb-6">
              The information that actually matters when you're far from home.
            </p>
            <div className="grid sm:grid-cols-3 gap-4">
              <SafetyCard icon={<Hospital className="h-4 w-4" />} title="Nearest hospital" body={place.safety.nearbyHospital} />
              <SafetyCard icon={<PhoneCall className="h-4 w-4" />} title="Emergency" body={place.safety.emergency} />
              <SafetyCard icon={<LifeBuoy className="h-4 w-4" />} title="Local support" body={place.safety.localSupport} />
            </div>
          </section>

          {/* Related */}
          {related.length > 0 && (
            <section>
              <h2 className="font-display text-2xl font-semibold mb-6">You might also love</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {related.map((p, i) => <PlaceCard key={p.id} place={p} index={i} />)}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar — travel info */}
        <aside className="lg:sticky lg:top-24 h-fit space-y-5">
          <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
            <div className="bg-gradient-mountain text-primary-foreground p-5">
              <div className="text-xs uppercase tracking-[0.2em] opacity-80 mb-1">Travel info</div>
              <div className="font-display text-xl">Plan your visit</div>
            </div>
            <dl className="divide-y divide-border">
              <Row icon={<CalendarDays className="h-4 w-4" />} label="Best season" value={place.travel.bestSeason} />
              <Row icon={<Mountain className="h-4 w-4" />} label="Difficulty" value={place.travel.difficulty} />
              <Row icon={<DollarSign className="h-4 w-4" />} label="Cost estimate" value={place.travel.costEstimate} />
              <Row icon={<FileCheck className="h-4 w-4" />} label="Permits" value={place.travel.permits} />
              <Row icon={<CalendarDays className="h-4 w-4" />} label="Suggested days" value={`${place.travel.durationDays} day${place.travel.durationDays > 1 ? "s" : ""}`} />
            </dl>
          </div>

          <Link
            to={`/explore?category=${place.category}`}
            className="block rounded-2xl border border-border bg-gradient-warm p-5 hover-lift"
          >
            <div className="text-xs uppercase tracking-[0.2em] text-accent font-semibold mb-1">More like this</div>
            <div className="font-display text-lg capitalize">Explore all {place.category}</div>
            <div className="text-sm text-muted-foreground mt-1">Find similar places across Nepal.</div>
          </Link>
        </aside>
      </div>
    </article>
  );
};

const Row = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-start justify-between gap-4 px-5 py-3.5">
    <dt className="inline-flex items-center gap-2 text-sm text-muted-foreground shrink-0">
      {icon} {label}
    </dt>
    <dd className="text-sm font-medium text-right">{value}</dd>
  </div>
);

const SafetyCard = ({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) => (
  <div className="rounded-xl bg-card border border-border p-4">
    <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
      {icon} {title}
    </div>
    <p className="text-sm text-foreground/85 leading-relaxed">{body}</p>
  </div>
);

export default PlaceDetail;
