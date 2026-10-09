import type { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  authRedirectUrl,
  isSupabaseConfigured,
  supabase,
} from "../lib/supabase";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  demoMode: boolean;
  configured: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  startDemo: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const DEMO_KEY = "dayline.demoMode";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [demoMode, setDemoMode] = useState(
    () => sessionStorage.getItem(DEMO_KEY) === "true",
  );

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
      if (nextSession) {
        sessionStorage.removeItem(DEMO_KEY);
        setDemoMode(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      loading,
      demoMode,
      configured: isSupabaseConfigured,
      signInWithGoogle: async () => {
        if (!supabase) throw new Error("Supabase is not configured.");
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: authRedirectUrl() },
        });
        if (error) throw error;
      },
      signInWithEmail: async (email: string) => {
        if (!supabase) throw new Error("Supabase is not configured.");
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: authRedirectUrl() },
        });
        if (error) throw error;
      },
      signOut: async () => {
        sessionStorage.removeItem(DEMO_KEY);
        setDemoMode(false);
        if (supabase) {
          const { error } = await supabase.auth.signOut();
          if (error) throw error;
        }
      },
      startDemo: () => {
        sessionStorage.setItem(DEMO_KEY, "true");
        setDemoMode(true);
      },
    }),
    [demoMode, loading, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider.");
  return value;
}
