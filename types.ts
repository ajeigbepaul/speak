// types.ts
export interface Post {
    id: string;
    userId: string;
    category: string;
    content: string;
    status: 'pending' | 'accepted' | 'completed';
    acceptedBy?: string;
    createdAt?: Date;
    updatedAt?: Date;
  }