import { describe, expect, it, vi } from "vitest";
import { createPorkitClient } from "../src/index";

describe("SDK client AE4", () => {
  it("fetches typed published content with publishable key", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          profile: { fullName: "Ada" },
          links: [],
          projects: [{ name: "Live", status: "published" }],
          experience: [{ company: "Acme", title: "Dev", status: "published" }],
          education: [],
          skills: [],
        }),
        { status: 200 },
      );
    }) as unknown as typeof fetch;

    const client = createPorkitClient({
      publishableKey: "pk_test",
      baseUrl: "https://porkit.test",
      fetchImpl,
    });

    const data = await client.getPortfolio();
    expect(data.projects[0]?.name).toBe("Live");
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://porkit.test/api/v1/portfolio",
      expect.objectContaining({
        headers: expect.objectContaining({ "x-porkit-key": "pk_test" }),
      }),
    );
  });
});
