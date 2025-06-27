"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useSocket } from "../../contexts/SocketContext";
import axios from "axios";
import {
  Calendar,
  CheckSquare,
  Users,
  TrendingUp,
  Target,
  Activity,
  Search,
  UserPlus,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

const Dashboard = () => {
  const { currentTeam, fetchTeams } = useAuth();
  const { onlineUsers } = useSocket();
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    upcomingEvents: 0,
    teamMembers: 0,
  });
  const [recentTasks, setRecentTasks] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [searchUsers, setSearchUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (currentTeam) {
      fetchDashboardData();
    }
  }, [currentTeam]);

  const fetchDashboardData = async () => {
    if (!currentTeam) {
      setStats({
        totalTasks: 0,
        completedTasks: 0,
        upcomingEvents: 0,
        teamMembers: 0,
      });
      return;
    }

    try {
      setLoading(true);

      const [tasksResponse, eventsResponse] = await Promise.all([
        axios.get(
          `https://sync-project.glitch.me/api/tasks/team/${currentTeam._id}`
        ),
        axios.get(
          `https://sync-project.glitch.me/api/calendar/team/${currentTeam._id}`
        ),
      ]);

      const tasks = tasksResponse.data;
      const events = eventsResponse.data;

      const completedTasks = tasks.filter(
        (task) => task.status === "Done"
      ).length;
      const upcomingEvents = events.filter(
        (event) => new Date(event.startDate) > new Date()
      ).length;

      setStats({
        totalTasks: tasks.length,
        completedTasks,
        upcomingEvents,
        teamMembers: currentTeam.members?.length || 0,
      });

      setRecentTasks(tasks.slice(0, 5));

      const sortedEvents = events
        .filter((event) => new Date(event.startDate) > new Date())
        .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
        .slice(0, 3);
      setUpcomingEvents(sortedEvents);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setStats({
        totalTasks: 0,
        completedTasks: 0,
        upcomingEvents: 0,
        teamMembers: currentTeam.members?.length || 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const searchUsersForInvite = async (term) => {
    if (!term.trim()) {
      setSearchUsers([]);
      return;
    }

    try {
      console.log("🔍 Searching users with term:", term);
      const response = await axios.get(
        `https://sync-project.glitch.me/api/users?search=${term}`
      );
      console.log("📋 Search results:", response.data);

      // Filter out users who are already team members
      const filteredUsers = response.data.filter(
        (searchUser) =>
          !currentTeam?.members?.some(
            (member) => member.user._id === searchUser._id
          )
      );
      console.log(
        "✅ Filtered users (excluding existing members):",
        filteredUsers
      );
      setSearchUsers(filteredUsers);
    } catch (error) {
      console.error("❌ Error searching users:", error);
      toast.error("Failed to search users");
    }
  };

  const sendInvitationToUser = async (userId) => {
    if (!currentTeam) {
      toast.error("No team selected");
      return;
    }

    if (inviting) {
      console.log("⏳ Already sending invitation, skipping...");
      return;
    }

    try {
      setInviting(true);
      console.log("📤 Sending invitation...");
      console.log("📊 Invitation data:", {
        userId,
        teamId: currentTeam._id,
        teamName: currentTeam.name,
      });

      const response = await axios.post(
        `https://sync-project.glitch.me/api/users/teams/${currentTeam._id}/invite`,
        {
          userId: userId,
          message: `You've been invited to join ${currentTeam.name}`,
        }
      );

      console.log("✅ Invitation sent:", response.data);

      // Create notification for invited user
      try {
        const notificationResponse = await axios.post(
          "https://sync-project.glitch.me/api/notifications",
          {
            userId: userId,
            title: "Team Invitation Sent",
            message: `An invitation to join ${currentTeam.name} has been sent`,
            type: "invitation",
          }
        );
        console.log("📧 Notification created:", notificationResponse.data);
      } catch (notifError) {
        console.error(
          "⚠️ Error creating notification (non-critical):",
          notifError
        );
      }

      toast.success("Invitation sent successfully!", {
        icon: "📤",
        style: {
          borderRadius: "12px",
          background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
          color: "#fff",
        },
      });

      setShowQuickAddModal(false);
      setSearchTerm("");
      setSearchUsers([]);
    } catch (error) {
      console.error("💥 Error sending invitation:", error);

      let errorMessage = "Failed to send invitation";

      if (error.response) {
        console.log("📋 Error response:", {
          status: error.response.status,
          data: error.response.data,
        });
        errorMessage =
          error.response.data?.message ||
          `Server error (${error.response.status})`;
      } else if (error.request) {
        console.log("📡 No response received:", error.request);
        errorMessage = "No response from server. Please check your connection.";
      } else {
        console.log("⚙️ Request setup error:", error.message);
        errorMessage = error.message;
      }

      toast.error(errorMessage, {
        icon: "❌",
        style: {
          borderRadius: "12px",
          background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
          color: "#fff",
        },
      });
    } finally {
      setInviting(false);
      console.log("🏁 Invitation process completed");
    }
  };

  const QuickAddModal = () => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-md border border-gray-200/50">
        <div className="p-6 border-b border-gray-200/50 bg-gradient-to-r from-violet-50/80 to-pink-50/80">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-pink-600 bg-clip-text text-transparent">
              Send Team Invitation
            </h2>
            <button
              onClick={() => {
                setShowQuickAddModal(false);
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
              className="w-full pl-10 pr-4 py-3 border border-gray-300/50 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              placeholder="Search by username or email..."
            />
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2">
            {searchUsers.map((searchUser) => (
              <div
                key={searchUser._id}
                className="flex items-center justify-between p-3 bg-gradient-to-r from-violet-50/50 to-pink-50/50 rounded-xl hover:from-violet-100/50 hover:to-pink-100/50 transition-all"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-violet-500 to-pink-500 rounded-full flex items-center justify-center">
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
                  onClick={() => sendInvitationToUser(searchUser._id)}
                  disabled={inviting}
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {inviting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <span>Send Invite</span>
                  )}
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

  const StatCard = ({
    title,
    value,
    icon: Icon,
    gradient,
    trend,
    description,
  }) => (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-gray-200/50 hover:shadow-2xl transition-all duration-300 group">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mb-2">{value}</p>
          {trend && (
            <div className="flex items-center">
              <TrendingUp className="w-4 h-4 text-emerald-500 mr-1" />
              <span className="text-sm text-emerald-600 font-medium">
                {trend}
              </span>
            </div>
          )}
          {description && (
            <p className="text-xs text-gray-500 mt-1">{description}</p>
          )}
        </div>
        <div
          className={`p-4 rounded-2xl bg-gradient-to-r ${gradient} shadow-lg group-hover:scale-110 transition-transform duration-300`}
        >
          <Icon className="w-8 h-8 text-white" />
        </div>
      </div>
    </div>
  );

  const TaskItem = ({ task }) => (
    <div className="flex items-center justify-between p-4 hover:bg-gradient-to-r hover:from-violet-50 hover:to-pink-50 rounded-xl transition-all duration-200 group">
      <div className="flex items-center space-x-4">
        <div
          className={`w-3 h-3 rounded-full ${
            task.status === "Done"
              ? "bg-emerald-500 shadow-lg shadow-emerald-200"
              : task.status === "In Progress"
              ? "bg-amber-500 shadow-lg shadow-amber-200"
              : "bg-gray-400 shadow-lg shadow-gray-200"
          }`}
        />
        <div>
          <p className="text-sm font-semibold text-gray-900 group-hover:text-violet-700 transition-colors">
            {task.title}
          </p>
          <p className="text-xs text-gray-500">
            {task.assignedTo
              ? `Assigned to ${task.assignedTo.username}`
              : "Unassigned"}
          </p>
        </div>
      </div>
      <span
        className={`px-3 py-1 text-xs font-bold rounded-full ${
          task.priority === "High"
            ? "bg-gradient-to-r from-red-500 to-pink-500 text-white"
            : task.priority === "Medium"
            ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-white"
            : "bg-gradient-to-r from-green-500 to-teal-500 text-white"
        }`}
      >
        {task.priority}
      </span>
    </div>
  );

  const EventItem = ({ event }) => (
    <div className="flex items-center space-x-4 p-4 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 rounded-xl transition-all duration-200 group">
      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
        <Calendar className="w-6 h-6 text-white" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
          {event.title}
        </p>
        <p className="text-xs text-gray-500">
          {new Date(event.startDate).toLocaleDateString()} at{" "}
          {new Date(event.startDate).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-transparent bg-gradient-to-r from-violet-500 to-pink-500 rounded-full"></div>
          <div className="absolute inset-0 animate-spin rounded-full h-16 w-16 border-4 border-transparent border-t-white rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-gray-600 mt-2 text-lg">
            Welcome back! Here's what's happening with your team.
          </p>
        </div>
        <button
          onClick={() => setShowQuickAddModal(true)}
          className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-8 py-3 rounded-2xl hover:from-blue-600 hover:to-purple-600 flex items-center space-x-3 shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold"
        >
          <UserPlus className="w-5 h-5" />
          <span>Send Invite</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Tasks"
          value={stats.totalTasks}
          icon={Target}
          gradient="from-blue-500 to-cyan-500"
          trend="+12% from last week"
          description="Active tasks in progress"
        />
        <StatCard
          title="Completed Tasks"
          value={stats.completedTasks}
          icon={CheckSquare}
          gradient="from-emerald-500 to-teal-500"
          trend="+8% from last week"
          description="Successfully finished"
        />
        <StatCard
          title="Upcoming Events"
          value={stats.upcomingEvents}
          icon={Calendar}
          gradient="from-purple-500 to-pink-500"
          description="Scheduled meetings"
        />
        <StatCard
          title="Team Members"
          value={stats.teamMembers}
          icon={Users}
          gradient="from-orange-500 to-red-500"
          description="Active collaborators"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Tasks */}
        <div className="lg:col-span-2 bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200/50">
          <div className="p-6 border-b border-gray-100/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  Recent Tasks
                </h2>
              </div>
              <button className="text-violet-600 hover:text-violet-700 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-violet-50 transition-colors">
                View All
              </button>
            </div>
          </div>
          <div className="p-6">
            {recentTasks.length > 0 ? (
              <div className="space-y-2">
                {recentTasks.map((task) => (
                  <TaskItem key={task._id} task={task} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-r from-gray-200 to-gray-300 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <CheckSquare className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium">No tasks yet</p>
                <p className="text-gray-400 text-sm mt-1">
                  Create your first task to get started!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Upcoming Events */}
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200/50">
            <div className="p-6 border-b border-gray-100/50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  Upcoming Events
                </h2>
              </div>
            </div>
            <div className="p-6">
              {upcomingEvents.length > 0 ? (
                <div className="space-y-3">
                  {upcomingEvents.map((event) => (
                    <EventItem key={event._id} event={event} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Calendar className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500 font-medium">
                    No upcoming events
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Team Activity */}
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200/50">
            <div className="p-6 border-b border-gray-100/50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  Team Activity
                </h2>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {currentTeam?.members?.slice(0, 5).map((member) => (
                  <div
                    key={member.user._id}
                    className="flex items-center space-x-3 p-3 hover:bg-gradient-to-r hover:from-orange-50 hover:to-red-50 rounded-xl transition-all duration-200 group"
                  >
                    <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center shadow-lg">
                      <span className="text-white text-sm font-bold">
                        {member.user.username?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900 group-hover:text-orange-700 transition-colors">
                        {member.user.username}
                      </p>
                      <p className="text-xs text-gray-500">{member.role}</p>
                    </div>
                    <div
                      className={`w-3 h-3 rounded-full ${
                        member.user.isOnline
                          ? "bg-emerald-500 shadow-lg shadow-emerald-200"
                          : "bg-gray-300"
                      }`}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Add Modal */}
      {showQuickAddModal && <QuickAddModal />}
    </div>
  );
};

export default Dashboard;
