const express = require("express")
const Event = require("../models/Event")
const auth = require("../middleware/auth")
const router = express.Router()

router.get("/team/:teamId", auth, async (req, res) => {
  try {
    console.log(`📅 Fetching events for team: ${req.params.teamId}`)

    const events = await Event.find({ teamId: req.params.teamId })
      .populate("attendees", "username email avatar")
      .populate("createdBy", "username email avatar")
      .sort({ startDate: 1 })

    console.log(`✅ Found ${events.length} events for team ${req.params.teamId}`)
    res.json(events)
  } catch (error) {
    console.error("❌ Error fetching events:", error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

router.post("/", auth, async (req, res) => {
  try {
    console.log("📅 Creating new event:", {
      title: req.body.title,
      teamId: req.body.teamId,
      createdBy: req.userId,
    })

    const event = new Event({
      ...req.body,
      createdBy: req.userId,
    })

    await event.save()
    await event.populate("attendees", "username email avatar")
    await event.populate("createdBy", "username email avatar")

    console.log("✅ Event created:", event._id)
    res.status(201).json(event)
  } catch (error) {
    console.error("❌ Error creating event:", error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

router.put("/:id", auth, async (req, res) => {
  try {
    console.log("📅 Updating event:", req.params.id)

    const event = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate("attendees", "username email avatar")
      .populate("createdBy", "username email avatar")

    if (!event) {
      return res.status(404).json({ message: "Event not found" })
    }

    console.log("✅ Event updated:", event._id)
    res.json(event)
  } catch (error) {
    console.error("❌ Error updating event:", error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

router.delete("/:id", auth, async (req, res) => {
  try {
    console.log("📅 Deleting event:", req.params.id)

    const event = await Event.findByIdAndDelete(req.params.id)

    if (!event) {
      return res.status(404).json({ message: "Event not found" })
    }

    console.log("✅ Event deleted:", req.params.id)
    res.json({ message: "Event deleted successfully" })
  } catch (error) {
    console.error("❌ Error deleting event:", error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

module.exports = router
