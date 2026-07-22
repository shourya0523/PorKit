"use client";

import { useRouter } from "next/navigation";

export function PortfolioActions() {
  const router = useRouter();

  async function confirmReview() {
    await fetch("/api/imports/review", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    router.refresh();
  }

  async function addExperience() {
    await fetch("/api/portfolio/experience", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        company: "New Company",
        title: "Role",
        summary: "",
      }),
    });
    router.refresh();
  }

  async function addProject() {
    await fetch("/api/portfolio/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "New Project", description: "" }),
    });
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => void confirmReview()}
        className="rounded-md bg-barn px-3 py-1.5 text-sm font-bold"
        style={{ color: "var(--pk-paper)" }}
      >
        Confirm review
      </button>
      <button
        type="button"
        onClick={() => void addExperience()}
        className="rounded-md border border-border px-3 py-1.5 text-sm font-semibold text-soil"
      >
        + Experience
      </button>
      <button
        type="button"
        onClick={() => void addProject()}
        className="rounded-md border border-border px-3 py-1.5 text-sm font-semibold text-soil"
      >
        + Project
      </button>
    </div>
  );
}
