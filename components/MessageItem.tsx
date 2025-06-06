import { formatDate } from '@/utils/formateDate';
import { View, Text, Image } from 'react-native';
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
export default function MessageItem({ message, userId }:{message: Message, userId: string}) {
  const isCurrentUser = message.senderId === userId;

  return (
    <View className={`mb-3 ${isCurrentUser ? 'items-end' : 'items-start'}`}>
      <View
        className={`max-w-[80%] rounded-lg p-3 ${
          isCurrentUser
            ? 'bg-blue-500 rounded-br-none'
            : 'bg-gray-200 rounded-bl-none'
        }`}
      >
        <Text className={isCurrentUser ? 'text-white' : 'text-gray-800'}>
          {message.text}
        </Text>
        <Text
          className={`text-xs mt-1 ${
            isCurrentUser ? 'text-blue-100' : 'text-gray-500'
          }`}
        >
          {formatDate(message.createdAt)}
        </Text>
      </View>
    </View>
  );
}