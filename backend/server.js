const express = require("express")
const http = require("http")
const socketIo = require("socket.io")
const mongoose = require("mongoose")
const cors = require("cors")
const path = require("path")
require("dotenv").config()

const authRoutes = require("./routes/auth")
const taskRoutes = require("./routes/tasks")
const calendarRoutes = require("./routes/calendar")
const chatRoutes = require("./routes/chat")
const notesRoutes = require("./routes/notes")
const userRoutes = require("./routes/users")
const invitationRoutes = require("./routes/invitation")
const { router: notificationRoutes } = require("./routes/notifications")

const app = express()
const server = http.createServer(app)
const io = socketIo(server, {
  cors: {
    origin: ["https://sync-project-smoky.vercel.app", "http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
})

app.use(
  cors({
    origin: ["https://sync-project-smoky.vercel.app", "http://localhost:3000"],
    credentials: true,
  }),
)
app.use(express.json({ limit: "50mb" }))
app.use(express.urlencoded({ limit: "50mb", extended: true }))

// Serve static files with proper headers
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    setHeaders: (res, path) => {
      res.setHeader("Access-Control-Allow-Origin", "*")
      res.setHeader("Access-Control-Allow-Methods", "GET")
      res.setHeader("Access-Control-Allow-Headers", "Content-Type")

      // Set proper content type based on file extension
      if (path.endsWith(".jpg") || path.endsWith(".jpeg")) {
        res.setHeader("Content-Type", "image/jpeg")
      } else if (path.endsWith(".png")) {
        res.setHeader("Content-Type", "image/png")
      } else if (path.endsWith(".gif")) {
        res.setHeader("Content-Type", "image/gif")
      } else if (path.endsWith(".webp")) {
        res.setHeader("Content-Type", "image/webp")
      }
    },
  }),
)

