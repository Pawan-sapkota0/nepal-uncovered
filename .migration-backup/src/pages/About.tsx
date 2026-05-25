import { Heart, ShieldCheck, Users, Sparkles } from "lucide-react";

const About = () => {
  return (
    <div className="pt-28 pb-24">
      <div className="container max-w-4xl">
        <div className="text-xs uppercase tracking-[0.2em] text-accent font-semibold mb-3">About</div>
        <h1 className="font-display text-5xl md:text-6xl font-semibold tracking-tight leading-[1.05] text-balance">
          A community atlas for the Nepal you don't see on the postcard.
        </h1>
        <p className="mt-6 text-xl text-muted-foreground leading-relaxed">
          Hidden Nepal is a quiet rebellion against the same five photos. We're building a living, locally-edited guide to the lakes, villages, valleys and trails that locals love — with the practical, cultural and safety detail you actually need to travel well.
        </p>

        <div className="mt-16 grid sm:grid-cols-2 gap-6">
          <Pillar icon={<Sparkles className="h-5 w-5" />} title="Hidden first" body="We surface lesser-known places alongside the icons. The unforgettable corners of Nepal deserve their turn." />
          <Pillar icon={<Users className="h-5 w-5" />} title="Community curated" body="Every place is added by a person who knows it — a guide, a local, a returning traveller — and reviewed before it's published." />
          <Pillar icon={<ShieldCheck className="h-5 w-5" />} title="Safety as standard" body="Hospitals, emergency contacts and local support on every page. Travel light, arrive prepared." />
          <Pillar icon={<Heart className="h-5 w-5" />} title="Respect as default" body="Cultural notes, permit details and best-season guidance, written so visitors leave a place better than they found it." />
        </div>

        <blockquote className="mt-20 border-l-4 border-saffron pl-6 font-display text-2xl md:text-3xl italic text-foreground/85 leading-snug">
          "The mountains are not stadiums where I satisfy my ambition to achieve, they are the cathedrals where I practice my religion."
          <footer className="mt-3 text-sm not-italic font-sans text-muted-foreground">— Anatoli Boukreev</footer>
        </blockquote>
      </div>
    </div>
  );
};

const Pillar = ({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) => (
  <div className="rounded-2xl border border-border bg-card p-6 hover-lift">
    <div className="h-10 w-10 rounded-lg bg-accent-soft text-accent grid place-items-center mb-4">{icon}</div>
    <h3 className="font-display text-xl font-semibold mb-2">{title}</h3>
    <p className="text-muted-foreground text-sm leading-relaxed">{body}</p>
  </div>
);

export default About;
