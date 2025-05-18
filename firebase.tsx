import { initializeApp } from 'firebase/app';
// @ts-ignore 
import { initializeAuth, getReactNativePersistence, sendPasswordResetEmail, signInWithPhoneNumber, signInWithEmailAndPassword, createUserWithEmailAndPassword, Auth, User, ConfirmationResult, signOut,signInWithCredential,PhoneAuthProvider } from 'firebase/auth';
import { getStorage,ref,uploadBytes,getDownloadURL } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore, doc, getDoc,getDocs, limit, startAfter, setDoc, collection, addDoc, query, where, onSnapshot, orderBy, updateDoc, Firestore,deleteDoc,DocumentSnapshot, serverTimestamp } from 'firebase/firestore';
import Constants from 'expo-constants';
// Define types for environment variables

// Throw error if any config value is missing
const requiredEnvVars = [
  'firebaseApiKey',
  'firebaseAuthDomain',
  'firebaseProjectId',
  'firebaseStorageBucket',
  'firebaseMessagingSenderId',
  'firebaseAppId'
];

requiredEnvVars.forEach(variable => {
  if (!Constants.expoConfig?.extra?.[variable]) {
    throw new Error(`Missing Firebase config: ${variable}`);
  }
});

const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.firebaseApiKey,
  authDomain: Constants.expoConfig?.extra?.firebaseAuthDomain,
  projectId: Constants.expoConfig?.extra?.firebaseProjectId,
  storageBucket: Constants.expoConfig?.extra?.firebaseStorageBucket,
  messagingSenderId: Constants.expoConfig?.extra?.firebaseMessagingSenderId,
  appId: Constants.expoConfig?.extra?.firebaseAppId,
  measurementId: Constants.expoConfig?.extra?.firebaseMeasurementId,
};

const app = initializeApp(firebaseConfig);
console.log("Firebase initialized successfully");
// Use standard getAuth for Expo managed workflow
// const auth = getAuth(app);
// Initialize Auth with AsyncStorage persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});
 console.log("Auth service initialized");
const db = getFirestore(app);

// Set persistence to IndexedDB in Web, and to AsyncStorage in native with a manual implementation if needed
// Note: For complex auth persistence in Expo, you may need to implement custom listeners and AsyncStorage handling

export {
  app,
  auth,
  db,
  signInWithPhoneNumber,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  Auth,
  User,
  signOut,
  ConfirmationResult,
  AsyncStorage,
  doc,
  getDoc,
  getDocs,
  setDoc,
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  orderBy,
  updateDoc,
  deleteDoc,
  limit,
  startAfter,
  signInWithCredential,
  serverTimestamp,
  PhoneAuthProvider,
  Firestore,
  DocumentSnapshot,
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
};