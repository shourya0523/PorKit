import Link from "next/link";

export default function HomePage() {
  return (
    <section className="pk-hero-sky pk-barn-stripe relative overflow-hidden">
      <div className="mx-auto grid min-h-[calc(100vh-8rem)] max-w-6xl items-end gap-10 px-6 pb-16 pt-10 md:grid-cols-[1.1fr_0.9fr] md:items-center md:px-10">
        <div className="relative z-10 max-w-xl">
          <p className="mb-3 font-[family-name:var(--font-display)] text-sm font-semibold uppercase tracking-[0.2em] text-barn">
            Por-Kit
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-5xl font-black leading-[1.05] tracking-tight text-soil md:text-6xl">
            Feed your portfolio once. Keep it fresh.
          </h1>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-mud">
            Import career data, sync the GitHub repos you choose, and embed live
            content into the React or Next.js site you already have — in under
            15 minutes.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/sign-up"
              className="rounded-md bg-barn px-5 py-3 text-sm font-bold transition hover:bg-soil"
              style={{ color: "var(--pk-paper)" }}
            >
              Start free
            </Link>
            <Link
              href="/docs"
              className="rounded-md border border-mud/30 bg-paper/70 px-5 py-3 text-sm font-bold text-soil backdrop-blur transition hover:border-barn"
            >
              Read the docs
            </Link>
          </div>
        </div>
        <div
          aria-hidden
          className="relative mx-auto aspect-[4/5] w-full max-w-md overflow-hidden rounded-tl-[3rem] rounded-br-[3rem] bg-barn shadow-[0_30px_80px_rgba(61,41,20,0.25)]"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,#e89a8a,transparent_45%),linear-gradient(160deg,#8b3a2a,#3d2914)]" />
          <div className="absolute bottom-8 left-8 right-8 rounded-2xl bg-cream/95 p-5 text-soil shadow-lg">
            <p className="font-[family-name:var(--font-display)] text-xl font-bold">
              The sty stays here.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-mud">
              Dashboard and docs wear the barnyard look. Your published portfolio
              stays professionally yours.
            </p>
          </div>
          <div className="absolute left-[18%] top-[18%] h-24 w-28 rounded-[50%] bg-snout opacity-90" style={{ background: "var(--pk-snout)" }} />
          <div className="absolute left-[28%] top-[28%] h-4 w-4 rounded-full bg-soil" />
          <div className="absolute left-[42%] top-[28%] h-4 w-4 rounded-full bg-soil" />
        </div>
      </div>
    </section>
  );
}
