import { useRouter } from "expo-router";
import React, { useContext, useState } from "react";
import { Alert, Text, TextInput, TouchableOpacity, View } from "react-native";
import { AuthContext } from "../contextApi/AuthContext";

export default function CounselorSignInScreen() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const { signIn } = useContext(AuthContext);
  const router = useRouter();

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password");
      return;
    }

    if (!email.includes("@")) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      await signIn(
        {
          email,
          password,
          role: "counselor",
        },
        router
      );
    } catch (error) {
      console.error("Sign in error:", error);
      Alert.alert("Error", "Failed to sign in. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-100 justify-center items-center p-4">
      <Text className="text-2xl font-bold text-gray-800 mb-6">
        Counselor Sign In
      </Text>

      <TextInput
        className="border border-gray-300 p-3 rounded w-full max-w-xs mb-4 bg-white"
        placeholder="Email address"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        className="border border-gray-300 p-3 rounded w-full max-w-xs mb-6 bg-white"
        placeholder="Password"
        secureTextEntry
        autoComplete="password"
        textContentType="password"
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity
        className="bg-green-500 py-3 px-6 rounded w-full max-w-xs items-center"
        onPress={handleSignIn}
        disabled={loading}
      >
        <Text className="text-white font-semibold">
          {loading ? "Signing In..." : "Sign In"}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        className="mt-4 self-center"
        onPress={() => router.push({ pathname: "/counselor-signup" })}
      >
        <View className="flex-row items-center">
          <Text className="text-blue-500">
            Already have an account?
            {""}
            <Text
              className="text-blue-500"
              onPress={() => router.push("/counselor-signup")}
            >
              Sign Up
            </Text>
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}
