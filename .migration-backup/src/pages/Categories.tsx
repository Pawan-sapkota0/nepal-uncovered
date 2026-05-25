import { Link } from "react-router-dom";
import { categories } from "@/data/mock";
import { useApp } from "@/store/useApp";
import { ArrowRight } from "lucide-react";

const Categories = () => {
  const { places } = useApp();
  const counts = categories.map((c) => ({
    ...c,
    count: places.filter((p) => p.status === "approved" && p.category === c.slug).length,
    sample: places.find((p) => p.status === "approved" && p.category === c.slug),
  }));

  return (
    <div className="pt-28 pb-20">
      <div className="container">
        <div className="text-xs uppercase tracking-[0.2em] text-accent font-semibold mb-3">Categories</div>
        <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight max-w-2xl">
          Choose how you want to wander.
        </h1>
        <p className="mt-3 text-muted-foreground max-w-2xl text-lg">
          From sky-high lakes to royal courtyards — eight different ways to travel through Nepal.
        </p>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {counts.map((c, i) => (
            <Link
              key={c.id}
              to={`/explore?category=${c.slug}`}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card hover-lift animate-fade-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {c.sample && (
                <div className="aspect-[16/10] overflow-hidden">
                  <img
                    src={c.sample.coverImage}
                    alt={c.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
              )}
              <div className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-display text-2xl font-semibold">{c.name}</h3>
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">{c.count} place{c.count === 1 ? "" : "s"}</span>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">{c.description}</p>
                <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary group-hover:translate-x-1 transition-transform">
                  Browse <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Categories;
