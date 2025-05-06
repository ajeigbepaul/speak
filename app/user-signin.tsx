// app/user-signin.tsx
import React, { useState, useContext, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { AuthContext } from '../contextApi/AuthContext';
import { useRouter } from 'expo-router';
import { FirebaseRecaptchaBanner } from 'expo-firebase-recaptcha';

export default function UserSignInScreen() {
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const [userExists, setUserExists] = useState<boolean>(false);
  const { verifyPhoneNumber, checkPhoneNumber, user, recaptchaVerifier } = useContext(AuthContext);
  const router = useRouter();
  useEffect(() => {
    if (user && user.phoneNumber === phoneNumber) {
      setUserExists(true);
      router.replace('/user-home');
    }
  }, [user, phoneNumber, router]);
  const handleSignIn = async () => {
    if (!phoneNumber) {
      Alert.alert('Error', 'Please enter a valid phone number.');
      return;
    }

    // Basic phone number validation
    if (!phoneNumber.startsWith('+')) {
      Alert.alert('Error', 'Please include country code (e.g., +1 for US)');
      return;
    }

    setLoading(true);
    try {
      const confirmation = await verifyPhoneNumber(phoneNumber);
      router.push({ 
        pathname: '/otp', 
        params: { 
          phoneNumber,
          verificationId: confirmation.verificationId 
        } 
      });
    } catch (error: any) {
      console.error('Sign in error:', error);
      Alert.alert('Error', error.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneChange = async (text: string) => {
    setPhoneNumber(text);
    if (text.length >= 10) {
      setLoading(true);
      try {
        const exists = await checkPhoneNumber(text);
        setUserExists(exists);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    } else {
      setUserExists(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-100 justify-center items-center p-4">
      <Text className="text-2xl font-bold text-gray-800 mb-6">User Sign In</Text>
      
      <TextInput
        className="border border-gray-300 p-3 rounded w-full max-w-xs mb-4 bg-white"
        placeholder="+1 234567890"
        keyboardType="phone-pad"
        value={phoneNumber}
        onChangeText={handlePhoneChange}
        autoComplete="tel"
        textContentType="telephoneNumber"
      />
      
      <TouchableOpacity
        className={`py-3 px-6 rounded w-full max-w-xs items-center ${loading ? 'bg-gray-400' : 'bg-blue-500'}`}
        onPress={handleSignIn}
        
        disabled={loading}
      >
        <Text className="text-white font-semibold">
        {loading ? 'Checking...' : userExists ? 'Continue' : 'Send OTP'}
        </Text>
      </TouchableOpacity>

      {/* Optional: Display reCAPTCHA banner */}
      <FirebaseRecaptchaBanner 
        style={{ marginTop: 20, marginLeft:20,  }}
      />
    </View>
  );
}