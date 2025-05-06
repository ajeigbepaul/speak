import { View, Text, ImageBackground, TouchableOpacity } from 'react-native'
import React from 'react'
import { Link } from 'expo-router'

const LandingScreen = () => {
  return (
    <ImageBackground
      source={require('../assets/images/talk2.jpg')}  
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
        resizeMode="cover"
        blurRadius={1}
      >
        {/* <View className="absolute inset-0 bg-black opacity-50" /> */}
        <View className="bg-black/50 p-8 rounded-lg">
        <Text className="text-3xl text-white font-bold text-center mb-6">Welcome to SAFEPLACE</Text>
        <Text className="text-lg text-white text-center mb-8">Please who are you</Text>
        <Link href="/user-signin" asChild>
          <TouchableOpacity className="bg-blue-500 py-4 px-8 rounded-lg mb-4">
            <Text className="text-white text-lg font-semibold text-center">User</Text>
          </TouchableOpacity>
        </Link>
        <Link href="/counselor-signin" asChild>
          <TouchableOpacity className="bg-green-500 py-4 px-8 rounded-lg">
            <Text className="text-white text-lg font-semibold text-center">Counselor</Text>
          </TouchableOpacity>
        </Link>
      </View>
      </ImageBackground>
   
  )
}

export default LandingScreen