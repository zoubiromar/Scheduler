import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "../auth/AuthProvider";
import {
  loadPartnershipContext,
  type PartnershipContext,
} from "../data/partnershipRepository";

interface PartnershipContextValue {
  partnership: PartnershipContext | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
}

const Context = createContext<PartnershipContextValue | null>(null);

const demoPartnership: PartnershipContext = {
  id: "demo-partnership",
  name: "Alex & Sam",
  createdBy: "demo-you",
  currentRole: "admin",
  members: [
    {
      role: "admin",
      color: "#3f6b58",
      profile: {
        id: "demo-you",
        displayName: "Alex",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    },
    {
      role: "partner",
      color: "#c45c3e",
      profile: {
        id: "demo-partner",
        displayName: "Sam",
        timezone: "Europe/Paris",
      },
    },
  ],
};

export function PartnershipProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const [partnership, setPartnership] = useState<PartnershipContext | null>(
    auth.demoMode ? demoPartnership : null,
  );
  const [loading, setLoading] = useState(Boolean(auth.user));
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (auth.demoMode) {
      setPartnership(demoPartnership);
      setLoading(false);
      setError("");
      return;
    }
    if (!auth.user) {
      setPartnership(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      setPartnership(await loadPartnershipContext(auth.user.id));
      setError("");
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Could not load your partnership.",
      );
    } finally {
      setLoading(false);
    }
  }, [auth.demoMode, auth.user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ partnership, loading, error, refresh }),
    [error, loading, partnership, refresh],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function usePartnership(): PartnershipContextValue {
  const value = useContext(Context);
  if (!value) {
    throw new Error("usePartnership must be used inside PartnershipProvider.");
  }
  return value;
}
