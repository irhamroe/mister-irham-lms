import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, setToken, getToken } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [demoUsers, setDemoUsers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    initAuth();
  }, []);

  async function initAuth() {
    try {
      // 1. Fetch demo users
      const demos = await api.getDemoUsers();
      setDemoUsers(demos);

      // 2. Check existing token or auto login as Guru Budi by default for instant wow experience
      const token = getToken();
      if (token) {
        try {
          const res = await api.getMe();
          setUser(res.user);
        } catch (e) {
          // Token expired, fallback to default teacher
          await autoLoginDefaultTeacher(demos);
        }
      } else {
        await autoLoginDefaultTeacher(demos);
      }

      // 3. Fetch classes and subjects meta
      const meta = await api.getMeta();
      setClasses(meta.classes || []);
      setSubjects(meta.subjects || []);
    } catch (err) {
      console.error('Init auth error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function autoLoginDefaultTeacher(demos) {
    const teacher = demos.find(d => d.username === 'guru_budi') || demos[0];
    if (teacher) {
      const res = await api.switchAccount(teacher.id);
      setToken(res.token);
      setUser(res.user);
    }
  }

  async function switchUser(userId) {
    setLoading(true);
    try {
      const res = await api.switchAccount(userId);
      setToken(res.token);
      setUser(res.user);
      return res.user;
    } catch (err) {
      alert('Gagal beralih akun: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function login(username, password) {
    const res = await api.login(username, password);
    setToken(res.token);
    setUser(res.user);
    return res.user;
  }

  function logout() {
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      demoUsers,
      classes,
      subjects,
      switchUser,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
