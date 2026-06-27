"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { getCurrentUser } from "@/lib/auth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "admin" | "user";
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const router = useRouter();
  const { user, setUser, setLoading, isAuthenticated } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        setLoading(true);
        const currentUser = await getCurrentUser();

        if (!currentUser) {
          router.push("/login");
          return;
        }

        setUser(currentUser);

        // Check role if required
        if (requiredRole && currentUser.role !== requiredRole) {
          router.push("/dashboard");
          return;
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        router.push("/login");
      } finally {
        setLoading(false);
        setIsChecking(false);
      }
    }

    if (!isAuthenticated) {
      checkAuth();
    } else {
      setIsChecking(false);
    }
  }, [isAuthenticated, requiredRole, router, setUser, setLoading]);

  if (isChecking) {
    return (
      <div className="w-screen h-screen bg-os-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  if (requiredRole && user.role !== requiredRole) {
    return null;
  }

  return <>{children}</>;
}
