import React, { useState, useEffect, useContext } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { AuthContext } from "../contextApi/AuthContext";
import { collection, query, updateDoc, doc, where, onSnapshot, orderBy, db, deleteDoc } from "../firebase";
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Post } from '@/types';
export default function CounselorDashboardScreen() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const { user, logout } = useContext(AuthContext);
    const router = useRouter();
  
    const fetchPosts = async () => {
      try {
        const q = query(
          collection(db, 'posts'),
          where('status', '==', 'pending'),
          orderBy('createdAt', 'desc')
        );
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const postsData = snapshot.docs.map((doc) => ({ 
            id: doc.id, 
            ...doc.data() 
          } as Post));
          setPosts(postsData);
          setLoading(false);
          setRefreshing(false);
        });
        
        return unsubscribe;
      } catch (error) {
        console.error('Error fetching posts:', error);
        Alert.alert('Error', 'Failed to load requests. Please try again.');
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
  
    const handleAccept = async (postId: string) => {
      if (!user) return;
      
      try {
        Alert.alert(
          'Accept Request',
          'Are you sure you want to accept this request?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Accept', 
              onPress: async () => {
                await updateDoc(doc(db, 'posts', postId), {
                  status: 'accepted',
                  acceptedBy: user.uid,
                  updatedAt: new Date()
                });
                router.push(`/chat/${postId}` as any);
              }
            }
          ]
        );
      } catch (error) {
        console.error('Accept error:', error);
        Alert.alert('Error', 'Failed to accept request. Please try again.');
      }
    };
  
    const handleSignOut = async () => {
      try {
        await logout();
        router.replace('/');
      } catch (error) {
        console.error('Sign out error:', error);
        Alert.alert('Error', 'Failed to sign out. Please try again.');
      }
    };
  
    const handleRefresh = () => {
      setRefreshing(true);
      fetchPosts();
    };
  
    const renderPost = ({ item }: { item: Post }) => (
      <View className="p-4 mb-4 bg-white rounded-lg shadow-sm">
        <View className="flex-row justify-between items-start mb-2">
          <Text className="text-lg font-semibold text-gray-800 capitalize">{item.category}</Text>
          <View className="px-2 py-1 rounded-full bg-yellow-100">
            <Text className="text-xs font-medium text-yellow-800">PENDING</Text>
          </View>
        </View>
        
        <Text className="text-gray-600 mb-4">{item.content}</Text>
        
        <View className="flex-row justify-between items-center">
          <Text className="text-xs text-gray-400">
            {item.createdAt && `Posted: ${new Date(item.createdAt).toLocaleString()}`}
          </Text>
          
          <TouchableOpacity
            className="bg-green-500 py-2 px-4 rounded-md flex-row items-center"
            onPress={() => handleAccept(item.id)}
          >
            <MaterialIcons name="check-circle" size={16} color="white" />
            <Text className="text-white font-medium ml-2">Accept</Text>
          </TouchableOpacity>
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
      <View className="flex-1 bg-gray-50 p-4">
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-2xl font-bold text-gray-800">Available Requests</Text>
          <TouchableOpacity onPress={handleSignOut}>
            <Text className="text-red-500 font-medium">Sign Out</Text>
          </TouchableOpacity>
        </View>
  
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
              <MaterialIcons name="inbox" size={48} color="#9ca3af" />
              <Text className="text-gray-500 text-lg mt-4">No pending requests</Text>
              <Text className="text-gray-400 text-center mt-2">
                When users create requests, they'll appear here
              </Text>
            </View>
          }
          contentContainerStyle={posts.length === 0 ? { flex: 1 } : { paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        />
      </View>
    );
  }