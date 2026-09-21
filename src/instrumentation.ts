export async function register() {}

// Next.js calls this for every uncaught error during rendering (Server
// Components, Server Actions, Route Handlers) — the single place to catch
// server-side failures without wrapping every action/query in try/catch.
export async function onRequestError(
  error: unknown,
  request: { path: string; method: string },
  context: { routerKind: string; routePath: string; routeType: string }
) {
  const { logError } = await import("@/lib/log");
  await logError(error, {
    path: request.path,
    method: request.method,
    routeType: context.routeType,
  });
}
