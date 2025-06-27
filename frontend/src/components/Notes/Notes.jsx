"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { useSocket } from "../../contexts/SocketContext.jsx";
import axios from "axios";
import { FileText, Plus, Search, Edit, Trash2, Eye, Users } from "lucide-react";
import toast from "react-hot-toast";

const Notes = () => {
  const { currentTeam, user } = useAuth();
  const { socket, updateNote } = useSocket();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");

  useEffect(() => {
    if (currentTeam) {
      fetchNotes();
    }
  }, [currentTeam]);

  useEffect(() => {
    if (socket && currentTeam) {
      console.log(
        "🔄 Setting up note update listener for team:",
        currentTeam.name
      );

      const handleNoteUpdate = (noteData) => {
        console.log("📝 Received note update via socket:", noteData);

        if (noteData.teamId === currentTeam._id) {
          if (noteData.deleted) {
            // Remove deleted note
            setNotes((prev) =>
              prev.filter((note) => note._id !== noteData._id)
            );
          } else {
            setNotes((prev) => {
              const noteExists = prev.find((note) => note._id === noteData._id);
              if (noteExists) {
                // Update existing note
                return prev.map((note) =>
                  note._id === noteData._id ? noteData : note
                );
              } else {
                // Add new note
                return [noteData, ...prev];
              }
            });
          }
        }
      };

      socket.on("note-updated", handleNoteUpdate);

      return () => {
        console.log("🧹 Cleaning up note update listener");
        socket.off("note-updated", handleNoteUpdate);
      };
    }
  }, [socket, currentTeam]);

  const fetchNotes = async () => {
    if (!currentTeam) return;

    try {
      setLoading(true);
      const response = await axios.get(
        `https://sync-project.glitch.me/api/notes/team/${currentTeam._id}`
      );
      setNotes(response.data);
    } catch (error) {
      console.error("Error fetching notes:", error);
      toast.error("Failed to fetch notes");
      setNotes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNote = async (noteData) => {
    if (!currentTeam) {
      toast.error("Please select a team first");
      return;
    }

    try {
      const response = await axios.post(
        "https://sync-project.glitch.me/api/notes",
        {
          ...noteData,
          teamId: currentTeam._id,
        }
      );
      setNotes((prev) => [response.data, ...prev]);

      // Broadcast update via socket
      updateNote(response.data);

      toast.success("Note created successfully");
    } catch (error) {
      console.error("Error creating note:", error);
      toast.error("Failed to create note");
    }
  };

  const handleUpdateNote = async (noteId, noteData) => {
    try {
      const response = await axios.put(
        `https://sync-project.glitch.me/api/notes/${noteId}`,
        noteData
      );
      setNotes((prev) =>
        prev.map((note) => (note._id === noteId ? response.data : note))
      );

      // Broadcast update via socket
      updateNote(response.data);

      toast.success("Note updated successfully");
    } catch (error) {
      console.error("Error updating note:", error);
      toast.error("Failed to update note");
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm("Are you sure you want to delete this note?")) return;

    try {
      await axios.delete(`https://sync-project.glitch.me/api/notes/${noteId}`);
      setNotes((prev) => prev.filter((note) => note._id !== noteId));

      // Broadcast deletion via socket
      updateNote({ _id: noteId, deleted: true, teamId: currentTeam._id });

      toast.success("Note deleted successfully");
    } catch (error) {
      console.error("Error deleting note:", error);
      toast.error("Failed to delete note");
    }
  };

  const filteredNotes = notes.filter((note) => {
    const matchesSearch =
      note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      filterCategory === "all" || note.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const NoteModal = ({ note, isOpen, onClose, onSave }) => {
    const [formData, setFormData] = useState({
      title: "",
      content: "",
      category: "Other",
      tags: [],
      isPublic: true,
    });
    const [tagInput, setTagInput] = useState("");

    useEffect(() => {
      if (note) {
        setFormData({
          title: note.title || "",
          content: note.content || "",
          category: note.category || "Other",
          tags: note.tags || [],
          isPublic: note.isPublic !== undefined ? note.isPublic : true,
        });
      } else {
        setFormData({
          title: "",
          content: "",
          category: "Other",
          tags: [],
          isPublic: true,
        });
      }
    }, [note]);

    const handleSubmit = (e) => {
      e.preventDefault();
      if (note) {
        onSave(note._id, formData);
      } else {
        onSave(formData);
      }
      onClose();
    };

    const handleAddTag = (e) => {
      e.preventDefault();
      if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
        setFormData((prev) => ({
          ...prev,
          tags: [...prev.tags, tagInput.trim()],
        }));
        setTagInput("");
      }
    };

    const handleRemoveTag = (tagToRemove) => {
      setFormData((prev) => ({
        ...prev,
        tags: prev.tags.filter((tag) => tag !== tagToRemove),
      }));
    };

    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">
              {note ? "Edit Note" : "Create New Note"}
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      category: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="Meeting Notes">Meeting Notes</option>
                  <option value="Project Plan">Project Plan</option>
                  <option value="Documentation">Documentation</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content *
              </label>
              <textarea
                value={formData.content}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, content: e.target.value }))
                }
                rows={12}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Write your note content here..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-orange-100 text-orange-800"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-2 text-orange-600 hover:text-orange-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleAddTag(e)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Add a tag"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isPublic"
                checked={formData.isPublic}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    isPublic: e.target.checked,
                  }))
                }
                className="mr-2"
              />
              <label htmlFor="isPublic" className="text-sm text-gray-700">
                Make this note visible to all team members
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600"
              >
                {note ? "Update" : "Create"} Note
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
            Team Notes
          </h1>
          <p className="text-gray-600">
            Create and manage team notes and documentation
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedNote(null);
            setShowNoteModal(true);
          }}
          className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-xl hover:from-orange-600 hover:to-red-600 flex items-center space-x-2 shadow-lg transform hover:scale-105 transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>New Note</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value="all">All Categories</option>
            <option value="Meeting Notes">Meeting Notes</option>
            <option value="Project Plan">Project Plan</option>
            <option value="Documentation">Documentation</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* Notes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredNotes.map((note) => (
          <div
            key={note._id}
            className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105 overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                    {note.title}
                  </h3>
                  <span
                    className={`px-3 py-1 text-xs rounded-full ${
                      note.category === "Meeting Notes"
                        ? "bg-blue-100 text-blue-800"
                        : note.category === "Project Plan"
                        ? "bg-green-100 text-green-800"
                        : note.category === "Documentation"
                        ? "bg-purple-100 text-purple-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {note.category}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setSelectedNote(note);
                      setShowNoteModal(true);
                    }}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteNote(note._id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                {note.content}
              </p>

              {note.tags && note.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {note.tags.slice(0, 3).map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                  {note.tags.length > 3 && (
                    <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                      +{note.tags.length - 3}
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-medium">
                      {note.createdBy?.username?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span>{note.createdBy?.username}</span>
                </div>

                <div className="flex items-center space-x-1">
                  {note.isPublic ? (
                    <Users className="w-3 h-3" />
                  ) : (
                    <Eye className="w-3 h-3" />
                  )}
                  <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredNotes.length === 0 && (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No notes found
          </h3>
          <p className="text-gray-500 mb-6">
            {searchTerm || filterCategory !== "all"
              ? "Try adjusting your search or filter criteria"
              : "Create your first note to get started"}
          </p>
          {!searchTerm && filterCategory === "all" && (
            <button
              onClick={() => {
                setSelectedNote(null);
                setShowNoteModal(true);
              }}
              className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-lg hover:from-orange-600 hover:to-red-600"
            >
              Create First Note
            </button>
          )}
        </div>
      )}

      {/* Note Modal */}
      <NoteModal
        note={selectedNote}
        isOpen={showNoteModal}
        onClose={() => {
          setShowNoteModal(false);
          setSelectedNote(null);
        }}
        onSave={selectedNote ? handleUpdateNote : handleCreateNote}
      />
    </div>
  );
};

export default Notes;
