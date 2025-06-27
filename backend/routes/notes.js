const express = require("express")
const Note = require("../models/Note")
const auth = require("../middleware/auth")

const router = express.Router()

// Get all notes for a team
router.get("/team/:teamId", auth, async (req, res) => {
  try {
    console.log(`📝 Fetching notes for team: ${req.params.teamId}`)

    const notes = await Note.find({ teamId: req.params.teamId })
      .populate("createdBy", "username email avatar")
      .populate("lastEditedBy", "username email avatar")
      .populate("collaborators", "username email avatar")
      .sort({ updatedAt: -1 })

    console.log(`✅ Found ${notes.length} notes for team ${req.params.teamId}`)
    res.json(notes)
  } catch (error) {
    console.error("❌ Error fetching notes:", error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// Create note
router.post("/", auth, async (req, res) => {
  try {
    console.log("📝 Creating new note:", {
      title: req.body.title,
      teamId: req.body.teamId,
      createdBy: req.userId,
    })

    const note = new Note({
      ...req.body,
      createdBy: req.userId,
      lastEditedBy: req.userId,
    })

    await note.save()
    await note.populate("createdBy", "username email avatar")
    await note.populate("lastEditedBy", "username email avatar")

    console.log("✅ Note created:", note._id)
    res.status(201).json(note)
  } catch (error) {
    console.error("❌ Error creating note:", error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// Update note
router.put("/:id", auth, async (req, res) => {
  try {
    console.log("📝 Updating note:", req.params.id)

    const note = await Note.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        lastEditedBy: req.userId,
        version: req.body.version + 1,
      },
      { new: true },
    )
      .populate("createdBy", "username email avatar")
      .populate("lastEditedBy", "username email avatar")
      .populate("collaborators", "username email avatar")

    if (!note) {
      return res.status(404).json({ message: "Note not found" })
    }

    console.log("✅ Note updated:", note._id)
    res.json(note)
  } catch (error) {
    console.error("❌ Error updating note:", error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// Delete note
router.delete("/:id", auth, async (req, res) => {
  try {
    console.log("📝 Deleting note:", req.params.id)

    const note = await Note.findByIdAndDelete(req.params.id)

    if (!note) {
      return res.status(404).json({ message: "Note not found" })
    }

    console.log("✅ Note deleted:", req.params.id)
    res.json({ message: "Note deleted successfully" })
  } catch (error) {
    console.error("❌ Error deleting note:", error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

module.exports = router
