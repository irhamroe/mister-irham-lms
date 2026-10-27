import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, setToken, getToken } from '../services/api';
import { sortClassesNatural } from '../utils/sortHelper';

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
      fetchMetadata
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
