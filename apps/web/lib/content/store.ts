import { randomUUID, createHash, randomBytes } from "node:crypto";
import type {
  Education,
  Experience,
  PlanId,
  Profile,
  Project,
  Skill,
  Link,
} from "@porkit/shared";
import {
  canRunAiEnrichment,
  evaluateConfidence,
  getEntitlements,
  retainsRevisionHistory,
  type EvidenceBundle,
} from "@porkit/shared";

export type ContentStatus = "draft" | "published" | "needs_review";

export type StoredProject = Project & {
  id: string;
  portfolioId: string;
  status: ContentStatus;
};

export type StoredExperience = Experience & {
  id: string;
  portfolioId: string;
  status: ContentStatus;
};

export type StoredEducation = Education & {
  id: string;
  portfolioId: string;
  status: ContentStatus;
};

export type StoredSkill = Skill & { id: string; portfolioId: string };
export type StoredLink = Link & { id: string; portfolioId: string };

export type PortfolioRecord = {
  id: string;
  userId: string;
  name: string;
  slug: string;
  importReviewedAt: string | null;
  profileDraft: Partial<Profile>;
  profilePublished: Partial<Profile> | null;
};

export type UserRecord = {
  id: string;
  clerkUserId: string;
  planId: PlanId;
  aiEnrichmentsUsedMonth: number;
  stripeCustomerId?: string;
};

export type PublishableKeyRecord = {
  id: string;
  portfolioId: string;
  name: string;
  keyPrefix: string;
  keyHash: string;
  rawKey?: string;
  allowedOrigins: string[];
  revokedAt: string | null;
};

export type SelectedRepo = {
  portfolioId: string;
  githubRepoId: string;
  fullName: string;
};

export type GithubInstallation = {
  portfolioId: string;
  installationId: string;
  disconnectedAt: string | null;
};

export type ImportJob = {
  id: string;
  portfolioId: string;
  sourceType: string;
  status: "pending" | "completed" | "failed";
  errorMessage?: string;
};

export type Revision = {
  id: string;
  portfolioId: string;
  entityType: string;
  entityId: string;
  snapshot: Record<string, unknown>;
};

function hashKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function createMemoryStore() {
  const users = new Map<string, UserRecord>();
  const usersByClerk = new Map<string, string>();
  const portfolios = new Map<string, PortfolioRecord>();
  const projects = new Map<string, StoredProject>();
  const experiences = new Map<string, StoredExperience>();
  const education = new Map<string, StoredEducation>();
  const skills = new Map<string, StoredSkill>();
  const links = new Map<string, StoredLink>();
  const keys = new Map<string, PublishableKeyRecord>();
  const keysByHash = new Map<string, string>();
  const selectedRepos = new Map<string, SelectedRepo>();
  const installations = new Map<string, GithubInstallation>();
  const importJobs = new Map<string, ImportJob>();
  const revisions: Revision[] = [];
  const rateBuckets = new Map<string, { count: number; resetAt: number }>();

  function ensureUser(clerkUserId: string): UserRecord {
    const existingId = usersByClerk.get(clerkUserId);
    if (existingId) {
      return users.get(existingId)!;
    }
    const user: UserRecord = {
      id: randomUUID(),
      clerkUserId,
      planId: "free",
      aiEnrichmentsUsedMonth: 0,
    };
    users.set(user.id, user);
    usersByClerk.set(clerkUserId, user.id);
    return user;
  }

  function ensurePortfolio(clerkUserId: string): PortfolioRecord {
    const user = ensureUser(clerkUserId);
    for (const p of portfolios.values()) {
      if (p.userId === user.id) return p;
    }
    const portfolio: PortfolioRecord = {
      id: randomUUID(),
      userId: user.id,
      name: "My Portfolio",
      slug: `portfolio-${user.id.slice(0, 8)}`,
      importReviewedAt: null,
      profileDraft: {},
      profilePublished: null,
    };
    portfolios.set(portfolio.id, portfolio);
    return portfolio;
  }

  function assertPortfolioOwner(portfolioId: string, clerkUserId: string) {
    const user = ensureUser(clerkUserId);
    const portfolio = portfolios.get(portfolioId);
    if (!portfolio || portfolio.userId !== user.id) {
      throw new Error("UNAUTHORIZED");
    }
    return portfolio;
  }

  function createExperience(
    clerkUserId: string,
    input: Partial<Experience> & Pick<Experience, "company" | "title"> & {
      status?: ContentStatus;
    },
  ) {
    const portfolio = ensurePortfolio(clerkUserId);
    const row: StoredExperience = {
      id: randomUUID(),
      portfolioId: portfolio.id,
      company: input.company,
      title: input.title,
      location: input.location ?? "",
      startDate: input.startDate ?? "",
      endDate: input.endDate ?? null,
      summary: input.summary ?? "",
      status: input.status ?? "draft",
      sortOrder: input.sortOrder ?? 0,
    };
    experiences.set(row.id, row);
    return row;
  }

  function updateExperience(
    clerkUserId: string,
    id: string,
    patch: Partial<Experience>,
  ) {
    const row = experiences.get(id);
    if (!row) throw new Error("NOT_FOUND");
    assertPortfolioOwner(row.portfolioId, clerkUserId);
    const next = { ...row, ...patch, id: row.id, portfolioId: row.portfolioId };
    experiences.set(id, next);
    return next;
  }

  function deleteExperience(clerkUserId: string, id: string) {
    const row = experiences.get(id);
    if (!row) throw new Error("NOT_FOUND");
    assertPortfolioOwner(row.portfolioId, clerkUserId);
    experiences.delete(id);
  }

  function publishExperience(clerkUserId: string, id: string) {
    const row = experiences.get(id);
    if (!row) throw new Error("NOT_FOUND");
    const portfolio = assertPortfolioOwner(row.portfolioId, clerkUserId);
    if (portfolio.importReviewedAt === null && hasPendingImport(portfolio.id)) {
      throw new Error("IMPORT_REVIEW_REQUIRED");
    }
    const next = { ...row, status: "published" as const };
    experiences.set(id, next);
    return next;
  }

  function createProject(
    clerkUserId: string,
    input: Partial<Project> & Pick<Project, "name"> & {
      status?: ContentStatus;
    },
  ) {
    const portfolio = ensurePortfolio(clerkUserId);
    const row: StoredProject = {
      id: randomUUID(),
      portfolioId: portfolio.id,
      name: input.name,
      description: input.description ?? "",
      url: input.url ?? "",
      language: input.language ?? "",
      topics: input.topics ?? [],
      stars: input.stars ?? 0,
      githubRepoId: input.githubRepoId ?? null,
      githubFullName: input.githubFullName ?? null,
      status: input.status ?? "draft",
      sortOrder: input.sortOrder ?? 0,
    };
    projects.set(row.id, row);
    return row;
  }

  function updateProject(
    clerkUserId: string,
    id: string,
    patch: Partial<Project>,
  ) {
    const row = projects.get(id);
    if (!row) throw new Error("NOT_FOUND");
    assertPortfolioOwner(row.portfolioId, clerkUserId);
    const next = { ...row, ...patch, id: row.id, portfolioId: row.portfolioId };
    projects.set(id, next);
    return next;
  }

  function deleteProject(clerkUserId: string, id: string) {
    const row = projects.get(id);
    if (!row) throw new Error("NOT_FOUND");
    assertPortfolioOwner(row.portfolioId, clerkUserId);
    projects.delete(id);
  }

  function publishProject(clerkUserId: string, id: string) {
    const row = projects.get(id);
    if (!row) throw new Error("NOT_FOUND");
    const portfolio = assertPortfolioOwner(row.portfolioId, clerkUserId);
    if (portfolio.importReviewedAt === null && hasPendingImport(portfolio.id)) {
      throw new Error("IMPORT_REVIEW_REQUIRED");
    }
    maybeStoreRevision(portfolio, "project", row);
    const next = { ...row, status: "published" as const };
    projects.set(id, next);
    return next;
  }

  function listPortfolioContent(clerkUserId: string) {
    const portfolio = ensurePortfolio(clerkUserId);
    return {
      portfolio,
      projects: [...projects.values()].filter(
        (p) => p.portfolioId === portfolio.id,
      ),
      experience: [...experiences.values()].filter(
        (e) => e.portfolioId === portfolio.id,
      ),
      education: [...education.values()].filter(
        (e) => e.portfolioId === portfolio.id,
      ),
      skills: [...skills.values()].filter((s) => s.portfolioId === portfolio.id),
      links: [...links.values()].filter((l) => l.portfolioId === portfolio.id),
    };
  }

  function hasPendingImport(portfolioId: string) {
    return [...importJobs.values()].some(
      (j) => j.portfolioId === portfolioId && j.status === "completed",
    );
  }

  function startImport(
    clerkUserId: string,
    sourceType: string,
    payload: {
      text?: string;
      corrupt?: boolean;
    },
  ) {
    const portfolio = ensurePortfolio(clerkUserId);
    const job: ImportJob = {
      id: randomUUID(),
      portfolioId: portfolio.id,
      sourceType,
      status: "pending",
    };
    importJobs.set(job.id, job);

    if (payload.corrupt) {
      job.status = "failed";
      job.errorMessage = "Unsupported or corrupt file";
      return job;
    }

    const text = payload.text ?? "";
    // Lightweight structuring for tests / offline mode (LLM wired in Inngest job).
    if (sourceType === "resume" || sourceType === "linkedin") {
      portfolio.profileDraft = {
        ...portfolio.profileDraft,
        fullName: extractName(text) ?? portfolio.profileDraft.fullName ?? "Imported User",
        headline: portfolio.profileDraft.headline ?? "Imported profile",
      };
      createExperience(clerkUserId, {
        company: extractCompany(text) ?? "Imported Company",
        title: extractTitle(text) ?? "Imported Role",
        summary: "Imported from upload — review before publishing.",
        status: "draft",
      });
      createProject(clerkUserId, {
        name: "Imported Project Draft",
        description: "Review and edit before first publication.",
        status: "draft",
      });
    }

    job.status = "completed";
    portfolio.importReviewedAt = null;
    return job;
  }

  function confirmImportReview(clerkUserId: string) {
    const portfolio = ensurePortfolio(clerkUserId);
    portfolio.importReviewedAt = new Date().toISOString();
    return portfolio;
  }

  function connectGithub(clerkUserId: string, installationId: string) {
    const portfolio = ensurePortfolio(clerkUserId);
    installations.set(portfolio.id, {
      portfolioId: portfolio.id,
      installationId,
      disconnectedAt: null,
    });
    return installations.get(portfolio.id)!;
  }

  function disconnectGithub(clerkUserId: string) {
    const portfolio = ensurePortfolio(clerkUserId);
    const inst = installations.get(portfolio.id);
    if (inst) {
      inst.disconnectedAt = new Date().toISOString();
    }
  }

  function selectRepos(
    clerkUserId: string,
    repos: { githubRepoId: string; fullName: string }[],
  ) {
    const portfolio = ensurePortfolio(clerkUserId);
    for (const [key, value] of selectedRepos) {
      if (value.portfolioId === portfolio.id) selectedRepos.delete(key);
    }
    for (const repo of repos) {
      selectedRepos.set(`${portfolio.id}:${repo.githubRepoId}`, {
        portfolioId: portfolio.id,
        ...repo,
      });
    }
    return [...selectedRepos.values()].filter(
      (r) => r.portfolioId === portfolio.id,
    );
  }

  function syncGithubRepoChange(
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
    const inst = installations.get(portfolioId);
    if (!inst || inst.disconnectedAt) {
      return { synced: false, reason: "disconnected" as const };
    }
    const selected = selectedRepos.get(`${portfolioId}:${githubRepoId}`);
    if (!selected) {
      return { synced: false, reason: "not_selected" as const };
    }

    let project = [...projects.values()].find(
      (p) =>
        p.portfolioId === portfolioId && p.githubRepoId === githubRepoId,
    );
    if (!project) {
      project = {
        id: randomUUID(),
        portfolioId,
        name: facts.name,
        description: facts.description,
        url: facts.url,
        language: facts.language,
        topics: facts.topics,
        stars: facts.stars,
        githubRepoId,
        githubFullName: facts.fullName,
        status: "draft",
        sortOrder: 0,
      };
      projects.set(project.id, project);
    } else {
      project = {
        ...project,
        name: facts.name,
        url: facts.url,
        language: facts.language,
        topics: facts.topics,
        stars: facts.stars,
        githubFullName: facts.fullName,
      };
      projects.set(project.id, project);
    }
    return { synced: true as const, project };
  }

  function enrichProject(
    clerkUserId: string,
    projectId: string,
    evidence: EvidenceBundle,
    generatedProse: string,
  ) {
    const row = projects.get(projectId);
    if (!row) throw new Error("NOT_FOUND");
    const portfolio = assertPortfolioOwner(row.portfolioId, clerkUserId);
    const user = users.get(portfolio.userId)!;
    const entitlements = getEntitlements(user.planId);
    const gate = canRunAiEnrichment(
      entitlements,
      user.aiEnrichmentsUsedMonth,
    );
    if (!gate.allowed) {
      return { ok: false as const, reason: gate.reason!, upgradeRequired: true };
    }

    user.aiEnrichmentsUsedMonth += 1;
    const confidence = evaluateConfidence(evidence);
    const priorProse = row.description;

    if (confidence === "high") {
      maybeStoreRevision(portfolio, "project", row);
      const next = {
        ...row,
        description: generatedProse,
        language: evidence.language || row.language,
        topics: evidence.topics.length ? evidence.topics : row.topics,
        stars: evidence.stars ?? row.stars,
        url: evidence.url || row.url,
        status: "published" as const,
      };
      projects.set(projectId, next);
      return { ok: true as const, project: next, confidence };
    }

    const next = {
      ...row,
      // facts may update; prose preserved
      language: evidence.language || row.language,
      topics: evidence.topics.length ? evidence.topics : row.topics,
      stars: evidence.stars ?? row.stars,
      url: evidence.url || row.url,
      description: priorProse,
      status: "needs_review" as const,
    };
    projects.set(projectId, next);
    return {
      ok: true as const,
      project: next,
      confidence,
      preservedProse: priorProse,
      proposedProse: generatedProse,
    };
  }

  function acceptFlaggedProse(
    clerkUserId: string,
    projectId: string,
    prose: string,
  ) {
    const row = projects.get(projectId);
    if (!row) throw new Error("NOT_FOUND");
    const portfolio = assertPortfolioOwner(row.portfolioId, clerkUserId);
    maybeStoreRevision(portfolio, "project", row);
    const next = {
      ...row,
      description: prose,
      status: "published" as const,
    };
    projects.set(projectId, next);
    return next;
  }

  function maybeStoreRevision(
    portfolio: PortfolioRecord,
    entityType: string,
    row: StoredProject | StoredExperience,
  ) {
    const user = users.get(portfolio.userId)!;
    const entitlements = getEntitlements(user.planId);
    if (!retainsRevisionHistory(entitlements)) return;
    if (row.status !== "published") return;
    revisions.push({
      id: randomUUID(),
      portfolioId: portfolio.id,
      entityType,
      entityId: row.id,
      snapshot: { ...row },
    });
  }

  function createPublishableKey(
    clerkUserId: string,
    allowedOrigins: string[],
    name = "Default",
  ) {
    const portfolio = ensurePortfolio(clerkUserId);
    const raw = `pk_${randomBytes(24).toString("hex")}`;
    const record: PublishableKeyRecord = {
      id: randomUUID(),
      portfolioId: portfolio.id,
      name,
      keyPrefix: raw.slice(0, 10),
      keyHash: hashKey(raw),
      rawKey: raw,
      allowedOrigins,
      revokedAt: null,
    };
    keys.set(record.id, record);
    keysByHash.set(record.keyHash, record.id);
    return { ...record, key: raw };
  }

  function revokeKey(clerkUserId: string, keyId: string) {
    const record = keys.get(keyId);
    if (!record) throw new Error("NOT_FOUND");
    assertPortfolioOwner(record.portfolioId, clerkUserId);
    record.revokedAt = new Date().toISOString();
    return record;
  }

  function readPublishedPortfolio(
    rawKey: string,
    origin: string | null,
    options?: { isBrowser?: boolean },
  ) {
    const isBrowser = options?.isBrowser ?? Boolean(origin);
    const id = keysByHash.get(hashKey(rawKey));
    if (!id) return { ok: false as const, status: 401, error: "invalid_key" };
    const record = keys.get(id)!;
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

    const publishedProjects = [...projects.values()]
      .filter(
        (p) =>
          p.portfolioId === record.portfolioId && p.status === "published",
      )
      .map((p) => {
        const { portfolioId, ...rest } = p;
        void portfolioId;
        return rest;
      });
    const publishedExperience = [...experiences.values()]
      .filter(
        (e) =>
          e.portfolioId === record.portfolioId && e.status === "published",
      )
      .map((e) => {
        const { portfolioId, ...rest } = e;
        void portfolioId;
        return rest;
      });
    const portfolio = portfolios.get(record.portfolioId)!;

    return {
      ok: true as const,
      data: {
        profile: portfolio.profilePublished,
        links: [...links.values()]
          .filter((l) => l.portfolioId === record.portfolioId)
          .map((l) => {
            const { portfolioId, ...rest } = l;
            void portfolioId;
            return rest;
          }),
        projects: publishedProjects,
        experience: publishedExperience,
        education: [...education.values()]
          .filter(
            (e) =>
              e.portfolioId === record.portfolioId && e.status === "published",
          )
          .map((e) => {
            const { portfolioId, ...rest } = e;
            void portfolioId;
            return rest;
          }),
        skills: [...skills.values()]
          .filter((s) => s.portfolioId === record.portfolioId)
          .map((s) => {
            const { portfolioId, ...rest } = s;
            void portfolioId;
            return rest;
          }),
      },
    };
  }

  function setPlan(clerkUserId: string, planId: PlanId) {
    const user = ensureUser(clerkUserId);
    user.planId = planId;
    return user;
  }

  function applyStripeWebhook(event: {
    type: string;
    clerkUserId?: string;
    planId?: PlanId;
    customerId?: string;
  }) {
    if (event.type === "customer.subscription.updated" && event.clerkUserId) {
      const user = ensureUser(event.clerkUserId);
      if (event.planId) user.planId = event.planId;
      if (event.customerId) user.stripeCustomerId = event.customerId;
      return user;
    }
    return null;
  }

  function listRevisions(portfolioId: string) {
    return revisions.filter((r) => r.portfolioId === portfolioId);
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
    // test helpers
    _projects: projects,
    _experiences: experiences,
    _users: users,
    _importJobs: importJobs,
  };
}

export type MemoryStore = ReturnType<typeof createMemoryStore>;

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

/** Singleton used by API routes in local/dev without Neon. */
let singleton: MemoryStore | null = null;
export function getStore(): MemoryStore {
  if (!singleton) singleton = createMemoryStore();
  return singleton;
}

export function resetStore() {
  singleton = createMemoryStore();
  return singleton;
}
