import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)", "/profile(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth(); 

  if (
    req.nextUrl.pathname === "/" ||
    req.nextUrl.pathname.startsWith("/sign-up") ||
    req.nextUrl.pathname.startsWith("/onboarding") ||
    req.nextUrl.pathname.startsWith("/sign-in") ||
    req.nextUrl.pathname.startsWith("/dashboard") //
  ) {
    return NextResponse.next();
  }

  console.log("Middleware - pathname:", req.nextUrl.pathname);
  console.log("Middleware - userId:", !!userId);

  // Check if onboarding is complete
  const onboardingCookie = req.cookies.get("onboarding-complete")?.value;
  const onboardingMeta =
    (sessionClaims?.publicMetadata as any)?.onboardingComplete === true;
  const onboardingDone = Boolean(onboardingCookie === "true" || onboardingMeta);

  console.log("Middleware - onboarding complete:", onboardingDone);

  // Redirect unauthenticated users away from protected routes
  if (isProtectedRoute(req) && !userId) {
    console.log("Middleware - redirecting to sign-in (no user)");
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  // Redirect logged-in users without onboarding complete
  if (userId && !onboardingDone) {
    if (isProtectedRoute(req) || req.nextUrl.pathname === "/") {
      console.log("Middleware - redirecting to onboarding (not complete)");
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
