import { formatDate } from "@/utils/formateDate";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { Link, useRouter } from "expo-router";

import React, { useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthContext } from "../contextApi/AuthContext";
import {
  collection,
  db,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from "../firebase";
import { Post } from "../types";
import AppHeader from "@/components/AppHeader";

// --- EditPostModal Component ---
type EditPostModalProps = {
  post: Post;
  onClose: () => void;
  onSave: (updated: { content: string; category: string }) => void;
};
function EditPostModal({ post, onClose, onSave }: EditPostModalProps) {
  const [content, setContent] = useState(post.content);
  const [category, setCategory] = useState(post.category);

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-center items-center bg-black/50 p-4">
        <View className="bg-white rounded-lg p-6 w-full max-w-md">
          <Text className="text-xl font-bold mb-4">Edit Request</Text>
          <Text className="text-sm font-medium mb-1">Category</Text>
          <TextInput
            className="border border-gray-300 p-3 rounded-lg mb-4"
            value={category}
            onChangeText={setCategory}
            placeholder="Category"
          />
          <Text className="text-sm font-medium mb-1">Details</Text>
          <TextInput
            className="border border-gray-300 p-3 rounded-lg mb-6 h-24"
            value={content}
            onChangeText={setContent}
            placeholder="Describe your request..."
            multiline
          />
          <View className="flex-row justify-end space-x-3">
            <TouchableOpacity className="px-4 py-2" onPress={onClose}>
              <Text className="text-gray-600">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="bg-blue-500 px-4 py-2 rounded-lg"
              onPress={() => onSave({ content, category })}
            >
              <Text className="text-white font-medium">Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// --- PostErrorBoundary Component ---
class PostErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <View className="p-4 bg-red-100 rounded-lg mb-4">
          <Text className="text-red-600">
            Something went wrong with this post.
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

// --- RenderPost Component (Memoized) ---
type RenderPostProps = {
  item: Post; // Find the first accepted post (if any)
  userId: string;
  setEditingPost: (post: Post) => void;
  activeAcceptedPostId?: string; // <-- Add this prop
};
const RenderPost = React.memo(
  ({ item, setEditingPost, activeAcceptedPostId, userId }: RenderPostProps) => {
    // Disable if there is an active accepted post and this is not it, and not completed
    const isDisabled =
      !!activeAcceptedPostId &&
      activeAcceptedPostId !== item.id &&
      item.status !== "completed";
    const handleDeletePost = async (postId: string) => {
      if (isDisabled) return;
      Alert.alert(
        "Delete Request",
        "Are you sure you want to delete this request?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                await deleteDoc(doc(db, "posts", postId));
                Alert.alert("Success", "Request deleted successfully");
              } catch (error) {
                Alert.alert("Error", "Failed to delete request");
              }
            },
          },
        ]
      );
    };

    const handleStatusUpdate = async (
      postId: string,
      newStatus: Post["status"]
    ) => {
      try {
        await updateDoc(doc(db, "posts", postId), {
          status: newStatus,
          updatedAt: new Date(),
        });
      } catch (error) {
        Alert.alert("Error", "Failed to update status");
      }
    };

    return (
      <View className="p-4 mb-4 bg-white rounded-lg shadow-sm">
        <View className="flex-row justify-between items-start mb-2">
          <Text className="text-lg font-semibold text-gray-800 capitalize">
            {item.category}
          </Text>
          <View className="flex-row items-center space-x-2">
            <View
              className={`px-2 py-1 rounded-full ${
                item.status === "pending"
                  ? "bg-yellow-100"
                  : item.status === "accepted"
                  ? "bg-green-100"
                  : item.status === "completed"
                  ? "bg-blue-100"
                  : "bg-gray-100"
              }`}
            >
              <Text
                className={`text-xs font-medium ${
                  item.status === "pending"
                    ? "text-yellow-800"
                    : item.status === "accepted"
                    ? "text-green-800"
                    : item.status === "completed"
                    ? "text-blue-800"
                    : "text-gray-800"
                }`}
              >
                {item.status.toUpperCase()}
              </Text>
            </View>
            {item.status === "pending" && (
              <>
                <TouchableOpacity
                  onPress={() => !isDisabled && setEditingPost(item)}
                  disabled={isDisabled}
                >
                  <Feather name="edit" size={18} color="#3b82f6" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDeletePost(item.id)}
                  disabled={isDisabled}
                >
                  <Feather name="trash-2" size={18} color="#ef4444" />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
        <Text className="text-gray-600 mb-3">{item.content}</Text>
        <View className="flex-row space-x-2">
          {item.status === "accepted" && (
            <>
              <Link
                href={{
                  pathname: "/chat/[postId]",
                  params: {
                    postId: item.id,
                    // counselorId: item.acceptedBy,
                    userId: userId, // Pass the user ID
                  },
                }}
                asChild
              >
                <TouchableOpacity className="bg-blue-500 py-2 px-4 rounded-md">
                  <Text className="text-white font-medium">View Chat</Text>
                </TouchableOpacity>
              </Link>
              <TouchableOpacity
                className="bg-green-500 py-2 px-4 rounded-md ml-3"
                disabled={isDisabled}
                onPress={() => handleStatusUpdate(item.id, "completed")}
              >
                <Text className="text-white font-medium">Mark Complete</Text>
              </TouchableOpacity>
            </>
          )}
          {item.status === "completed" && (
            <View className="flex-row items-center">
              <MaterialIcons name="verified" size={20} color="#10b981" />
              <Text className="text-green-600 ml-1">Completed</Text>
            </View>
          )}
        </View>
        {item.updatedAt && (
          <Text className="text-xs text-gray-400 mt-2">
            Last updated: {formatDate(item.updatedAt)}
          </Text>
        )}
      </View>
    );
  }
);

