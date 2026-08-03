export default function NextDocsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12 md:px-10">
      <h1 className="font-[family-name:var(--font-display)] text-4xl font-black text-soil">
        Next.js integration
      </h1>
      <p className="mt-3 text-mud">
        Primary guided path for existing Next.js portfolios using a domain-controlled
        publishable credential.
      </p>
      <pre className="mt-8 overflow-x-auto rounded-xl bg-soil p-4 text-sm text-cream">
{`npm install @porkit/sdk

import { createPorkitClient } from "@porkit/sdk";

const porkit = createPorkitClient({
  publishableKey: process.env.NEXT_PUBLIC_PORKIT_KEY!,
  baseUrl: "https://your-porkit-host",
});

const { projects, experience } = await porkit.getPortfolio();`}
      </pre>
      <h2 className="mt-10 font-[family-name:var(--font-display)] text-2xl font-bold text-soil">
        Credential rules
      </h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-mud">
        <li>Use `pk_` keys in the browser — never secret server keys.</li>
        <li>Allowlist your production and preview Origins.</li>
        <li>Revoke instantly from the dashboard if a key leaks.</li>
      </ul>
      <h2 className="mt-10 font-[family-name:var(--font-display)] text-2xl font-bold text-soil">
        Common failures
      </h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-mud">
        <li>403 from Origin mismatch — add the exact browser origin.</li>
        <li>Empty projects — publish draft content and confirm import review.</li>
        <li>CORS/preflight — ensure your host serves the public read API.</li>
      </ul>
    </div>
  );
}
