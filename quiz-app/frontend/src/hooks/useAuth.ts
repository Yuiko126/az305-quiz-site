// src/hooks/useAuth.ts
import { useState, useEffect, useCallback } from "react";
import { logout as logoutApi, me } from "../utils/api";

export function useAuth() {
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const data = await me();
      setUserId(data.userId ?? null);
      setUserName(data.userName ?? null);
    } catch {
      setUserId(null);
      setUserName(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // 初回マウント時に認証状態を確認
  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  async function logout() {
    try {
      await logoutApi();
    } catch (e) {
      console.error("network error during logout", e);
    }

    // フロントの状態をクリア
    setUserId(null);
    setUserName(null);
  }

  return {
    userId,
    userName,
    loading,
    checkAuth,
    logout,
    isAuthenticated: !!userId,
  };
}