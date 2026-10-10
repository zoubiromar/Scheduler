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
  acceptPartnerInviteById,
  declinePartnerInvite,
  loadMyPendingInvites,
  loadPartnershipContext,
  type IncomingPartnerInvite,
  type PartnershipContext,
} from "../data/partnershipRepository";

interface PartnershipContextValue {
  partnership: PartnershipContext | null;
  loading: boolean;
  error: string;
  incomingInvites: IncomingPartnerInvite[];
  refresh: () => Promise<void>;
  refreshInvites: () => Promise<void>;
  acceptInvite: (inviteId: string) => Promise<void>;
  declineInvite: (inviteId: string) => Promise<void>;
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
  const [incomingInvites, setIncomingInvites] = useState<
    IncomingPartnerInvite[]
  >([]);

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

  const refreshInvites = useCallback(async () => {
    if (auth.demoMode || !auth.user) {
      setIncomingInvites([]);
      return;
    }
    try {
      setIncomingInvites(await loadMyPendingInvites());
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Could not load your invitations.",
      );
    }
  }, [auth.demoMode, auth.user]);

  useEffect(() => {
    void Promise.all([refresh(), refreshInvites()]);
  }, [refresh, refreshInvites]);

  const acceptInvite = useCallback(
    async (inviteId: string) => {
      setLoading(true);
      try {
        await acceptPartnerInviteById(inviteId);
        await Promise.all([refresh(), refreshInvites()]);
      } finally {
        setLoading(false);
      }
    },
    [refresh, refreshInvites],
  );

  const declineInvite = useCallback(
    async (inviteId: string) => {
      await declinePartnerInvite(inviteId);
      await refreshInvites();
    },
    [refreshInvites],
  );

  const value = useMemo(
    () => ({
      partnership,
      loading,
      error,
      incomingInvites,
      refresh,
      refreshInvites,
      acceptInvite,
      declineInvite,
    }),
    [
      acceptInvite,
      declineInvite,
      error,
      incomingInvites,
      loading,
      partnership,
      refresh,
      refreshInvites,
    ],
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
