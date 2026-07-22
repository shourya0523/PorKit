import Link from "next/link";

export default function DocsIndexPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12 md:px-10">
      <h1 className="font-[family-name:var(--font-display)] text-4xl font-black text-soil">
        Documentation
      </h1>
      <p className="mt-3 text-mud">
        Get from account creation to live portfolio content on your existing
        Next.js site in about 15 minutes.
      </p>
      <ol className="mt-10 list-decimal space-y-6 pl-5 text-soil">
        <li>
          <strong>Create an account</strong> and open your portfolio project in
          the dashboard.
        </li>
        <li>
          <strong>Import</strong> a résumé or LinkedIn export, review the draft,
          then publish.
        </li>
        <li>
          <strong>Connect GitHub</strong>, select only the repos you want as
          portfolio projects.
        </li>
        <li>
          <strong>Create a publishable key</strong> (`pk_…`) and allowlist your
          site origin.
        </li>
        <li>
          <strong>Install @porkit/sdk</strong> and map content into your
          components — no secret keys in the browser.
        </li>
      </ol>
      <div className="mt-10 space-y-3 rounded-xl bg-surface p-6">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-bold">
          Integration paths
        </h2>
        <ul className="list-disc space-y-2 pl-5 text-mud">
          <li>
            Guided React / Next helpers via{" "}
            <code className="text-barn">@porkit/sdk</code>
          </li>
          <li>Universal JSON read API for any stack</li>
          <li>
            Optional neutral widgets for projects and experience (
            <code className="text-barn">@porkit/widget</code>) — CSS variables,
            no pig branding
          </li>
        </ul>
        <p className="pt-2 text-sm text-mud">
          Analytics: bring your own. Por-Kit does not track portfolio visitors in
          v1.
        </p>
        <Link href="/docs/next" className="inline-block font-semibold text-barn">
          Next.js primary path →
        </Link>
      </div>
    </div>
  );
}
