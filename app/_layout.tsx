import { AuthProvider, useAuth } from "@/contextApi/AuthContext";
import { useColorScheme } from "@/hooks/useColorScheme";
import { MaterialIcons } from "@expo/vector-icons";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, Text, View } from "react-native";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../global.css";

// NavigationContent component that will be wrapped by AuthProvider
// This component can safely use the useAuth hook
function NavigationContent({ colorScheme }: { colorScheme: "light" | "dark" }) {
  const { loading, user, isCounselor } = useAuth();
  function CounselorDashboardHeader() {
    const { logout } = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
      await logout();
      router.replace("/counselor-signin");
    };

    return (
      <MaterialIcons
        name="logout"
        size={26}
        color="#ef4444"
        style={{ marginRight: 16 }}
        onPress={handleLogout}
      />
    );
  }

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
          name="counselor-signup"
          options={{ title: "Counselor Sign Up", headerShown: false }}
        />
        <Stack.Screen
          name="user-home"
          options={{ title: "Your Posts", headerShown: false }}
        />
        <Stack.Screen
          name="counselor-dashboard"
          options={{
            headerShown: false, // Hide the default header
          }}
        />
        <Stack.Screen
          name="chat/[postId]"
          options={{headerShown: false}}
        />
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
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContent colorScheme={colorScheme} />
      </AuthProvider>
     </SafeAreaProvider>
  );
}
