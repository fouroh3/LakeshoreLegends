import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const APPS_SCRIPT_PATH =
  "/macros/s/AKfycbw6gMIFYPvaljF3Ls-waojzprU6bygZZonOIJeKLopN2NSKgkDT-EsRKznxQiGpth_6/exec";

const APPS_SCRIPT_ORIGIN = "https://script.google.com";

function appsScriptDevProxy(): Plugin {
  return {
    name: "lakeshore-apps-script-dev-proxy",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/ll-api")) {
          next();
          return;
        }

        try {
          const suffix = req.url.slice("/ll-api".length);
          let targetUrl = `${APPS_SCRIPT_ORIGIN}${APPS_SCRIPT_PATH}${suffix}`;
          const method = String(req.method || "GET").toUpperCase();
          const chunks: Buffer[] = [];

          for await (const chunk of req) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          }

          const requestBody = chunks.length ? Buffer.concat(chunks) : undefined;
          let requestMethod = method;
          let requestBodyForRedirect = requestBody;
          let upstream: Response | null = null;

          for (let redirectCount = 0; redirectCount < 5; redirectCount++) {
            const headers: Record<string, string> = {
              Accept: "*/*",
            };
            const contentType = req.headers["content-type"];
            if (contentType && requestMethod !== "GET" && requestMethod !== "HEAD") {
              headers["Content-Type"] = String(contentType);
            }

            upstream = await fetch(targetUrl, {
              method: requestMethod,
              headers,
              body:
                requestMethod === "GET" || requestMethod === "HEAD"
                  ? undefined
                  : requestBodyForRedirect,
              redirect: "manual",
            });

            if (![301, 302, 303, 307, 308].includes(upstream.status)) {
              break;
            }

            const location = upstream.headers.get("location");
            if (!location) {
              break;
            }

            targetUrl = new URL(location, targetUrl).toString();

            // Apps Script ContentService returns a 302 to a one-time
            // script.googleusercontent.com URL. That URL must be fetched with
            // GET to retrieve the JSON body; replaying the POST can produce a
            // Google HTML 404/405 before our API response is returned.
            if ([301, 302, 303].includes(upstream.status)) {
              requestMethod = "GET";
              requestBodyForRedirect = undefined;
            }
          }

          if (!upstream) {
            throw new Error("Apps Script proxy did not receive a response.");
          }

          const responseBody = Buffer.from(await upstream.arrayBuffer());
          const responseType = upstream.headers.get("content-type");

          res.statusCode = upstream.status;
          res.setHeader("Cache-Control", "no-store");
          if (responseType) {
            res.setHeader("Content-Type", responseType);
          }
          res.end(responseBody);
        } catch (err: any) {
          res.statusCode = 502;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.setHeader("Cache-Control", "no-store");
          res.end(
            JSON.stringify({
              ok: false,
              error: `Apps Script proxy failed: ${String(
                err?.message || err || "Unknown proxy error"
              )}`,
            })
          );
        }
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), appsScriptDevProxy()],
});
