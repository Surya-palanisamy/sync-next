const express = require("express");
const auth = require("../middleware/auth");

const router = express.Router();

// In-memory notification storage (in production, use a database)
const notifications = [];

// Get notifications for user
router.get("/", auth, async (req, res) => {
  try {
    const userNotifications = notifications
      .filter((n) => n.userId === req.userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(userNotifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Create notification
router.post("/", auth, async (req, res) => {
  try {
    const notification = {
      _id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      userId: req.body.userId || req.userId,
      title: req.body.title,
      message: req.body.message,
      type: req.body.type || "info",
      read: false,
      createdAt: new Date(),
    };

    notifications.push(notification);
    console.log("Notification created:", notification);
    res.status(201).json(notification);
  } catch (error) {
    console.error("Error creating notification:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Mark notification as read
router.put("/:id/read", auth, async (req, res) => {
  try {
    const notification = notifications.find(
      (n) => n._id === req.params.id && n.userId === req.userId
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    notification.read = true;
    res.json({ message: "Notification marked as read" });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Mark all notifications as read
router.put("/read-all", auth, async (req, res) => {
  try {
    notifications.forEach((notification) => {
      if (notification.userId === req.userId) {
        notification.read = true;
      }
    });

    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Delete notification
router.delete("/:id", auth, async (req, res) => {
  try {
    const index = notifications.findIndex(
      (n) => n._id === req.params.id && n.userId === req.userId
    );

    if (index === -1) {
      return res.status(404).json({ message: "Notification not found" });
    }

    notifications.splice(index, 1);
    res.json({ message: "Notification deleted" });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Helper function to create notification
const createNotification = (userId, title, message, type = "info") => {
  const notification = {
    _id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    userId,
    title,
    message,
    type,
    read: false,
    createdAt: new Date(),
  };
  notifications.push(notification);
  console.log("Helper notification created:", notification);
  return notification;
};

module.exports = { router, createNotification };
