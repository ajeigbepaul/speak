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
  signInWithPhoneNumber,
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
} from "../firebase";
import { Router } from "expo-router";
import {
  FirebaseRecaptchaVerifierModal,
  FirebaseRecaptchaBanner,
} from "expo-firebase-recaptcha";
import Constants from "expo-constants";
// Keys for AsyncStorage
const USER_AUTH_KEY = "@user_auth";
const USER_ROLE_KEY = "@user_role";

interface SignInParams {
  role: "user" | "counselor";
  phoneNumber?: string;
  email?: string;
  password?: string;
}

interface AuthContextType {
  user: User | null;
  isCounselor: boolean;
  loading: boolean;
  signIn: (params: SignInParams, router: Router) => Promise<void>;
  verifyPhoneNumber: (phoneNumber: string) => Promise<any>;
  checkPhoneNumber: (phoneNumber: string) => Promise<boolean>;
  logout: () => Promise<void>;
  auth: Auth;
  db: Firestore;
  recaptchaVerifier: React.RefObject<FirebaseRecaptchaVerifierModal | null>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  isCounselor: false,
  loading: true,
  signIn: async () => {},
  verifyPhoneNumber: async () => {},
  checkPhoneNumber: async () => false,
  logout: async () => {},
  auth,
  db,
  recaptchaVerifier: useRef<FirebaseRecaptchaVerifierModal | null>(null),
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isCounselor, setIsCounselor] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const recaptchaVerifier = useRef<FirebaseRecaptchaVerifierModal>(null);

  // Store user data in AsyncStorage
  const storeUserData = async (userData: User | null, isCounselor: boolean) => {
    try {
      if (userData) {
        const userToStore = {
          uid: userData.uid,
          email: userData.email,
          displayName: userData.displayName,
          photoURL: userData.photoURL,
          phoneNumber: userData.phoneNumber,
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

  const signIn = async (params: SignInParams, router: Router) => {
    try {
      if (params.role === "user" && params.phoneNumber) {
        // Phone number sign-in flow
        const confirmation = await verifyPhoneNumber(params.phoneNumber);
        router.push({
          pathname: "/otp",
          params: {
            phoneNumber: params.phoneNumber,
            verificationId: confirmation.verificationId,
          },
        });
      } else if (
        params.role === "counselor" &&
        params.email &&
        params.password
      ) {
        // Existing email/password flow
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
      } else {
        throw new Error("Invalid sign-in parameters.");
      }
    } catch (error: any) {
      console.error("Sign-in error:", error);
      alert(
        `Sign-in failed: ${
          error.message || "Please check your credentials and try again."
        }`
      );
    }
  };

  const verifyPhoneNumber = async (phoneNumber: string) => {
    try {
      if (!recaptchaVerifier.current) {
        throw new Error("Recaptcha verifier not ready");
      }

      const phoneProviderOptions = {
        phoneNumber,
      };

      // This will trigger the recaptcha modal automatically
      const confirmation = await signInWithPhoneNumber(
        auth,
        phoneNumber,
        recaptchaVerifier.current
      );

      return confirmation;
    } catch (error: any) {
      console.error("Phone verification error:", error);
      throw new Error(
        `Phone verification failed: ${error.message || "Please try again."}`
      );
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

  const checkPhoneNumber = async (phoneNumber: string): Promise<boolean> => {
    try {
      const usersQuery = query(
        collection(db, "users"),
        where("phoneNumber", "==", phoneNumber)
      );
      const querySnapshot = await getDocs(usersQuery);
      return !querySnapshot.empty;
    } catch (error) {
      console.error("Error checking phone number:", error);
      return false;
    }
  };
  return (
    <AuthContext.Provider
      value={{
        user,
        isCounselor,
        loading,
        signIn,
        verifyPhoneNumber,
        logout,
        auth,
        db,
        recaptchaVerifier,
        checkPhoneNumber,
      }}
    >
      {/* Add the reCAPTCHA modal at the root of your provider */}
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaVerifier}
        firebaseConfig={{
          apiKey: Constants.expoConfig?.extra?.firebaseApiKey,
          authDomain: Constants.expoConfig?.extra?.firebaseAuthDomain,
          projectId: Constants.expoConfig?.extra?.firebaseProjectId,
          storageBucket: Constants.expoConfig?.extra?.firebaseStorageBucket,
          messagingSenderId:
            Constants.expoConfig?.extra?.firebaseMessagingSenderId,
          appId: Constants.expoConfig?.extra?.firebaseAppId,
          measurementId: Constants.expoConfig?.extra?.firebaseMeasurementId,
        }}
        title="Prove you're human"
        cancelLabel="Close"
      />

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
