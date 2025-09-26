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
  refreshUserData: () => Promise<void>; // <-- NUEVA FUNCIÓN
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
          rol: userData.rol,
          cursosInscritos: userData.cursosInscritos || [],
        });
      } else {
        setUser(firebaseUser);
      }
    } else {
      setUser(null);
    }
  }, []);
  
  useEffect(() => {
    setLoading(true);
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      await fetchUserData(firebaseUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [fetchUserData]);

  const refreshUserData = useCallback(async () => {
    await fetchUserData(auth.currentUser);
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