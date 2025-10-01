// RUTA: src/context/AuthContext.tsx (VERSIÓN FINAL Y SIMPLIFICADA)

"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export interface UserProfile extends FirebaseUser {
  rol?: string;
  cursosInscritos?: string[];
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true, 
  refreshUserData: async () => {} 
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = useCallback(async (firebaseUser: FirebaseUser | null) => {
    if (firebaseUser) {
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUser({
          ...firebaseUser,
          rol: userData.rol, // Leemos el rol directamente de Firestore
          cursosInscritos: userData.cursosInscritos || [],
        });
      } else {
        setUser(firebaseUser);
      }
    } else {
      setUser(null);
    }
    setLoading(false);
  }, []);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      fetchUserData(firebaseUser);
    });
    return () => unsubscribe();
  }, [fetchUserData]);

  const refreshUserData = useCallback(async () => {
    if (auth.currentUser) {
      await fetchUserData(auth.currentUser);
    }
  }, [fetchUserData]);

  return (
    <AuthContext.Provider value={{ user, loading, refreshUserData }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};