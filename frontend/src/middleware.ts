import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  '/login(.*)',
  '/api/webhooks/clerk(.*)',
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    const url = new URL('/login', request.url);
    await auth.protect({
      unauthenticatedUrl: url.toString(),
    });
  }
});

export const config = {
  matcher: [
    // skip next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // always run for api routes
    '/(api|trpc)(.*)',
  ],
};
