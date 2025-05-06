import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput
} from "react-native";
import { AuthContext } from "../contextApi/AuthContext";
import { collection, query, updateDoc, doc, where, onSnapshot, orderBy, db, deleteDoc } from "../firebase";
import { Link, useRouter } from "expo-router";
import { Post } from "../types"; // Assuming you have a types file
import { Feather, MaterialIcons } from '@expo/vector-icons';
export default function UserHomeScreen() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [editingPost, setEditingPost] = useState<Post | null>(null);
    const [editContent, setEditContent] = useState<string>('');
    const [editCategory, setEditCategory] = useState<string>('');
  const { user, logout } = useContext(AuthContext);
  const router = useRouter();

  const fetchPosts = async () => {
    try {
      if (!user) return;

      const q = query(
        collection(db, "posts"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc") // Add timestamp to your posts
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
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
    } catch (error) {
      console.error("Error fetching posts:", error);
      Alert.alert("Error", "Failed to load posts. Please try again.");
      setLoading(false);
      setRefreshing(false);
    }
  };

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

  const handleDeletePost = async (postId: string) => {
    try {
      Alert.alert(
        'Delete Request',
        'Are you sure you want to delete this request?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Delete', 
            style: 'destructive',
            onPress: async () => {
              await deleteDoc(doc(db, 'posts', postId));
              Alert.alert('Success', 'Request deleted successfully');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Delete error:', error);
      Alert.alert('Error', 'Failed to delete request');
    }
  };

  const handleEditPost = async () => {
    if (!editingPost) return;
    
    try {
      await updateDoc(doc(db, 'posts', editingPost.id), {
        content: editContent,
        category: editCategory,
        updatedAt: new Date()
      });
      setEditingPost(null);
      Alert.alert('Success', 'Request updated successfully');
    } catch (error) {
      console.error('Update error:', error);
      Alert.alert('Error', 'Failed to update request');
    }
  };

  const handleStatusUpdate = async (postId: string, newStatus: Post['status']) => {
    try {
      await updateDoc(doc(db, 'posts', postId), {
        status: newStatus,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Status update error:', error);
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPosts();
  };

  const handleSignOut = async () => {
    try {
      await logout();
      router.replace("/");
    } catch (error) {
      console.error("Sign out error:", error);
      Alert.alert("Error", "Failed to sign out. Please try again.");
    }
  };

  const renderPost = ({ item }: { item: Post }) => (
    <View className="p-4 mb-4 bg-white rounded-lg shadow-sm">
      <View className="flex-row justify-between items-start mb-2">
        <Text className="text-lg font-semibold text-gray-800 capitalize">{item.category}</Text>
        <View className="flex-row items-center space-x-2">
          <View className={`px-2 py-1 rounded-full ${
            item.status === 'pending' ? 'bg-yellow-100' : 
            item.status === 'accepted' ? 'bg-green-100' : 
            item.status === 'completed' ? 'bg-blue-100' : 'bg-gray-100'
          }`}>
            <Text className={`text-xs font-medium ${
              item.status === 'pending' ? 'text-yellow-800' : 
              item.status === 'accepted' ? 'text-green-800' : 
              item.status === 'completed' ? 'text-blue-800' : 'text-gray-800'
            }`}>
              {item.status.toUpperCase()}
            </Text>
          </View>
          
          {item.status === 'pending' && (
            <TouchableOpacity onPress={() => setEditingPost(item)}>
              <Feather name="edit" size={18} color="#3b82f6" />
            </TouchableOpacity>
          )}
          
          {item.status === 'pending' && (
            <TouchableOpacity onPress={() => handleDeletePost(item.id)}>
              <Feather name="trash-2" size={18} color="#ef4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      <Text className="text-gray-600 mb-3">{item.content}</Text>
      
      <View className="flex-row space-x-2">
        {item.status === 'accepted' && (
          <>
            <Link href={{ 
              pathname: '/chat/[postId]', 
              params: { 
                postId: item.id,
                counselorId: item.acceptedBy 
              } 
            }} asChild>
              <TouchableOpacity className="bg-blue-500 py-2 px-4 rounded-md">
                <Text className="text-white font-medium">View Chat</Text>
              </TouchableOpacity>
            </Link>
            
            <TouchableOpacity 
              className="bg-green-500 py-2 px-4 rounded-md"
              onPress={() => handleStatusUpdate(item.id, 'completed')}
            >
              <Text className="text-white font-medium">Mark Complete</Text>
            </TouchableOpacity>
          </>
        )}
        
        {item.status === 'completed' && (
          <View className="flex-row items-center">
            <MaterialIcons name="verified" size={20} color="#10b981" />
            <Text className="text-green-600 ml-1">Completed</Text>
          </View>
        )}
      </View>
      
      {item.updatedAt && (
        <Text className="text-xs text-gray-400 mt-2">
          Last updated: {new Date(item.updatedAt).toLocaleString()}
        </Text>
      )}
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
    <View className="flex-1 bg-gray-50 p-4">
      {/* Edit Post Modal */}
      <Modal
        visible={!!editingPost}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditingPost(null)}
      >
        <View className="flex-1 justify-center items-center bg-black/50 p-4">
          <View className="bg-white rounded-lg p-6 w-full max-w-md">
            <Text className="text-xl font-bold mb-4">Edit Request</Text>
            
            <Text className="text-sm font-medium mb-1">Category</Text>
            <TextInput
              className="border border-gray-300 p-3 rounded-lg mb-4"
              value={editCategory}
              onChangeText={setEditCategory}
              placeholder="Category"
            />
            
            <Text className="text-sm font-medium mb-1">Details</Text>
            <TextInput
              className="border border-gray-300 p-3 rounded-lg mb-6 h-24"
              value={editContent}
              onChangeText={setEditContent}
              placeholder="Describe your request..."
              multiline
            />
            
            <View className="flex-row justify-end space-x-3">
              <TouchableOpacity 
                className="px-4 py-2"
                onPress={() => setEditingPost(null)}
              >
                <Text className="text-gray-600">Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                className="bg-blue-500 px-4 py-2 rounded-lg"
                onPress={handleEditPost}
              >
                <Text className="text-white font-medium">Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View className="flex-row justify-between items-center mb-6">
        <Text className="text-2xl font-bold text-gray-800">Your Requests</Text>
        <TouchableOpacity onPress={handleSignOut}>
          <Text className="text-red-500 font-medium">Sign Out</Text>
        </TouchableOpacity>
      </View>

      <Link href="/category" asChild>
        <TouchableOpacity className="bg-blue-500 py-3 px-6 rounded-lg mb-6 shadow-sm">
          <Text className="text-white font-semibold text-center">+ New Request</Text>
        </TouchableOpacity>
      </Link>

      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#3b82f6']}
          />
        }
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center mt-10">
            <Text className="text-gray-500 text-lg mb-4">No requests yet</Text>
            <Link href="/category" asChild>
              <TouchableOpacity className="bg-blue-500 py-2 px-6 rounded-lg">
                <Text className="text-white font-medium">Create Your First Request</Text>
              </TouchableOpacity>
            </Link>
          </View>
        }
        contentContainerStyle={posts.length === 0 ? { flex: 1 } : { paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
