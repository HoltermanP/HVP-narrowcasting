import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Publieke routes: de player zelf, de read-only player-API en de heartbeat.
// Alles daarbuiten (de hele beheeromgeving) vereist een Clerk-login.
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/player/(.*)",
  "/api/player/(.*)",
  "/api/heartbeat",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
