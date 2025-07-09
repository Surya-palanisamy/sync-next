"use client";

import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { useSocket } from "../../contexts/SocketContext.jsx";
import axios from "axios";
import TaskModal from "./TaskModal.jsx";
import {
  Plus,
  Search,
  Calendar,
  Filter,
  Zap,
  TrendingUp,
  Clock,
} from "lucide-react";
import toast from "react-hot-toast";

const Tasks = () => {
  const { currentTeam } = useAuth();
  const { socket, updateTask } = useSocket();
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBy, setFilterBy] = useState("all");

  const columns = {
    "To-Do": {
      title: "To Do",
      gradient: "from-slate-500 to-gray-600",
      bgGradient: "from-slate-50/80 to-gray-100/80",
      borderColor: "border-slate-200",
      accentColor: "bg-slate-500",
      lightAccent: "bg-slate-100",
      icon: Clock,
    },
    "In Progress": {
      title: "In Progress",
      gradient: "from-amber-500 to-orange-600",
      bgGradient: "from-amber-50/80 to-orange-100/80",
      borderColor: "border-amber-200",
      accentColor: "bg-amber-500",
      lightAccent: "bg-amber-100",
      icon: TrendingUp,
    },
    Done: {
      title: "Done",
      gradient: "from-emerald-500 to-teal-600",
      bgGradient: "from-emerald-50/80 to-teal-100/80",
      borderColor: "border-emerald-200",
      accentColor: "bg-emerald-500",
      lightAccent: "bg-emerald-100",
      icon: Zap,
    },
  };

  useEffect(() => {
    if (currentTeam) {
      fetchTasks();
    }
  }, [currentTeam]);

  useEffect(() => {
    if (socket && currentTeam) {
      console.log(
        "🔄 Setting up task update listener for team:",
        currentTeam.name
      );

      const handleTaskUpdate = (updatedTask) => {
        console.log("📋 Received task update via socket:", updatedTask);

        if (updatedTask.teamId === currentTeam._id) {
          setTasks((prev) => {
            const taskExists = prev.find(
              (task) => task._id === updatedTask._id
            );
            if (taskExists) {
              // Update existing task
              return prev.map((task) =>
                task._id === updatedTask._id ? updatedTask : task
              );
            } else {
              // Add new task
              return [...prev, updatedTask];
            }
          });
        }
      };

      socket.on("task-updated", handleTaskUpdate);

      return () => {
        console.log("🧹 Cleaning up task update listener");
        socket.off("task-updated", handleTaskUpdate);
      };
    }
  }, [socket, currentTeam]);

  useEffect(() => {
    filterTasks();
  }, [tasks, searchTerm, filterBy]);

  const fetchTasks = async () => {
    if (!currentTeam) {
      setTasks([]);
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get(
        `https://sync-next.onrender.com/api/tasks/team/${currentTeam._id}`
      );
      setTasks(response.data);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast.error("Failed to fetch tasks");
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const filterTasks = () => {
    let filtered = tasks;

    if (searchTerm) {
      filtered = filtered.filter(
        (task) =>
          task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          task.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterBy !== "all") {
      filtered = filtered.filter((task) => task.status === filterBy);
    }

    setFilteredTasks(filtered);
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const { draggableId, destination } = result;
    const newStatus = destination.droppableId;

    try {
      const response = await axios.put(
        `https://sync-next.onrender.com/api/tasks/${draggableId}`,
        {
          status: newStatus,
        }
      );

      setTasks((prev) =>
        prev.map((task) =>
          task._id === draggableId ? { ...task, status: newStatus } : task
        )
      );

      // Broadcast update via socket
      updateTask(response.data);

      toast.success("Task status updated", {
        icon: "🚀",
        style: {
          borderRadius: "12px",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "#fff",
        },
      });
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task");
    }
  };

  const handleCreateTask = async (taskData) => {
    if (!currentTeam) {
      toast.error("Please select a team first");
      return;
    }

    try {
      const response = await axios.post(
        "https://sync-next.onrender.com/api/tasks",
        {
          ...taskData,
          teamId: currentTeam._id,
        }
      );

      setTasks((prev) => [response.data, ...prev]);

      // Broadcast update via socket
      updateTask(response.data);

      toast.success("Task created successfully", {
        icon: "✨",
        style: {
          borderRadius: "12px",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "#fff",
        },
      });
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error("Failed to create task");
    }
  };

  const handleUpdateTask = async (taskId, taskData) => {
    try {
      const response = await axios.put(
        `https://sync-next.onrender.com/api/tasks/${taskId}`,
        taskData
      );

      setTasks((prev) =>
        prev.map((task) => (task._id === taskId ? response.data : task))
      );

      // Broadcast update via socket
      updateTask(response.data);

      toast.success("Task updated successfully", {
        icon: "🎉",
        style: {
          borderRadius: "12px",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "#fff",
        },
      });
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task");
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await axios.delete(`https://sync-next.onrender.com/api/tasks/${taskId}`);
      setTasks((prev) => prev.filter((task) => task._id !== taskId));

      // Broadcast deletion via socket
      updateTask({ _id: taskId, deleted: true, teamId: currentTeam._id });

      toast.success("Task deleted successfully", {
        icon: "🗑️",
        style: {
          borderRadius: "12px",
          background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
          color: "#fff",
        },
      });
    } catch (error) {
      console.error("Error deleting task:", error);
      toast.error("Failed to delete task");
    }
  };

  const TaskCard = ({ task, index }) => (
    <Draggable draggableId={task._id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-5 mb-4 cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.02] hover:-translate-y-1 group ${
            snapshot.isDragging
              ? "shadow-2xl scale-105 rotate-2 ring-2 ring-violet-300"
              : ""
          }`}
          onClick={() => {
            setSelectedTask(task);
            setShowTaskModal(true);
          }}
          style={provided.draggableProps.style}
        >
          {/* Task Header */}
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-900 line-clamp-2 flex-1 mr-3 group-hover:text-violet-700 transition-colors leading-relaxed">
              {task.title}
            </h3>
            <span
              className={`px-3 py-1.5 text-xs font-bold rounded-full whitespace-nowrap shadow-sm ${
                task.priority === "Critical"
                  ? "bg-gradient-to-r from-red-500 to-pink-500 text-white"
                  : task.priority === "High"
                  ? "bg-gradient-to-r from-orange-500 to-red-500 text-white"
                  : task.priority === "Medium"
                  ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-white"
                  : "bg-gradient-to-r from-green-500 to-teal-500 text-white"
              }`}
            >
              {task.priority}
            </span>
          </div>

          {/* Task Description */}
          {task.description && (
            <p className="text-xs text-gray-600 mb-4 line-clamp-2 leading-relaxed bg-gray-50/50 rounded-lg p-2">
              {task.description}
            </p>
          )}

          {/* Task Meta Info */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              {task.assignedTo && (
                <div className="flex items-center space-x-2 bg-gradient-to-r from-violet-100/80 to-pink-100/80 rounded-full px-3 py-1.5 border border-violet-200/50">
                  <div className="w-6 h-6 bg-gradient-to-r from-violet-500 to-pink-500 rounded-full flex items-center justify-center shadow-sm">
                    <span className="text-white text-xs font-bold">
                      {task.assignedTo.username?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-xs text-violet-700 font-semibold truncate max-w-20">
                    {task.assignedTo.username}
                  </span>
                </div>
              )}
            </div>

            {task.dueDate && (
              <div className="flex items-center space-x-1 text-xs text-gray-500 bg-gray-100/80 rounded-full px-2.5 py-1.5 border border-gray-200/50">
                <Calendar className="w-3 h-3" />
                <span className="font-medium">
                  {new Date(task.dueDate).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>

          {/* Task Tags */}
          {task.tags && task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {task.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="px-2.5 py-1 text-xs bg-gradient-to-r from-blue-100/80 to-purple-100/80 text-blue-700 rounded-full font-semibold border border-blue-200/50"
                >
                  {tag}
                </span>
              ))}
              {task.tags.length > 3 && (
                <span className="px-2.5 py-1 text-xs bg-gradient-to-r from-gray-100/80 to-gray-200/80 text-gray-600 rounded-full font-semibold border border-gray-200/50">
                  +{task.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </Draggable>
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
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
            Task Management
          </h1>
          <p className="text-gray-600 mt-2 text-lg">
            Organize and track your team's progress efficiently
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedTask(null);
            setShowTaskModal(true);
          }}
          className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-8 py-3 rounded-2xl hover:from-emerald-600 hover:to-teal-600 flex items-center space-x-3 shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold"
        >
          <Plus className="w-5 h-5" />
          <span>Create Task</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-gray-200/50">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-emerald-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search tasks by title or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 border border-gray-300/50 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-gradient-to-r from-emerald-50/50 to-teal-50/50 backdrop-blur-sm font-medium"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 text-emerald-400 w-5 h-5" />
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value)}
              className="pl-12 pr-8 py-3.5 border border-gray-300/50 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-gradient-to-r from-emerald-50/50 to-teal-50/50 backdrop-blur-sm min-w-[180px] font-medium"
            >
              <option value="all">All Tasks</option>
              <option value="To-Do">To Do</option>
              <option value="In Progress">In Progress</option>
              <option value="Done">Done</option>
            </select>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {Object.entries(columns).map(([status, column]) => {
            const Icon = column.icon;
            const columnTasks = filteredTasks.filter(
              (task) => task.status === status
            );

            return (
              <div
                key={status}
                className={`bg-gradient-to-br ${column.bgGradient} backdrop-blur-sm rounded-2xl p-6 border-2 ${column.borderColor} shadow-xl min-h-[600px]`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200/50">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-10 h-10 rounded-xl ${column.accentColor} flex items-center justify-center shadow-lg`}
                    >
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="font-bold text-gray-900 text-xl">
                        {column.title}
                      </h2>
                      <p className="text-sm text-gray-600">
                        {columnTasks.length} tasks
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`${column.accentColor} text-white px-3 py-1.5 rounded-full text-sm font-bold shadow-lg`}
                    >
                      {columnTasks.length}
                    </span>
                  </div>
                </div>

                {/* Droppable Area */}
                <Droppable droppableId={status}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-[500px] transition-all duration-300 rounded-xl p-3 ${
                        snapshot.isDraggingOver
                          ? `bg-white/60 shadow-inner border-2 border-dashed ${column.borderColor} backdrop-blur-sm`
                          : ""
                      }`}
                    >
                      {columnTasks.map((task, index) => (
                        <TaskCard key={task._id} task={task} index={index} />
                      ))}
                      {provided.placeholder}

                      {/* Empty State */}
                      {columnTasks.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-40 text-gray-400 bg-white/30 rounded-xl border-2 border-dashed border-gray-300/50">
                          <div
                            className={`w-16 h-16 rounded-full ${column.lightAccent} opacity-50 flex items-center justify-center mb-3`}
                          >
                            <Icon className="w-8 h-8 text-gray-400" />
                          </div>
                          <p className="text-sm font-semibold">No tasks yet</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Drag tasks here or create new ones
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* Task Modal */}
      {showTaskModal && (
        <TaskModal
          task={selectedTask}
          isOpen={showTaskModal}
          onClose={() => {
            setShowTaskModal(false);
            setSelectedTask(null);
          }}
          onSave={selectedTask ? handleUpdateTask : handleCreateTask}
          onDelete={handleDeleteTask}
          teamMembers={currentTeam?.members || []}
        />
      )}
    </div>
  );
};

export default Tasks;
