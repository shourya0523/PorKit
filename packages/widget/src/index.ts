export type WidgetProject = {
  name: string;
  description?: string;
  url?: string;
};

export type WidgetExperience = {
  company: string;
  title: string;
  summary?: string;
};

const NEUTRAL_CSS = `
.pk-embed {
  --pk-embed-fg: #111;
  --pk-embed-muted: #555;
  --pk-embed-border: #ddd;
  --pk-embed-bg: transparent;
  color: var(--pk-embed-fg);
  background: var(--pk-embed-bg);
  font-family: system-ui, sans-serif;
}
.pk-embed h3 { margin: 0 0 0.5rem; font-size: 1.1rem; }
.pk-embed ul { list-style: none; padding: 0; margin: 0; }
.pk-embed li {
  border-top: 1px solid var(--pk-embed-border);
  padding: 0.75rem 0;
}
.pk-embed .muted { color: var(--pk-embed-muted); font-size: 0.9rem; }
`;

/** Brand tokens that must not appear in default widget output (AE5). */
export const FORBIDDEN_BRAND_PATTERNS = [
  /por-kit/i,
  /\bpig\b/i,
  /\bbarn(?:yard)?\b/i,
  /\bsty\b/i,
  /\bsnout\b/i,
  /\bhay\b/i,
  /--pk-soil|--pk-barn|--pk-hay|--pk-cream|--pk-mud|--pk-snout/i,
];

export function renderProjectsWidget(projects: WidgetProject[]): string {
  const items = projects
    .map(
      (p) =>
        `<li><strong>${escapeHtml(p.name)}</strong>` +
        (p.description
          ? `<div class="muted">${escapeHtml(p.description)}</div>`
          : "") +
        (p.url
          ? `<div class="muted"><a href="${escapeHtml(p.url)}">${escapeHtml(p.url)}</a></div>`
          : "") +
        `</li>`,
    )
    .join("");
  return wrap(`<h3>Projects</h3><ul>${items}</ul>`);
}

export function renderExperienceWidget(experience: WidgetExperience[]): string {
  const items = experience
    .map(
      (e) =>
        `<li><strong>${escapeHtml(e.title)}</strong> · ${escapeHtml(e.company)}` +
        (e.summary
          ? `<div class="muted">${escapeHtml(e.summary)}</div>`
          : "") +
        `</li>`,
    )
    .join("");
  return wrap(`<h3>Experience</h3><ul>${items}</ul>`);
}

export function assertNoPigBranding(markup: string): boolean {
  return !FORBIDDEN_BRAND_PATTERNS.some((pattern) => pattern.test(markup));
}

function wrap(inner: string): string {
  return `<div class="pk-embed"><style>${NEUTRAL_CSS}</style>${inner}</div>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
