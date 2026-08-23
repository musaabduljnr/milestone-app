import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
      global: {
        fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }),
      },
    }
  );

  // Refresh user session token safely
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = request.nextUrl.clone();
  const isAuthRoute = url.pathname.startsWith("/auth");
  const isDashboardRoute =
    url.pathname.startsWith("/dashboard") ||
    url.pathname.startsWith("/projects") ||
    url.pathname.startsWith("/invitations") ||
    url.pathname.startsWith("/client") ||
    url.pathname.startsWith("/freelancer") ||
    url.pathname.startsWith("/verification") ||
    url.pathname === "/wallet" ||
    url.pathname === "/messages" ||
    url.pathname === "/activity" ||
    url.pathname === "/settings";

  // Case 1: Unauthenticated user trying to access protected areas -> Redirect to Login
  if (isDashboardRoute && !user) {
    url.pathname = "/auth/login";
    url.searchParams.set("returnUrl", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Case 2: Authenticated user
  if (user) {
    // Fetch profile role directly from database
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    // If user has not selected client vs freelancer role yet, redirect to role selection
    if (!profile?.role && url.pathname !== "/auth/role-selection" && isDashboardRoute) {
      url.pathname = "/auth/role-selection";
      return NextResponse.redirect(url);
    }

    // Guard: Prevent freelancers from opening project creation wizard
    if (url.pathname === "/projects/new" && profile?.role !== "client") {
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    // If authenticated user with a set role visits Auth pages, redirect to dashboard
    if (isAuthRoute && url.pathname !== "/auth/role-selection" && profile?.role) {
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
