import { useCallback, useEffect, useState } from "react";
import type { DomainStat, SessionRecord } from "../types";
import { getDomainStats, getSessions } from "../utils/api";

export function useLearningStats(userId: string | null) {
  const [domainStats, setDomainStats] = useState<DomainStat[]>([]);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!userId) {
      setDomainStats([]);
      setSessions([]);
      return;
    }

    setLoading(true);
    try {
      const [sessionsData, statsData] = await Promise.all([
        getSessions(),
        getDomainStats(),
      ]);
      setSessions(sessionsData);
      setDomainStats(statsData);
    } catch (error) {
      console.error("Failed to load learning stats:", error);
      setSessions([]);
      setDomainStats([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    sessions,
    domainStats,
    loading,
    reload,
  };
}
