import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User as FirebaseUser,
  onAuthStateChanged, 
  createUserWithEmailAndPassword, // Import this
  signOut as firebaseSignOut
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, // Import this
  collection, 
  getDocs,
  Timestamp 
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import * as faceapi from 'face-api.js';

interface UserData {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  studentId?: string;
  department?: string;
  faceDescriptor?: number[]; 
  profilePhoto?: string;
}

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userData: UserData | null;
  loading: boolean;
  isFullyAuthenticated: boolean;
  // Login with Face (1:N Search)
  loginWithFace: (descriptor: Float32Array) => Promise<boolean>;
  // Standard Register
  signup: (email: string, password: string) => Promise<{ success: boolean; userId?: string; error?: string }>;
  // Save Profile (used after signup)
  createUserProfile: (userId: string, data: Partial<UserData>) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  // 1. Listen for Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserData({ id: docSnap.id, ...docSnap.data() } as UserData);
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // 2. REGISTER FUNCTION (Fixes the hang)
  const signup = async (email: string, password: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      // We do NOT create the profile yet. The UI will do that after Face Registration.
      return { success: true, userId: result.user.uid };
    } catch (error: any) {
      console.error("Signup error:", error);
      return { success: false, error: error.message };
    }
  };

  // 3. CREATE PROFILE (Used after Signup + Face Capture)
  const createUserProfile = async (userId: string, data: Partial<UserData>) => {
    try {
      await setDoc(doc(db, 'users', userId), {
        ...data,
        id: userId,
        createdAt: Timestamp.now(),
        role: 'student' // Default role
      });
      // Force refresh user data
      const docSnap = await getDoc(doc(db, 'users', userId));
      if (docSnap.exists()) {
        setUserData({ id: docSnap.id, ...docSnap.data() } as UserData);
      }
    } catch (error) {
      console.error("Error creating profile:", error);
      throw error;
    }
  };

  // 4. FACE LOGIN (Search all users)
  const loginWithFace = async (descriptor: Float32Array): Promise<boolean> => {
    try {
      console.log("Searching for face match...");
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      
      let bestMatch: UserData | null = null;
      let lowestDistance = 1.0; 

      snapshot.forEach(doc => {
        const user = { id: doc.id, ...doc.data() } as UserData;
        if (user.faceDescriptor) {
          const storedDescriptor = new Float32Array(user.faceDescriptor);
          const distance = faceapi.euclideanDistance(descriptor, storedDescriptor);
          // Threshold 0.5 is a good balance
          if (distance < 0.5 && distance < lowestDistance) {
            lowestDistance = distance;
            bestMatch = user;
          }
        }
      });

      if (bestMatch) {
        setUserData(bestMatch);
        // Note: We don't technically sign them in to Firebase Auth here because 
        // we might not have their password. We just set 'userData' which grants access.
        return true;
      }
      return false;
    } catch (error) {
      console.error("Face login error:", error);
      return false;
    }
  };

  const logout = async () => {
    await firebaseSignOut(auth);
    setUserData(null);
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      userData,
      loading,
      isFullyAuthenticated: !!userData, 
      loginWithFace,
      signup,
      createUserProfile,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};