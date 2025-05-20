import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function AppHeader({
  title,
  onLogout,
  showBack,
  profilePicUrl,
}: {
  title: string;
  onLogout?: () => void;
  showBack?: boolean;
  profilePicUrl?: string;
}) {
  const router = useRouter();

  return (
    <View style={[styles.header]}>
      {showBack ? (
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={20} color="#222" />
        </TouchableOpacity>
      ) : (
        <View style={{ width: 28 }} /> // Placeholder for alignment
      )}
      <Text style={styles.title}>{title}</Text>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {profilePicUrl ? (
          <Image
            source={{ uri: profilePicUrl }}
            style={{
              width: 24,
              height: 24,
              borderRadius: 16,
              marginRight: 8,
              backgroundColor: "#eee",
            }}
          />
        ) : (
          <MaterialIcons
            name="account-circle"
            size={28}
            color="#bbb"
            style={{ marginRight: 8 }}
          />
        )}
        {onLogout ? (
          <TouchableOpacity onPress={onLogout}>
            <MaterialIcons name="logout" size={20} color="#ef4444" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 28 }} /> // Placeholder for alignment
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    width: "100%",
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 16,
    paddingHorizontal: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#222",
  },
});
