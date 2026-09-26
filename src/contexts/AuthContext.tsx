import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const clearAuthTokens = () => {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('-auth-token') || key.startsWith('sb-'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // Ignore storage clearing error
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkUserRole = async (currentSession: Session | null) => {
      if (!currentSession?.user) {
        if (!isMounted) return;
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      const cachedRole = sessionStorage.getItem(`admin_role_${currentSession.user.id}`);
      if (cachedRole === "admin") {
        if (!isMounted) return;
        setSession(currentSession);
        setUser(currentSession.user);
        setLoading(false);
        return;
      }

      const { data: profileData, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", currentSession.user.id)
        .maybeSingle();

      if (!isMounted) return;

      if (error || !profileData || profileData.role !== "admin") {
        sessionStorage.removeItem(`admin_role_${currentSession.user.id}`);
        try {
          await supabase.auth.signOut();
        } catch {
          // session may already be invalid; ignore
        }
        clearAuthTokens();
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      sessionStorage.setItem(`admin_role_${currentSession.user.id}`, "admin");
      setSession(currentSession);
      setUser(currentSession.user);
      setLoading(false);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === "SIGNED_OUT" || event === "TOKEN_REFRESH_FAILED") {
        clearAuthTokens();
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") {
        checkUserRole(newSession);
      }
    });

    supabase.auth
      .getSession()
      .then(({ data: { session: existingSession }, error }) => {
        if (error) {
          clearAuthTokens();
          if (isMounted) {
            setSession(null);
            setUser(null);
            setLoading(false);
          }
          return;
        }
        if (existingSession) {
          checkUserRole(existingSession);
        } else if (isMounted) {
          setLoading(false);
        }
      })
      .catch(() => {
        clearAuthTokens();
        if (isMounted) {
          setSession(null);
          setUser(null);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    } finally {
      clearAuthTokens();
      setSession(null);
      setUser(null);
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          signup_source: 'admin'
        },
      },
    });

    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: error as Error };
      }

      if (!data?.user) {
        return { error: new Error("Authentication failed") };
      }

      // Fast check for cached role or instant verification
      const cached = sessionStorage.getItem(`admin_role_${data.user.id}`);
      if (cached === "admin") {
        setUser(data.user);
        setSession(data.session);
        setLoading(false);
        return { error: null };
      }

      // Verify admin role immediately before returning
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (roleError || !roleData || roleData.role !== "admin") {
        try {
          await supabase.auth.signOut();
        } catch {}
        clearAuthTokens();
        sessionStorage.removeItem(`admin_role_${data.user.id}`);
        setUser(null);
        setSession(null);
        setLoading(false);
        return { error: new Error("Access denied. Admin privileges required.") };
      }

      // Validated Admin
      sessionStorage.setItem(`admin_role_${data.user.id}`, "admin");
      setUser(data.user);
      setSession(data.session);
      setLoading(false);

      return { error: null };
    } catch (err: any) {
      return { error: err || new Error("Failed to sign in") };
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}