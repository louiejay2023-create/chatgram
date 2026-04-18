// src/app/page.tsx

'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Room } from '@/types';
import Sidebar from '@/components/chat/Sidebar';
import ChatInterface from '@/components/chat/ChatInterface';
import GlobalSearch from '@/components/search/GlobalSearch';
import AuthPage from '@/components/auth/AuthPage';
import { Search, Menu, MessageSquare } from 'lucide-react';

export default function HomePage() {
  const { user, loading } = useAuth();
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading Chatgram...</p>
        </div>
      </div>
    );
  }

  // Show auth page if not logged in
  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="h-screen flex overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Sidebar */}
      <Sidebar
        onRoomSelect={setSelectedRoom}
        selectedRoom={selectedRoom}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {selectedRoom ? (
          <>
            {/* Mobile Header */}
            <div className="lg:hidden flex items-center gap-3 p-4 bg-black/20 backdrop-blur-xl border-b border-white/10">
              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className="p-2 hover:bg-white/10 rounded-lg transition"
              >
                <Menu className="w-5 h-5 text-white" />
              </button>
              
              <h1 className="flex-1 text-lg font-semibold text-white">Chatgram</h1>

              <button
                onClick={() => setShowSearch(true)}
                className="p-2 hover:bg-white/10 rounded-lg transition"
              >
                <Search className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Chat Interface */}
            <ChatInterface
              room={selectedRoom}
              onBack={() => setSelectedRoom(null)}
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            {/* Mobile Menu Button */}
            <div className="lg:hidden absolute top-4 left-4">
              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className="p-3 bg-purple-600 hover:bg-purple-700 rounded-full transition shadow-lg"
              >
                <Menu className="w-6 h-6 text-white" />
              </button>
            </div>

            {/* Empty State */}
            <div className="text-center max-w-md">
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-purple-600 to-purple-700 rounded-3xl flex items-center justify-center">
                <MessageSquare className="w-12 h-12 text-white" />
              </div>
              
              <h2 className="text-3xl font-bold text-white mb-4">
                Welcome to Chatgram
              </h2>
              
              <p className="text-gray-400 mb-8">
                Select a conversation to start messaging or create a new chat to get started.
              </p>

              <div className="grid grid-cols-1 gap-4 text-left">
                <div className="p-4 glass rounded-xl">
                  <h3 className="font-semibold text-white mb-2">🚀 Real-Time Messaging</h3>
                  <p className="text-sm text-gray-400">
                    Send messages instantly with optimistic updates and read receipts
                  </p>
                </div>

                <div className="p-4 glass rounded-xl">
                  <h3 className="font-semibold text-white mb-2">📞 Voice Calling</h3>
                  <p className="text-sm text-gray-400">
                    Make high-quality P2P voice calls with WebRTC technology
                  </p>
                </div>

                <div className="p-4 glass rounded-xl">
                  <h3 className="font-semibold text-white mb-2">☁️ Cloud Media</h3>
                  <p className="text-sm text-gray-400">
                    Share images and videos with automatic optimization via Cloudinary
                  </p>
                </div>

                <div className="p-4 glass rounded-xl">
                  <h3 className="font-semibold text-white mb-2">🔍 Global Search</h3>
                  <p className="text-sm text-gray-400">
                    Find any message or user instantly with powerful search
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowSearch(true)}
                className="mt-8 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-full transition text-white font-medium shadow-lg flex items-center gap-2 mx-auto"
              >
                <Search className="w-5 h-5" />
                Search Users
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Global Search Modal */}
      {showSearch && (
        <GlobalSearch
          onUserSelect={(user) => {
            // Create or open DM with this user
            setShowSearch(false);
          }}
          onMessageSelect={(message) => {
            // Navigate to message
            setShowSearch(false);
          }}
          onClose={() => setShowSearch(false)}
        />
      )}
    </div>
  );
}
