// RUTA: src/context/AuthContext.tsx

"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export interface UserProfile extends FirebaseUser {
  rol?: string;
  cursosInscritos?: string[];
  nombre?: string;
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

  const fetchFullUserProfile = useCallback(async (firebaseUser: FirebaseUser | null, forceRefresh: boolean = false) => {
    if (!firebaseUser) {
      setUser(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const tokenResult = await firebaseUser.getIdTokenResult(forceRefresh);
      const claims = tokenResult.claims;

      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);
      const firestoreData = userDoc.exists() ? userDoc.data() : {};

      setUser({
        ...firebaseUser,
        nombre: firestoreData.nombre || firebaseUser.displayName || '',
        cursosInscritos: firestoreData.cursosInscritos || [],
        rol: (claims.rol as string) || (firestoreData.rol as string) || undefined,
      });

    } catch (error) {
      console.error("Error al obtener el perfil completo del usuario:", error);
      setUser(firebaseUser);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      fetchFullUserProfile(firebaseUser);
    });
    return () => unsubscribe();
  }, [fetchFullUserProfile]);

  const refreshUserData = useCallback(async () => {
    if (auth.currentUser) {
      await fetchFullUserProfile(auth.currentUser, true);
    }
  }, [fetchFullUserProfile]);

  return (
    <AuthContext.Provider value={{ user, loading, refreshUserData }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};