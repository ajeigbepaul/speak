import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type ChatHeaderProps = {
  userPic?: string;
  counselorPic?: string;
  userName: string;
  category: string;
  status: string;
  onBack?: () => void;
  isTyping?: boolean;
};

export default function ChatHeader({
  userPic,
  counselorPic,
  userName,
  category,
  status,
  onBack,
  isTyping,
}: ChatHeaderProps) {
  const router = useRouter();
  //  console.log("ChatHeader", { userPic, counselorPic, userName, category, status, onBack, isTyping });
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack || (() => router.back())}>
        <MaterialIcons name="arrow-back" size={24} color="#3b82f6" />
      </TouchableOpacity>

      <View style={styles.avatars}>
        {userPic ? (
          <Image source={{ uri: userPic }} style={styles.avatar} />
        ) : (
          <MaterialIcons
            name="account-circle"
            size={28}
            color="#bbb"
            style={{ marginRight: 8 }}
          />
        )}
        {counselorPic ? (
          <Image
            source={{ uri: counselorPic }}
            style={[
              styles.avatar,
              { marginLeft: -10, borderWidth: 2, borderColor: "#fff" },
            ]}
          />
        ) : (
          <View
            style={[
              styles.avatar,
              {
                marginLeft: -10,
                backgroundColor: "#e5e7eb",
                borderWidth: 2,
                borderColor: "#fff",
              },
            ]}
          />
        )}
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.name} numberOfLines={1}>
          {userName}
        </Text>
        <Text style={styles.sub}>
          {isTyping ? "Typing..." : category} • {status}
        </Text>
        {/* <Text style={{ color: "#6b7280", fontSize: 13 }}>
          {isTyping ? "Typing..." : category}
        </Text> */}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    backgroundColor: "#fff",
  },
  avatars: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 12,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#eee",
  },
  name: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#222",
  },
  sub: {
    color: "#6b7280",
    fontSize: 13,
  },
});