mongoose.connect(process.env.MONGODB_URI)
const db = mongoose.connection
db.on("error", console.error.bind(console, "connection error:"))
db.once("open", () => {
  console.log("✅ Connected to MongoDB")
})

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.path}`)
  next()
})

app.use("/api/auth", authRoutes)
app.use("/api/tasks", taskRoutes)
app.use("/api/calendar", calendarRoutes)
app.use("/api/chat", chatRoutes)
app.use("/api/notes", notesRoutes)
app.use("/api/users", userRoutes)
app.use("/api/invitations", invitationRoutes)
app.use("/api/notifications", notificationRoutes)

app.use((req, res) => {
  console.log(`❌ 404 - Route not found: ${req.method} ${req.path}`)
  res.status(404).json({ message: `Route not found: ${req.method} ${req.path}` })
})

// Enhanced socket management with better real-time sync
const connectedUsers = new Map()
const teamRooms = new Map()
const socketToUser = new Map()
const userSockets = new Map()

io.on("connection", (socket) => {
  console.log("🔌 New socket connection:", socket.id)

  socket.on("authenticate", (userData) => {
    const { userId, username, teams } = userData
    console.log("🔐 User authenticating:", {
      userId,
      username,
      teams: teams?.length,
      socketId: socket.id,
    })

    // Store user connection info
    connectedUsers.set(userId, {
      socketId: socket.id,
      username,
      teams: teams || [],
      lastSeen: new Date(),
    })
    socketToUser.set(socket.id, userId)

    // Handle multiple sockets per user
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set())
    }
    userSockets.get(userId).add(socket.id)

    // Join user's personal room
    socket.join(`user-${userId}`)
    console.log(`👤 User ${username} joined personal room`)

    // Join all team rooms
    if (teams && teams.length > 0) {
      teams.forEach((team) => {
        const teamId = team._id
        socket.join(`team-${teamId}`)

        if (!teamRooms.has(teamId)) {
          teamRooms.set(teamId, new Set())
        }
        teamRooms.get(teamId).add(userId)

        console.log(`🏠 User ${username} joined team room: ${team.name} (${teamId})`)

        // Notify other team members with enhanced data
        socket.to(`team-${teamId}`).emit("user-joined-team", {
          userId,
          username,
          teamId,
          timestamp: new Date(),
          isOnline: true,
        })
      })
    }

    socket.emit("authenticated", {
      success: true,
      joinedTeams: teams?.map((t) => t._id) || [],
      timestamp: new Date(),
    })

    console.log(`✅ User ${username} authenticated and joined ${teams?.length || 0} teams`)
  })

  socket.on("join-team", (teamId) => {
    const userId = socketToUser.get(socket.id)
    if (!userId) {
      console.log("❌ Cannot join team - user not authenticated")
      return
    }

    socket.join(`team-${teamId}`)

    if (!teamRooms.has(teamId)) {
      teamRooms.set(teamId, new Set())
    }
    teamRooms.get(teamId).add(userId)

    const user = connectedUsers.get(userId)
    console.log(`🏠 User ${user?.username} joined team ${teamId}`)

    // Notify other team members
    socket.to(`team-${teamId}`).emit("user-joined-team", {
      userId,
      username: user?.username,
      teamId,
      timestamp: new Date(),
      isOnline: true,
    })
  })

  socket.on("send-message", (messageData) => {
    const userId = socketToUser.get(socket.id)
    if (!userId) {
      console.log("❌ Cannot send message - user not authenticated")
      return
    }

    const { teamId } = messageData
    const user = connectedUsers.get(userId)

    console.log("💬 Broadcasting message to team:", teamId)
    console.log(`📤 From: ${user?.username} (${userId})`)

    // Enhanced message data with timestamp
    const enhancedMessage = {
      ...messageData,
      timestamp: new Date(),
      broadcastId: `${Date.now()}-${Math.random()}`,
    }

    // Broadcast to ALL sockets in the team room
    io.to(`team-${teamId}`).emit("new-message", enhancedMessage)

    // Send confirmation back to sender
    socket.emit("message-sent", {
      messageId: messageData._id,
      timestamp: new Date(),
      success: true,
    })

    console.log(`📡 Message broadcasted to team-${teamId}`)
  })

  socket.on("typing-start", (data) => {
    const userId = socketToUser.get(socket.id)
    if (!userId) return

    const user = connectedUsers.get(userId)
    socket.to(`team-${data.teamId}`).emit("user-typing", {
      userId,
      username: user?.username,
      teamId: data.teamId,
      isTyping: true,
    })
  })

  socket.on("typing-stop", (data) => {
    const userId = socketToUser.get(socket.id)
    if (!userId) return

    const user = connectedUsers.get(userId)
    socket.to(`team-${data.teamId}`).emit("user-typing", {
      userId,
      username: user?.username,
      teamId: data.teamId,
      isTyping: false,
    })
  })

  socket.on("task-update", (taskData) => {
    const userId = socketToUser.get(socket.id)
    if (!userId) return

    const { teamId } = taskData
    console.log("📋 Broadcasting task update to team:", teamId)

    io.to(`team-${teamId}`).emit("task-updated", {
      ...taskData,
      timestamp: new Date(),
      updatedBy: userId,
    })
  })

  socket.on("calendar-update", (eventData) => {
    const userId = socketToUser.get(socket.id)
    if (!userId) return

    const { teamId } = eventData
    console.log("📅 Broadcasting calendar update to team:", teamId)

    io.to(`team-${teamId}`).emit("calendar-updated", {
      ...eventData,
      timestamp: new Date(),
      updatedBy: userId,
    })
  })

  socket.on("note-update", (noteData) => {
    const userId = socketToUser.get(socket.id)
    if (!userId) return

    const { teamId } = noteData
    console.log("📝 Broadcasting note update to team:", teamId)

    io.to(`team-${teamId}`).emit("note-updated", {
      ...noteData,
      timestamp: new Date(),
      updatedBy: userId,
    })
  })

  socket.on("disconnect", (reason) => {
    const userId = socketToUser.get(socket.id)
    console.log("❌ Socket disconnected:", socket.id, "Reason:", reason)

    if (userId) {
      const user = connectedUsers.get(userId)
      console.log(`👋 User ${user?.username} socket disconnected`)

      // Remove this socket from user's socket set
      if (userSockets.has(userId)) {
        userSockets.get(userId).delete(socket.id)

        // If no more sockets for this user, mark as offline
        if (userSockets.get(userId).size === 0) {
          userSockets.delete(userId)

          // Update user status to offline
          if (user && user.teams) {
            user.teams.forEach((team) => {
              socket.to(`team-${team._id}`).emit("user-left-team", {
                userId,
                username: user.username,
                teamId: team._id,
                isOnline: false,
                timestamp: new Date(),
              })
            })
          }

          connectedUsers.delete(userId)

          // Remove from all team rooms
          for (const [teamId, members] of teamRooms.entries()) {
            if (members.has(userId)) {
              members.delete(userId)
              console.log(`🚪 Removed ${user?.username} from team ${teamId}`)
            }
          }
        }
      }

      socketToUser.delete(socket.id)
    }
  })

  socket.on("error", (error) => {
    console.error("💥 Socket error:", error)
  })
})

// Cleanup and health check
setInterval(() => {
  for (const [teamId, members] of teamRooms.entries()) {
    if (members.size === 0) {
      teamRooms.delete(teamId)
      console.log(`🧹 Cleaned up empty team room: ${teamId}`)
    }
  }
}, 60000)

const PORT = process.env.PORT || 5000
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
})
