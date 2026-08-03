import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col bg-cream">
      <header className="flex items-center justify-between border-b border-border bg-paper px-6 py-4">
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="font-[family-name:var(--font-display)] text-xl font-black text-soil"
          >
            Por-Kit
          </Link>
          <nav className="hidden gap-4 text-sm font-semibold text-mud sm:flex">
            <Link href="/dashboard" className="hover:text-barn">
              Overview
            </Link>
            <Link href="/portfolio" className="hover:text-barn">
              Portfolio
            </Link>
            <Link href="/keys" className="hover:text-barn">
              Keys
            </Link>
            <Link href="/docs" className="hover:text-barn">
              Docs
            </Link>
          </nav>
        </div>
        <span className="rounded-full bg-hay/40 px-3 py-1 text-xs font-bold uppercase tracking-wide text-soil">
          Sty dashboard
        </span>
      </header>
      <div className="flex-1 px-6 py-8 md:px-10">{children}</div>
    </div>
  );
}
