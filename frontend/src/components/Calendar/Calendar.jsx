"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { useSocket } from "../../contexts/SocketContext.jsx";
import axios from "axios";
import {
  CalendarIcon,
  Plus,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";

const Calendar = () => {
  const { currentTeam } = useAuth();
  const { socket, updateCalendar } = useSocket();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState("month");

  useEffect(() => {
    if (currentTeam) {
      fetchEvents();
    }
  }, [currentTeam]);

  useEffect(() => {
    if (socket && currentTeam) {
      console.log(
        "🔄 Setting up calendar update listener for team:",
        currentTeam.name
      );

      const handleCalendarUpdate = (eventData) => {
        console.log("📅 Received calendar update via socket:", eventData);

        if (eventData.teamId === currentTeam._id) {
          if (eventData.deleted) {
            // Remove deleted event
            setEvents((prev) =>
              prev.filter((event) => event._id !== eventData._id)
            );
          } else {
            setEvents((prev) => {
              const eventExists = prev.find(
                (event) => event._id === eventData._id
              );
              if (eventExists) {
                // Update existing event
                return prev.map((event) =>
                  event._id === eventData._id ? eventData : event
                );
              } else {
                // Add new event
                return [...prev, eventData];
              }
            });
          }
        }
      };

      socket.on("calendar-updated", handleCalendarUpdate);

      return () => {
        console.log("🧹 Cleaning up calendar update listener");
        socket.off("calendar-updated", handleCalendarUpdate);
      };
    }
  }, [socket, currentTeam]);

  const fetchEvents = async () => {
    if (!currentTeam) return;

    try {
      setLoading(true);
      const response = await axios.get(
        `https:////sync-next.onrender.com/api/calendar/team/${currentTeam._id}`
      );
      setEvents(response.data);
    } catch (error) {
      console.error("Error fetching events:", error);
      toast.error("Failed to fetch events");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async (eventData) => {
    if (!currentTeam) {
      toast.error("Please select a team first");
      return;
    }

    try {
      const response = await axios.post(
        "https:////sync-next.onrender.com/api/calendar",
        {
          ...eventData,
          teamId: currentTeam._id,
        }
      );
      setEvents((prev) => [...prev, response.data]);

      // Broadcast update via socket
      updateCalendar(response.data);

      toast.success("Event created successfully", {
        icon: "📅",
        style: {
          borderRadius: "12px",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "#fff",
        },
      });
    } catch (error) {
      console.error("Error creating event:", error);
      toast.error("Failed to create event");
    }
  };

  const handleUpdateEvent = async (eventId, eventData) => {
    try {
      const response = await axios.put(
        `https:////sync-next.onrender.com/api/calendar/${eventId}`,
        eventData
      );
      setEvents((prev) =>
        prev.map((event) => (event._id === eventId ? response.data : event))
      );

      // Broadcast update via socket
      updateCalendar(response.data);

      toast.success("Event updated successfully", {
        icon: "📅",
        style: {
          borderRadius: "12px",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "#fff",
        },
      });
    } catch (error) {
      console.error("Error updating event:", error);
      toast.error("Failed to update event");
    }
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      await axios.delete(
        `https:////sync-next.onrender.com/api/calendar/${eventId}`
      );
      setEvents((prev) => prev.filter((event) => event._id !== eventId));

      // Broadcast deletion via socket
      updateCalendar({ _id: eventId, deleted: true, teamId: currentTeam._id });

      toast.success("Event deleted successfully", {
        icon: "🗑️",
        style: {
          borderRadius: "12px",
          background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
          color: "#fff",
        },
      });
    } catch (error) {
      console.error("Error deleting event:", error);
      toast.error("Failed to delete event");
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const getEventsForDate = (date) => {
    if (!date) return [];
    return events.filter((event) => {
      const eventDate = new Date(event.startDate);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const EventModal = ({ event, isOpen, onClose, onSave, onDelete }) => {
    const [formData, setFormData] = useState({
      title: "",
      description: "",
      startDate: "",
      endDate: "",
      location: "",
      allDay: false,
    });

    useEffect(() => {
      if (event) {
        setFormData({
          title: event.title || "",
          description: event.description || "",
          startDate: event.startDate
            ? new Date(event.startDate).toISOString().slice(0, 16)
            : "",
          endDate: event.endDate
            ? new Date(event.endDate).toISOString().slice(0, 16)
            : "",
          location: event.location || "",
          allDay: event.allDay || false,
        });
      } else {
        setFormData({
          title: "",
          description: "",
          startDate: "",
          endDate: "",
          location: "",
          allDay: false,
        });
      }
    }, [event]);

    const handleSubmit = (e) => {
      e.preventDefault();
      if (event) {
        onSave(event._id, formData);
      } else {
        onSave(formData);
      }
      onClose();
    };

    const handleDelete = () => {
      if (window.confirm("Are you sure you want to delete this event?")) {
        onDelete(event._id);
        onClose();
      }
    };

    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-md border border-gray-200/50">
          <div className="p-6 border-b border-gray-200/50 bg-gradient-to-r from-purple-50/80 to-pink-50/80">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                {event ? "Edit Event" : "Create New Event"}
              </h2>
              {event && (
                <button
                  onClick={handleDelete}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  🗑️
                </button>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Event Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                className="w-full px-4 py-3 border border-gray-300/50 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gradient-to-r from-purple-50/30 to-pink-50/30"
                placeholder="Enter event title"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                rows={3}
                className="w-full px-4 py-3 border border-gray-300/50 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gradient-to-r from-purple-50/30 to-pink-50/30"
                placeholder="Event description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="datetime-local"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      startDate: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 border border-gray-300/50 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gradient-to-r from-purple-50/30 to-pink-50/30"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="datetime-local"
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      endDate: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 border border-gray-300/50 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gradient-to-r from-purple-50/30 to-pink-50/30"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, location: e.target.value }))
                }
                className="w-full px-4 py-3 border border-gray-300/50 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gradient-to-r from-purple-50/30 to-pink-50/30"
                placeholder="Event location"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="allDay"
                checked={formData.allDay}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, allDay: e.target.checked }))
                }
                className="mr-3 w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
              />
              <label
                htmlFor="allDay"
                className="text-sm font-medium text-gray-700"
              >
                All Day Event
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 font-medium shadow-lg transition-all"
              >
                {event ? "Update" : "Create"} Event
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const days = getDaysInMonth(currentDate);
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-transparent bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
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
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 bg-clip-text text-transparent">
            Team Calendar
          </h1>
          <p className="text-gray-600 mt-2 text-lg">
            Manage your team's events and meetings
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedEvent(null);
            setShowEventModal(true);
          }}
          className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-3 rounded-2xl hover:from-purple-600 hover:to-pink-600 flex items-center space-x-3 shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold"
        >
          <Plus className="w-5 h-5" />
          <span>New Event</span>
        </button>
      </div>

      {/* Calendar Navigation */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-gray-200/50">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() =>
                setCurrentDate(
                  new Date(
                    currentDate.getFullYear(),
                    currentDate.getMonth() - 1
                  )
                )
              }
              className="p-3 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 rounded-xl transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h2 className="text-2xl font-bold text-gray-900">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <button
              onClick={() =>
                setCurrentDate(
                  new Date(
                    currentDate.getFullYear(),
                    currentDate.getMonth() + 1
                  )
                )
              }
              className="p-3 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 rounded-xl transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-6 py-3 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 rounded-xl hover:from-purple-200 hover:to-pink-200 font-medium transition-colors"
          >
            Today
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {/* Day headers */}
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="p-4 text-center font-bold text-gray-600 bg-gradient-to-r from-purple-50/50 to-pink-50/50 rounded-xl"
            >
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {days.map((day, index) => {
            const dayEvents = day ? getEventsForDate(day) : [];
            const isToday =
              day && day.toDateString() === new Date().toDateString();

            return (
              <div
                key={index}
                className={`min-h-[140px] p-3 border border-gray-100/50 rounded-xl transition-all duration-200 ${
                  day
                    ? "bg-white/50 hover:bg-white/80 hover:shadow-lg"
                    : "bg-gray-50/30"
                } ${
                  isToday
                    ? "ring-2 ring-purple-500 bg-gradient-to-br from-purple-50 to-pink-50"
                    : ""
                }`}
              >
                {day && (
                  <>
                    <div
                      className={`text-sm font-bold mb-2 ${
                        isToday ? "text-purple-600" : "text-gray-900"
                      }`}
                    >
                      {day.getDate()}
                    </div>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 2).map((event) => (
                        <div
                          key={event._id}
                          onClick={() => {
                            setSelectedEvent(event);
                            setShowEventModal(true);
                          }}
                          className="text-xs p-2 bg-gradient-to-r from-purple-100/80 to-pink-100/80 text-purple-800 rounded-lg cursor-pointer hover:from-purple-200/80 hover:to-pink-200/80 truncate transition-all font-medium"
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-xs text-gray-500 font-medium">
                          +{dayEvents.length - 2} more
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming Events */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-gray-200/50">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900">Upcoming Events</h3>
        </div>
        <div className="space-y-4">
          {events
            .filter((event) => new Date(event.startDate) > new Date())
            .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
            .slice(0, 5)
            .map((event) => (
              <div
                key={event._id}
                className="flex items-center space-x-4 p-4 bg-gradient-to-r from-blue-50/80 to-purple-50/80 rounded-xl hover:from-blue-100/80 hover:to-purple-100/80 transition-all duration-200 group cursor-pointer"
                onClick={() => {
                  setSelectedEvent(event);
                  setShowEventModal(true);
                }}
              >
                <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                  <CalendarIcon className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors">
                    {event.title}
                  </h4>
                  <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>
                        {new Date(event.startDate).toLocaleDateString()}
                      </span>
                    </div>
                    {event.location && (
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-4 h-4" />
                        <span>{event.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Event Modal */}
      <EventModal
        event={selectedEvent}
        isOpen={showEventModal}
        onClose={() => {
          setShowEventModal(false);
          setSelectedEvent(null);
        }}
        onSave={selectedEvent ? handleUpdateEvent : handleCreateEvent}
        onDelete={handleDeleteEvent}
      />
    </div>
  );
};

export default Calendar;
