import React, { useState, useContext, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { AuthContext } from '../contextApi/AuthContext';
import { useRouter } from 'expo-router';

export default function UserSignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(''); // Add name field for signup
  
  const { 
    user, 
    loading: authLoading,
    signIn,
    signUp
  } = useContext(AuthContext);
  
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/user-home');
    }
  }, [user, authLoading, router]);

  const handleAuthentication = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    
    if (isSignUp && password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password);
        router.replace('/user-home'); // New users go to category selection
      } else {
        await signIn({ role: 'user', email, password }, router);
        // signIn will handle navigation to user-home
      }
    } catch (error: any) {
      console.error('Authentication error:', error);
      
      let errorMessage = error.message || 'Authentication failed';
      
      // Handle specific error cases
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email. Would you like to sign up?';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again.';
      } else if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered. Please sign in.';
        setIsSignUp(false);
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView 
      contentContainerStyle={{ flexGrow: 1 }} 
      className="bg-gray-100"
      keyboardShouldPersistTaps="handled"
    >
      <View className="flex-1 justify-center p-6">
        <Text className="text-2xl font-bold text-gray-800 mb-6 text-center">
          {isSignUp ? 'Create Account' : 'Sign In'}
        </Text>
        
        {isSignUp && (
          <TextInput
            className="bg-white p-4 rounded-lg mb-4"
            placeholder="Full Name"
            value={name}
            onChangeText={setName}
          />
        )}
        
        <TextInput
          className="bg-white p-4 rounded-lg mb-4"
          placeholder="Email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
        />
        
        <TextInput
          className="bg-white p-4 rounded-lg mb-4"
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        
        {isSignUp && (
          <TextInput
            className="bg-white p-4 rounded-lg mb-6"
            placeholder="Confirm Password"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
        )}
        
        <TouchableOpacity
          className={`p-4 rounded-lg items-center ${loading ? 'bg-gray-400' : 'bg-blue-500'}`}
          onPress={handleAuthentication}
          disabled={loading}
        >
          <Text className="text-white font-semibold">
            {loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          className="mt-4 self-center"
          onPress={() => setIsSignUp(!isSignUp)}
        >
          <Text className="text-blue-500">
            {isSignUp 
              ? 'Already have an account? Sign In' 
              : "Don't have an account? Sign Up"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}