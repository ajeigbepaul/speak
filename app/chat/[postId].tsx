import { AuthContext } from "@/contextApi/AuthContext";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useContext, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  collection,
  db,
  deleteDoc,
  doc,
  getDoc,
  getDownloadURL,
  getStorage,
  onSnapshot,
  orderBy,
  query,
  ref,
  serverTimestamp,
  setDoc,
  updateDoc,
  uploadBytes,
  writeBatch,
} from "../../firebase";
import ChatHeader from "@/components/ChatHeader";
import { formatDate } from "@/utils/formateDate";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as Notifications from "expo-notifications";
import { deleteObject } from "firebase/storage";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Message {
  id: string;
  text: string;
  senderId: string;
  createdAt: Date;
  read: boolean;
  type?: "text" | "image" | "file";
  fileUrl?: string;
  fileName?: string;
}

export default function ChatScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState<any>(null);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { user } = useContext(AuthContext);
  const typingTimeoutRef = useRef<number | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const router = useRouter();
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [counselorProfilePicUrl, setProfilePicUrl] = useState<string | undefined>(undefined);
  const insets = useSafeAreaInsets();
  const shouldScrollToEnd = useRef(true);

  // Fetch post details and validate counselor access
  useEffect(() => {
    const fetchPost = async () => {
      try {
        const postRef = doc(db, "posts", postId);
        const postSnap = await getDoc(postRef);

        if (!postSnap.exists()) {
          Alert.alert("Error", "Request not found");
          router.back();
          return;
        }

        const postData = postSnap.data();
        setPost(postData);

        // Verify this user is the owner of the post or the counselor who accepted it
        if (
          postData.userId !== user?.uid &&
          postData.acceptedBy !== user?.uid
        ) {
          Alert.alert("Error", "You don't have permission to access this chat");
          router.back();
          return;
        }

        // Fetch the other user's details
        let otherUserId;
        if (user?.uid === postData.userId) {
          // If current user is the post owner, get counselor details
          otherUserId = postData.acceptedBy;
          const counselorRef = doc(db, "counselors", otherUserId);
          const counselorSnap = await getDoc(counselorRef);
          if (counselorSnap.exists()) {
            setOtherUser(counselorSnap.data());
          }
        } else {
          // If current user is the counselor, get user details
          otherUserId = postData.userId;
          const userRef = doc(db, "users", otherUserId);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            setOtherUser(userSnap.data());
          }
        }
      } catch (error) {
        console.error("Error fetching post:", error);
        Alert.alert("Error", "Failed to load chat");
        router.back();
      }
    };

    fetchPost();
  }, [postId]);

  // Configure notifications
  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }, []);

  // Real-time messages subscription
  useEffect(() => {
    if (!postId) return;

    const messagesRef = collection(db, "posts", postId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
      })) as Message[];

      // Detect new incoming message from other user
      if (
        messages.length > 0 &&
        messagesData.length > messages.length
      ) {
        const lastMsg = messagesData[messagesData.length - 1];
        if (lastMsg.senderId !== user?.uid) {
          Notifications.scheduleNotificationAsync({
            content: {
              title: otherUser?.displayName || "New Message",
              body: lastMsg.text || "Sent a file/image",
              data: { postId },
            },
            trigger: null,
          });
        }
      }

      setMessages(messagesData);
      setLoading(false);

      // Only scroll to end if shouldScrollToEnd is true (initial load or after sending)
      if (shouldScrollToEnd.current) {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
        shouldScrollToEnd.current = false;
      }
    });

    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId, user?.uid, otherUser?.displayName]);

  // Mark messages as read
  useEffect(() => {
    if (messages.length > 0 && user?.uid) {
      const unreadMessages = messages.filter(
        (msg) => !msg.read && msg.senderId !== user.uid
      );

      if (unreadMessages.length > 0) {
        const batch = writeBatch(db);
        unreadMessages.forEach((msg) => {
          const msgRef = doc(db, "posts", postId, "messages", msg.id);
          batch.update(msgRef, { read: true });
        });
        batch.commit();
      }
    }
  }, [messages]);

  // Handle Typing indicator
  const handleTyping = (text: string) => {
    setNewMessage(text);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    setIsTyping(true);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 1500);
  };

  const sendNotification = async (message: string) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `New message from ${user?.displayName || "Counselor"}`,
        body: message,
        data: { postId },
      },
      trigger: null,
    });
  };

  // Fetch participants (counselor and user) details and set their profile pictures
  useEffect(() => {
    const fetchParticipants = async () => {
      try {
        const postRef = doc(db, "posts", postId);
        const postSnap = await getDoc(postRef);

        if (!postSnap.exists()) {
          Alert.alert("Error", "Request not found");
          router.back();
          return;
        }

        const postData = postSnap.data();
        setPost(postData);

        // Determine if current user is the counselor or the client
        const isCounselor = user?.uid === postData.acceptedBy;

        // Fetch the other participant's details
        const otherUserId = isCounselor ? postData.userId : postData.acceptedBy;
        const collectionName = isCounselor ? "users" : "counselors";
        const otherUserRef = doc(db, collectionName, otherUserId);
        const otherUserSnap = await getDoc(otherUserRef);

        if (otherUserSnap.exists()) {
          setOtherUser({
            ...otherUserSnap.data(),
            id: otherUserSnap.id,
            isCounselor: !isCounselor,
          });
        }

        // Set profile pictures
        if (isCounselor) {
          setProfilePicUrl(user?.photoURL || undefined);
        } else {
          const counselorRef = doc(db, "counselors", postData.acceptedBy);
          const counselorSnap = await getDoc(counselorRef);
          if (counselorSnap.exists()) {
            setProfilePicUrl(counselorSnap.data()?.personalInfo?.profilePic);
          }
        }
      } catch (error) {
        console.error("Error fetching participants:", error);
        Alert.alert("Error", "Failed to load chat details");
      }
    };

    fetchParticipants();
  }, [postId, user?.uid]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user?.uid || !postId) return;

    try {
      const messagesRef = collection(db, "posts", postId, "messages");
      const newMessageRef = doc(messagesRef);

      await setDoc(newMessageRef, {
        text: newMessage,
        senderId: user.uid,
        createdAt: serverTimestamp(),
        read: false,
      });

      // Update last message timestamp in post
      await updateDoc(doc(db, "posts", postId), {
        lastMessageAt: serverTimestamp(),
      });
      await sendNotification(newMessage);
      setNewMessage("");
      // After sending, scroll to end
      shouldScrollToEnd.current = true;
    } catch (error) {
      console.error("Error sending message:", error);
      Alert.alert("Error", "Failed to send message");
    }
  };

  // Handle scroll events
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const isAtBottom =
      contentOffset.y + layoutMeasurement.height >= contentSize.height - 100;
    setIsNearBottom(isAtBottom);
    // If user scrolls up, don't auto-scroll to end anymore
    if (!isAtBottom) {
      shouldScrollToEnd.current = false;
    }
  };

  // Handle message deletion
  const handleDeleteMessage = async (item: Message) => {
    Alert.alert("Delete", "Do you want to delete this message?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            // Delete Firestore message
            await deleteDoc(doc(db, "posts", postId, "messages", item.id));
            // Optionally delete file/image from storage
            if (item.fileUrl) {
              const storage = getStorage();
              const fileRef = ref(storage, item.fileUrl);
              try {
                await deleteObject(fileRef);
              } catch (e) {
                // File might already be deleted or not found
              }
            }
          } catch (error) {
            Alert.alert("Error", "Failed to delete message");
          }
        },
      },
    ]);
  };

  const handleAttachFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });

      if (result.assets && result.assets.length > 0) {
        await uploadFile(result.assets[0]);
      }
    } catch (error) {
      console.error("File picker error:", error);
      Alert.alert("Error", "Failed to select file");
    }
  };

  const handleAttachImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Image picker error:", error);
      Alert.alert("Error", "Failed to select image");
    }
  };

  const uploadFile = async (file: any) => {
    if (!file || !file.name) return;

    setIsUploading(true);
    try {
      const storage = getStorage();
      const fileRef = ref(
        storage,
        `chatFiles/${postId}/${Date.now()}_${file.name}`
      );
      const response = await fetch(file.uri);
      const blob = await response.blob();
      await uploadBytes(fileRef, blob);
      const downloadUrl = await getDownloadURL(fileRef);

      const messagesRef = collection(db, "posts", postId, "messages");
      await setDoc(doc(messagesRef), {
        type: "file",
        fileName: file.name,
        fileUrl: downloadUrl,
        senderId: user?.uid,
        createdAt: serverTimestamp(),
        read: false,
      });

      await sendNotification(`Sent a file: ${file.name}`);
      shouldScrollToEnd.current = true;
    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert("Error", "Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  };

  const uploadImage = async (uri: string) => {
    setIsUploading(true);
    try {
      const storage = getStorage();
      const imageName = `chatImages/${postId}/${Date.now()}.jpg`;
      const imageRef = ref(storage, imageName);

      const response = await fetch(uri);
      const blob = await response.blob();
      await uploadBytes(imageRef, blob);

      const downloadUrl = await getDownloadURL(imageRef);

      const messagesRef = collection(db, "posts", postId, "messages");
      await setDoc(doc(messagesRef), {
        type: "image",
        fileUrl: downloadUrl,
        senderId: user?.uid,
        createdAt: serverTimestamp(),
        read: false,
      });

      await sendNotification("Sent an image");
      shouldScrollToEnd.current = true;
    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert("Error", "Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isCurrentUser = item.senderId === user?.uid;
    if (!item) return null;
    return (
      <View className={`mb-4 ${isCurrentUser ? "items-end" : "items-start"}`}>
        {item.type === "image" ? (
          <View
            className={`overflow-hidden rounded-lg ${
              isCurrentUser ? "bg-blue-100" : "bg-gray-200"
            }`}
          >
            <Image
              source={{ uri: item.fileUrl }}
              className="w-64 h-48"
              resizeMode="cover"
            />
            <Text
              className={`p-2 text-xs ${
                isCurrentUser ? "text-blue-800" : "text-gray-600"
              }`}
            >
              {formatDate(item.createdAt)}
              {item.read && isCurrentUser && (
                <MaterialIcons
                  name="done-all"
                  size={12}
                  color="#3b82f6"
                  style={{ marginLeft: 4 }}
                />
              )}
            </Text>
          </View>
        ) : item.type === "file" ? (
          <TouchableOpacity
            className={`p-3 rounded-lg flex-row items-center ${
              isCurrentUser
                ? "bg-blue-500 rounded-br-none"
                : "bg-gray-200 rounded-bl-none"
            }`}
            onPress={() => {
              // Open file
              if (item.fileUrl) {
                // You can use Linking.openURL(item.fileUrl) if you want
              }
            }}
            onLongPress={() => handleDeleteMessage(item)}
            activeOpacity={0.8}
          >
            <Feather
              name="file"
              size={20}
              color={isCurrentUser ? "white" : "#6b7280"}
            />
            <View className="ml-3 max-w-[80%]">
              <Text
                numberOfLines={1}
                className={isCurrentUser ? "text-white" : "text-gray-800"}
              >
                {item.fileName}
              </Text>
              <Text
                className={`text-xs mt-1 ${
                  isCurrentUser ? "text-blue-100" : "text-gray-500"
                }`}
              >
                {formatDate(item.createdAt)}
                {item.read && isCurrentUser && (
                  <MaterialIcons
                    name="done-all"
                    size={12}
                    color="#a5b4fc"
                    style={{ marginLeft: 4 }}
                  />
                )}
              </Text>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            className={`max-w-[80%] rounded-lg p-3 ${
              isCurrentUser
                ? "bg-blue-500 rounded-br-none"
                : "bg-gray-200 rounded-bl-none"
            }`}
            onLongPress={() => handleDeleteMessage(item)}
            activeOpacity={0.8}
          >
            <Text className={isCurrentUser ? "text-white" : "text-gray-800"}>
              {item.text}
            </Text>
            <View className="flex-row justify-end items-center mt-1">
              {item.createdAt ? (
                <Text
                  className={`text-xs ${
                    isCurrentUser ? "text-blue-100" : "text-gray-500"
                  }`}
                >
                  {formatDate(item.createdAt)}
                </Text>
              ) : (
                <ActivityIndicator
                  size={10}
                  color="#a5b4fc"
                  style={{ marginRight: 4 }}
                />
              )}
              {item.read && isCurrentUser && (
                <MaterialIcons
                  name="done-all"
                  size={12}
                  color="#a5b4fc"
                  style={{ marginLeft: 4 }}
                />
              )}
            </View>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading || !post) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <View className="pt-4 bg-white">
        <ChatHeader
          userPic={
            user?.uid === post?.userId
              ? user?.photoURL
              : otherUser?.personalInfo?.profilePic || undefined
          }
          counselorPic={
            user?.uid === post?.acceptedBy
              ? user?.photoURL
              : otherUser?.personalInfo?.profilePic || undefined
          }
          userName={
            otherUser?.displayName ||
            (user?.uid === post?.userId ? "You" : "Counselor")
          }
          category={post?.category || "Unknown"}
          status={post?.status || "pending"}
        />
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 bg-white"
        keyboardVerticalOffset={90}
      >
        {/* Messages area */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
          keyboardVerticalOffset={Platform.select({
            ios: 100,
            android: insets.bottom + 100,
          })}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{
              paddingTop: 16,
              paddingBottom: 80 + insets.bottom,
            }}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            className="px-4"
            ListEmptyComponent={
              <View className="flex-1 justify-center items-center mt-20">
                <Feather name="message-square" size={48} color="#e5e7eb" />
                <Text className="text-gray-400 mt-4">No messages yet</Text>
                <Text className="text-gray-300">Start the conversation</Text>
              </View>
            }
          />

          {/* Message Input */}
          <View className="p-4 border-t border-gray-200 bg-white">
            {isUploading && (
              <View className="bg-blue-50 p-3 rounded-lg mb-3 flex-row items-center">
                <ActivityIndicator size="small" color="#3b82f6" />
                <Text className="text-blue-800 ml-2">Uploading...</Text>
              </View>
            )}

            <View className="flex-row items-center">
              <View className="flex-row mr-2">
                <TouchableOpacity className="p-2" onPress={handleAttachImage}>
                  <Feather name="image" size={24} color="#6b7280" />
                </TouchableOpacity>
                <TouchableOpacity className="p-2" onPress={handleAttachFile}>
                  <Feather name="paperclip" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <TextInput
                className="flex-1 border border-gray-300 rounded-full py-3 px-4 mr-2 min-h-[50px]"
                placeholder="Type your message..."
                value={newMessage}
                onChangeText={handleTyping}
                onSubmitEditing={handleSendMessage}
                multiline
              />

              <TouchableOpacity
                className="bg-blue-500 rounded-full p-3"
                onPress={handleSendMessage}
                disabled={!newMessage.trim()}
              >
                <MaterialIcons
                  name={newMessage.trim() ? "send" : "mic"}
                  size={20}
                  color="white"
                />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </KeyboardAvoidingView>
    </View>
  );
}