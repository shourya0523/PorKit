import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-black text-soil">
        Welcome to the sty
      </h1>
      <p className="mt-2 max-w-xl text-mud">
        Your portfolio project is ready. Import a résumé, edit content, connect
        GitHub, and create a publishable key when you are ready to embed.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Link
          href="/portfolio"
          className="rounded-xl border border-border bg-paper p-5 transition hover:border-barn"
        >
          <h2 className="font-bold text-soil">Portfolio</h2>
          <p className="mt-1 text-sm text-mud">Edit profile, projects, experience</p>
        </Link>
        <Link
          href="/keys"
          className="rounded-xl border border-border bg-paper p-5 transition hover:border-barn"
        >
          <h2 className="font-bold text-soil">Keys</h2>
          <p className="mt-1 text-sm text-mud">Publishable credentials + domains</p>
        </Link>
        <Link
          href="/docs"
          className="rounded-xl border border-border bg-paper p-5 transition hover:border-barn"
        >
          <h2 className="font-bold text-soil">Integrate</h2>
          <p className="mt-1 text-sm text-mud">15-minute Next.js path</p>
        </Link>
      </div>
    </div>
  );
}
