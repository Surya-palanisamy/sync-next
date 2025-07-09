"use client";

import { createContext, useContext, useEffect, useState } from "react";
import io from "socket.io-client";
import { useAuth } from "./AuthContext";

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const { user, currentTeam, teams } = useAuth();

  useEffect(() => {
    if (user && teams) {
      console.log(
        "🔌 Initializing enhanced socket connection for user:",
        user.username
      );

      const newSocket = io("https://sync-next.onrender.com/", {
        transports: ["websocket", "polling"],
        timeout: 20000,
        forceNew: true,
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 10,
        maxReconnectionAttempts: 10,
      });

      newSocket.on("connect", () => {
        console.log("✅ Socket connected:", newSocket.id);
        setConnectionStatus("connected");
        setSocket(newSocket);
        setReconnectAttempts(0);

        // Authenticate user and join rooms
        console.log("🔐 Authenticating user with teams:", teams.length);
        newSocket.emit("authenticate", {
          userId: user.id,
          username: user.username,
          teams: teams,
        });
      });

      newSocket.on("authenticated", (data) => {
        console.log("✅ User authenticated successfully:", data);
        setIsAuthenticated(true);
      });

      newSocket.on("disconnect", (reason) => {
        console.log("❌ Socket disconnected:", reason);
        setConnectionStatus("disconnected");
        setIsAuthenticated(false);
      });

      newSocket.on("connect_error", (error) => {
        console.error("💥 Socket connection error:", error);
        setConnectionStatus("error");
        setReconnectAttempts((prev) => prev + 1);
      });

      newSocket.on("reconnect", (attemptNumber) => {
        console.log("🔄 Socket reconnected after", attemptNumber, "attempts");
        setConnectionStatus("connected");
        setReconnectAttempts(0);

        // Re-authenticate after reconnection
        if (user && teams) {
          newSocket.emit("authenticate", {
            userId: user.id,
            username: user.username,
            teams: teams,
          });
        }
      });

      newSocket.on("reconnect_attempt", (attemptNumber) => {
        console.log("🔄 Reconnection attempt:", attemptNumber);
        setConnectionStatus("connecting");
        setReconnectAttempts(attemptNumber);
      });

      newSocket.on("reconnect_error", (error) => {
        console.error("🔄❌ Socket reconnection error:", error);
      });

      newSocket.on("reconnect_failed", () => {
        console.error("💥 Socket reconnection failed");
        setConnectionStatus("failed");
      });

      return () => {
        console.log("🔌 Cleaning up socket connection...");
        newSocket.close();
        setSocket(null);
        setConnectionStatus("disconnected");
        setIsAuthenticated(false);
        setReconnectAttempts(0);
      };
    }
  }, [user, teams]);

  // Join new team room when current team changes
  useEffect(() => {
    if (socket && isAuthenticated && currentTeam) {
      console.log("🏠 Joining current team room:", currentTeam.name);
      socket.emit("join-team", currentTeam._id);
    }
  }, [socket, isAuthenticated, currentTeam]);

  const sendMessage = (messageData) => {
    if (socket && isAuthenticated && currentTeam) {
      console.log("💬 Sending message via socket:", {
        messageId: messageData._id,
        teamId: currentTeam._id,
        content: messageData.content?.substring(0, 50) + "...",
      });

      socket.emit("send-message", {
        ...messageData,
        teamId: currentTeam._id,
      });
      return true;
    } else {
      console.warn("⚠️ Cannot send message:", {
        hasSocket: !!socket,
        isAuthenticated,
        hasTeam: !!currentTeam,
      });
      return false;
    }
  };

  const updateTask = (taskData) => {
    if (socket && isAuthenticated && currentTeam) {
      console.log("📋 Sending task update via socket:", {
        taskId: taskData._id,
        teamId: currentTeam._id,
      });
      socket.emit("task-update", {
        ...taskData,
        teamId: currentTeam._id,
      });
    } else {
      console.warn("⚠️ Cannot update task - not connected or authenticated");
    }
  };

  const updateCalendar = (eventData) => {
    if (socket && isAuthenticated && currentTeam) {
      console.log("📅 Sending calendar update via socket:", {
        eventId: eventData._id,
        teamId: currentTeam._id,
      });
      socket.emit("calendar-update", {
        ...eventData,
        teamId: currentTeam._id,
      });
    } else {
      console.warn(
        "⚠️ Cannot update calendar - not connected or authenticated"
      );
    }
  };

  const updateNote = (noteData) => {
    if (socket && isAuthenticated && currentTeam) {
      console.log("📝 Sending note update via socket:", {
        noteId: noteData._id,
        teamId: currentTeam._id,
      });
      socket.emit("note-update", {
        ...noteData,
        teamId: currentTeam._id,
      });
    } else {
      console.warn("⚠️ Cannot update note - not connected or authenticated");
    }
  };

  const joinTeamRoom = (teamId) => {
    if (socket && isAuthenticated) {
      console.log("🏠 Manually joining team room:", teamId);
      socket.emit("join-team", teamId);
    }
  };

  const value = {
    socket,
    onlineUsers,
    connectionStatus,
    isAuthenticated,
    reconnectAttempts,
    sendMessage,
    updateTask,
    updateCalendar,
    updateNote,
    joinTeamRoom,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};
