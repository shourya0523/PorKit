import { createHash, randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type {
  Experience,
  PlanId,
  Profile,
  Project,
} from "@porkit/shared";
import {
  canRunAiEnrichment,
  evaluateConfidence,
  getEntitlements,
  retainsRevisionHistory,
  type EvidenceBundle,
} from "@porkit/shared";
import { createDb, type Db } from "@/lib/db";
import * as schema from "../../../../drizzle/schema";
import type {
  ContentStatus,
  GithubInstallation,
  ImportJob,
  PortfolioRecord,
  PublishableKeyRecord,
  Revision,
  StoredExperience,
  StoredProject,
  UserRecord,
} from "./store";

function hashKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}


function must<T>(row: T | undefined, message = "DB_WRITE_FAILED"): T {
  if (!row) throw new Error(message);
  return row;
}


function extractName(text: string): string | undefined {
  const m = text.match(/Name:\s*(.+)/i);
  return m?.[1]?.trim();
}
function extractCompany(text: string): string | undefined {
  const m = text.match(/Company:\s*(.+)/i);
  return m?.[1]?.trim();
}
function extractTitle(text: string): string | undefined {
  const m = text.match(/Title:\s*(.+)/i);
  return m?.[1]?.trim();
}

function mapExperience(
  row: typeof schema.experiences.$inferSelect,
): StoredExperience {
  return {
    id: row.id,
    portfolioId: row.portfolioId,
    company: row.company,
    title: row.title,
    location: row.location ?? "",
    startDate: row.startDate ?? "",
    endDate: row.endDate ?? null,
    summary:
      row.status === "published" && row.publishedSummary
        ? row.publishedSummary
        : row.draftSummary,
    status: row.status,
    sortOrder: row.sortOrder,
  };
}

function mapProject(row: typeof schema.projects.$inferSelect): StoredProject {
  return {
    id: row.id,
    portfolioId: row.portfolioId,
    name: row.name,
    description:
      row.status === "published" && row.publishedDescription
        ? row.publishedDescription
        : row.draftDescription,
    url: row.url ?? "",
    language: row.language ?? "",
    topics: row.topics ?? [],
    stars: row.stars,
    githubRepoId: row.githubRepoId ?? null,
    githubFullName: row.githubFullName ?? null,
    status: row.status,
    sortOrder: row.sortOrder,
  };
}

