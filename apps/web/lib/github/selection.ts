export type GithubRepoSummary = {
  id: string;
  fullName: string;
  description: string;
  language: string;
  topics: string[];
  stars: number;
  htmlUrl: string;
  isPinned: boolean;
  hasPortfolioTopic: boolean;
};

/**
 * Discovery helpers — pinned repos and topic `portfolio` are suggestions only.
 * Dashboard multi-select remains authoritative (never auto-publish alone).
 */
export function suggestRepos(repos: GithubRepoSummary[]): GithubRepoSummary[] {
  return repos.filter((r) => r.isPinned || r.hasPortfolioTopic);
}

export function filterSelectedOnly<T extends { githubRepoId: string }>(
  selectedIds: Set<string>,
  candidates: T[],
): T[] {
  return candidates.filter((c) => selectedIds.has(c.githubRepoId));
}
