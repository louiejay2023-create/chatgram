// src/contexts/AuthContext.tsx

"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import {
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { User } from "@/types";

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<void>;
  signOut: () => Promise<void>;
  updateUserProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Fetch user data from Firestore
   */
  const fetchUserData = async (uid: string): Promise<User | null> => {
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        return { uid, ...userDoc.data() } as User;
      }
      return null;
    } catch (error) {
      console.error("Error fetching user data:", error);
      return null;
    }
  };

  /**
   * Update user's online status
   */
  const updateUserStatus = async (
    uid: string,
    status: "online" | "offline",
  ) => {
    try {
      await updateDoc(doc(db, "users", uid), {
        status,
        lastSeen: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error updating user status:", error);
    }
  };

  /**
   * Sign in
   */
  const signIn = async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      await updateUserStatus(result.user.uid, "online");
    } catch (error: any) {
      console.error("Sign in error:", error);
      throw new Error(error.message || "Failed to sign in");
    }
  };

  /**
   * Sign up
   */
  const signUp = async (
    email: string,
    password: string,
    displayName: string,
  ) => {
    try {
      const result = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );

      // Update Firebase Auth profile
      await updateProfile(result.user, { displayName });

      // Create user document in Firestore
      const userData = {
        email,
        displayName,
        photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`,
        status: "online",
        lastSeen: serverTimestamp(),
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, "users", result.user.uid), userData);
    } catch (error: any) {
      console.error("Sign up error:", error);
      throw new Error(error.message || "Failed to sign up");
    }
  };

  /**
   * Sign out
   */
  const signOut = async () => {
    try {
      if (user) {
        await updateUserStatus(user.uid, "offline");
      }
      await firebaseSignOut(auth);
      setUser(null);
      setFirebaseUser(null);
    } catch (error: any) {
      console.error("Sign out error:", error);
      throw new Error(error.message || "Failed to sign out");
    }
  };

  /**
   * Update user profile
   */
  const updateUserProfile = async (data: Partial<User>) => {
    if (!user) return;

    try {
      await updateDoc(doc(db, "users", user.uid), data);
      setUser({ ...user, ...data });
    } catch (error: any) {
      console.error("Update profile error:", error);
      throw new Error(error.message || "Failed to update profile");
    }
  };

  /**
   * Listen to auth state changes
   */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser);

      if (firebaseUser) {
        const userData = await fetchUserData(firebaseUser.uid);
        setUser(userData);
        await updateUserStatus(firebaseUser.uid, "online");
      } else {
        setUser(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  /**
   * Update status to offline on page unload
   */
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (user) {
        updateUserStatus(user.uid, "offline");
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [user]);

  const value: AuthContextType = {
    user,
    firebaseUser,
    loading,
    signIn,
    signUp,
    signOut,
    updateUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