export function createDrizzleStore(db: Db = createDb()) {
  const rateBuckets = new Map<string, { count: number; resetAt: number }>();

  async function ensureUser(clerkUserId: string): Promise<UserRecord> {
    const existing = await db.query.users.findFirst({
      where: eq(schema.users.clerkUserId, clerkUserId),
    });
    if (existing) {
      return {
        id: existing.id,
        clerkUserId: existing.clerkUserId,
        planId: existing.planId,
        aiEnrichmentsUsedMonth: existing.aiEnrichmentsUsedMonth,
        stripeCustomerId: existing.stripeCustomerId ?? undefined,
      };
    }
    const created = must((await db
      .insert(schema.users)
      .values({ clerkUserId })
      .returning())[0]);
    return {
      id: created.id,
      clerkUserId: created.clerkUserId,
      planId: created.planId,
      aiEnrichmentsUsedMonth: created.aiEnrichmentsUsedMonth,
      stripeCustomerId: created.stripeCustomerId ?? undefined,
    };
  }

  async function loadPortfolioForUser(
    userId: string,
  ): Promise<PortfolioRecord | null> {
    const portfolio = await db.query.portfolios.findFirst({
      where: eq(schema.portfolios.userId, userId),
    });
    if (!portfolio) return null;
    const profile = await db.query.profiles.findFirst({
      where: eq(schema.profiles.portfolioId, portfolio.id),
    });
    return {
      id: portfolio.id,
      userId: portfolio.userId,
      name: portfolio.name,
      slug: portfolio.slug,
      importReviewedAt: portfolio.importReviewedAt?.toISOString() ?? null,
      profileDraft: (profile?.draft ?? {}) as Partial<Profile>,
      profilePublished: (profile?.published ?? null) as Partial<Profile> | null,
    };
  }

  async function ensurePortfolio(clerkUserId: string): Promise<PortfolioRecord> {
    const user = await ensureUser(clerkUserId);
    const existing = await loadPortfolioForUser(user.id);
    if (existing) return existing;

    const slug = `portfolio-${user.id.slice(0, 8)}`;
    const portfolio = must((await db
      .insert(schema.portfolios)
      .values({ userId: user.id, slug, name: "My Portfolio" })
      .returning())[0]);
    await db.insert(schema.profiles).values({
      portfolioId: portfolio.id,
      draft: {},
      published: null,
    });
    return {
      id: portfolio.id,
      userId: portfolio.userId,
      name: portfolio.name,
      slug: portfolio.slug,
      importReviewedAt: null,
      profileDraft: {},
      profilePublished: null,
    };
  }

  async function assertPortfolioOwner(portfolioId: string, clerkUserId: string) {
    const user = await ensureUser(clerkUserId);
    const portfolio = await db.query.portfolios.findFirst({
      where: eq(schema.portfolios.id, portfolioId),
    });
    if (!portfolio || portfolio.userId !== user.id) {
      throw new Error("UNAUTHORIZED");
    }
    const profile = await db.query.profiles.findFirst({
      where: eq(schema.profiles.portfolioId, portfolio.id),
    });
    return {
      id: portfolio.id,
      userId: portfolio.userId,
      name: portfolio.name,
      slug: portfolio.slug,
      importReviewedAt: portfolio.importReviewedAt?.toISOString() ?? null,
      profileDraft: (profile?.draft ?? {}) as Partial<Profile>,
      profilePublished: (profile?.published ?? null) as Partial<Profile> | null,
    } satisfies PortfolioRecord;
  }

  async function hasPendingImport(portfolioId: string) {
    const jobs = await db.query.importJobs.findMany({
      where: and(
        eq(schema.importJobs.portfolioId, portfolioId),
        eq(schema.importJobs.status, "completed"),
      ),
    });
    return jobs.length > 0;
  }

  async function createExperience(
    clerkUserId: string,
    input: Partial<Experience> &
      Pick<Experience, "company" | "title"> & { status?: ContentStatus },
  ) {
    const portfolio = await ensurePortfolio(clerkUserId);
    const row = must((await db
      .insert(schema.experiences)
      .values({
        portfolioId: portfolio.id,
        company: input.company,
        title: input.title,
        location: input.location ?? "",
        startDate: input.startDate ?? "",
        endDate: input.endDate ?? null,
        draftSummary: input.summary ?? "",
        status: input.status ?? "draft",
        sortOrder: input.sortOrder ?? 0,
      })
      .returning())[0]);
    return mapExperience(row);
  }

  async function updateExperience(
    clerkUserId: string,
    id: string,
    patch: Partial<Experience>,
  ) {
    const existing = await db.query.experiences.findFirst({
      where: eq(schema.experiences.id, id),
    });
    if (!existing) throw new Error("NOT_FOUND");
    await assertPortfolioOwner(existing.portfolioId, clerkUserId);
    const row = must((await db
      .update(schema.experiences)
      .set({
        company: patch.company ?? existing.company,
        title: patch.title ?? existing.title,
        location: patch.location ?? existing.location,
        startDate: patch.startDate ?? existing.startDate,
        endDate: patch.endDate === undefined ? existing.endDate : patch.endDate,
        draftSummary: patch.summary ?? existing.draftSummary,
        sortOrder: patch.sortOrder ?? existing.sortOrder,
        updatedAt: new Date(),
      })
      .where(eq(schema.experiences.id, id))
      .returning())[0]);
    return mapExperience(row);
  }

  async function deleteExperience(clerkUserId: string, id: string) {
    const existing = await db.query.experiences.findFirst({
      where: eq(schema.experiences.id, id),
    });
    if (!existing) throw new Error("NOT_FOUND");
    await assertPortfolioOwner(existing.portfolioId, clerkUserId);
    await db.delete(schema.experiences).where(eq(schema.experiences.id, id));
  }

  async function publishExperience(clerkUserId: string, id: string) {
    const existing = await db.query.experiences.findFirst({
      where: eq(schema.experiences.id, id),
    });
    if (!existing) throw new Error("NOT_FOUND");
    const portfolio = await assertPortfolioOwner(
      existing.portfolioId,
      clerkUserId,
    );
    if (portfolio.importReviewedAt === null && (await hasPendingImport(portfolio.id))) {
      throw new Error("IMPORT_REVIEW_REQUIRED");
    }
    const row = must((await db
      .update(schema.experiences)
      .set({
        status: "published",
        publishedSummary: existing.draftSummary,
        updatedAt: new Date(),
      })
      .where(eq(schema.experiences.id, id))
      .returning())[0]);
    return mapExperience(row);
  }

  async function createProject(
    clerkUserId: string,
    input: Partial<Project> &
      Pick<Project, "name"> & { status?: ContentStatus },
  ) {
    const portfolio = await ensurePortfolio(clerkUserId);
    const row = must((await db
      .insert(schema.projects)
      .values({
        portfolioId: portfolio.id,
        name: input.name,
        draftDescription: input.description ?? "",
        url: input.url ?? "",
        language: input.language ?? "",
        topics: input.topics ?? [],
        stars: input.stars ?? 0,
        githubRepoId: input.githubRepoId ?? null,
        githubFullName: input.githubFullName ?? null,
        status: input.status ?? "draft",
        sortOrder: input.sortOrder ?? 0,
      })
      .returning())[0]);
    return mapProject(row);
  }

  async function updateProject(
    clerkUserId: string,
    id: string,
    patch: Partial<Project>,
  ) {
    const existing = await db.query.projects.findFirst({
      where: eq(schema.projects.id, id),
    });
    if (!existing) throw new Error("NOT_FOUND");
    await assertPortfolioOwner(existing.portfolioId, clerkUserId);
    const row = must((await db
      .update(schema.projects)
      .set({
        name: patch.name ?? existing.name,
        draftDescription: patch.description ?? existing.draftDescription,
        url: patch.url ?? existing.url,
        language: patch.language ?? existing.language,
        topics: patch.topics ?? existing.topics,
        stars: patch.stars ?? existing.stars,
        githubRepoId:
          patch.githubRepoId === undefined
            ? existing.githubRepoId
            : patch.githubRepoId,
        githubFullName:
          patch.githubFullName === undefined
            ? existing.githubFullName
            : patch.githubFullName,
        sortOrder: patch.sortOrder ?? existing.sortOrder,
        updatedAt: new Date(),
      })
      .where(eq(schema.projects.id, id))
      .returning())[0]);
    return mapProject(row);
  }

  async function deleteProject(clerkUserId: string, id: string) {
    const existing = await db.query.projects.findFirst({
      where: eq(schema.projects.id, id),
    });
    if (!existing) throw new Error("NOT_FOUND");
    await assertPortfolioOwner(existing.portfolioId, clerkUserId);
    await db.delete(schema.projects).where(eq(schema.projects.id, id));
  }

  async function maybeStoreRevision(
    portfolio: PortfolioRecord,
    entityType: string,
    row: StoredProject | StoredExperience,
  ) {
    const userRows = await db.query.users.findFirst({
      where: eq(schema.users.id, portfolio.userId),
    });
    if (!userRows) return;
    const entitlements = getEntitlements(userRows.planId);
    if (!retainsRevisionHistory(entitlements)) return;
    if (row.status !== "published") return;
    await db.insert(schema.contentRevisions).values({
      portfolioId: portfolio.id,
      entityType,
      entityId: row.id,
      snapshot: { ...row },
    });
  }

  async function publishProject(clerkUserId: string, id: string) {
    const existing = await db.query.projects.findFirst({
      where: eq(schema.projects.id, id),
    });
    if (!existing) throw new Error("NOT_FOUND");
    const portfolio = await assertPortfolioOwner(
      existing.portfolioId,
      clerkUserId,
    );
    if (portfolio.importReviewedAt === null && (await hasPendingImport(portfolio.id))) {
      throw new Error("IMPORT_REVIEW_REQUIRED");
    }
    await maybeStoreRevision(portfolio, "project", mapProject(existing));
    const row = must((await db
      .update(schema.projects)
      .set({
        status: "published",
        publishedDescription: existing.draftDescription,
        updatedAt: new Date(),
      })
      .where(eq(schema.projects.id, id))
      .returning())[0]);
    return mapProject(row);
  }

  async function listPortfolioContent(clerkUserId: string) {
    const portfolio = await ensurePortfolio(clerkUserId);
    const [projectRows, experienceRows, educationRows, skillRows, linkRows] =
      await Promise.all([
        db.query.projects.findMany({
          where: eq(schema.projects.portfolioId, portfolio.id),
        }),
        db.query.experiences.findMany({
          where: eq(schema.experiences.portfolioId, portfolio.id),
        }),
        db.query.education.findMany({
          where: eq(schema.education.portfolioId, portfolio.id),
        }),
        db.query.skills.findMany({
          where: eq(schema.skills.portfolioId, portfolio.id),
        }),
        db.query.links.findMany({
          where: eq(schema.links.portfolioId, portfolio.id),
        }),
      ]);

    return {
      portfolio,
      projects: projectRows.map(mapProject),
      experience: experienceRows.map(mapExperience),
      education: educationRows.map((e) => ({
        id: e.id,
        portfolioId: e.portfolioId,
        school: e.school,
        degree: e.degree ?? "",
        field: e.field ?? "",
        startDate: e.startDate ?? "",
        endDate: e.endDate ?? null,
        summary:
          e.status === "published" && e.publishedSummary
            ? e.publishedSummary
            : e.draftSummary,
        status: e.status,
        sortOrder: e.sortOrder,
      })),
      skills: skillRows.map((s) => ({
        id: s.id,
        portfolioId: s.portfolioId,
        name: s.name,
        category: s.category ?? "",
        proficiency: s.proficiency ?? "",
        sortOrder: s.sortOrder,
      })),
      links: linkRows.map((l) => ({
        id: l.id,
        portfolioId: l.portfolioId,
        label: l.label,
        url: l.url,
        sortOrder: l.sortOrder,
      })),
    };
  }

  async function startImport(
    clerkUserId: string,
    sourceType: string,
    payload: { text?: string; corrupt?: boolean },
  ) {
    const portfolio = await ensurePortfolio(clerkUserId);
    const job = must((await db
      .insert(schema.importJobs)
      .values({
        portfolioId: portfolio.id,
        sourceType,
        status: "pending",
      })
      .returning())[0]);

    if (payload.corrupt) {
      const failed = must((await db
        .update(schema.importJobs)
        .set({
          status: "failed",
          errorMessage: "Unsupported or corrupt file",
          completedAt: new Date(),
        })
        .where(eq(schema.importJobs.id, job.id))
        .returning())[0]);
      return {
        id: failed.id,
        portfolioId: failed.portfolioId,
        sourceType: failed.sourceType,
        status: "failed" as const,
        errorMessage: failed.errorMessage ?? undefined,
      } satisfies ImportJob;
    }

    const text = payload.text ?? "";
    if (sourceType === "resume" || sourceType === "linkedin") {
      const draft = {
        ...portfolio.profileDraft,
        fullName:
          extractName(text) ??
          portfolio.profileDraft.fullName ??
          "Imported User",
        headline: portfolio.profileDraft.headline ?? "Imported profile",
      };
      await db
        .update(schema.profiles)
        .set({ draft, updatedAt: new Date() })
        .where(eq(schema.profiles.portfolioId, portfolio.id));
      await createExperience(clerkUserId, {
        company: extractCompany(text) ?? "Imported Company",
        title: extractTitle(text) ?? "Imported Role",
        summary: "Imported from upload — review before publishing.",
        status: "draft",
      });
      await createProject(clerkUserId, {
        name: "Imported Project Draft",
        description: "Review and edit before first publication.",
        status: "draft",
      });
    }

    await db
      .update(schema.portfolios)
      .set({ importReviewedAt: null, updatedAt: new Date() })
      .where(eq(schema.portfolios.id, portfolio.id));

    const completed = must((await db
      .update(schema.importJobs)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(schema.importJobs.id, job.id))
      .returning())[0]);

    return {
      id: completed.id,
      portfolioId: completed.portfolioId,
      sourceType: completed.sourceType,
      status: "completed" as const,
      errorMessage: completed.errorMessage ?? undefined,
    } satisfies ImportJob;
  }

  async function confirmImportReview(clerkUserId: string) {
    const portfolio = await ensurePortfolio(clerkUserId);
    const reviewedAt = new Date();
    await db
      .update(schema.portfolios)
      .set({ importReviewedAt: reviewedAt, updatedAt: reviewedAt })
      .where(eq(schema.portfolios.id, portfolio.id));
    return {
      ...portfolio,
      importReviewedAt: reviewedAt.toISOString(),
    };
  }

  async function connectGithub(clerkUserId: string, installationId: string) {
    const portfolio = await ensurePortfolio(clerkUserId);
    const existing = await db.query.githubInstallations.findFirst({
      where: eq(schema.githubInstallations.portfolioId, portfolio.id),
    });
    if (existing) {
      const row = must((await db
        .update(schema.githubInstallations)
        .set({ installationId, disconnectedAt: null })
        .where(eq(schema.githubInstallations.id, existing.id))
        .returning())[0]);
      return {
        portfolioId: row.portfolioId,
        installationId: row.installationId,
        disconnectedAt: row.disconnectedAt?.toISOString() ?? null,
      } satisfies GithubInstallation;
    }
    const row = must((await db
      .insert(schema.githubInstallations)
      .values({ portfolioId: portfolio.id, installationId })
      .returning())[0]);
    return {
      portfolioId: row.portfolioId,
      installationId: row.installationId,
      disconnectedAt: null,
    } satisfies GithubInstallation;
  }

  async function disconnectGithub(clerkUserId: string) {
    const portfolio = await ensurePortfolio(clerkUserId);
    await db
      .update(schema.githubInstallations)
      .set({ disconnectedAt: new Date() })
      .where(eq(schema.githubInstallations.portfolioId, portfolio.id));
  }

  async function selectRepos(
    clerkUserId: string,
    repos: { githubRepoId: string; fullName: string }[],
  ) {
    const portfolio = await ensurePortfolio(clerkUserId);
    await db
      .delete(schema.selectedRepos)
      .where(eq(schema.selectedRepos.portfolioId, portfolio.id));
    if (repos.length) {
      await db.insert(schema.selectedRepos).values(
        repos.map((repo) => ({
          portfolioId: portfolio.id,
          githubRepoId: repo.githubRepoId,
          fullName: repo.fullName,
        })),
      );
    }
    const rows = await db.query.selectedRepos.findMany({
      where: eq(schema.selectedRepos.portfolioId, portfolio.id),
    });
    return rows.map((r) => ({
      portfolioId: r.portfolioId,
      githubRepoId: r.githubRepoId,
      fullName: r.fullName,
    }));
  }

  async function syncGithubRepoChange(
    portfolioId: string,
    githubRepoId: string,
    facts: {
      name: string;
      url: string;
      language: string;
      topics: string[];
      description: string;
      stars: number;
      fullName: string;
    },
  ) {
    const inst = await db.query.githubInstallations.findFirst({
      where: eq(schema.githubInstallations.portfolioId, portfolioId),
    });
    if (!inst || inst.disconnectedAt) {
      return { synced: false as const, reason: "disconnected" as const };
    }
    const selected = await db.query.selectedRepos.findFirst({
      where: and(
        eq(schema.selectedRepos.portfolioId, portfolioId),
        eq(schema.selectedRepos.githubRepoId, githubRepoId),
      ),
    });
    if (!selected) {
      return { synced: false as const, reason: "not_selected" as const };
    }

    const existing = await db.query.projects.findFirst({
      where: and(
        eq(schema.projects.portfolioId, portfolioId),
        eq(schema.projects.githubRepoId, githubRepoId),
      ),
    });

    if (!existing) {
      const row = must((await db
        .insert(schema.projects)
        .values({
          portfolioId,
          name: facts.name,
          draftDescription: facts.description,
          url: facts.url,
          language: facts.language,
          topics: facts.topics,
          stars: facts.stars,
          githubRepoId,
          githubFullName: facts.fullName,
          status: "draft",
        })
        .returning())[0]);
      return { synced: true as const, project: mapProject(row) };
    }

    const row = must((await db
      .update(schema.projects)
      .set({
        name: facts.name,
        url: facts.url,
        language: facts.language,
        topics: facts.topics,
        stars: facts.stars,
        githubFullName: facts.fullName,
        updatedAt: new Date(),
      })
      .where(eq(schema.projects.id, existing.id))
      .returning())[0]);
    return { synced: true as const, project: mapProject(row) };
  }

  async function enrichProject(
    clerkUserId: string,
    projectId: string,
    evidence: EvidenceBundle,
    generatedProse: string,
  ) {
    const existing = await db.query.projects.findFirst({
      where: eq(schema.projects.id, projectId),
    });
    if (!existing) throw new Error("NOT_FOUND");
    const portfolio = await assertPortfolioOwner(
      existing.portfolioId,
      clerkUserId,
    );
    const userRow = await db.query.users.findFirst({
      where: eq(schema.users.id, portfolio.userId),
    });
    if (!userRow) throw new Error("NOT_FOUND");
    const entitlements = getEntitlements(userRow.planId);
    const gate = canRunAiEnrichment(
      entitlements,
      userRow.aiEnrichmentsUsedMonth,
    );
    if (!gate.allowed) {
      return { ok: false as const, reason: gate.reason!, upgradeRequired: true };
    }

    await db
      .update(schema.users)
      .set({
        aiEnrichmentsUsedMonth: userRow.aiEnrichmentsUsedMonth + 1,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, userRow.id));

    const confidence = evaluateConfidence(evidence);
    const priorProse = existing.draftDescription;
    const mapped = mapProject(existing);

    if (confidence === "high") {
      await maybeStoreRevision(portfolio, "project", mapped);
      const row = must((await db
        .update(schema.projects)
        .set({
          draftDescription: generatedProse,
          publishedDescription: generatedProse,
          language: evidence.language || existing.language,
          topics: evidence.topics.length ? evidence.topics : existing.topics,
          stars: evidence.stars ?? existing.stars,
          url: evidence.url || existing.url,
          status: "published",
          updatedAt: new Date(),
        })
        .where(eq(schema.projects.id, projectId))
        .returning())[0]);
      return { ok: true as const, project: mapProject(row), confidence };
    }

    const row = must((await db
      .update(schema.projects)
      .set({
        language: evidence.language || existing.language,
        topics: evidence.topics.length ? evidence.topics : existing.topics,
        stars: evidence.stars ?? existing.stars,
        url: evidence.url || existing.url,
        status: "needs_review",
        updatedAt: new Date(),
      })
      .where(eq(schema.projects.id, projectId))
      .returning())[0]);

    return {
      ok: true as const,
      project: mapProject(row),
      confidence,
      preservedProse: priorProse,
      proposedProse: generatedProse,
    };
  }

  async function acceptFlaggedProse(
    clerkUserId: string,
    projectId: string,
    prose: string,
  ) {
    const existing = await db.query.projects.findFirst({
      where: eq(schema.projects.id, projectId),
    });
    if (!existing) throw new Error("NOT_FOUND");
    const portfolio = await assertPortfolioOwner(
      existing.portfolioId,
      clerkUserId,
    );
    await maybeStoreRevision(portfolio, "project", mapProject(existing));
    const row = must((await db
      .update(schema.projects)
      .set({
        draftDescription: prose,
        publishedDescription: prose,
        status: "published",
        updatedAt: new Date(),
      })
      .where(eq(schema.projects.id, projectId))
      .returning())[0]);
    return mapProject(row);
  }

  async function createPublishableKey(
    clerkUserId: string,
    allowedOrigins: string[],
    name = "Default",
  ) {
    const portfolio = await ensurePortfolio(clerkUserId);
    const raw = `pk_${randomBytes(24).toString("hex")}`;
    const record = must((await db
      .insert(schema.publishableKeys)
      .values({
        portfolioId: portfolio.id,
        name,
        keyPrefix: raw.slice(0, 10),
        keyHash: hashKey(raw),
        allowedOrigins,
      })
      .returning())[0]);
    return {
      id: record.id,
      portfolioId: record.portfolioId,
      name: record.name,
      keyPrefix: record.keyPrefix,
      keyHash: record.keyHash,
      rawKey: raw,
      allowedOrigins: record.allowedOrigins,
      revokedAt: null,
      key: raw,
    };
  }

  async function revokeKey(clerkUserId: string, keyId: string) {
    const record = await db.query.publishableKeys.findFirst({
      where: eq(schema.publishableKeys.id, keyId),
    });
    if (!record) throw new Error("NOT_FOUND");
    await assertPortfolioOwner(record.portfolioId, clerkUserId);
    const revokedAt = new Date();
    const updated = must((await db
      .update(schema.publishableKeys)
      .set({ revokedAt })
      .where(eq(schema.publishableKeys.id, keyId))
      .returning())[0]);
    return {
      id: updated.id,
      portfolioId: updated.portfolioId,
      name: updated.name,
      keyPrefix: updated.keyPrefix,
      keyHash: updated.keyHash,
      allowedOrigins: updated.allowedOrigins,
      revokedAt: updated.revokedAt?.toISOString() ?? null,
    } satisfies PublishableKeyRecord;
  }

  async function readPublishedPortfolio(
    rawKey: string,
    origin: string | null,
    options?: { isBrowser?: boolean },
  ) {
    const isBrowser = options?.isBrowser ?? Boolean(origin);
    const record = await db.query.publishableKeys.findFirst({
      where: eq(schema.publishableKeys.keyHash, hashKey(rawKey)),
    });
    if (!record) return { ok: false as const, status: 401, error: "invalid_key" };
    if (record.revokedAt) {
      return { ok: false as const, status: 401, error: "revoked_key" };
    }
    if (isBrowser) {
      if (!origin || !record.allowedOrigins.includes(origin)) {
        return { ok: false as const, status: 403, error: "origin_denied" };
      }
    }

    const bucketKey = `${record.id}:${origin ?? "server"}`;
    const now = Date.now();
    const bucket = rateBuckets.get(bucketKey) ?? {
      count: 0,
      resetAt: now + 60_000,
    };
    if (now > bucket.resetAt) {
      bucket.count = 0;
      bucket.resetAt = now + 60_000;
    }
    bucket.count += 1;
    rateBuckets.set(bucketKey, bucket);
    if (bucket.count > 120) {
      return { ok: false as const, status: 429, error: "rate_limited" };
    }

    const portfolio = await db.query.portfolios.findFirst({
      where: eq(schema.portfolios.id, record.portfolioId),
    });
    if (!portfolio) {
      return { ok: false as const, status: 401, error: "invalid_key" };
    }
    const profile = await db.query.profiles.findFirst({
      where: eq(schema.profiles.portfolioId, record.portfolioId),
    });

    const [projectRows, experienceRows, educationRows, skillRows, linkRows] =
      await Promise.all([
        db.query.projects.findMany({
          where: and(
            eq(schema.projects.portfolioId, record.portfolioId),
            eq(schema.projects.status, "published"),
          ),
        }),
        db.query.experiences.findMany({
          where: and(
            eq(schema.experiences.portfolioId, record.portfolioId),
            eq(schema.experiences.status, "published"),
          ),
        }),
        db.query.education.findMany({
          where: and(
            eq(schema.education.portfolioId, record.portfolioId),
            eq(schema.education.status, "published"),
          ),
        }),
        db.query.skills.findMany({
          where: eq(schema.skills.portfolioId, record.portfolioId),
        }),
        db.query.links.findMany({
          where: eq(schema.links.portfolioId, record.portfolioId),
        }),
      ]);

    return {
      ok: true as const,
      data: {
        profile: (profile?.published ?? null) as Partial<Profile> | null,
        links: linkRows.map(({ portfolioId: _p, ...rest }) => {
          void _p;
          return rest;
        }),
        projects: projectRows.map((p) => {
          const mapped = mapProject(p);
          const { portfolioId: _pid, ...rest } = mapped;
          void _pid;
          return rest;
        }),
        experience: experienceRows.map((e) => {
          const mapped = mapExperience(e);
          const { portfolioId: _pid, ...rest } = mapped;
          void _pid;
          return rest;
        }),
        education: educationRows.map((e) => ({
          id: e.id,
          school: e.school,
          degree: e.degree ?? "",
          field: e.field ?? "",
          startDate: e.startDate ?? "",
          endDate: e.endDate ?? null,
          summary: e.publishedSummary ?? e.draftSummary,
          status: e.status,
          sortOrder: e.sortOrder,
        })),
        skills: skillRows.map((s) => ({
          id: s.id,
          name: s.name,
          category: s.category ?? "",
          proficiency: s.proficiency ?? "",
          sortOrder: s.sortOrder,
        })),
      },
    };
  }

  async function setPlan(clerkUserId: string, planId: PlanId) {
    const user = await ensureUser(clerkUserId);
    const updated = must((await db
      .update(schema.users)
      .set({ planId, updatedAt: new Date() })
      .where(eq(schema.users.id, user.id))
      .returning())[0]);
    return {
      id: updated.id,
      clerkUserId: updated.clerkUserId,
      planId: updated.planId,
      aiEnrichmentsUsedMonth: updated.aiEnrichmentsUsedMonth,
      stripeCustomerId: updated.stripeCustomerId ?? undefined,
    } satisfies UserRecord;
  }

  async function applyStripeWebhook(event: {
    type: string;
    clerkUserId?: string;
    planId?: PlanId;
    customerId?: string;
  }) {
    if (event.type === "customer.subscription.updated" && event.clerkUserId) {
      const user = await ensureUser(event.clerkUserId);
      const updated = must((await db
        .update(schema.users)
        .set({
          planId: event.planId ?? user.planId,
          stripeCustomerId: event.customerId ?? user.stripeCustomerId ?? null,
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, user.id))
        .returning())[0]);
      return {
        id: updated.id,
        clerkUserId: updated.clerkUserId,
        planId: updated.planId,
        aiEnrichmentsUsedMonth: updated.aiEnrichmentsUsedMonth,
        stripeCustomerId: updated.stripeCustomerId ?? undefined,
      } satisfies UserRecord;
    }
    return null;
  }

  async function listRevisions(portfolioId: string): Promise<Revision[]> {
    const rows = await db.query.contentRevisions.findMany({
      where: eq(schema.contentRevisions.portfolioId, portfolioId),
    });
    return rows.map((r) => ({
      id: r.id,
      portfolioId: r.portfolioId,
      entityType: r.entityType,
      entityId: r.entityId,
      snapshot: r.snapshot,
    }));
  }

  return {
    ensureUser,
    ensurePortfolio,
    assertPortfolioOwner,
    createExperience,
    updateExperience,
    deleteExperience,
    publishExperience,
    createProject,
    updateProject,
    deleteProject,
    publishProject,
    listPortfolioContent,
    startImport,
    confirmImportReview,
    connectGithub,
    disconnectGithub,
    selectRepos,
    syncGithubRepoChange,
    enrichProject,
    acceptFlaggedProse,
    createPublishableKey,
    revokeKey,
    readPublishedPortfolio,
    setPlan,
    applyStripeWebhook,
    listRevisions,
  };
}

export type DrizzleStore = ReturnType<typeof createDrizzleStore>;
