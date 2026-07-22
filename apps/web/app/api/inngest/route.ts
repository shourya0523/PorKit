import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { importResume } from "@/inngest/functions/import-resume";
import { githubSync } from "@/inngest/functions/github-sync";
import { enrichProject } from "@/inngest/functions/enrich-project";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [importResume, githubSync, enrichProject],
});
