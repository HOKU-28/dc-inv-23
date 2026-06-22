"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  AuthSession,
  UserRole,
  requireAuth,
  logout,
  touchSession,
  getSession,
  isSessionValid,
} from "@/app/lib/auth";

interface UseAuthOptions {
  expectedRole?: UserRole;
  redirectTo?: string;
}

const SESSION_CHECK_INTERVAL_MS = 60_000; // 1 minute
const TOUCH_THROTTLE_MS = 30_000; // 30 seconds

/**
 * Client-side auth guard for dashboard pages.
 * Validates session, redirects on expiry/invalid role, and keeps the session
 * alive while the user is active.
 */
export function useAuth(options: UseAuthOptions = {}) {
  const { expectedRole, redirectTo = "/" } = options;
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  const doLogout = useCallback(
    (reason?: string) => {
      logout();
      if (reason) {
        try {
          sessionStorage.setItem("dominico-auth-reason", reason);
        } catch {
          // ignore
        }
      }
      router.replace(redirectTo);
    },
    [redirectTo, router]
  );

  // Initial check + periodic revalidation.
  useEffect(() => {
    let mounted = true;

    const check = async () => {
      const validSession = await requireAuth(expectedRole);
      if (!mounted) return;
      if (!validSession) {
        doLogout();
        return;
      }
      setSession(validSession);
      setLoading(false);
    };

    check();

    const interval = setInterval(async () => {
      const valid = await isSessionValid(getSession());
      if (!valid) {
        doLogout("Sesi berakhir. Silakan login kembali.");
      }
    }, SESSION_CHECK_INTERVAL_MS);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [expectedRole, doLogout]);

  // Touch session on user activity (throttled).
  useEffect(() => {
    if (loading || !session) return;

    let lastTouch = 0;
    const handleActivity = () => {
      const now = Date.now();
      if (now - lastTouch < TOUCH_THROTTLE_MS) return;
      lastTouch = now;
      touchSession();
    };

    const events = ["mousedown", "keydown", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, handleActivity, { passive: true }));

    return () => {
      events.forEach((e) => window.removeEventListener(e, handleActivity));
    };
  }, [loading, session]);

  const handleLogout = useCallback(() => {
    doLogout();
  }, [doLogout]);

  return { session, loading, logout: handleLogout };
}
