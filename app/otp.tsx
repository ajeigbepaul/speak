// app/otp.tsx
import React, { useState, useContext,useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { AuthContext } from '../contextApi/AuthContext';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { doc, setDoc, getDoc, updateDoc, PhoneAuthProvider, signInWithCredential } from '../firebase';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
export default function OTPScreen() {
    const [otp, setOtp] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [resending, setResending] = useState<boolean>(false);
    const { phoneNumber, verificationId } = useLocalSearchParams<{ 
      phoneNumber: string;
      verificationId: string;
    }>();
    const { auth, db, isCounselor, verifyPhoneNumber } = useContext(AuthContext);
    const router = useRouter();
    const recaptchaVerifier = useRef<FirebaseRecaptchaVerifierModal | null>(null);

//   const handleVerify = async () => {
//     try {
//       const recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
//       const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
//       const result = await confirmationResult.confirm(otp);
//       const newUser = result.user;

//       const userRef = doc(db, 'users', newUser.uid);
//       const userDoc = await getDoc(userRef);
//       if (!userDoc.exists()) {
//         await setDoc(userRef, {
//           mobileNumber: newUser.phoneNumber,
//           createdAt: new Date(),
//         });
//       }

//       router.replace(isCounselor ? '/counselor-dashboard' : '/category' as any);
//     } catch (error) {
//       console.error(error);
//       alert('Invalid OTP or error creating user. Please try again.');
//     }
//   };
const handleVerify = async () => {
    if (!otp || otp.length < 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
    const credential = PhoneAuthProvider.credential(
        verificationId as string,
        otp
      );
      
    const result = await signInWithCredential(auth, credential);
      if (!result.user) {
        throw new Error('User not found after OTP verification');
      }
      // User successfully signed in
      const newUser = result.user;

      // Create or update user document
      const userRef = doc(db, 'users', newUser.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        await setDoc(userRef, {
          phoneNumber: newUser.phoneNumber,
          createdAt: new Date(),
          lastLogin: new Date(),
        });
      } else {
        await updateDoc(userRef, {
          lastLogin: new Date()
        });
      }

      router.replace(isCounselor ? '/counselor-dashboard' : '/category' as any);
    } catch (error) {
      console.error('OTP verification error:', error);
      Alert.alert('Error', 'Invalid OTP or verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <View className="flex-1 bg-gray-100 justify-center items-center p-4">
      <Text className="text-2xl font-bold text-gray-800 mb-6">Enter OTP</Text>
      <TextInput
        className="border border-gray-300 p-3 rounded w-3/4 mb-4"
        placeholder="123456"
        keyboardType="numeric"
        value={otp}
        onChangeText={setOtp}
      />
      <TouchableOpacity
        className="bg-blue-500 py-3 px-6 rounded"
        onPress={handleVerify}
      >
        <Text className="text-white font-semibold">Verify OTP</Text>
      </TouchableOpacity>
      <View id="recaptcha-container" />
    </View>
  );
}
