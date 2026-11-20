import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiClient, setStoredToken } from '../lib/apiClient';
import { signInWithGooglePopup, signOutFirebase } from '../lib/firebase';
import type { UserProfile, WorkspaceSummary } from '../shared/api-contracts';

const ACTIVE_WS_KEY = 'lt_active_workspace_id';

interface AuthContextValue {
  user: UserProfile | null;
  workspaces: WorkspaceSummary[];
  activeWorkspace: WorkspaceSummary | null;
  loading: boolean;
  setActiveWorkspaceId: (id: string) => void;
  refreshSession: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (input: {
    email: string;
    password: string;
    fullName: string;
    workspaceName?: string;
    industry?: string;
  }) => Promise<{ verificationToken?: string }>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateWorkspacesState: (workspaces: WorkspaceSummary[], selectId?: string) => void;
  updateUserState: (user: UserProfile) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(ACTIVE_WS_KEY);
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  const selectWorkspace = useCallback((list: WorkspaceSummary[], preferredId?: string | null) => {
    setWorkspaces(list);
    if (list.length === 0) {
      setActiveWorkspaceIdState(null);
      return;
    }
    const target = preferredId && list.some((w) => w.id === preferredId) ? preferredId : list[0].id;
    setActiveWorkspaceIdState(target);
    try {
      localStorage.setItem(ACTIVE_WS_KEY, target);
    } catch {
      // Ignore storage restrictions
    }
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const data = await apiClient.getMe();
      setUser(data.user);
      if (data.token) setStoredToken(data.token);
      selectWorkspace(data.workspaces, activeWorkspaceId);
    } catch {
      setUser(null);
      setWorkspaces([]);
      setStoredToken(null);
    } finally {
      setLoading(false);
    }
  }, [activeWorkspaceId, selectWorkspace]);

  useEffect(() => {
    void refreshSession();
  }, []);

  const setActiveWorkspaceId = useCallback((id: string) => {
    setActiveWorkspaceIdState(id);
    try {
      localStorage.setItem(ACTIVE_WS_KEY, id);
    } catch {
      // Ignore
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiClient.login({ email, password });
    setStoredToken(res.token);
    setUser(res.user);
    selectWorkspace(res.workspaces);
  }, [selectWorkspace]);

  const register = useCallback(
    async (input: {
      email: string;
      password: string;
      fullName: string;
      workspaceName?: string;
      industry?: string;
    }) => {
      const res = await apiClient.register(input);
      setStoredToken(res.token);
      setUser(res.user);
      selectWorkspace(res.workspaces);
      return { verificationToken: res.verificationToken };
    },
    [selectWorkspace]
  );

  const loginWithGoogle = useCallback(async () => {
    const fbUser = await signInWithGooglePopup();
    if (!fbUser.email) {
      throw new Error('Google account did not return an email address.');
    }
    const res = await apiClient.googleSync({
      externalUid: fbUser.uid,
      email: fbUser.email,
      fullName: fbUser.displayName || fbUser.email.split('@')[0],
      avatarUrl: fbUser.photoURL,
      emailVerified: fbUser.emailVerified,
    });
    setStoredToken(res.token);
    setUser(res.user);
    selectWorkspace(res.workspaces);
  }, [selectWorkspace]);

  const logout = useCallback(async () => {
    try {
      await apiClient.logout();
    } catch {
      // Ignore network errors during logout
    }
    await signOutFirebase();
    setStoredToken(null);
    setUser(null);
    setWorkspaces([]);
    setActiveWorkspaceIdState(null);
  }, []);

  const updateWorkspacesState = useCallback(
    (nextList: WorkspaceSummary[], selectId?: string) => {
      selectWorkspace(nextList, selectId ?? activeWorkspaceId);
    },
    [activeWorkspaceId, selectWorkspace]
  );

  const activeWorkspace =
    workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0] || null;

  return (
    <AuthContext.Provider
      value={{
        user,
        workspaces,
        activeWorkspace,
        loading,
        setActiveWorkspaceId,
        refreshSession,
        login,
        register,
        loginWithGoogle,
        logout,
        updateWorkspacesState,
        updateUserState: setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
