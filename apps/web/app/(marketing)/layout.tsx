import Link from "next/link";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="relative z-10 flex items-center justify-between px-6 py-5 md:px-10">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-2xl font-black tracking-tight text-soil"
        >
          Por-Kit
        </Link>
        <nav className="flex items-center gap-5 text-sm font-semibold text-mud">
          <Link href="/docs" className="hover:text-barn">
            Docs
          </Link>
          <Link href="/sign-in" className="hover:text-barn">
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="rounded-md bg-barn px-3 py-1.5 text-pk-paper text-[color:var(--pk-paper)] transition hover:bg-soil"
            style={{ color: "var(--pk-paper)" }}
          >
            Get started
          </Link>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border px-6 py-8 text-sm text-mud md:px-10">
        <p>
          Por-Kit keeps your existing site. Pig branding stays on the product —
          never on your portfolio output.
        </p>
      </footer>
    </div>
  );
}
