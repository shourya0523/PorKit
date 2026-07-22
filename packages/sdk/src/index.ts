import type { PublishedPortfolio } from "@porkit/shared";

export type PorkitClientOptions = {
  publishableKey: string;
  baseUrl: string;
  fetchImpl?: typeof fetch;
};

export function createPorkitClient(options: PorkitClientOptions) {
  const fetchImpl = options.fetchImpl ?? fetch;

  async function getPortfolio(): Promise<PublishedPortfolio> {
    const res = await fetchImpl(
      `${options.baseUrl.replace(/\/$/, "")}/api/v1/portfolio`,
      {
        headers: {
          "x-porkit-key": options.publishableKey,
        },
      },
    );
    if (!res.ok) {
      throw new Error(`Por-Kit API error: ${res.status}`);
    }
    return (await res.json()) as PublishedPortfolio;
  }

  return { getPortfolio };
}

export type PorkitClient = ReturnType<typeof createPorkitClient>;