// --- Main UserHomeScreen ---
export default function UserHomeScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const { user, logout } = useContext(AuthContext);
  const router = useRouter();
  // console.log("Post", posts);
  // console.log("User", user)
  // Fetch posts with real-time listener
  useEffect(() => {
    if (!user?.uid) {
      setError("User not authenticated");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const q = query(
      collection(db, "posts"),
      where("userId", "==", user.uid),
      where("archived", "==", showArchived),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        console.log(
          "Docs:",
          querySnapshot.docs.map((d) => d.data())
        ); // Add this line
        const postsData = querySnapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            } as Post)
        );
        setPosts(postsData);
        setLoading(false);
        setRefreshing(false);
      },
      (err) => {
        if (err.code === "failed-precondition") {
          Alert.alert(
            "Configuration Needed",
            "This feature requires index setup. Please try again later."
          );
        } else {
          console.error("Error fetching posts:", err);
          setError("Failed to load posts. Please try again.");
          setLoading(false);
        }
      }
    );

    return () => unsubscribe();
  }, [user?.uid, showArchived]);

  // Refresh posts
  const handleRefresh = () => {
    setRefreshing(true);
    // Listener will handle updates
  };

  const handleEditPost = async (updated: {
    content: string;
    category: string;
  }) => {
    if (!editingPost) return;
    try {
      await updateDoc(doc(db, "posts", editingPost.id), {
        content: updated.content,
        category: updated.category,
        updatedAt: new Date(),
      });
      setEditingPost(null);
      Alert.alert("Success", "Request updated successfully");
    } catch (error) {
      Alert.alert("Error", "Failed to update request");
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      router.replace("/");
    } catch (error) {
      Alert.alert("Error", "Failed to sign out. Please try again.");
    }
  };

   

  // Find the first accepted post (if any)
  const activeAcceptedPost = posts.find((p) => p.status === "accepted");
  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-gray-100">
        <ActivityIndicator size="large" color="#3b82f6" />
      </SafeAreaView>
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
        title="User Home"
        onLogout={handleSignOut}
        showBack
        // profilePicUrl={profilePicUrl}
      />
     <View className="flex-1 p-4">
      {/* Archive Filter */}
      <View className="flex-row space-x-4 mb-4">
        <TouchableOpacity
          className={`px-4 py-2 rounded-full ${
            !showArchived ? "bg-blue-500" : "bg-gray-200"
          }`}
          onPress={() => setShowArchived(false)}
        >
          <Text className={!showArchived ? "text-white" : "text-gray-600"}>
            Active
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`px-4 py-2 rounded-full ${
            showArchived ? "bg-blue-500" : "bg-gray-200"
          }`}
          onPress={() => setShowArchived(true)}
        >
          <Text className={showArchived ? "text-white" : "text-gray-600"}>
            Archived
          </Text>
        </TouchableOpacity>
      </View>
      <Link href="/category" asChild>
        <TouchableOpacity className="bg-blue-500 py-3 px-6 rounded-lg mb-6 shadow-sm">
          <Text className="text-white font-semibold text-center">
            + New Request
          </Text>
        </TouchableOpacity>
      </Link>
      {/* Posts List */}
      <FlashList
        data={posts}
        renderItem={({ item }) => (
          <PostErrorBoundary>
            <RenderPost
              item={item}
              setEditingPost={setEditingPost}
              activeAcceptedPostId={activeAcceptedPost?.id}
              userId={user?.uid || ""} // Pass the user ID
            />
          </PostErrorBoundary>
        )}
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
            <Text className="text-gray-500 text-lg mb-4">
              {showArchived ? "No archived requests" : "No requests yet"}
            </Text>
            {!showArchived && (
              <Link href="/category" asChild>
                <TouchableOpacity className="bg-blue-500 py-2 px-6 rounded-lg">
                  <Text className="text-white font-medium">
                    Create Your First Request
                  </Text>
                </TouchableOpacity>
              </Link>
            )}
          </View>
        }
        // contentContainerStyle={
        //   posts.length === 0 ? { minHeight: "100%" } : { paddingBottom: 20 }
        // }
        estimatedItemSize={132}
        showsVerticalScrollIndicator={false}
      />
      {/* Edit Modal */}
      {editingPost && (
        <EditPostModal
          post={editingPost}
          onClose={() => setEditingPost(null)}
          onSave={handleEditPost}
        />
      )}
    </View>
    </SafeAreaView>
  );
}
