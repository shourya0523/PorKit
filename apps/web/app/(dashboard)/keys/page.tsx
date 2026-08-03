"use client";

import { useState } from "react";

export default function KeysPage() {
  const [key, setKey] = useState<string | null>(null);
  const [origins, setOrigins] = useState("http://localhost:3000");
  const [keyId, setKeyId] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  async function createKey() {
    const res = await fetch("/api/v1/keys", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        allowedOrigins: origins
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        name: "Site key",
      }),
    });
    const data = await res.json();
    setKey(data.key);
    setKeyId(data.id);
    setStatus("Key created — copy it now; it will not be shown again.");
  }

  async function revoke() {
    if (!keyId) return;
    await fetch("/api/v1/keys", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ keyId }),
    });
    setStatus("Key revoked.");
    setKey(null);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-black text-soil">
          Publishable keys
        </h1>
        <p className="mt-2 text-mud">
          `pk_` keys are read-only and browser-safe. Allowlist Origins, rate
          limit, and revoke anytime. Never put secret keys in client bundles.
        </p>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-soil">Allowed origins</span>
        <input
          className="w-full rounded-md border border-border bg-paper px-3 py-2"
          value={origins}
          onChange={(e) => setOrigins(e.target.value)}
          placeholder="https://yoursite.com, http://localhost:3000"
        />
      </label>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => void createKey()}
          className="rounded-md bg-barn px-4 py-2 text-sm font-bold"
          style={{ color: "var(--pk-paper)" }}
        >
          Create key
        </button>
        <button
          type="button"
          onClick={() => void revoke()}
          className="rounded-md border border-border px-4 py-2 text-sm font-bold text-soil"
        >
          Revoke
        </button>
      </div>

      {status ? <p className="text-sm text-mud">{status}</p> : null}
      {key ? (
        <pre className="overflow-x-auto rounded-xl bg-soil p-4 text-sm text-cream">
          {key}
        </pre>
      ) : null}
    </div>
  );
}
