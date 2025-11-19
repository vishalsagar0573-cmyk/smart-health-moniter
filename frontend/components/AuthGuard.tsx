import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

export const AuthGuard = ({ children, requireAuth = true }: AuthGuardProps) => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        if (requireAuth && !session) {
          navigate("/auth");
        } else if (!requireAuth && session) {
          // Check user role and redirect to appropriate dashboard
          setTimeout(() => {
            checkUserRoleAndRedirect(session.user.id);
          }, 0);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (requireAuth && !session) {
        navigate("/auth");
      } else if (!requireAuth && session) {
        checkUserRoleAndRedirect(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [requireAuth, navigate]);

  const checkUserRoleAndRedirect = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const roles = (data || []).map((r: any) => r.role) as string[];
    const lastRole = localStorage.getItem("lastRole") as "health_worker" | "villager" | null;

    // If we know the user's last chosen role and they have it, honor it
    if (lastRole && roles.includes(lastRole)) {
      navigate(lastRole === "health_worker" ? "/worker-dashboard" : "/villager-dashboard");
      return;
    }

    // Otherwise prefer villager when ambiguous
    if (roles.includes("villager")) {
      navigate("/villager-dashboard");
    } else if (roles.includes("health_worker")) {
      navigate("/worker-dashboard");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
