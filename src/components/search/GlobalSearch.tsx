// src/components/search/GlobalSearch.tsx

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { collection, query as firestoreQuery, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User, Message, SearchResult } from '@/types';
import { Search, User as UserIcon, MessageSquare, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import debounce from 'lodash/debounce';

interface GlobalSearchProps {
  onUserSelect?: (user: User) => void;
  onMessageSelect?: (message: Message) => void;
  onClose?: () => void;
}

const GlobalSearch: React.FC<GlobalSearchProps> = ({
  onUserSelect,
  onMessageSelect,
  onClose,
}) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'users' | 'messages'>('all');

  /**
   * Search function
   */
  const performSearch = useCallback(
    async (searchText: string) => {
      if (!searchText.trim() || !user) {
        setResults([]);
        return;
      }

      setLoading(true);

      try {
        const searchResults: SearchResult[] = [];
        const lowerQuery = searchText.toLowerCase();

        // Search users
        if (activeTab === 'all' || activeTab === 'users') {
          const usersQueryRef = firestoreQuery(
            collection(db, 'users'),
            orderBy('displayName'),
            limit(10)
          );

          const usersSnapshot = await getDocs(usersQueryRef);
          
          usersSnapshot.docs.forEach((doc) => {
            const userData = { uid: doc.id, ...doc.data() } as User;
            
            // Filter by search query
            if (
              userData.displayName.toLowerCase().includes(lowerQuery) ||
              userData.email.toLowerCase().includes(lowerQuery)
            ) {
              searchResults.push({
                type: 'user',
                id: doc.id,
                data: userData,
                highlight: userData.displayName,
              });
            }
          });
        }

        // Search messages in user's rooms
        if (activeTab === 'all' || activeTab === 'messages') {
          // First, get user's rooms
          const roomsQueryRef = firestoreQuery(
            collection(db, 'rooms'),
            where('participants', 'array-contains', user.uid)
          );

          const roomsSnapshot = await getDocs(roomsQueryRef);
          const roomIds = roomsSnapshot.docs.map((doc) => doc.id);

          // Search messages in each room
          for (const roomId of roomIds) {
            const messagesQueryRef = firestoreQuery(
              collection(db, 'messages'),
              where('roomId', '==', roomId),
              limit(50)
            );

            const messagesSnapshot = await getDocs(messagesQueryRef);
            
            messagesSnapshot.docs.forEach((doc) => {
              const messageData = { id: doc.id, ...doc.data() } as Message;
              
              // Filter by search query
              if (messageData.text.toLowerCase().includes(lowerQuery)) {
                // Get sender name
                const senderName = 'Unknown';
                
                searchResults.push({
                  type: 'message',
                  id: doc.id,
                  data: { ...messageData, senderName, roomId: messageData.roomId } as any,
                  highlight: highlightText(messageData.text, searchText),
                });
              }
            });
          }
        }

        setResults(searchResults);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    },
    [user, activeTab]
  );

  /**
   * Debounced search
   */
  const debouncedSearch = useCallback(
    debounce((searchText: string) => performSearch(searchText), 300),
    [performSearch]
  );

  /**
   * Handle search input change
   */
  useEffect(() => {
    debouncedSearch(searchQuery);
  }, [searchQuery, debouncedSearch]);

  /**
   * Highlight matching text
   */
  const highlightText = (text: string, searchText: string): string => {
    const index = text.toLowerCase().indexOf(searchText.toLowerCase());
    if (index === -1) return text;

    const start = Math.max(0, index - 20);
    const end = Math.min(text.length, index + searchText.length + 20);
    
    return `...${text.substring(start, end)}...`;
  };

  /**
   * Filter results by tab
   */
  const filteredResults = results.filter((result) => {
    if (activeTab === 'all') return true;
    return result.type === activeTab.slice(0, -1);
  });

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-start justify-center z-50 p-4 pt-20">
      <div className="w-full max-w-2xl bg-gradient-to-br from-gray-900 to-gray-800 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search users and messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-white placeholder-gray-400 focus:outline-none"
              autoFocus
            />
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-4">
            {['all', 'users', 'messages'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  activeTab === tab
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {loading && (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-gray-400 mt-4">Searching...</p>
            </div>
          )}

          {!loading && searchQuery && filteredResults.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-gray-400">No results found for "{searchQuery}"</p>
            </div>
          )}

          {!loading && filteredResults.length > 0 && (
            <div className="divide-y divide-white/5">
              {filteredResults.map((result) => (
                <SearchResultItem
                  key={`${result.type}-${result.id}`}
                  result={result}
                  onUserSelect={onUserSelect}
                  onMessageSelect={onMessageSelect}
                />
              ))}
            </div>
          )}

          {!searchQuery && (
            <div className="p-8 text-center">
              <Search className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">Start typing to search</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Search Result Item Component
 */
const SearchResultItem: React.FC<{
  result: SearchResult;
  onUserSelect?: (user: User) => void;
  onMessageSelect?: (message: Message) => void;
}> = ({ result, onUserSelect, onMessageSelect }) => {
  const handleClick = () => {
    if (result.type === 'user' && onUserSelect) {
      onUserSelect(result.data as User);
    } else if (result.type === 'message' && onMessageSelect) {
      onMessageSelect(result.data as any);
    }
  };

  if (result.type === 'user') {
    const user = result.data as User;
    
    return (
      <button
        onClick={handleClick}
        className="w-full p-4 hover:bg-white/5 transition flex items-center gap-3 text-left"
      >
        <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
          <UserIcon className="w-5 h-5 text-white" />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium truncate">{user.displayName}</p>
          <p className="text-sm text-gray-400 truncate">{user.email}</p>
        </div>

        <div className={`w-2 h-2 rounded-full ${
          user.status === 'online' ? 'bg-green-500' : 'bg-gray-500'
        }`} />
      </button>
    );
  }

  const message = result.data as any;
  
  return (
    <button
      onClick={handleClick}
      className="w-full p-4 hover:bg-white/5 transition flex items-start gap-3 text-left"
    >
      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
        <MessageSquare className="w-5 h-5 text-white" />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-400 mb-1">{message.senderName}</p>
        <p className="text-white text-sm line-clamp-2">{result.highlight || message.text}</p>
      </div>
    </button>
  );
};

export default GlobalSearch;