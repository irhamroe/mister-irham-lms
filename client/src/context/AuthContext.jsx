import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, setToken, getToken } from '../services/api';
import { sortClassesNatural } from '../utils/sortHelper';
import { ref, onValue } from 'firebase/database';
import { database } from '../services/firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [classes, setClassesState] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const setClasses = (rawList) => {
    setClassesState(sortClassesNatural(rawList || []));
  };

  useEffect(() => {
    initAuth();
  }, []);

  // Realtime synchronization for classes and subjects
  useEffect(() => {
    const handleSync = (e) => {
      const { storageKey } = e.detail || {};
      if (storageKey === 'lms_mock_subjects_v3' || storageKey === 'lms_mock_classes_v3') {
        fetchMetadata();
      }
    };
    window.addEventListener('lms-sync-update', handleSync);
    return () => window.removeEventListener('lms-sync-update', handleSync);
  }, []);

  useEffect(() => {
    if (!database) return;
    try {
      const subRef = ref(database, 'lms_v3/subjects');
      const clsRef = ref(database, 'lms_v3/classes');

      const unsubSub = onValue(subRef, () => fetchMetadata());
      const unsubCls = onValue(clsRef, () => fetchMetadata());

      return () => {
        unsubSub();
        unsubCls();
      };
    } catch (e) {
      console.warn('AuthContext Firebase listener setup error:', e);
    }
  }, []);

  async function fetchMetadata() {
    try {
      const meta = await api.getMeta();
      setClasses(meta.classes || []);
      setSubjects(meta.subjects || []);
    } catch (err) {
      console.error('Failed to load classes and subjects meta:', err);
    }
  }

  async function initAuth() {
    try {
      const token = getToken();
      if (token) {
        try {
          const res = await api.getMe();
          if (res && res.user) {
            setUser(res.user);
            await fetchMetadata();
          } else {
            setToken(null);
            setUser(null);
          }
        } catch (e) {
          console.warn('Session expired or invalid, clearing credentials:', e.message);
          setToken(null);
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Init auth error:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(username, password) {
    const res = await api.login(username, password);
    setToken(res.token);
    setUser(res.user);
    await fetchMetadata();
    return res.user;
  }

  function updateUser(updatedData) {
    if (!updatedData) return;
    setUser(prev => prev ? ({ ...prev, ...updatedData }) : prev);
  }

  // Keep active logged-in user in sync if profile/name is updated
  useEffect(() => {
    const handleSync = (e) => {
      const { storageKey, data } = e.detail || {};
      if (storageKey === 'lms_mock_users_v3' && Array.isArray(data) && user) {
        const fresh = data.find(u => u.id === user.id || (u.username && u.username.toLowerCase() === user.username.toLowerCase()));
        if (fresh && (fresh.name !== user.name || fresh.role !== user.role || fresh.avatar !== user.avatar)) {
          setUser(prev => ({ ...prev, ...fresh }));
        }
      }
    };
    window.addEventListener('lms-sync-update', handleSync);
    return () => window.removeEventListener('lms-sync-update', handleSync);
  }, [user]);

  function logout() {
    setToken(null);
    setUser(null);
    setClasses([]);
    setSubjects([]);
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      classes,
      subjects,
      login,
      logout,
      fetchMetadata,
      updateUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
