import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
  useRef,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  auth,
  db,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  Auth,
  User,
  doc,
  getDoc,
  setDoc,
  Firestore,
  signOut,
  query,
  collection,
  where,
  getDocs,
  sendPasswordResetEmail,
} from "../firebase";
import { Router } from "expo-router";
import NetInfo from '@react-native-community/netinfo';
import Constants from "expo-constants";
// Keys for AsyncStorage
const USER_AUTH_KEY = "@user_auth";
const USER_ROLE_KEY = "@user_role";

interface SignInParams {
  role: "user" | "counselor";
  email?: string;
  password?: string;
}

// Update AuthContextType
interface AuthContextType {
  user: User | null;
  isCounselor: boolean;
  loading: boolean;
  signIn: (params: SignInParams, router: Router) => Promise<void>;
  signUp: (email: string, password: string) => Promise<User>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  auth: Auth;
  db: Firestore;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  isCounselor: false,
  loading: true,
  signIn: async () => {},
  signUp: async (email: string, password: string) => {
    throw new Error("signUp function not implemented.");
  },
  logout: async () => {},
  resetPassword: async () => {},
  auth,
  db,
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isCounselor, setIsCounselor] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Store user data in AsyncStorage
  const storeUserData = async (userData: User | null, isCounselor: boolean) => {
    try {
      if (userData) {
        const userToStore = {
          uid: userData.uid,
          email: userData.email,
          displayName: userData.displayName,
          photoURL: userData.photoURL,
        };
        await AsyncStorage.setItem(USER_AUTH_KEY, JSON.stringify(userToStore));
        await AsyncStorage.setItem(
          USER_ROLE_KEY,
          isCounselor ? "counselor" : "user"
        );
      } else {
        await AsyncStorage.removeItem(USER_AUTH_KEY);
        await AsyncStorage.removeItem(USER_ROLE_KEY);
      }
    } catch (error) {
      console.error("Error storing user data:", error);
    }
  };

  const loadStoredUserData = async () => {
    try {
      const storedUser = await AsyncStorage.getItem(USER_AUTH_KEY);
      const storedRole = await AsyncStorage.getItem(USER_ROLE_KEY);

      if (storedUser) {
        setIsCounselor(storedRole === "counselor");
      }
    } catch (error) {
      console.error("Error loading stored user data:", error);
    }
  };

  useEffect(() => {
    loadStoredUserData();

    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const counselorDoc = await getDoc(
            doc(db, "counselors", firebaseUser.uid)
          );
          const userIsCounselor =
            counselorDoc.exists() && counselorDoc.data()?.isVerified;

          setUser(firebaseUser);
          setIsCounselor(userIsCounselor);
          await storeUserData(firebaseUser, userIsCounselor);
        } else {
          setUser(null);
          setIsCounselor(false);
          await storeUserData(null, false);
        }
      } catch (error) {
        console.error("Error in auth state change:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

 

   // Add this new signUp function
  const signUp = async (email: string, password: string): Promise<User> => {
   
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Create user document in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        email,
        createdAt: new Date(),
        role: 'user' // Explicit role designation
      });
      
      return user;
    } catch (error: any) {
      console.error("Sign up error:", error);
      throw error;
    }
  };
const checkNetwork = async () => {
  const state = await NetInfo.fetch();
  if (!state.isConnected) {
    throw new Error("No internet connection");
  }
};
  // Update the signIn function
  const signIn = async (params: SignInParams, router: Router) => {
     await checkNetwork();
    try {
      if (params.role === "counselor" && params.email && params.password) {
        // Existing counselor flow
        const result = await signInWithEmailAndPassword(
          auth,
          params.email,
          params.password
        );
        const newUser = result.user;

        const counselorRef = doc(db, "counselors", newUser.uid);
        const counselorDoc = await getDoc(counselorRef);

        if (!counselorDoc.exists()) {
          if (!newUser?.email) {
            throw new Error("User email is undefined.");
          }
          const sanitizedEmail = newUser.email.replace(/[^a-zA-Z0-9]/g, "");
          const verifiedRef = doc(db, "verifiedCounselors", sanitizedEmail);
          const verifiedDoc = await getDoc(verifiedRef);

          if (verifiedDoc.exists()) {
            await setDoc(counselorRef, {
              email: newUser.email,
              isVerified: true,
              createdAt: new Date(),
            });
            setIsCounselor(true);
            await storeUserData(newUser, true);
            router.push("/counselor-dashboard");
          } else {
            await signOut(auth);
            throw new Error("Email not verified for counselor access.");
          }
        } else {
          const isVerified = counselorDoc.data()?.isVerified;
          if (isVerified) {
            setIsCounselor(true);
            await storeUserData(newUser, true);
            router.push("/counselor-dashboard");
          } else {
            await signOut(auth);
            throw new Error("Your account is pending verification.");
          }
        }
      } else if (params.role === "user" && params.email && params.password) {
        // New user email/password flow
        const result = await signInWithEmailAndPassword(
          auth,
          params.email,
          params.password
        );
        const user = result.user;
        
        // Check if this is a counselor trying to access user area
        const counselorDoc = await getDoc(doc(db, "counselors", user.uid));
        if (counselorDoc.exists()) {
          await signOut(auth);
          throw new Error("Counselors must sign in through the counselor portal.");
        }
        
        await storeUserData(user, false);
        router.push("/user-home");
      } else {
        throw new Error("Invalid sign-in parameters.");
      }
    } catch (error: any) {
      console.error("Sign-in error:", error);
      throw error; // Let the calling component handle the error
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await signOut(auth);
    } catch (error: any) {
      console.error("Logout error:", error);
      alert(
        `Logout failed: ${error.message || "An unexpected error occurred."}`
      );
    }
  };

  // Password reset
  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };
  // In your AuthContext implementation

  return (
     <AuthContext.Provider
      value={{
        user,
        isCounselor,
        loading,
        signIn,
        signUp,
        logout,
        resetPassword,
        auth,
        db
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
