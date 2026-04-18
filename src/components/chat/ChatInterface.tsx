// src/components/chat/ChatInterface.tsx

"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  arrayUnion,
  Timestamp,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Message, Room, User } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import TypingIndicator from "./TypingIndicator";
import { Phone, Pin, Search, ArrowLeft } from "lucide-react";
import { useVoiceCall } from "@/contexts/VoiceCallContext";

interface ChatInterfaceProps {
  room: Room;
  onBack?: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ room, onBack }) => {
  const { user } = useAuth();
  const { initiateCall } = useVoiceCall();

  const [messages, setMessages] = useState<Message[]>([]);
  const [participants, setParticipants] = useState<User[]>([]);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const lastTypingUpdateRef = useRef<number>(0);

  /**
   * Scroll to bottom
   */
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  /**
   * Load messages
   */
  useEffect(() => {
    const messagesQuery = query(
      collection(db, "messages"),
      where("roomId", "==", room.id),
      // Remove orderBy - it requires an index
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[];

      // Sort manually by timestamp
      messagesData.sort((a, b) => {
        const aTime = a.timestamp?.toMillis?.() || 0;
        const bTime = b.timestamp?.toMillis?.() || 0;
        return aTime - bTime;
      });

      setMessages(messagesData);
      scrollToBottom();

      // Mark messages as read
      if (user) {
        snapshot.docs.forEach(async (docSnapshot) => {
          const message = docSnapshot.data() as Message;
          if (
            message.senderId !== user.uid &&
            !message.readBy.includes(user.uid)
          ) {
            await updateDoc(doc(db, "messages", docSnapshot.id), {
              readBy: arrayUnion(user.uid),
            });
          }
        });
      }
    });

    return () => unsubscribe();
  }, [room.id, user]);

  /**
   * Load participants
   */
  useEffect(() => {
    const loadParticipants = async () => {
      const participantsData: User[] = [];
      for (const participantId of room.participants) {
        const userDoc = await getDoc(doc(db, "users", participantId));
        if (userDoc.exists()) {
          participantsData.push({
            uid: participantId,
            ...userDoc.data(),
          } as User);
        }
      }
      setParticipants(participantsData);
    };

    loadParticipants();
  }, [room.participants]);

  /**
   * Listen to typing indicators
   */
  useEffect(() => {
    const typingQuery = query(
      collection(db, "typing"),
      where("roomId", "==", room.id),
    );

    const unsubscribe = onSnapshot(typingQuery, (snapshot) => {
      const typingUserIds = snapshot.docs
        .map((doc) => doc.data())
        .filter((typing) => typing.userId !== user?.uid)
        .filter((typing) => {
          const now = Date.now();
          const typingTime = typing.timestamp?.toMillis() || 0;
          return now - typingTime < 3000; // 3 seconds timeout
        })
        .map((typing) => typing.userName);

      setTypingUsers(typingUserIds);
    });

    return () => unsubscribe();
  }, [room.id, user]);

  /**
   * Send typing indicator
   */
  const sendTypingIndicator = useCallback(async () => {
    if (!user) return;

    const now = Date.now();
    if (now - lastTypingUpdateRef.current < 2000) return; // Throttle to 2 seconds

    lastTypingUpdateRef.current = now;

    try {
      const typingId = `${room.id}_${user.uid}`;
      await setDoc(doc(db, "typing", typingId), {
        roomId: room.id,
        userId: user.uid,
        userName: user.displayName || "Unknown",
        timestamp: serverTimestamp(),
      });

      // Clear typing indicator after 3 seconds
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(async () => {
        await deleteDoc(doc(db, "typing", typingId));
      }, 3000);
    } catch (error) {
      console.error("Error sending typing indicator:", error);
    }
  }, [user, room.id]);

  /**
   * Send message
   */
  const sendMessage = async (
    text: string,
    mediaUrl?: string,
    mediaData?: any,
  ) => {
    if (!user || (!text.trim() && !mediaUrl)) return;

    try {
      const messageData: Omit<Message, "id"> = {
        roomId: room.id,
        senderId: user.uid,
        text: text.trim(),
        timestamp: serverTimestamp() as Timestamp,
        readBy: [user.uid],
        type: mediaUrl ? mediaData?.type || "image" : "text",
        ...(mediaUrl && {
          media: {
            url: mediaUrl,
            publicId: mediaData?.publicId,
            type: mediaData?.type || "image",
            ...(mediaData?.thumbnail && { thumbnail: mediaData.thumbnail }),
            ...(mediaData?.duration && { duration: mediaData.duration }),
            ...(mediaData?.size && { size: mediaData.size }),
            ...(mediaData?.mimeType && { mimeType: mediaData.mimeType }),
          },
        }),
        ...(replyTo && {
          replyTo: {
            messageId: replyTo.id,
            text: replyTo.text,
            senderId: replyTo.senderId,
          },
        }),
      };

      // Optimistic UI update
      const optimisticMessage: Message = {
        id: `temp_${Date.now()}`,
        ...messageData,
        timestamp: Timestamp.now(),
      };
      setMessages((prev) => [...prev, optimisticMessage]);
      scrollToBottom();

      // Add to Firestore
      await addDoc(collection(db, "messages"), messageData);

      // Update room's last message
      await updateDoc(doc(db, "rooms", room.id), {
        lastMessage: {
          text: text.trim() || "[Media]",
          senderId: user.uid,
          timestamp: serverTimestamp(),
        },
      });

      // Clear reply
      setReplyTo(null);

      // Clear typing indicator
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      await deleteDoc(doc(db, "typing", `${room.id}_${user.uid}`));
    } catch (error) {
      console.error("Error sending message:", error);
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => !m.id.startsWith("temp_")));
    }
  };

  /**
   * Edit message
   */
  const editMessage = async (messageId: string, newText: string) => {
    try {
      await updateDoc(doc(db, "messages", messageId), {
        text: newText,
        edited: true,
        editedAt: serverTimestamp(),
      });
      setEditingMessage(null);
    } catch (error) {
      console.error("Error editing message:", error);
    }
  };

  /**
   * Delete message
   */
  const deleteMessage = async (messageId: string) => {
    try {
      await updateDoc(doc(db, "messages", messageId), {
        deleted: true,
        deletedAt: serverTimestamp(),
        text: "This message was deleted",
      });
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };

  /**
   * Add reaction
   */
  const addReaction = async (messageId: string, emoji: string) => {
    if (!user) return;

    try {
      const messageRef = doc(db, "messages", messageId);
      const messageDoc = await getDoc(messageRef);
      const currentReactions = messageDoc.data()?.reactions || {};

      const emojiReactions = currentReactions[emoji] || [];
      const hasReacted = emojiReactions.includes(user.uid);

      if (hasReacted) {
        // Remove reaction
        currentReactions[emoji] = emojiReactions.filter(
          (uid: string) => uid !== user.uid,
        );
        if (currentReactions[emoji].length === 0) {
          delete currentReactions[emoji];
        }
      } else {
        // Add reaction
        currentReactions[emoji] = [...emojiReactions, user.uid];
      }

      await updateDoc(messageRef, { reactions: currentReactions });
    } catch (error) {
      console.error("Error adding reaction:", error);
    }
  };

  /**
   * Pin message
   */
  const togglePinMessage = async (messageId: string) => {
    try {
      const pinnedMessages = room.pinnedMessages || [];
      const isPinned = pinnedMessages.includes(messageId);

      if (isPinned) {
        await updateDoc(doc(db, "rooms", room.id), {
          pinnedMessages: pinnedMessages.filter((id) => id !== messageId),
        });
      } else {
        await updateDoc(doc(db, "rooms", room.id), {
          pinnedMessages: [...pinnedMessages, messageId],
        });
      }
    } catch (error) {
      console.error("Error pinning message:", error);
    }
  };

  /**
   * Initiate voice call
   */
  const handleVoiceCall = () => {
    const otherParticipant = room.participants.find((p) => p !== user?.uid);
    if (otherParticipant && room.type === "direct") {
      initiateCall(otherParticipant, room.id);
    }
  };

  /**
   * Get other user (for direct chats)
   */
  const otherUser =
    room.type === "direct"
      ? participants.find((p) => p.uid !== user?.uid)
      : null;

  /**
   * Filter messages by search
   */
  const filteredMessages = searchQuery
    ? messages.filter((m) =>
        m.text.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : messages;

  const pinnedMessages = messages.filter((m) =>
    room.pinnedMessages?.includes(m.id),
  );

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/20 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="lg:hidden p-2 hover:bg-white/10 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
          )}

          {otherUser && (
            <>
              <img
                src={otherUser.photoURL}
                alt={otherUser.displayName}
                className="w-10 h-10 rounded-full border-2 border-purple-500"
              />
              <div>
                <h2 className="font-semibold text-white">
                  {otherUser.displayName}
                </h2>
                <p className="text-xs text-gray-400">
                  {otherUser.status === "online" ? "Online" : "Offline"}
                </p>
              </div>
            </>
          )}

          {room.type === "group" && (
            <div>
              <h2 className="font-semibold text-white">{room.name}</h2>
              <p className="text-xs text-gray-400">
                {room.participants.length} members
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-2 hover:bg-white/10 rounded-lg transition"
          >
            <Search className="w-5 h-5 text-white" />
          </button>

          {room.type === "direct" && (
            <button
              onClick={handleVoiceCall}
              className="p-2 hover:bg-white/10 rounded-lg transition"
            >
              <Phone className="w-5 h-5 text-white" />
            </button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="p-3 bg-black/20 border-b border-white/10">
          <input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      )}

      {/* Pinned Messages */}
      {pinnedMessages.length > 0 && !showSearch && (
        <div className="p-3 bg-purple-500/10 border-b border-purple-500/20">
          <div className="flex items-center gap-2 text-purple-300 text-sm">
            <Pin className="w-4 h-4" />
            <span className="font-medium">Pinned Messages</span>
          </div>
          <div className="mt-2 space-y-1">
            {pinnedMessages.slice(0, 3).map((msg) => (
              <div key={msg.id} className="text-sm text-gray-300 truncate">
                {msg.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filteredMessages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isOwn={message.senderId === user?.uid}
            onReply={() => setReplyTo(message)}
            onEdit={() => setEditingMessage(message)}
            onDelete={() => deleteMessage(message.id)}
            onReact={(emoji) => addReaction(message.id, emoji)}
            onPin={() => togglePinMessage(message.id)}
            isPinned={room.pinnedMessages?.includes(message.id)}
          />
        ))}

        {typingUsers.length > 0 && <TypingIndicator users={typingUsers} />}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <MessageInput
        onSend={sendMessage}
        onTyping={sendTypingIndicator}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        editingMessage={editingMessage}
        onCancelEdit={() => setEditingMessage(null)}
        onEditSubmit={(text) =>
          editingMessage && editMessage(editingMessage.id, text)
        }
      />
    </div>
  );
};

export default ChatInterface;
