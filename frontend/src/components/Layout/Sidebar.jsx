"use client";

import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext.jsx";
import {
  Home,
  CheckSquare,
  Calendar,
  MessageCircle,
  FileText,
  X,
  Plus,
  ChevronDown,
  GripVertical,
} from "lucide-react";

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { user, currentTeam, teams, switchTeam, createTeam } = useAuth();
  const [showTeamDropdown, setShowTeamDropdown] = useState(false);
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [isResizing, setIsResizing] = useState(false);
  const [newTeamData, setNewTeamData] = useState({ name: "", description: "" });
  const sidebarRef = useRef(null);

  const navigation = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: Home,
      gradient: "from-violet-500 via-purple-500 to-pink-500",
    },
    {
      name: "Tasks",
      href: "/tasks",
      icon: CheckSquare,
      gradient: "from-emerald-500 via-teal-500 to-cyan-500",
    },
    {
      name: "Calendar",
      href: "/calendar",
      icon: Calendar,
      gradient: "from-rose-500 via-pink-500 to-fuchsia-500",
    },
    {
      name: "Chat",
      href: "/chat",
      icon: MessageCircle,
      gradient: "from-blue-500 via-indigo-500 to-purple-500",
    },
    {
      name: "Notes",
      href: "/notes",
      icon: FileText,
      gradient: "from-orange-500 via-red-500 to-pink-500",
    },
  ];

  const isActive = (path) => location.pathname === path;

  const handleMouseDown = (e) => {
    setIsResizing(true);
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;

      const newWidth = e.clientX;
      if (newWidth >= 200 && newWidth <= 400) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!newTeamData.name.trim()) return;

    const result = await createTeam(newTeamData);
    if (result.success) {
      setShowCreateTeamModal(false);
      setNewTeamData({ name: "", description: "" });
      setShowTeamDropdown(false);
    }
  };

  const CreateTeamModal = () => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-md border border-gray-200/50">
        <div className="p-6 border-b border-gray-200/50 bg-gradient-to-r from-violet-50/80 to-pink-50/80">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-pink-600 bg-clip-text text-transparent">
            Create New Team
          </h2>
        </div>

        <form onSubmit={handleCreateTeam} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Team Name *
            </label>
            <input
              type="text"
              value={newTeamData.name}
              onChange={(e) =>
                setNewTeamData((prev) => ({ ...prev, name: e.target.value }))
              }
              className="w-full px-4 py-3 border border-gray-300/50 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-gradient-to-r from-violet-50/30 to-pink-50/30"
              placeholder="Enter team name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={newTeamData.description}
              onChange={(e) =>
                setNewTeamData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              rows={3}
              className="w-full px-4 py-3 border border-gray-300/50 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-gradient-to-r from-violet-50/30 to-pink-50/30"
              placeholder="Team description (optional)"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowCreateTeamModal(false);
                setNewTeamData({ name: "", description: "" });
              }}
              className="px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-xl hover:from-violet-600 hover:to-pink-600 font-medium shadow-lg transition-all"
            >
              Create Team
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <div
        ref={sidebarRef}
        className={`
        fixed inset-y-0 left-0 z-50 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:inset-0
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}
        style={{ width: `${sidebarWidth}px` }}
      >
        <div
          className="absolute top-0 right-0 w-1 h-full bg-gradient-to-b from-violet-500 to-pink-500 cursor-col-resize hover:w-2 transition-all duration-200 hidden lg:block"
          onMouseDown={handleMouseDown}
        >
          <div className="absolute top-1/2 right-0 transform -translate-y-1/2 translate-x-1/2">
            <GripVertical className="w-4 h-4 text-gray-400" />
          </div>
        </div>

        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 bg-gradient-to-r from-violet-600 to-pink-600">
          <h1 className="text-xl font-bold text-white">SyncNext</h1>
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-md text-white hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {currentTeam && (
          <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-violet-50 to-pink-50">
            <div className="relative">
              <button
                onClick={() => setShowTeamDropdown(!showTeamDropdown)}
                className="w-full flex items-center justify-between p-3 text-left bg-white rounded-xl hover:shadow-lg transition-all duration-200 border border-violet-200"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {currentTeam.name}
                  </p>
                  <p className="text-xs text-violet-600">
                    {currentTeam.members?.length} members
                  </p>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-violet-500 transition-transform duration-200 ${
                    showTeamDropdown ? "rotate-180" : ""
                  }`}
                />
              </button>

              {showTeamDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-violet-200 rounded-xl shadow-xl z-10 overflow-hidden">
                  {teams.map((team) => (
                    <button
                      key={team._id}
                      onClick={() => {
                        switchTeam(team);
                        setShowTeamDropdown(false);
                      }}
                      className={`w-full text-left p-3 hover:bg-gradient-to-r hover:from-violet-50 hover:to-pink-50 transition-all ${
                        currentTeam._id === team._id
                          ? "bg-gradient-to-r from-violet-100 to-pink-100 text-violet-700"
                          : ""
                      }`}
                    >
                      <p className="text-sm font-medium">{team.name}</p>
                      <p className="text-xs text-gray-500">
                        {team.members?.length} members
                      </p>
                    </button>
                  ))}
                  <div className="border-t border-violet-200">
                    <button
                      onClick={() => {
                        setShowCreateTeamModal(true);
                        setShowTeamDropdown(false);
                      }}
                      className="w-full text-left p-3 hover:bg-gradient-to-r hover:from-violet-50 hover:to-pink-50 text-violet-600 flex items-center transition-all"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create New Team
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <nav className="flex-1 px-4 py-6 space-y-3 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={onClose}
                className={`
                  flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-300 group relative overflow-hidden
                  ${
                    active
                      ? `bg-gradient-to-r ${item.gradient} text-white shadow-lg transform scale-105`
                      : "text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 hover:text-gray-900 hover:scale-102 hover:shadow-md"
                  }
                `}
              >
                <Icon
                  className={`w-5 h-5 mr-3 transition-all duration-300 group-hover:scale-110 ${
                    active ? "text-white" : ""
                  }`}
                />
                <span className="truncate">{item.name}</span>
                {active && (
                  <div className="ml-auto flex items-center space-x-1">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    <div className="w-1 h-1 bg-white/70 rounded-full animate-pulse delay-100" />
                  </div>
                )}

                {!active && (
                  <div
                    className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-xl`}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200 bg-gradient-to-r from-violet-50 to-pink-50">
          <div className="flex items-center p-3 bg-white rounded-xl shadow-sm">
            <div className="w-10 h-10 bg-gradient-to-r from-violet-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-white text-sm font-bold">
                {user?.username?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {user?.username}
              </p>
              <p className="text-xs text-violet-600">{user?.role}</p>
            </div>
          </div>
        </div>
      </div>

      {showCreateTeamModal && <CreateTeamModal />}
    </>
  );
};

export default Sidebar;
