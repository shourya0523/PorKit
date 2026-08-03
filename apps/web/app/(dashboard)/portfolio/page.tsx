import { requireClerkUserId } from "@/lib/auth";
import { getStore } from "@/lib/content/store";
import { PortfolioActions } from "./portfolio-actions";

export default async function PortfolioPage() {
  const clerkUserId = await requireClerkUserId();
  const content = await Promise.resolve(
    getStore().listPortfolioContent(clerkUserId),
  );

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-black text-soil">
          Portfolio content
        </h1>
        <p className="mt-2 text-mud">
          Edit profile, projects, experience, education, and skills. Draft first;
          publish when ready.
        </p>
      </div>

      <section className="rounded-xl border border-border bg-paper p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold text-soil">Import review</h2>
          <PortfolioActions />
        </div>
        <p className="mt-2 text-sm text-mud">
          Reviewed:{" "}
          {content.portfolio.importReviewedAt
            ? content.portfolio.importReviewedAt
            : "Not yet — publish blocked after import"}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-bold text-soil">Experience</h2>
        <ul className="space-y-2">
          {content.experience.map((e) => (
            <li
              key={e.id}
              className="rounded-lg border border-border bg-paper px-4 py-3"
            >
              <div className="flex justify-between gap-3">
                <div>
                  <p className="font-semibold text-soil">
                    {e.title} · {e.company}
                  </p>
                  <p className="text-sm text-mud">{e.summary || "No summary yet"}</p>
                </div>
                <span className="text-xs font-bold uppercase text-mud">
                  {e.status}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-bold text-soil">Projects</h2>
        <ul className="space-y-2">
          {content.projects.map((p) => (
            <li
              key={p.id}
              className="rounded-lg border border-border bg-paper px-4 py-3"
            >
              <div className="flex justify-between gap-3">
                <div>
                  <p className="font-semibold text-soil">{p.name}</p>
                  <p className="text-sm text-mud">
                    {p.description || "No description yet"}
                  </p>
                </div>
                <span className="text-xs font-bold uppercase text-mud">
                  {p.status}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
