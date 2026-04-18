// src/types/index.ts

import { Timestamp } from 'firebase/firestore';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  status: 'online' | 'offline' | 'away';
  lastSeen: Timestamp;
  createdAt: Timestamp;
}

export interface Room {
  id: string;
  type: 'direct' | 'group';
  name?: string; // For group chats
  participants: string[]; // User UIDs
  createdBy: string;
  createdAt: Timestamp;
  lastMessage?: {
    text: string;
    senderId: string;
    timestamp: Timestamp;
  };
  pinnedMessages?: string[]; // Message IDs
  metadata?: {
    groupAvatar?: string;
    description?: string;
  };
}

export interface Message {
  id: string;
  roomId: string;
  senderId: string;
  text: string;
  timestamp: Timestamp;
  edited?: boolean;
  editedAt?: Timestamp;
  deleted?: boolean;
  deletedAt?: Timestamp;
  readBy: string[]; // User UIDs who have read
  type: 'text' | 'image' | 'video' | 'audio' | 'file';
  media?: {
    url: string;
    publicId: string;
    thumbnail?: string;
    duration?: number; // For audio/video
    size?: number;
    mimeType?: string;
  };
  replyTo?: {
    messageId: string;
    text: string;
    senderId: string;
  };
  reactions?: {
    [emoji: string]: string[]; // emoji -> array of user UIDs
  };
  linkPreview?: {
    url: string;
    title?: string;
    description?: string;
    image?: string;
  };
}

export interface TypingIndicator {
  roomId: string;
  userId: string;
  userName: string;
  timestamp: Timestamp;
}

export interface Call {
  id: string;
  roomId: string;
  callerId: string;
  receiverId: string;
  status: 'ringing' | 'active' | 'ended' | 'missed' | 'declined';
  startedAt: Timestamp;
  endedAt?: Timestamp;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  iceCandidates?: {
    caller: RTCIceCandidateInit[];
    receiver: RTCIceCandidateInit[];
  };
}

export interface VoiceCallState {
  isInCall: boolean;
  isMuted: boolean;
  callId: string | null;
  remotePeerId: string | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  callStatus: 'idle' | 'calling' | 'ringing' | 'connected' | 'ended';
}

export interface SearchResult {
  type: 'user' | 'message';
  id: string;
  data: User | (Message & { senderName: string; roomId: string });
  highlight?: string;
}

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  resource_type: string;
  format: string;
  width?: number;
  height?: number;
  duration?: number;
  bytes: number;
  thumbnail_url?: string;
}

export interface MessageDraft {
  roomId: string;
  text: string;
  replyTo?: Message;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'message' | 'call' | 'mention';
  title: string;
  body: string;
  data?: any;
  read: boolean;
  createdAt: Timestamp;
}
