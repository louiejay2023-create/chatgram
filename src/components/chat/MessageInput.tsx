// src/components/chat/MessageInput.tsx

"use client";

import React, { useState, useRef, KeyboardEvent } from "react";
import {
  Send,
  Image as ImageIcon,
  Video,
  Mic,
  Paperclip,
  X,
} from "lucide-react";
import { Message } from "@/types";
import { cloudinaryService } from "@/services/CloudinaryService";

interface MessageInputProps {
  onSend: (text: string, mediaUrl?: string, mediaData?: any) => void;
  onTyping: () => void;
  replyTo?: Message | null;
  onCancelReply?: () => void;
  editingMessage?: Message | null;
  onCancelEdit?: () => void;
  onEditSubmit?: (text: string) => void;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSend,
  onTyping,
  replyTo,
  onCancelReply,
  editingMessage,
  onCancelEdit,
  onEditSubmit,
}) => {
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /**
   * Auto-resize textarea
   */
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  };

  /**
   * Handle text change
   */
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    adjustTextareaHeight();
    onTyping();
  };

  /**
   * Handle file selection
   */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);

    // Create preview for images/videos
    if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  /**
   * Upload file to Cloudinary
   */
  const uploadFile = async (file: File) => {
    setUploading(true);
    setUploadProgress(0);

    try {
      let result;

      if (file.type.startsWith("image/")) {
        result = await cloudinaryService.uploadImage(file, setUploadProgress);
      } else if (file.type.startsWith("video/")) {
        result = await cloudinaryService.uploadVideo(file, setUploadProgress);
      } else if (file.type.startsWith("audio/")) {
        result = await cloudinaryService.uploadAudio(file, setUploadProgress);
      } else {
        result = await cloudinaryService.uploadFile(file, setUploadProgress);
      }

      return {
        url: result.secure_url,
        publicId: result.public_id,
        type: file.type.startsWith("image/")
          ? "image"
          : file.type.startsWith("video/")
            ? "video"
            : file.type.startsWith("audio/")
              ? "audio"
              : "file",
        thumbnail: result.thumbnail_url,
        duration: result.duration,
        size: result.bytes,
        mimeType: file.type,
      };
    } catch (error: any) {
      console.error("Upload error:", error);
      alert(`Upload failed: ${error.message || "Unknown error"}`);
      throw error;
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  /**
   * Handle send
   */
  const handleSend = async () => {
    if (editingMessage && onEditSubmit) {
      onEditSubmit(text.trim());
      setText("");
      return;
    }

    if (!text.trim() && !selectedFile) return;

    let mediaUrl: string | undefined;
    let mediaData: any;

    // Upload file if selected
    if (selectedFile) {
      try {
        const uploadResult = await uploadFile(selectedFile);
        mediaUrl = uploadResult.url;
        mediaData = uploadResult;
      } catch (error) {
        console.error("Failed to upload file:", error);
        return;
      }
    }

    // Send message
    onSend(text, mediaUrl, mediaData);

    // Clear input
    setText("");
    setSelectedFile(null);
    setPreviewUrl(null);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  /**
   * Handle Enter key
   */
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /**
   * Cancel file selection
   */
  const cancelFileSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="p-4 bg-black/20 backdrop-blur-xl border-t border-white/10">
      {/* Reply/Edit Banner */}
      {(replyTo || editingMessage) && (
        <div className="mb-2 px-3 py-2 bg-purple-500/10 border-l-2 border-purple-500 rounded flex items-center justify-between">
          <div>
            <p className="text-xs text-purple-300">
              {editingMessage ? "Editing message" : "Replying to"}
            </p>
            <p className="text-sm text-white truncate">
              {editingMessage?.text || replyTo?.text}
            </p>
          </div>
          <button
            onClick={editingMessage ? onCancelEdit : onCancelReply}
            className="p-1 hover:bg-white/10 rounded transition"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      )}

      {/* File Preview */}
      {previewUrl && (
        <div className="mb-2 relative">
          <div className="relative inline-block">
            {selectedFile?.type.startsWith("image/") ? (
              <img
                src={previewUrl}
                alt="Preview"
                className="max-h-40 rounded-lg border border-white/10"
              />
            ) : selectedFile?.type.startsWith("video/") ? (
              <video
                src={previewUrl}
                className="max-h-40 rounded-lg border border-white/10"
                controls
              />
            ) : (
              <div className="px-4 py-2 bg-gray-800 rounded-lg border border-white/10">
                <p className="text-sm text-white">{selectedFile?.name}</p>
              </div>
            )}

            <button
              onClick={cancelFileSelection}
              className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full hover:bg-red-600 transition"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {uploading && (
        <div className="mb-2">
          <div className="flex items-center justify-between text-sm text-gray-400 mb-1">
            <span>Uploading...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div
              className="bg-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="flex items-end gap-2">
        {/* File Upload Buttons */}
        <div className="flex gap-1">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
            className="hidden"
          />

          <button
            onClick={() => {
              fileInputRef.current?.click();
              if (fileInputRef.current) {
                fileInputRef.current.accept = "image/*";
              }
            }}
            className="p-2 hover:bg-white/10 rounded-lg transition"
            title="Upload Image"
            disabled={uploading}
          >
            <ImageIcon className="w-5 h-5 text-gray-400" />
          </button>

          <button
            onClick={() => {
              fileInputRef.current?.click();
              if (fileInputRef.current) {
                fileInputRef.current.accept = "video/*";
              }
            }}
            className="p-2 hover:bg-white/10 rounded-lg transition"
            title="Upload Video"
            disabled={uploading}
          >
            <Video className="w-5 h-5 text-gray-400" />
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 hover:bg-white/10 rounded-lg transition"
            title="Upload File"
            disabled={uploading}
          >
            <Paperclip className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Text Input */}
        <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-2">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="w-full bg-transparent text-white placeholder-gray-400 focus:outline-none resize-none"
            rows={1}
            disabled={uploading}
          />
        </div>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={(!text.trim() && !selectedFile) || uploading}
          className="p-3 bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-5 h-5 text-white" />
        </button>
      </div>

      <p className="text-xs text-gray-500 mt-2">
        Press Enter to send, Shift + Enter for new line
      </p>
    </div>
  );
};

export default MessageInput;
