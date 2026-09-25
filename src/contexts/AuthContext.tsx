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

      checkUserRole(newSession);
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
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error: error as Error | null };
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