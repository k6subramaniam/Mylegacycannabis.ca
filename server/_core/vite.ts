import type { Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";
import { injectSeoMeta } from "./seo-middleware";

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    // "custom" = Vite will NOT serve HTML, only process modules/HMR.
    // We serve HTML ourselves via the "*" fallback below.
    appType: "custom",
  });

  app.use(vite.middlewares);

  // SPA HTML fallback — we control this, not Vite
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;


    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");

      // Inject per-route SEO metadata BEFORE Vite's transform
      // (Vite's transformIndexHtml strips HTML comments)
      const requestPath = url.split("?")[0];
      template = injectSeoMeta(template, requestPath);

      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);

      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}
