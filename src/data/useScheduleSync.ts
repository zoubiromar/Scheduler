import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useAuth } from "../auth/AuthProvider";
import { usePartnership } from "../partnership/PartnershipProvider";
import { loadState, saveState } from "../lib/storage";
import { hasUserCreatedLocalSchedule } from "../lib/localSchedule";
import type { AppState, ItemScope } from "../types";
import {
  importLocalSchedule,
  loadCloudSchedule,
  subscribeToCloudSchedule,
} from "./scheduleRepository";

export interface ScheduleSyncState {
  state: AppState;
  setState: Dispatch<SetStateAction<AppState>>;
  loading: boolean;
  error: string;
  online: boolean;
  cloudEnabled: boolean;
  importAvailable: boolean;
  importLocal: (scope: ItemScope) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useScheduleSync(): ScheduleSyncState {
  const auth = useAuth();
  const { partnership } = usePartnership();
  const [state, setState] = useState<AppState>(() => loadState());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [online, setOnline] = useState(() => navigator.onLine);
  const [importAvailable, setImportAvailable] = useState(false);
  const reloadTimer = useRef<number | null>(null);
  const cloudEnabled = Boolean(auth.user && partnership && !auth.demoMode);

  const refresh = useCallback(async () => {
    if (!cloudEnabled || !partnership || !navigator.onLine) return;
    setLoading(true);
    try {
      const cloudState = await loadCloudSchedule(partnership.id);
      setState(cloudState);
      setImportAvailable(
        cloudState.tasks.length === 0 &&
          cloudState.events.length === 0 &&
          hasUserCreatedLocalSchedule(),
      );
      setError("");
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Could not sync your shared schedule.",
      );
    } finally {
      setLoading(false);
    }
  }, [cloudEnabled, partnership]);

  useEffect(() => {
    const updateOnline = () => setOnline(navigator.onLine);
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, []);

  useEffect(() => {
    if (!auth.user || auth.demoMode) {
      saveState(state);
    }
  }, [auth.demoMode, auth.user, state]);

  useEffect(() => {
    if (online && cloudEnabled) void refresh();
  }, [cloudEnabled, online, refresh]);

  useEffect(() => {
    if (!cloudEnabled || !partnership) return;
    const channel = subscribeToCloudSchedule(partnership.id, () => {
      if (reloadTimer.current !== null) window.clearTimeout(reloadTimer.current);
      reloadTimer.current = window.setTimeout(() => void refresh(), 120);
    });
    return () => {
      if (reloadTimer.current !== null) window.clearTimeout(reloadTimer.current);
      void channel.unsubscribe();
    };
  }, [cloudEnabled, partnership, refresh]);

  async function importLocal(scope: ItemScope) {
    if (!auth.user || !partnership) return;
    setLoading(true);
    try {
      await importLocalSchedule(loadState(), partnership.id, auth.user.id, scope);
      setImportAvailable(false);
      await refresh();
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Import failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  return {
    state,
    setState,
    loading,
    error,
    online,
    cloudEnabled,
    importAvailable,
    importLocal,
    refresh,
  };
}
