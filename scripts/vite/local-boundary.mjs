const addresses = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);
const hosts = new Set(["127.0.0.1", "localhost", "[::1]"]);

export function isLocalRequest(request) {
  try {
    const authority = new URL(`http://${request.headers.host}`);
    const url = new URL(request.url ?? "/", authority);
    return hosts.has(authority.hostname) && authority.port === "5173" &&
      addresses.has(request.socket.remoteAddress) && url.origin === authority.origin &&
      (!request.headers.origin || request.headers.origin === authority.origin) &&
      request.headers["sec-fetch-site"] !== "cross-site";
  } catch { return false; }
}

/** @returns {import('vite').Plugin} */
export function localBoundary() {
  return {
    name: "kanban-loopback-only",
    enforce: "pre",
    configResolved(config) {
      // Vinext adds a dev CORS default in its config hook. This local-only
      // entry point does not allow cross-origin access, even to Vite assets.
      config.server.cors = false;
      if (config.command !== "serve" || config.isPreview || config.server.host !== "127.0.0.1" ||
          config.server.port !== 5173 || config.server.strictPort !== true || config.server.https ||
          config.server.proxy) {
        throw new Error("Local mode is development-only on http://127.0.0.1:5173; network/build overrides are not supported.");
      }
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (isLocalRequest(request)) return next();
        response.statusCode = 403;
        response.setHeader("Cache-Control", "no-store");
        response.end("Local requests only");
      });
    },
  };
}
