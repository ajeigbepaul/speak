import { initializeApp } from 'firebase/app';
// @ts-ignore 
import { getAuth, initializeAuth, getReactNativePersistence , signInWithPhoneNumber, signInWithEmailAndPassword, Auth, User, ConfirmationResult, signOut,signInWithCredential,PhoneAuthProvider } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore, doc, getDoc,getDocs, setDoc, collection, addDoc, query, where, onSnapshot, orderBy, updateDoc, Firestore,deleteDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDJF33f6h3V7H1nJdIqv1NRykTFQDjp2_o",
  authDomain: "speak-af637.firebaseapp.com",
  projectId: "speak-af637",
  storageBucket: "speak-af637.firebasestorage.app",
  messagingSenderId: "750315747971",
  appId: "1:750315747971:web:7a70948a84f5b35c9579b6",
  measurementId: "G-PMVM8CXZS3"
};

const app = initializeApp(firebaseConfig);
// Use standard getAuth for Expo managed workflow
// const auth = getAuth(app);
// Initialize Auth with AsyncStorage persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});
const db = getFirestore(app);

// Set persistence to IndexedDB in Web, and to AsyncStorage in native with a manual implementation if needed
// Note: For complex auth persistence in Expo, you may need to implement custom listeners and AsyncStorage handling

export {
  app,
  auth,
  db,
  signInWithPhoneNumber,
  signInWithEmailAndPassword,
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
  signInWithCredential,
  PhoneAuthProvider,
  Firestore
};