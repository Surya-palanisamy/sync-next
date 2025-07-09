"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { useSocket } from "../../contexts/SocketContext.jsx";
import {
  Menu,
  Bell,
  Search,
  LogOut,
  User,
  Settings,
  X,
  Check,
  UserPlus,
  Clock,
} from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";

const Header = ({ onMenuClick }) => {
  const { user, logout, fetchTeams, switchTeam } = useAuth();
  const { joinTeamRoom } = useSocket();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);
  const userMenuRef = useRef(null);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const pendingInvitations = invitations.filter(
    (inv) => inv.status === "pending"
  ).length;
  const totalBadgeCount = unreadCount + pendingInvitations;

  useEffect(() => {
    fetchNotifications();
    fetchInvitations();
    // Poll for new notifications and invitations every 30 seconds
    const interval = setInterval(() => {
      fetchNotifications();
      fetchInvitations();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await axios.get(
        "https://sync-next.onrender.com/api/notifications"
      );
      setNotifications(response.data);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const fetchInvitations = async () => {
    try {
      const response = await axios.get(
        "https://sync-next.onrender.com/api/invitations?status=pending"
      );
      setInvitations(response.data);
    } catch (error) {
      console.error("Error fetching invitations:", error);
    }
  };

  const handleAcceptInvitation = async (invitationId, teamData) => {
    try {
      console.log("✅ Accepting invitation:", invitationId);
      const response = await axios.put(
        `https://sync-next.onrender.com/api/invitations/${invitationId}/accept`
      );

      toast.success("Invitation accepted!", {
        icon: "🎉",
        style: {
          borderRadius: "12px",
          background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
          color: "#fff",
        },
      });

      // Refresh invitations and teams
      await fetchInvitations();
      await fetchTeams();

      // Join the new team's socket room
      if (response.data.team) {
        console.log("🏠 Joining new team socket room:", response.data.team._id);
        joinTeamRoom(response.data.team._id);

        // Switch to the new team
        switchTeam(response.data.team);
      }

      console.log("✅ Invitation acceptance complete");
    } catch (error) {
      console.error("❌ Error accepting invitation:", error);
      toast.error("Failed to accept invitation");
    }
  };

  const handleDeclineInvitation = async (invitationId) => {
    try {
      await axios.put(
        `https://sync-next.onrender.com/api/invitations/${invitationId}/decline`
      );
      toast.success("Invitation declined");
      fetchInvitations();
    } catch (error) {
      console.error("Error declining invitation:", error);
      toast.error("Failed to decline invitation");
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await axios.put(
        `https://sync-next.onrender.com/api/notifications/${notificationId}/read`
      );
      setNotifications((prev) =>
        prev.map((notification) =>
          notification._id === notificationId
            ? { ...notification, read: true }
            : notification
        )
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
      toast.error("Failed to mark notification as read");
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.put(
        "https://sync-next.onrender.com/api/notifications/read-all"
      );
      setNotifications((prev) =>
        prev.map((notification) => ({ ...notification, read: true }))
      );
      toast.success("All notifications marked as read");
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      toast.error("Failed to mark all notifications as read");
    }
  };

  const removeNotification = async (notificationId) => {
    try {
      await axios.delete(
        `https://sync-next.onrender.com/api/notifications/${notificationId}`
      );
      setNotifications((prev) =>
        prev.filter((notification) => notification._id !== notificationId)
      );
      toast.success("Notification removed");
    } catch (error) {
      console.error("Error removing notification:", error);
      toast.error("Failed to remove notification");
    }
  };

  return (
    <header className="bg-white/95 backdrop-blur-xl shadow-xl border-b border-violet-100/50 sticky top-0 z-40">
      <div className="flex items-center justify-between h-16 px-6">
        <div className="flex items-center">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gradient-to-r hover:from-violet-50 hover:to-pink-50 transition-all duration-200"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="hidden md:flex items-center ml-4">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-violet-400 w-4 h-4 group-focus-within:text-violet-600 transition-colors" />
              <input
                type="text"
                placeholder="Search anything..."
                className="pl-10 pr-4 py-2.5 bg-gradient-to-r from-violet-50/80 to-pink-50/80 backdrop-blur-sm border border-violet-200/50 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent w-72 transition-all duration-200 focus:w-80"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gradient-to-r hover:from-violet-50 hover:to-pink-50 rounded-xl relative transition-all transform hover:scale-110 duration-200"
            >
              <Bell className="w-5 h-5" />
              {totalBadgeCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center text-xs text-white font-bold animate-pulse shadow-lg">
                  {totalBadgeCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-3 w-96 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-violet-200/50 z-50 overflow-hidden animate-in slide-in-from-top-2 duration-200">
                <div className="p-4 border-b border-violet-100/50 bg-gradient-to-r from-violet-50/80 to-pink-50/80">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        Notifications & Invitations
                      </h3>
                      <p className="text-sm text-violet-600">
                        {unreadCount} notifications • {pendingInvitations}{" "}
                        invitations
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-xs text-violet-600 hover:text-violet-800 font-medium px-2 py-1 rounded-lg hover:bg-violet-100 transition-colors"
                        >
                          Mark all read
                        </button>
                      )}
                      <button
                        onClick={() => setShowNotifications(false)}
                        className="p-1 hover:bg-violet-100 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto">
                  {/* Invitations Section */}
                  {invitations.length > 0 && (
                    <div className="border-b border-gray-100/50">
                      <div className="p-3 bg-gradient-to-r from-blue-50/50 to-purple-50/50">
                        <h4 className="text-sm font-bold text-gray-900 flex items-center">
                          <UserPlus className="w-4 h-4 mr-2 text-blue-600" />
                          Team Invitations
                        </h4>
                      </div>
                      {invitations.map((invitation) => (
                        <div
                          key={invitation._id}
                          className="p-4 border-b border-gray-100/50 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/50 transition-all"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="text-sm font-semibold text-gray-900">
                                Join {invitation.team.name}
                              </h4>
                              <p className="text-sm text-gray-600 mt-1">
                                Invited by {invitation.fromUser.username}
                              </p>
                              <p className="text-xs text-blue-500 mt-2 flex items-center">
                                <Clock className="w-3 h-3 mr-1" />
                                {new Date(
                                  invitation.createdAt
                                ).toLocaleString()}
                              </p>
                            </div>
                            <div className="flex items-center space-x-2 ml-3">
                              <button
                                onClick={() =>
                                  handleAcceptInvitation(
                                    invitation._id,
                                    invitation.team
                                  )
                                }
                                className="p-1.5 bg-green-100 hover:bg-green-200 rounded-lg transition-colors"
                                title="Accept"
                              >
                                <Check className="w-3 h-3 text-green-600" />
                              </button>
                              <button
                                onClick={() =>
                                  handleDeclineInvitation(invitation._id)
                                }
                                className="p-1.5 bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
                                title="Decline"
                              >
                                <X className="w-3 h-3 text-red-600" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Notifications Section */}
                  {notifications.length > 0
                    ? notifications.slice(0, 10).map((notification) => (
                        <div
                          key={notification._id}
                          className={`p-4 border-b border-gray-100/50 hover:bg-gradient-to-r hover:from-violet-50/50 hover:to-pink-50/50 transition-all cursor-pointer group ${
                            !notification.read ? "bg-violet-50/30" : ""
                          }`}
                          onClick={() => markAsRead(notification._id)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="text-sm font-semibold text-gray-900 group-hover:text-violet-700 transition-colors">
                                {notification.title}
                              </h4>
                              <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                                {notification.message}
                              </p>
                              <p className="text-xs text-violet-500 mt-2 font-medium">
                                {new Date(
                                  notification.createdAt
                                ).toLocaleString()}
                              </p>
                            </div>
                            <div className="flex items-center space-x-2 ml-3">
                              {!notification.read && (
                                <div className="w-2.5 h-2.5 bg-gradient-to-r from-violet-500 to-pink-500 rounded-full animate-pulse"></div>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeNotification(notification._id);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded-lg transition-all"
                              >
                                <X className="w-3 h-3 text-red-400" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    : !invitations.length && (
                        <div className="p-8 text-center">
                          <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-gray-500 font-medium">
                            No notifications
                          </p>
                        </div>
                      )}
                </div>

                {(notifications.length > 0 || invitations.length > 0) && (
                  <div className="p-3 bg-gradient-to-r from-violet-50/80 to-pink-50/80 text-center border-t border-violet-100/50">
                    <button className="text-sm text-violet-600 hover:text-violet-800 font-semibold transition-colors">
                      View all notifications
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 p-2 rounded-xl hover:bg-gradient-to-r hover:from-violet-50 hover:to-pink-50 transition-all duration-200"
            >
              <div className="w-9 h-9 bg-gradient-to-r from-violet-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg ring-2 ring-white">
                <span className="text-white text-sm font-bold">
                  {user?.username?.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="hidden md:block text-sm font-semibold text-gray-700">
                {user?.username}
              </span>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-52 bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl border border-violet-200/50 z-50 overflow-hidden animate-in slide-in-from-top-2 duration-200">
                <div className="py-2">
                  <button className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-violet-50 hover:to-pink-50 transition-all group">
                    <User className="w-4 h-4 mr-3 group-hover:text-violet-600 transition-colors" />
                    Profile Settings
                  </button>
                  <button className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-violet-50 hover:to-pink-50 transition-all group">
                    <Settings className="w-4 h-4 mr-3 group-hover:text-violet-600 transition-colors" />
                    Preferences
                  </button>
                  <hr className="my-2 border-violet-200/50" />
                  <button
                    onClick={logout}
                    className="flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 transition-all group"
                  >
                    <LogOut className="w-4 h-4 mr-3 group-hover:text-red-700 transition-colors" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
