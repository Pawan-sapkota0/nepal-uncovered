import { Link } from "react-router-dom";
import { MapPin, Eye, Sparkles, Bookmark } from "lucide-react";
import type { Place } from "@/types";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/store/useApp";
import { cn } from "@/lib/utils";
import { Highlight } from "@/components/Highlight";
import { getImageUrl } from "@/lib/imageUrl";

interface PlaceCardProps {
  place: Place;
  index?: number;
  variant?: "default" | "compact" | "feature";
  highlight?: string;
}

export function PlaceCard({ place, index = 0, variant = "default", highlight }: PlaceCardProps) {
  const { bookmarks, toggleBookmark } = useApp();
  const saved = bookmarks.includes(place.id);

  if (variant === "feature") {
    return (
      <Link
        to={`/place/${place.slug}`}
        className="group relative block overflow-hidden rounded-2xl shadow-soft hover-lift animate-fade-up"
        style={{ animationDelay: `${index * 70}ms` }}
      >
        <div className="aspect-[4/5] overflow-hidden">
          <img
            src={getImageUrl(place.coverImage)}
            alt={place.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-card-hover" />
        {place.hidden && (
          <Badge className="absolute top-4 left-4 bg-saffron text-saffron-foreground border-0 gap-1">
            <Sparkles className="h-3 w-3" /> Hidden gem
          </Badge>
        )}
        <div className="absolute bottom-0 inset-x-0 p-6 text-primary-foreground">
          <div className="text-xs uppercase tracking-[0.18em] text-primary-foreground/80 mb-2">
            {place.district} · {place.province}
          </div>
          <h3 className="font-display text-2xl md:text-3xl font-semibold leading-tight">
            <Highlight text={place.title} query={highlight} />
          </h3>
          <p className="mt-2 text-sm text-primary-foreground/85 line-clamp-2 max-w-md">
            <Highlight text={place.shortDescription} query={highlight} />
          </p>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={`/place/${place.slug}`}
      className={cn(
        "group relative block overflow-hidden rounded-xl bg-card border border-border shadow-soft hover-lift animate-fade-up",
        variant === "compact" && "rounded-lg"
      )}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={getImageUrl(place.coverImage)}
          alt={place.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
        />
      </div>
      <button
        onClick={(e) => {
          e.preventDefault();
          toggleBookmark(place.id);
        }}
        className={cn(
          "absolute top-3 right-3 h-9 w-9 grid place-items-center rounded-full glass-dark text-primary-foreground transition",
          saved && "bg-accent text-accent-foreground"
        )}
        aria-label={saved ? "Remove bookmark" : "Bookmark place"}
      >
        <Bookmark className={cn("h-4 w-4", saved && "fill-current")} />
      </button>
      {place.hidden && (
        <Badge className="absolute top-3 left-3 bg-saffron text-saffron-foreground border-0 gap-1">
          <Sparkles className="h-3 w-3" /> Hidden gem
        </Badge>
      )}
      <div className="p-5">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" /> {place.district}
          </span>
          <span className="inline-flex items-center gap-1">
            <Eye className="h-3 w-3" /> {place.views.toLocaleString()}
          </span>
        </div>
        <h3 className="font-display text-xl font-semibold leading-snug group-hover:text-primary transition-colors">
          <Highlight text={place.title} query={highlight} />
        </h3>
        <p className="mt-2 text-sm text-muted-foreground line-clamp-2 leading-relaxed">
          <Highlight text={place.shortDescription} query={highlight} />
        </p>
        <div className="mt-4 flex items-center justify-between">
          <Badge variant="secondary" className="capitalize text-xs">{place.category}</Badge>
          <span className="text-sm font-medium text-primary group-hover:translate-x-1 transition-transform">
            View details →
          </span>
        </div>
      </div>
    </Link>
  );
}
