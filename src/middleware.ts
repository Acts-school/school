import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { routeAccessMap } from "./lib/settings";
import logger from "./lib/logger";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    if (process.env.NODE_ENV !== "production") {
      logger.debug("Middleware executed", { pathname, hasToken: !!token, role: token?.role });
    }

    
    if (token && pathname === "/") {
      return NextResponse.redirect(new URL(`/${token.role}`, req.url));
    }

    // Role-based access control
    if (token?.role) {
      for (const [route, allowedRoles] of Object.entries(routeAccessMap)) {
        const routePattern = new RegExp(`^${route}$`);
        
        if (routePattern.test(pathname)) {
          if (!allowedRoles.includes(token.role as string)) {
            if (process.env.NODE_ENV !== "production") {
              logger.debug("Access denied", { role: token.role, pathname });
            }
            return NextResponse.redirect(new URL(`/${token.role}`, req.url));
          }
          if (process.env.NODE_ENV !== "production") {
            logger.debug("Access granted", { role: token.role, pathname });
          }
          break; // Match topildi, boshqa tekshirishga hojat yo'q
        }
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        
        if (process.env.NODE_ENV !== "production") {
          logger.debug("Authorized callback", { pathname, hasToken: !!token });
        }
        
        // API routes uchun ruxsat berish
        if (pathname.startsWith("/api")) {
          return true;
        }
        
        // Bosh sahifa uchun hamma uchun ruxsat
        if (pathname === "/") {
          return true;
        }
        
        // Protected routes uchun token talab qilish
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Protected routes - all routes except auth
    "/admin/:path*",
    "/teacher/:path*", 
    "/student/:path*",
    "/parent/:path*",
    "/list/:path*",
  ],
};
