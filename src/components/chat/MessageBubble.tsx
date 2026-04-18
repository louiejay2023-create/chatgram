// src/components/chat/MessageBubble.tsx

"use client";

import React, { useState } from "react";
import { Message } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { Reply, Edit2, Trash2, MoreVertical, Pin, Smile } from "lucide-react";
import MediaViewer from "../media/MediaViewer";

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReact: (emoji: string) => void;
  onPin: () => void;
  isPinned?: boolean;
}

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwn,
  onReply,
  onEdit,
  onDelete,
  onReact,
  onPin,
  isPinned,
}) => {
  const [showActions, setShowActions] = useState(false);
  const [showReactions, setShowReactions] = useState(false);

  if (message.deleted) {
    return (
      <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
        <div className="max-w-[70%] px-4 py-2 rounded-2xl bg-gray-800/50 border border-gray-700">
          <p className="text-sm text-gray-500 italic">
            This message was deleted
          </p>
        </div>
      </div>
    );
  }

  const timestamp = message.timestamp?.toDate
    ? formatDistanceToNow(message.timestamp.toDate(), { addSuffix: true })
    : "Just now";

  const hasReactions =
    message.reactions && Object.keys(message.reactions).length > 0;

  return (
    <div
      className={`flex ${isOwn ? "justify-end" : "justify-start"} group`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowReactions(false);
      }}
    >
      <div className="max-w-[70%] relative">
        {/* Reply Reference */}
        {message.replyTo && (
          <div className="mb-1 px-3 py-2 bg-black/20 border-l-2 border-purple-500 rounded-lg">
            <p className="text-xs text-gray-400">Replying to</p>
            <p className="text-sm text-gray-300 truncate">
              {message.replyTo.text}
            </p>
          </div>
        )}

        {/* Message Bubble */}
        <div
          className={`px-4 py-2 rounded-2xl ${
            isOwn
              ? "bg-gradient-to-br from-purple-600 to-purple-700 text-white"
              : "bg-gray-800/80 backdrop-blur-sm text-white border border-gray-700"
          } ${isPinned ? "ring-2 ring-yellow-500" : ""}`}
        >
          {/* Media */}
          {message.media && (
            <MediaViewer
              type={message.type as "image" | "video" | "audio" | "file"}
              url={message.media.url}
              thumbnail={message.media.thumbnail}
              duration={message.media.duration}
            />
          )}

          {/* Text */}
          {message.text && (
            <p className="text-sm whitespace-pre-wrap break-words">
              {message.text}
            </p>
          )}

          {/* Link Preview */}
          {message.linkPreview && (
            <div className="mt-2 p-3 bg-black/20 rounded-lg border border-white/10">
              {message.linkPreview.image && (
                <img
                  src={message.linkPreview.image}
                  alt=""
                  className="w-full h-32 object-cover rounded mb-2"
                />
              )}
              {message.linkPreview.title && (
                <p className="font-semibold text-sm">
                  {message.linkPreview.title}
                </p>
              )}
              {message.linkPreview.description && (
                <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                  {message.linkPreview.description}
                </p>
              )}
            </div>
          )}

          {/* Metadata */}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs opacity-70">{timestamp}</span>
            {message.edited && (
              <span className="text-xs opacity-50">(edited)</span>
            )}
            {isOwn && (
              <span className="text-xs">
                {message.readBy.length > 1 ? "✓✓" : "✓"}
              </span>
            )}
          </div>
        </div>

        {/* Reactions */}
        {hasReactions && (
          <div className="flex flex-wrap gap-1 mt-1">
            {Object.entries(message.reactions!).map(([emoji, users]) => (
              <button
                key={emoji}
                onClick={() => onReact(emoji)}
                className="px-2 py-1 bg-gray-800/80 backdrop-blur-sm border border-gray-700 rounded-full text-xs flex items-center gap-1 hover:bg-gray-700 transition"
              >
                <span>{emoji}</span>
                <span className="text-gray-400">{users.length}</span>
              </button>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        {showActions && (
          <div
            className={`absolute top-0 ${
              isOwn ? "left-0 -translate-x-full" : "right-0 translate-x-full"
            } flex items-center gap-1 px-2`}
          >
            <button
              onClick={() => setShowReactions(!showReactions)}
              className="p-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
              title="React"
            >
              <Smile className="w-4 h-4 text-gray-400" />
            </button>

            <button
              onClick={onReply}
              className="p-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
              title="Reply"
            >
              <Reply className="w-4 h-4 text-gray-400" />
            </button>

            {isOwn && (
              <>
                <button
                  onClick={onEdit}
                  className="p-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
                  title="Edit"
                >
                  <Edit2 className="w-4 h-4 text-gray-400" />
                </button>

                <button
                  onClick={onDelete}
                  className="p-1.5 bg-gray-800 hover:bg-red-600 rounded-lg transition"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4 text-gray-400" />
                </button>
              </>
            )}

            <button
              onClick={onPin}
              className={`p-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg transition ${
                isPinned ? "text-yellow-500" : "text-gray-400"
              }`}
              title={isPinned ? "Unpin" : "Pin"}
            >
              <Pin className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Reaction Picker */}
        {showReactions && (
          <div
            className={`absolute ${
              isOwn ? "left-0" : "right-0"
            } top-0 -translate-y-full mb-2 p-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl flex gap-1`}
          >
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  onReact(emoji);
                  setShowReactions(false);
                }}
                className="p-2 hover:bg-gray-700 rounded transition text-xl"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
