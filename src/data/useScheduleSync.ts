import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useAuth } from "../auth/AuthProvider";
import { usePartnership } from "../partnership/PartnershipProvider";
import { loadState, saveState, STORAGE_KEY } from "../lib/storage";
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
  const [importAvailable, setImportAvailable] = useState(false);
  const reloadTimer = useRef<number | null>(null);
  const cloudEnabled = Boolean(auth.user && partnership && !auth.demoMode);

  const refresh = useCallback(async () => {
    if (!cloudEnabled || !partnership) return;
    setLoading(true);
    try {
      const cloudState = await loadCloudSchedule(partnership.id);
      setState(cloudState);
      setImportAvailable(
        cloudState.tasks.length === 0 &&
          cloudState.events.length === 0 &&
          Boolean(localStorage.getItem(STORAGE_KEY)),
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
    if (!cloudEnabled) {
      saveState(state);
    }
  }, [cloudEnabled, state]);

  useEffect(() => {
    if (!cloudEnabled || !partnership) return;
    void refresh();
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
    cloudEnabled,
    importAvailable,
    importLocal,
    refresh,
  };
}
