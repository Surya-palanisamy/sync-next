const express = require("express")
const multer = require("multer")
const path = require("path")
const fs = require("fs")
const Message = require("../models/Message")
const auth = require("../middleware/auth")

const router = express.Router()

// Enhanced multer configuration with better file handling
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "..", "uploads")
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    const ext = path.extname(file.originalname)
    const name = path.basename(file.originalname, ext)
    cb(null, `${name}-${uniqueSuffix}${ext}`)
  },
})

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images and common file types
    const allowedTypes = /jpeg|jpg|png|gif|webp|pdf|doc|docx|txt|zip|rar/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype)

    if (mimetype && extname) {
      return cb(null, true)
    } else {
      cb(new Error("Invalid file type"))
    }
  },
})

// Get messages for a team with enhanced pagination
router.get("/team/:teamId", auth, async (req, res) => {
  try {
    const page = Number.parseInt(req.query.page) || 1
    const limit = Number.parseInt(req.query.limit) || 100
    const skip = (page - 1) * limit

    console.log(`📨 Fetching messages for team: ${req.params.teamId}, page: ${page}`)

    const messages = await Message.find({ teamId: req.params.teamId })
      .populate("sender", "username avatar")
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean() // Use lean for better performance

    console.log(`✅ Found ${messages.length} messages for team ${req.params.teamId}`)

    // Reverse to show oldest first
    const reversedMessages = messages.reverse()

    res.json(reversedMessages)
  } catch (error) {
    console.error("❌ Error fetching messages:", error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// Enhanced file upload with better error handling
router.post("/upload", auth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" })
    }

    // Verify file exists and get stats
    const filePath = req.file.path
    const stats = fs.statSync(filePath)

    const fileData = {
      filename: req.file.originalname,
      path: req.file.path,
      mimetype: req.file.mimetype,
      size: stats.size, // Use actual file size
      url: `/uploads/${req.file.filename}`,
      uploadedAt: new Date(),
    }

    console.log("📎 File uploaded successfully:", {
      filename: fileData.filename,
      size: fileData.size,
      mimetype: fileData.mimetype,
    })

    res.json(fileData)
  } catch (error) {
    console.error("❌ File upload error:", error)
    res.status(500).json({ message: "File upload failed", error: error.message })
  }
})

// Enhanced file download route
router.get("/download/:filename", (req, res) => {
  try {
    const filename = req.params.filename
    const filePath = path.join(__dirname, "..", "uploads", filename)

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found" })
    }

    // Get file stats
    const stats = fs.statSync(filePath)

    // Set proper headers for download
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`)
    res.setHeader("Content-Length", stats.size)
    res.setHeader("Content-Type", "application/octet-stream")

    // Stream the file
    const fileStream = fs.createReadStream(filePath)
    fileStream.pipe(res)

    console.log(`📥 File download started: ${filename} (${stats.size} bytes)`)
  } catch (error) {
    console.error("❌ File download error:", error)
    res.status(500).json({ message: "Download failed", error: error.message })
  }
})

// Send message with enhanced validation
router.post("/", auth, async (req, res) => {
  try {
    const { content, teamId, messageType, fileUrl, fileName, fileSize } = req.body

    if (!content && !fileUrl) {
      return res.status(400).json({ message: "Message content or file is required" })
    }

    if (!teamId) {
      return res.status(400).json({ message: "Team ID is required" })
    }

    console.log("💬 Creating new message:", {
      sender: req.userId,
      teamId,
      messageType: messageType || "text",
      hasFile: !!fileUrl,
    })

    const messageData = {
      content,
      sender: req.userId,
      teamId,
      messageType: messageType || "text",
    }

    // Add file data if present
    if (fileUrl) {
      messageData.fileUrl = fileUrl
      messageData.fileName = fileName
      messageData.fileSize = fileSize
    }

    const message = new Message(messageData)
    await message.save()

    // Populate sender info
    await message.populate("sender", "username avatar")

    console.log("✅ Message saved to database:", message._id)
    res.status(201).json(message)
  } catch (error) {
    console.error("❌ Error creating message:", error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// Mark message as read
router.put("/:id/read", auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id)

    if (!message) {
      return res.status(404).json({ message: "Message not found" })
    }

    const existingRead = message.readBy.find((read) => read.user.toString() === req.userId)

    if (!existingRead) {
      message.readBy.push({ user: req.userId })
      await message.save()
    }

    res.json({ message: "Message marked as read" })
  } catch (error) {
    console.error("❌ Error marking message as read:", error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

module.exports = router
