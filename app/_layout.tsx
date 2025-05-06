import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Redirect, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import "../global.css";
import { useColorScheme } from "@/hooks/useColorScheme";
import { AuthProvider, useAuth } from "@/contextApi/AuthContext";
import { Text, View, ActivityIndicator } from "react-native";

// NavigationContent component that will be wrapped by AuthProvider
// This component can safely use the useAuth hook
function NavigationContent({ colorScheme }: { colorScheme: "light" | "dark" }) {
  const { loading,user,isCounselor } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={{ marginTop: 10 }}>Loading authentication...</Text>
      </View>
    );
  }

  // if (user) {
  //   return <Redirect href={isCounselor ? '/counselor-dashboard' : '/user-home'} />;
  // }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        {/* <Stack.Screen name="(tabs)" options={{ headerShown: false }} /> */}
        {/* <Stack.Screen name="+not-found" /> */}
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen
          name="user-signin"
          options={{ title: "User Sign In", headerShown: false }}
        />
        <Stack.Screen
          name="counselor-signin"
          options={{ title: "Counselor Sign In", headerShown: false }}
        />
        <Stack.Screen
          name="otp"
          options={{ title: "Enter OTP", headerShown: false }}
        />
        <Stack.Screen name="user-home" options={{ title: 'Your Posts', headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme() ?? "light";
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <AuthProvider>
      <NavigationContent colorScheme={colorScheme} />
    </AuthProvider>
  );
}
