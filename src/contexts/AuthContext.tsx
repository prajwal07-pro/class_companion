import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { User } from '@/types';
import { isFaceMatch } from '@/lib/faceApi';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  userData: User | null;
  loading: boolean;
  isFullyAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string) => Promise<{ success: boolean; userId?: string; error?: string }>;
  logout: () => Promise<void>;
  verifyFace: (capturedDescriptor: Float32Array) => Promise<boolean>;
  setFaceVerified: (verified: boolean) => void;
  createUserProfile: (userId: string, data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [faceVerified, setFaceVerified] = useState(false);

  const isFullyAuthenticated = !!firebaseUser && !!userData && faceVerified;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      
      if (user) {
        // Fetch user data from Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserData({ id: userDoc.id, ...userDoc.data() } as User);
        } else {
          setUserData(null);
        }
      } else {
        setUserData(null);
        setFaceVerified(false);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { success: true };
    } catch (error: any) {
      console.error('Login error:', error);
      return { success: false, error: error.message || 'Failed to login' };
    }
  };

  const signup = async (email: string, password: string): Promise<{ success: boolean; userId?: string; error?: string }> => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      return { success: true, userId: result.user.uid };
    } catch (error: any) {
      console.error('Signup error:', error);
      return { success: false, error: error.message || 'Failed to create account' };
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setFaceVerified(false);
      setUserData(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const verifyFace = async (capturedDescriptor: Float32Array): Promise<boolean> => {
    if (!userData?.faceDescriptor) {
      console.error('No stored face descriptor found');
      return false;
    }

    const isMatch = isFaceMatch(capturedDescriptor, userData.faceDescriptor);
    setFaceVerified(isMatch);
    return isMatch;
  };

  const createUserProfile = async (userId: string, data: Partial<User>) => {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      ...data,
      id: userId,
      createdAt: Timestamp.now(),
    });
    
    // Refresh user data
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      setUserData({ id: userDoc.id, ...userDoc.data() } as User);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        userData,
        loading,
        isFullyAuthenticated,
        login,
        signup,
        logout,
        verifyFace,
        setFaceVerified,
        createUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
