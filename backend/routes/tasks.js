const express = require("express")
const Task = require("../models/Task")
const auth = require("../middleware/auth")

const router = express.Router()

// Get all tasks for a team
router.get("/team/:teamId", auth, async (req, res) => {
  try {
    const tasks = await Task.find({ teamId: req.params.teamId })
      .populate("assignedTo", "username email avatar")
      .populate("createdBy", "username email avatar")
      .sort({ createdAt: -1 })

    res.json(tasks)
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// Create task
router.post("/", auth, async (req, res) => {
  try {
    const task = new Task({
      ...req.body,
      createdBy: req.userId,
    })

    await task.save()
    await task.populate("assignedTo", "username email avatar")
    await task.populate("createdBy", "username email avatar")

    res.status(201).json(task)
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// Update task
router.put("/:id", auth, async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate("assignedTo", "username email avatar")
      .populate("createdBy", "username email avatar")

    if (!task) {
      return res.status(404).json({ message: "Task not found" })
    }

    res.json(task)
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// Delete task
router.delete("/:id", auth, async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id)

    if (!task) {
      return res.status(404).json({ message: "Task not found" })
    }

    res.json({ message: "Task deleted successfully" })
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// Add comment to task
router.post("/:id/comments", auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)

    if (!task) {
      return res.status(404).json({ message: "Task not found" })
    }

    task.comments.push({
      user: req.userId,
      text: req.body.text,
    })

    await task.save()
    await task.populate("comments.user", "username avatar")

    res.json(task)
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

module.exports = router
