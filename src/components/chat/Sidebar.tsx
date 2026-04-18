// src/components/chat/Sidebar.tsx

"use client";
import { Settings } from "lucide-react";
import UserSettings from "../settings/UserSettings";

import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Room, User } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { Search, Plus, MessageSquare, LogOut, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface SidebarProps {
  onRoomSelect: (room: Room) => void;
  selectedRoom?: Room | null;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  onRoomSelect,
  selectedRoom,
  isMobileOpen,
  onMobileClose,
}) => {
  const { user, signOut } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  /**
   * Load user's rooms
   */
  useEffect(() => {
    if (!user) return;

    const roomsQuery = query(
      collection(db, "rooms"),
      where("participants", "array-contains", user.uid),
    );

    const unsubscribe = onSnapshot(roomsQuery, (snapshot) => {
      const roomsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Room[];

      // Sort manually by lastMessage timestamp
      roomsData.sort((a, b) => {
        const aTime = a.lastMessage?.timestamp?.toMillis?.() || 0;
        const bTime = b.lastMessage?.timestamp?.toMillis?.() || 0;
        return bTime - aTime;
      });

      setRooms(roomsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  /**
   * Load all users for new chat
   */
  const loadUsers = async () => {
    if (!user) return;

    const usersSnapshot = await getDocs(collection(db, "users"));
    const usersData = usersSnapshot.docs
      .map((doc) => ({ uid: doc.id, ...doc.data() }) as User)
      .filter((u) => u.uid !== user.uid);

    setUsers(usersData);
  };

  /**
   * Create new direct message room
   */
  const createDirectMessage = async (otherUserId: string) => {
    if (!user) return;

    // Check if room already exists
    const existingRoom = rooms.find(
      (room) =>
        room.type === "direct" &&
        room.participants.includes(otherUserId) &&
        room.participants.length === 2,
    );

    if (existingRoom) {
      onRoomSelect(existingRoom);
      setShowNewChatModal(false);
      return;
    }

    // Create new room
    const roomData = {
      type: "direct",
      participants: [user.uid, otherUserId],
      createdBy: user.uid,
      createdAt: serverTimestamp(),
    };

    const newRoomRef = await addDoc(collection(db, "rooms"), roomData);

    await new Promise((resolve) => setTimeout(resolve, 500));

    const newRoom = {
      id: newRoomRef.id,
      type: "direct",
      participants: [user.uid, otherUserId],
      createdBy: user.uid,
      createdAt: serverTimestamp() as any,
    } as Room;

    onRoomSelect(newRoom);
    setShowNewChatModal(false);
  };

  /**
   * Filter rooms by search
   */
  const filteredRooms = rooms.filter((room) => {
    if (!searchQuery) return true;
    return room.lastMessage?.text
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
  });

  const sidebarContent = (
    <>
      <div className="p-4 border-b border-white/10 glass-dark">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold gradient-text">Chatgram</h1>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 hover:bg-white/10 rounded-lg transition"
              title="Settings"
            >
              <Settings className="w-5 h-5 text-white" />
            </button>

            <button
              onClick={() => {
                loadUsers();
                setShowNewChatModal(true);
              }}
              className="p-2 hover:bg-white/10 rounded-lg transition"
              title="New Chat"
            >
              <Plus className="w-5 h-5 text-white" />
            </button>

            <button
              onClick={onMobileClose}
              className="lg:hidden p-2 hover:bg-white/10 rounded-lg transition"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {user && (
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
            <img
              src={user.photoURL}
              alt={user.displayName}
              className="w-10 h-10 rounded-full border-2 border-purple-500"
            />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white truncate">
                {user.displayName}
              </p>
              <p className="text-sm text-gray-400 truncate">{user.email}</p>
            </div>
            <div className="w-2 h-2 bg-green-500 rounded-full" />
          </div>
        )}

        <div className="mt-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton h-16 rounded-lg" />
            ))}
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="p-8 text-center">
            <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No conversations yet</p>
            <button
              onClick={() => {
                loadUsers();
                setShowNewChatModal(true);
              }}
              className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition text-white"
            >
              Start a chat
            </button>
          </div>
        ) : (
          <div className="p-2">
            {filteredRooms.map((room) => (
              <RoomItem
                key={room.id}
                room={room}
                isSelected={selectedRoom?.id === room.id}
                onClick={() => {
                  onRoomSelect(room);
                  onMobileClose();
                }}
                currentUserId={user?.uid || ""}
              />
            ))}
          </div>
        )}
      </div>

      {showNewChatModal && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md glass-dark rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">New Chat</h2>
              <button
                onClick={() => setShowNewChatModal(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto scrollbar-thin">
              {users.map((user) => (
                <button
                  key={user.uid}
                  onClick={() => createDirectMessage(user.uid)}
                  className="w-full p-3 hover:bg-white/5 rounded-lg transition flex items-center gap-3"
                >
                  <img
                    src={user.photoURL}
                    alt={user.displayName}
                    className="w-10 h-10 rounded-full border-2 border-purple-500"
                  />
                  <div className="flex-1 text-left">
                    <p className="font-medium text-white">{user.displayName}</p>
                    <p className="text-sm text-gray-400">{user.email}</p>
                  </div>
                  <div
                    className={`w-2 h-2 rounded-full ${
                      user.status === "online" ? "bg-green-500" : "bg-gray-500"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      <div className="hidden lg:flex lg:w-80 xl:w-96 flex-col bg-gray-900 border-r border-white/10">
        {sidebarContent}
      </div>

      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onMobileClose}
          />
          <div className="absolute left-0 top-0 bottom-0 w-80 bg-gray-900 border-r border-white/10 flex flex-col slide-in-left">
            {sidebarContent}
          </div>
        </div>
      )}

      {showSettings && (
        <UserSettings onClose={() => setShowSettings(false)} />
      )}
    </>
  );
};

const RoomItem: React.FC<{
  room: Room;
  isSelected: boolean;
  onClick: () => void;
  currentUserId: string;
}> = ({ room, isSelected, onClick, currentUserId }) => {
  const [otherUser, setOtherUser] = useState<User | null>(null);

  useEffect(() => {
    if (room.type === "direct") {
      const otherUserId = room.participants.find((id) => id !== currentUserId);
      if (otherUserId) {
        getDoc(doc(db, "users", otherUserId)).then((snapshot) => {
          if (snapshot.exists()) {
            setOtherUser({ uid: snapshot.id, ...snapshot.data() } as User);
          }
        });
      }
    }
  }, [room, currentUserId]);

  const displayName =
    room.type === "group" ? room.name : otherUser?.displayName || "User";
  const displayAvatar =
    room.type === "group" ? room.metadata?.groupAvatar : otherUser?.photoURL;

  const lastMessageTime = room.lastMessage?.timestamp?.toDate
    ? formatDistanceToNow(room.lastMessage.timestamp.toDate(), {
        addSuffix: true,
      })
    : "";

  return (
    <button
      onClick={onClick}
      className={`w-full p-3 rounded-lg transition flex items-center gap-3 ${
        isSelected
          ? "bg-purple-600/20 border border-purple-500/50"
          : "hover:bg-white/5"
      }`}
    >
      <img
        src={
          displayAvatar ||
          `https://ui-avatars.com/api/?name=${displayName}&background=random`
        }
        alt={displayName}
        className="w-12 h-12 rounded-full border-2 border-purple-500"
      />

      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between mb-1">
          <p className="font-semibold text-white truncate">{displayName}</p>
          {lastMessageTime && (
            <span className="text-xs text-gray-400">{lastMessageTime}</span>
          )}
        </div>

        {room.lastMessage && (
          <p className="text-sm text-gray-400 truncate">
            {room.lastMessage.text || "[Media]"}
          </p>
        )}
      </div>
    </button>
  );
};

export default Sidebar;
