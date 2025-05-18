import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { AuthContext } from '../contextApi/AuthContext';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { collection, addDoc, serverTimestamp } from '../firebase';
import { MaterialIcons } from '@expo/vector-icons';

export default function PostScreen() {
  const { icon: iconParam } = useLocalSearchParams<{ category: string; icon?: string }>();
  const { category, } = useLocalSearchParams<{ category: string; icon?: string }>();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, db } = useContext(AuthContext);
  const router = useRouter();
  const handleIcon = (iconName: string) => {
    switch (iconName) {
      case 'security':
        return 'security';
      case 'favorite':
        return 'favorite';
      case 'warning':
        return 'warning';
      case 'mood-bad':
        return 'mood-bad';
      case 'sentiment-dissatisfied':
        return 'sentiment-dissatisfied';
      case 'family-restroom':
        return 'family-restroom';
      case 'healing':
        return 'healing';
      default:
        return null;
    }
  };
  const icon = handleIcon(iconParam as string);
  const iconName = icon ? icon : 'help';

  

 
  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert('Required', 'Please describe your concerns');
      return;
    }

    if (content.length < 20) {
      Alert.alert('Too Short', 'Please provide more details (at least 20 characters)');
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'posts'), {
        userId: user?.uid,
        userEmail: user?.email,
        category,
        content,
        archived: false,
        status: 'pending',
        acceptedBy: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        icon
      });

      Alert.alert(
        'Request Submitted',
        'Your request has been received. A counselor will respond soon.',
        [{ text: 'OK', onPress: () => router.replace('/user-home') }]
      );
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Error', 'Failed to submit request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView 
      className="flex-1 bg-gray-50 p-6"
      keyboardShouldPersistTaps="handled"
    >
      <View className="flex-row items-center mb-6">
        {icon && (
          <MaterialIcons 
            name={icon as any} 
            size={28} 
            color="#3b82f6" 
            className="mr-3" 
          />
        )}
        <Text className="text-2xl font-bold text-gray-800">
          {category}
        </Text>
      </View>

      <Text className="text-lg font-medium text-gray-700 mb-2">
        Describe your concern in detail:
      </Text>
      
      <TextInput
        className="bg-white p-4 rounded-lg text-lg min-h-[200px] mb-6"
        multiline
        placeholder="Be as detailed as you feel comfortable..."
        placeholderTextColor="#9ca3af"
        value={content}
        onChangeText={setContent}
        textAlignVertical="top"
      />

      <Text className="text-sm text-gray-500 mb-6">
        {content.length}/500 characters • Minimum 20 characters required
      </Text>

      <TouchableOpacity
        className={`py-4 rounded-lg ${loading ? 'bg-blue-400' : 'bg-blue-500'}`}
        onPress={handleSubmit}
        disabled={loading || content.length < 20}
      >
        <Text className="text-white font-bold text-center text-lg">
          {loading ? 'Submitting...' : 'Submit Request'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        className="py-3 mt-4"
        onPress={() => router.back()}
      >
        <Text className="text-blue-500 text-center">
          Back to Categories
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}