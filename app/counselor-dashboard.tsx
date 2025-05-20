import AppHeader from "@/components/AppHeader";
import { Post } from "@/types";
import { MaterialIcons } from "@expo/vector-icons";

import { formatDate } from "@/utils/formateDate";
import { useNavigation, useRouter } from "expo-router";
import React, { useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthContext } from "../contextApi/AuthContext";
import {
  collection,
  db,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from "../firebase";
export default function CounselorDashboardScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const { user, logout } = useContext(AuthContext);
  const [profilePicUrl, setProfilePicUrl] = useState<string | undefined>(
    undefined
  );
  const router = useRouter();
  const navigation = useNavigation();

  const fetchPosts = async () => {
    try {
      if (!user?.uid) return;
      // 1. Check if there's an ongoing chat (accepted post by this counselor)
      const acceptedQuery = query(
        collection(db, "posts"),
        where("status", "==", "accepted"),
        where("acceptedBy", "==", user.uid)
      );
      const acceptedSnap = await getDocs(acceptedQuery);

      if (!acceptedSnap.empty) {
        // Counselor has an ongoing chat, show only that post
        const postsData = acceptedSnap.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            } as Post)
        );
        setPosts(postsData);
        setLoading(false);
        setRefreshing(false);
        return () => {}; // No unsubscribe needed for one-time fetch
      } else {
        // No ongoing chat, show all pending posts
        const pendingQuery = query(
          collection(db, "posts"),
          where("status", "==", "pending"),
          orderBy("createdAt", "desc")
        );
        const unsubscribe = onSnapshot(pendingQuery, (snapshot) => {
          const postsData = snapshot.docs.map(
            (doc) =>
              ({
                id: doc.id,
                ...doc.data(),
              } as Post)
          );
          setPosts(postsData);
          setLoading(false);
          setRefreshing(false);
        });
        return unsubscribe;
      }
    } catch (error) {
      console.error("Error fetching posts:", error);
      Alert.alert("Error", "Failed to load requests. Please try again.");
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch counselor profile
  useEffect(() => {
    const fetchCounselorProfile = async () => {
      if (!user?.uid) return;
      try {
        const docRef = doc(db, "counselors", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfilePicUrl(data?.personalInfo?.profilePic);
        }
      } catch (error) {
        console.error("Failed to fetch counselor profile:", error);
      }
    };
    fetchCounselorProfile();
  }, [user]);
  console.log("Counselor Profile Pic URL:", profilePicUrl);
  useEffect(() => {
    const fetchAndSubscribe = async () => {
      const unsubscribe = await fetchPosts();
      return unsubscribe;
    };

    const unsubscribePromise = fetchAndSubscribe();
    return () => {
      unsubscribePromise.then((unsubscribe) => {
        if (unsubscribe) unsubscribe();
      });
    };
  }, [user]);

  const handleAccept = async (postId: string) => {
    if (!user) return;

    try {
      Alert.alert(
        "Accept Request",
        "Are you sure you want to accept this request?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Accept",
            onPress: async () => {
              // await updateDoc(doc(db, "posts", postId), {
              //   status: "accepted",
              //   acceptedBy: user.uid,
              //   updatedAt: new Date(),
              // });
              // router.push(`/chat/${postId}` as any);
              // First check if user already has an active chat
              const activeChatQuery = query(
                collection(db, "posts"),
                where("acceptedBy", "==", user.uid),
                where("status", "==", "accepted")
              );
              const activeChatSnap = await getDocs(activeChatQuery);

              if (!activeChatSnap.empty) {
                Alert.alert(
                  "Active Chat Exists",
                  "You already have an active chat. Please complete it before accepting new requests."
                );
                return;
              }
              // Proceed to accept the request
              await updateDoc(doc(db, "posts", postId), {
                status: "accepted",
                acceptedBy: user.uid,
                updatedAt: new Date(),
              });
              router.push(`/chat/${postId}`);
            },
          },
        ]
      );
    } catch (error) {
      console.error("Accept error:", error);
      Alert.alert("Error", "Failed to accept request. Please try again.");
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPosts();
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/");
  };

  const renderPost = ({ item }: { item: Post }) => (
    <View className="p-4 mb-4 bg-white rounded-lg shadow-sm">
      <View className="flex-row justify-between items-start mb-2">
        <Text className="text-lg font-semibold text-gray-800 capitalize">
          {item.category}
        </Text>
        <View
          className={`px-2 py-1 rounded-full ${
            item.status === "accepted" ? "bg-green-100" : "bg-yellow-100"
          }`}
        >
          <Text
            className={`text-xs font-medium ${
              item.status === "accepted" ? "text-green-800" : "text-yellow-800"
            }`}
          >
            {item.status === "accepted" ? "ONGOING CHAT" : "PENDING"}
          </Text>
        </View>
      </View>

      <Text
        className="text-gray-600 mb-4"
        numberOfLines={2}
        ellipsizeMode="tail"
      >
        {item.content}
      </Text>

      <View className="flex-row justify-between items-center">
        <Text className="text-xs text-gray-400">
          {item.updatedAt && `Posted: ${formatDate(item.updatedAt)}`}
        </Text>
        {item.status === "accepted" ? (
          <TouchableOpacity
            className="bg-blue-500 py-2 px-4 rounded-md flex-row items-center"
            onPress={() => router.push(`/chat/${item.id}`)}
          >
            <MaterialIcons name="chat" size={16} color="white" />
            <Text className="text-white font-medium ml-2">Continue Chat</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            className="bg-green-500 py-2 px-4 rounded-md flex-row items-center"
            onPress={() => handleAccept(item.id)}
          >
            <MaterialIcons name="check-circle" size={16} color="white" />
            <Text className="text-white font-medium ml-2">Accept</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#d8e5f2]">
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#fff"
        translucent={false}
        animated={true}
      />
      <AppHeader
        title="Counselor Dashboard"
        onLogout={handleLogout}
        showBack
        profilePicUrl={profilePicUrl}
      />
      <View className="flex-1 p-4">
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-xl font-bold text-gray-800">
            Available Requests
          </Text>
        </View>

        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={["#3b82f6"]}
            />
          }
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center mt-10">
              <MaterialIcons name="inbox" size={48} color="#9ca3af" />
              <Text className="text-gray-500 text-lg mt-4">
                No pending requests
              </Text>
              <Text className="text-gray-400 text-center mt-2">
                When users create requests, they'll appear here
              </Text>
            </View>
          }
          contentContainerStyle={
            posts.length === 0 ? { flex: 1 } : { paddingBottom: 20 }
          }
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
}
