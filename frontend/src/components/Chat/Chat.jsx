"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { useSocket } from "../../contexts/SocketContext.jsx";
import EmojiPicker from "./EmojiPicker.jsx";
import axios from "axios";
import {
  Send,
  Smile,
  Paperclip,
  Users,
  ImageIcon,
  File,
  X,
  Download,
  UserPlus,
  Search,
  RefreshCw,
  ZoomIn,
  ExternalLink,
  Copy,
} from "lucide-react";
import toast from "react-hot-toast";

const Chat = () => {
  const { currentTeam, user, fetchTeams } = useAuth();
  const { socket, connectionStatus, isAuthenticated, sendMessage } =
    useSocket();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [searchUsers, setSearchUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [inviting, setInviting] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [showImageModal, setShowImageModal] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const messageInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    if (currentTeam) {
      fetchMessages();
    }
  }, [currentTeam]);

  useEffect(() => {
    if (socket && currentTeam) {
      console.log(
        "🔄 Setting up enhanced message listeners for team:",
        currentTeam.name
      );

      const handleNewMessage = (message) => {
        console.log("💬 Received message via socket:", {
          messageId: message._id,
          sender: message.sender?.username,
          teamId: message.teamId,
          currentTeamId: currentTeam._id,
          broadcastId: message.broadcastId,
        });

        if (message.teamId === currentTeam._id) {
          setMessages((prev) => {
            const messageExists = prev.some((msg) => msg._id === message._id);
            if (messageExists) {
              console.log("⚠️ Message already exists, skipping");
              return prev;
            }

            console.log("✅ Adding new message to state");
            return [...prev, message];
          });

          // Show notification for messages from other users
          if (message.sender._id !== user?.id) {
            toast.success(`New message from ${message.sender.username}`, {
              icon: "💬",
              duration: 3000,
            });
          }
        }
      };

      const handleUserTyping = (data) => {
        if (data.teamId === currentTeam._id && data.userId !== user?.id) {
          setTypingUsers((prev) => {
            const newSet = new Set(prev);
            if (data.isTyping) {
              newSet.add(data.username);
            } else {
              newSet.delete(data.username);
            }
            return newSet;
          });

          // Auto-remove typing indicator after 3 seconds
          if (data.isTyping) {
            setTimeout(() => {
              setTypingUsers((prev) => {
                const newSet = new Set(prev);
                newSet.delete(data.username);
                return newSet;
              });
            }, 3000);
          }
        }
      };

      const handleMessageSent = (data) => {
        console.log("✅ Message sent confirmation:", data);
      };

      socket.on("new-message", handleNewMessage);
      socket.on("user-typing", handleUserTyping);
      socket.on("message-sent", handleMessageSent);

      return () => {
        console.log("🧹 Cleaning up enhanced message listeners");
        socket.off("new-message", handleNewMessage);
        socket.off("user-typing", handleUserTyping);
        socket.off("message-sent", handleMessageSent);
      };
    }
  }, [socket, currentTeam, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = async () => {
    if (!currentTeam) return;

    try {
      setLoading(true);
      console.log("📨 Fetching messages for team:", currentTeam.name);
      const response = await axios.get(
        `https://sync-next.onrender.com/api/chat/team/${currentTeam._id}`
      );
      console.log("✅ Messages fetched:", response.data.length);
      setMessages(response.data);
    } catch (error) {
      console.error("❌ Error fetching messages:", error);
      toast.error("Failed to fetch messages");
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTyping = () => {
    if (!isTyping && socket && currentTeam) {
      setIsTyping(true);
      socket.emit("typing-start", { teamId: currentTeam._id });
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping && socket && currentTeam) {
        setIsTyping(false);
        socket.emit("typing-stop", { teamId: currentTeam._id });
      }
    }, 1000);
  };

  const refreshMessages = () => {
    fetchMessages();
    toast.success("Messages refreshed!", {
      icon: "🔄",
      style: {
        borderRadius: "12px",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color: "#fff",
      },
    });
  };

  const searchUsersForInvite = async (term) => {
    if (!term.trim()) {
      setSearchUsers([]);
      return;
    }

    try {
      const response = await axios.get(
        `https://sync-next.onrender.com/api/users?search=${term}`
      );
      const filteredUsers = response.data.filter(
        (searchUser) =>
          !currentTeam?.members?.some(
            (member) => member.user._id === searchUser._id
          )
      );
      setSearchUsers(filteredUsers);
    } catch (error) {
      console.error("Error searching users:", error);
      toast.error("Failed to search users");
    }
  };

  const inviteUserToTeam = async (userId) => {
    if (!currentTeam) {
      toast.error("No team selected");
      return;
    }

    if (inviting) return;

    try {
      setInviting(true);
      const response = await axios.post(
        `https://sync-next.onrender.com/api/users/teams/${currentTeam._id}/invite`,
        {
          userId: userId,
          message: `You've been invited to join ${currentTeam.name}`,
        }
      );

      toast.success("Invitation sent successfully!", {
        icon: "📤",
        style: {
          borderRadius: "12px",
          background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
          color: "#fff",
        },
      });
      setShowInviteModal(false);
      setSearchTerm("");
      setSearchUsers([]);
      await fetchTeams();
    } catch (error) {
      console.error("❌ Error inviting user:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to invite user";
      toast.error(errorMessage);
    } finally {
      setInviting(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        toast.error("File size must be less than 50MB");
        return;
      }
      setSelectedFile(file);
    }
  };

  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post(
        "https://sync-next.onrender.com/api/chat/upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            console.log(`Upload progress: ${percentCompleted}%`);
          },
        }
      );
      return response.data;
    } catch (error) {
      throw new Error("File upload failed: " + error.message);
    }
  };

  const handleDownload = async (fileUrl, fileName) => {
    try {
      // Use the download endpoint for better file handling
      const downloadUrl = `https://sync-next.onrender.com/api/chat/download/${fileName
        .split("/")
        .pop()}`;

      const response = await fetch(downloadUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) {
        throw new Error("Download failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Download started!", {
        icon: "📥",
        style: {
          borderRadius: "12px",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "#fff",
        },
      });
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Download failed");
    }
  };

  const copyImageUrl = (imageUrl) => {
    const fullUrl = `https://sync-next.onrender.com${imageUrl}`;
    navigator.clipboard.writeText(fullUrl);
    toast.success("Image URL copied to clipboard!");
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (
      Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
    );
  };

  const handleEmojiSelect = (emoji) => {
    const input = messageInputRef.current;
    if (input) {
      const start = input.selectionStart;
      const end = input.selectionEnd;
      const newValue =
        newMessage.slice(0, start) + emoji + newMessage.slice(end);
      setNewMessage(newValue);

      // Set cursor position after emoji
      setTimeout(() => {
        input.setSelectionRange(start + emoji.length, start + emoji.length);
        input.focus();
      }, 0);
    } else {
      setNewMessage((prev) => prev + emoji);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && !selectedFile) return;

    if (!currentTeam) {
      toast.error("Please select a team first");
      return;
    }

    if (!isAuthenticated) {
      toast.error("Not connected to chat server. Please wait...");
      return;
    }

    let messageData = {
      content: newMessage,
      teamId: currentTeam._id,
      messageType: "text",
    };

    try {
      setUploading(true);

      if (selectedFile) {
        const fileData = await uploadFile(selectedFile);
        messageData = {
          ...messageData,
          messageType: selectedFile.type.startsWith("image/")
            ? "image"
            : "file",
          fileUrl: fileData.url,
          fileName: fileData.filename,
          fileSize: fileData.size,
          content:
            newMessage ||
            `Shared ${
              selectedFile.type.startsWith("image/") ? "an image" : "a file"
            }: ${fileData.filename}`,
        };
      }

      // Save message to database first
      const response = await axios.post(
        "https://sync-next.onrender.com/api/chat",
        messageData
      );
      console.log("✅ Message saved to database:", response.data._id);

      // Send via socket for real-time delivery
      const socketSent = sendMessage(response.data);
      if (!socketSent) {
        console.warn(
          "⚠️ Socket send failed, adding message locally as fallback"
        );
        setMessages((prev) => [...prev, response.data]);
      }

      // Clear form
      setNewMessage("");
      setSelectedFile(null);
      setShowEmojiPicker(false);

      // Stop typing indicator
      if (isTyping && socket && currentTeam) {
        setIsTyping(false);
        socket.emit("typing-stop", { teamId: currentTeam._id });
      }

      toast.success("Message sent!", {
        icon: "💬",
        duration: 2000,
      });
    } catch (error) {
      console.error("❌ Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setUploading(false);
    }
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (date) => {
    const messageDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (messageDate.toDateString() === today.toDateString()) {
      return "Today";
    } else if (messageDate.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return messageDate.toLocaleDateString();
    }
  };

  const groupMessagesByDate = (messages) => {
    const groups = {};
    messages.forEach((message) => {
      const date = new Date(message.createdAt).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    return groups;
  };

  const messageGroups = groupMessagesByDate(messages);

  const ConnectionStatus = () => (
    <div className="flex items-center space-x-2">
      {connectionStatus === "connected" && isAuthenticated ? (
        <>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-green-600 font-medium">Connected</span>
        </>
      ) : (
        <>
          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          <span className="text-xs text-red-600 font-medium">
            {connectionStatus === "connecting"
              ? "Connecting..."
              : "Disconnected"}
          </span>
        </>
      )}
    </div>
  );

  const TypingIndicator = () => {
    if (typingUsers.size === 0) return null;

    const typingList = Array.from(typingUsers);
    const displayText =
      typingList.length === 1
        ? `${typingList[0]} is typing...`
        : typingList.length === 2
        ? `${typingList[0]} and ${typingList[1]} are typing...`
        : `${typingList[0]} and ${typingList.length - 1} others are typing...`;

    return (
      <div className="px-4 py-2 text-sm text-gray-500 italic flex items-center space-x-2">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
          <div
            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
            style={{ animationDelay: "0.1s" }}
          ></div>
          <div
            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
            style={{ animationDelay: "0.2s" }}
          ></div>
        </div>
        <span>{displayText}</span>
      </div>
    );
  };

  const ImageModal = ({ imageUrl, fileName, onClose }) => (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="relative max-w-4xl max-h-full">
        <div className="absolute top-4 right-4 flex space-x-2 z-10">
          <button
            onClick={() => copyImageUrl(imageUrl)}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm"
            title="Copy image URL"
          >
            <Copy className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={() =>
              window.open(`https://sync-next.onrender.com${imageUrl}`, "_blank")
            }
            className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm"
            title="Open in new tab"
          >
            <ExternalLink className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={() => handleDownload(imageUrl, fileName)}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm"
            title="Download image"
          >
            <Download className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={onClose}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm"
            title="Close"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
        <img
          src={`https://sync-next.onrender.com${imageUrl}`}
          alt={fileName}
          className="max-w-full max-h-full object-contain rounded-lg"
          onClick={onClose}
        />
      </div>
    </div>
  );

  const InviteModal = () => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-md border border-gray-200/50">
        <div className="p-6 border-b border-gray-200/50 bg-gradient-to-r from-blue-50/80 to-purple-50/80">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Invite Team Members
            </h2>
            <button
              onClick={() => {
                setShowInviteModal(false);
                setSearchTerm("");
                setSearchUsers([]);
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                searchUsersForInvite(e.target.value);
              }}
              className="w-full pl-10 pr-4 py-3 border border-gray-300/50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Search users by name or email..."
            />
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2">
            {searchUsers.map((searchUser) => (
              <div
                key={searchUser._id}
                className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50/50 to-purple-50/50 rounded-xl hover:from-blue-100/50 hover:to-purple-100/50 transition-all"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">
                      {searchUser.username?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {searchUser.username}
                    </p>
                    <p className="text-xs text-gray-500">{searchUser.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => inviteUserToTeam(searchUser._id)}
                  disabled={inviting}
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {inviting ? "Inviting..." : "Invite"}
                </button>
              </div>
            ))}
            {searchTerm && searchUsers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No users found</p>
                <p className="text-xs mt-1">
                  Try searching with a different username or email
                </p>
              </div>
            )}
            {!searchTerm && (
              <div className="text-center py-8 text-gray-500">
                <Search className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>Start typing to search users</p>
                <p className="text-xs mt-1">
                  Search by username or email address
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-transparent bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
          <div className="absolute inset-0 animate-spin rounded-full h-16 w-16 border-4 border-transparent border-t-white rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] max-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-xl p-4 border-b border-indigo-200 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">
                {currentTeam?.name || "Team Chat"}
              </h1>
              <div className="flex items-center space-x-4 text-blue-100 text-sm">
                <span>{currentTeam?.members?.length || 0} members</span>
                <ConnectionStatus />
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={refreshMessages}
              className="p-3 hover:bg-white/20 rounded-xl transition-colors flex items-center space-x-2 text-white backdrop-blur-sm"
              title="Refresh messages"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowInviteModal(true)}
              className="p-3 hover:bg-white/20 rounded-xl transition-colors flex items-center space-x-2 text-white backdrop-blur-sm"
            >
              <UserPlus className="w-5 h-5" />
              <span className="hidden sm:block text-sm font-medium">
                Invite
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {Object.entries(messageGroups).map(([date, dateMessages]) => (
          <div key={date}>
            {/* Date separator */}
            <div className="flex items-center justify-center my-8">
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-2 rounded-full text-sm font-semibold shadow-lg backdrop-blur-sm">
                {formatDate(date)}
              </div>
            </div>

            {/* Messages for this date */}
            {dateMessages.map((message, index) => {
              const isOwnMessage = message.sender._id === user?.id;
              const showAvatar =
                index === 0 ||
                dateMessages[index - 1]?.sender._id !== message.sender._id;

              return (
                <div
                  key={message._id}
                  className={`flex ${
                    isOwnMessage ? "justify-end" : "justify-start"
                  } mb-4`}
                >
                  <div
                    className={`flex items-end space-x-3 max-w-xs sm:max-w-md lg:max-w-lg xl:max-w-xl ${
                      isOwnMessage ? "flex-row-reverse space-x-reverse" : ""
                    }`}
                  >
                    {/* Avatar */}
                    {showAvatar && (
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg ring-2 ring-white">
                        <span className="text-white text-sm font-bold">
                          {message.sender.username?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    {!showAvatar && <div className="w-10"></div>}

                    {/* Message bubble */}
                    <div
                      className={`rounded-2xl px-4 py-3 shadow-lg backdrop-blur-sm relative group ${
                        isOwnMessage
                          ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                          : "bg-white/95 text-gray-900 border border-gray-200/50"
                      }`}
                    >
                      {!isOwnMessage && showAvatar && (
                        <div className="text-xs font-bold mb-2 text-blue-600">
                          {message.sender.username}
                        </div>
                      )}

                      {/* Image content */}
                      {message.messageType === "image" && message.fileUrl && (
                        <div className="mb-3 relative group/image">
                          <img
                            src={`https://sync-next.onrender.com${message.fileUrl}`}
                            alt={message.fileName}
                            className="max-w-full h-auto rounded-xl shadow-md cursor-pointer transition-transform hover:scale-105"
                            style={{ maxHeight: "300px", minWidth: "200px" }}
                            onClick={() =>
                              setShowImageModal({
                                url: message.fileUrl,
                                name: message.fileName,
                              })
                            }
                            onError={(e) => {
                              e.target.style.display = "none";
                              e.target.nextSibling.style.display = "block";
                            }}
                          />
                          <div className="hidden p-6 bg-gray-100 rounded-xl text-center">
                            <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                            <p className="text-sm text-gray-600 mb-3">
                              Image not available
                            </p>
                            <button
                              onClick={() =>
                                handleDownload(
                                  message.fileUrl,
                                  message.fileName
                                )
                              }
                              className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
                            >
                              Download
                            </button>
                          </div>
                          <div className="absolute inset-0 bg-black/0 group-hover/image:bg-black/20 transition-all rounded-xl flex items-center justify-center opacity-0 group-hover/image:opacity-100">
                            <div className="flex space-x-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowImageModal({
                                    url: message.fileUrl,
                                    name: message.fileName,
                                  });
                                }}
                                className="p-2 bg-white/90 rounded-full shadow-lg hover:bg-white transition-colors"
                                title="View full size"
                              >
                                <ZoomIn className="w-4 h-4 text-gray-700" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownload(
                                    message.fileUrl,
                                    message.fileName
                                  );
                                }}
                                className="p-2 bg-white/90 rounded-full shadow-lg hover:bg-white transition-colors"
                                title="Download"
                              >
                                <Download className="w-4 h-4 text-gray-700" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyImageUrl(message.fileUrl);
                                }}
                                className="p-2 bg-white/90 rounded-full shadow-lg hover:bg-white transition-colors"
                                title="Copy URL"
                              >
                                <Copy className="w-4 h-4 text-gray-700" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* File content */}
                      {message.messageType === "file" && message.fileUrl && (
                        <div className="mb-3 p-4 bg-white/20 rounded-xl border border-white/30 backdrop-blur-sm">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="p-2 bg-white/30 rounded-lg">
                                <File className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold">
                                  {message.fileName}
                                </p>
                                {message.fileSize && (
                                  <p className="text-xs opacity-75">
                                    {formatFileSize(message.fileSize)}
                                  </p>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() =>
                                handleDownload(
                                  message.fileUrl,
                                  message.fileName
                                )
                              }
                              className="p-2 bg-white/30 hover:bg-white/50 rounded-lg transition-colors"
                              title="Download file"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Message content */}
                      <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                        {message.content}
                      </div>

                      {/* Message time */}
                      <div
                        className={`text-xs mt-2 ${
                          isOwnMessage ? "text-blue-100" : "text-gray-500"
                        }`}
                      >
                        {formatTime(message.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {/* Typing indicator */}
        <TypingIndicator />

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-white/95 backdrop-blur-xl shadow-xl p-4 border-t border-gray-200/50 flex-shrink-0">
        {selectedFile && (
          <div className="mb-4 p-4 bg-gradient-to-r from-blue-50/80 to-purple-50/80 rounded-xl flex items-center justify-between border border-blue-200/50">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                {selectedFile.type.startsWith("image/") ? (
                  <ImageIcon className="w-5 h-5 text-blue-600" />
                ) : (
                  <File className="w-5 h-5 text-blue-600" />
                )}
              </div>
              <div>
                <span className="text-sm font-semibold text-gray-700">
                  {selectedFile.name}
                </span>
                <p className="text-xs text-gray-500">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedFile(null)}
              className="p-2 hover:bg-red-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-red-500" />
            </button>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="flex items-end space-x-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.txt,.zip,.rar"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-3 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors flex-shrink-0"
            title="Attach file"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <div className="flex-1 relative">
            <textarea
              ref={messageInputRef}
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping();
              }}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              placeholder="Type a message... (Press Enter to send, Shift+Enter for new line)"
              className="w-full px-4 py-3 pr-12 bg-gradient-to-r from-blue-50/80 to-purple-50/80 border border-blue-200/50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm resize-none min-h-[48px] max-h-32"
              disabled={!isAuthenticated}
              rows={1}
              style={{
                height: "auto",
                minHeight: "48px",
              }}
              onInput={(e) => {
                e.target.style.height = "auto";
                e.target.style.height =
                  Math.min(e.target.scrollHeight, 128) + "px";
              }}
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                title="Add emoji"
              >
                <Smile className="w-4 h-4" />
              </button>
            </div>

            {/* Emoji Picker */}
            {showEmojiPicker && (
              <EmojiPicker
                isOpen={showEmojiPicker}
                onEmojiSelect={handleEmojiSelect}
                onClose={() => setShowEmojiPicker(false)}
              />
            )}
          </div>

          <button
            type="submit"
            disabled={
              (!newMessage.trim() && !selectedFile) ||
              uploading ||
              !isAuthenticated
            }
            className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all shadow-lg flex-shrink-0"
            title="Send message"
          >
            {uploading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </form>
      </div>

      {/* Modals */}
      {showInviteModal && <InviteModal />}
      {showImageModal && (
        <ImageModal
          imageUrl={showImageModal.url}
          fileName={showImageModal.name}
          onClose={() => setShowImageModal(null)}
        />
      )}
    </div>
  );
};

export default Chat;
