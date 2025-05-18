import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { AuthContext } from '../contextApi/AuthContext';
import { Link } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

type MaterialIconName = keyof typeof MaterialIcons.glyphMap;

const categories: { name: string; icon: MaterialIconName }[] = [
  { name: 'Sexual Abuse', icon: 'security' },
  { name: 'Relationship', icon: 'favorite' },
  { name: 'Violence', icon: 'warning' },
  { name: 'Depression', icon: 'mood-bad' },
  // 'nervous' is not a valid MaterialIcon, replace with a valid one, e.g. 'sentiment-dissatisfied'
  { name: 'Anxiety', icon: 'sentiment-dissatisfied' },
  { name: 'Family Issues', icon: 'family-restroom' },
  { name: 'Trauma', icon: 'healing' },
  { name: 'Others', icon: 'help' }
];

export default function CategoryScreen() {
  const { isCounselor } = useContext(AuthContext);

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="bg-gray-50 p-4">
      <View className="mb-8">
        <Text className="text-3xl font-bold text-gray-800 mb-2">What's on your mind?</Text>
        <Text className="text-gray-600">Select a category that best describes your concern</Text>
      </View>

      <View className="flex-row flex-wrap justify-between">
        {categories.map((category) => (
          <Link 
            key={category.name} 
            href={{ 
              pathname: '/post', 
              params: { 
                category: category.name,
                icon: category.icon 
              } 
            }} 
            asChild
          >
            <TouchableOpacity className="w-[48%] bg-white p-6 rounded-xl shadow-sm mb-4 items-center">
              <MaterialIcons 
                name={category?.icon} 
                size={32} 
                color="#3b82f6" 
                className="mb-3" 
              />
              <Text className="text-lg font-medium text-gray-800 text-center">
                {category.name}
              </Text>
            </TouchableOpacity>
          </Link>
        ))}
      </View>

      {isCounselor && (
        <Link href="/counselor-dashboard" asChild>
          <TouchableOpacity className="mt-8 bg-green-500 py-4 px-6 rounded-lg">
            <Text className="text-white font-semibold text-center">Go to Counselor Dashboard</Text>
          </TouchableOpacity>
        </Link>
      )}
    </ScrollView>
  );
}