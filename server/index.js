const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const ACTIONS = require("./Actions");
const cors = require("cors");
const axios = require("axios");
const server = http.createServer(app);
require("dotenv").config();

const languageConfig = {
  python3: { versionIndex: "3" },
  java: { versionIndex: "3" },
  cpp: { versionIndex: "4" },
  nodejs: { versionIndex: "3" },
  c: { versionIndex: "4" },
  ruby: { versionIndex: "3" },
  go: { versionIndex: "3" },
  scala: { versionIndex: "3" },
  bash: { versionIndex: "3" },
  sql: { versionIndex: "3" },
  pascal: { versionIndex: "2" },
  csharp: { versionIndex: "3" },
  php: { versionIndex: "3" },
  swift: { versionIndex: "3" },
  rust: { versionIndex: "3" },
  r: { versionIndex: "3" },
};

// Enable CORS
app.use(cors());

// Parse JSON bodies
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: "https://collabcodeeditor.onrender.com",
    methods: ["GET", "POST"],
  },
});

const userSocketMap = {};
const getAllConnectedClients = (roomId) => {
  return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
    (socketId) => {
      return {
        socketId,
        username: userSocketMap[socketId],
      };
    }
  );
};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // JOIN ROOM (already exists)
  socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
    userSocketMap[socket.id] = username;
    socket.join(roomId);
    const clients = getAllConnectedClients(roomId);

    clients.forEach(({ socketId }) => {
      io.to(socketId).emit(ACTIONS.JOINED, {
        clients,
        username,
        socketId: socket.id,
      });
    });
  });

  // ✅ Video Call Signal Exchange
  socket.on("video-signal", ({ signal, to }) => {
    io.to(to).emit("video-signal", { signal, from: socket.id });
  });

  socket.on("start-call", ({ to }) => {
    io.to(to).emit("start-call", { from: socket.id });
  });

  // 💻 Sync & code stuff (already present)
  socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
    socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
  });

  socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
    io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
  });

  // 🧹 Handle Disconnect
  socket.on("disconnecting", () => {
    const rooms = [...socket.rooms];
    rooms.forEach((roomId) => {
      socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
        socketId: socket.id,
        username: userSocketMap[socket.id],
      });
    });
    delete userSocketMap[socket.id];
    socket.leave();
  });
});


app.post("/compile", async (req, res) => {
  const { code, language } = req.body;

  try {
    const response = await axios.post("https://api.jdoodle.com/v1/execute", {
      script: code,
      language: language,
      versionIndex: languageConfig[language].versionIndex,
      clientId: process.env.jDoodle_clientId,
      clientSecret: process.env.jDoodle_clientSecret,
    });

    res.json(response.data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to compile code" });
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server is runnint on port ${PORT}`));

// const express = require("express");
// const app = express();
// const http = require("http");
// const { Server } = require("socket.io");
// const cors = require("cors");
// const axios = require("axios");
// require("dotenv").config();

// const ACTIONS = require("./Actions");

// const server = http.createServer(app);

// const io = new Server(server, {
//   cors: {
//     origin: "https://collabcodeeditor.onrender.com",
//     methods: ["GET", "POST"],
//   },
// });

// // 🔒 JDoodle Language Configuration
// const languageConfig = {
//   python3: { versionIndex: "3" },
//   java: { versionIndex: "3" },
//   cpp: { versionIndex: "4" },
//   nodejs: { versionIndex: "3" },
//   c: { versionIndex: "4" },
//   ruby: { versionIndex: "3" },
//   go: { versionIndex: "3" },
//   scala: { versionIndex: "3" },
//   bash: { versionIndex: "3" },
//   sql: { versionIndex: "3" },
//   pascal: { versionIndex: "2" },
//   csharp: { versionIndex: "3" },
//   php: { versionIndex: "3" },
//   swift: { versionIndex: "3" },
//   rust: { versionIndex: "3" },
//   r: { versionIndex: "3" },
// };

// // 🔧 Middleware
// app.use(cors());
// app.use(express.json());

// const userSocketMap = {};
// const getAllConnectedClients = (roomId) => {
//   return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
//     (socketId) => ({
//       socketId,
//       username: userSocketMap[socketId],
//     })
//   );
// };

// // Room storage for tracking users with their usernames
// const rooms = {};

// io.on("connection", (socket) => {
//   console.log("User connected:", socket.id);

//   // 🧑‍💻 JOIN ROOM (Code + Video)
//   socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
//     userSocketMap[socket.id] = username;
//     socket.join(roomId);
//     const clients = getAllConnectedClients(roomId);

//     // Initialize room if it doesn't exist
//     if (!rooms[roomId]) {
//       rooms[roomId] = {
//         users: {},
//         messages: []
//       };
//     }
    
//     // Add user to room with username
//     rooms[roomId].users[socket.id] = {
//       username: username || "Anonymous"
//     };

//     clients.forEach(({ socketId }) => {
//       io.to(socketId).emit(ACTIONS.JOINED, {
//         clients,
//         username,
//         socketId: socket.id,
//       });
//     });
//   });

//   // Handle WebRTC peer signaling
//   socket.on("join-room", ({ roomId, username }) => {
//     userSocketMap[socket.id] = username;
//     socket.join(roomId);
    
//     // Initialize room if needed
//     if (!rooms[roomId]) {
//       rooms[roomId] = {
//         users: {},
//         messages: []
//       };
//     }
    
//     // Add user to room
//     rooms[roomId].users[socket.id] = {
//       username: username || "Anonymous"
//     };
    
//     // Send existing users to the new client
//     const usersInRoom = Object.keys(rooms[roomId].users)
//       .filter(id => id !== socket.id)
//       .map(id => ({
//         id,
//         username: rooms[roomId].users[id].username
//       }));
      
//     // Emit to just the new user
//     socket.emit("all-users", usersInRoom);
    
//     // Notify others that user has joined
//     socket.to(roomId).emit("user-connected", {
//       id: socket.id,
//       username: username || "Anonymous"
//     });
    
//     // Send previous messages in this room
//     if (rooms[roomId].messages && rooms[roomId].messages.length > 0) {
//       socket.emit("previous-messages", rooms[roomId].messages);
//     }
//   });

//   // WebRTC signaling
//   socket.on("sending-signal", ({ userToSignal, callerID, signal, username }) => {
//     io.to(userToSignal).emit("user-joined", {
//       signal,
//       callerID,
//       username
//     });
//   });

//   socket.on("returning-signal", ({ signal, callerID }) => {
//     io.to(callerID).emit("receiving-returned-signal", {
//       signal,
//       id: socket.id
//     });
//   });

//   // Handle chat messages
//   socket.on("send-message", ({ roomId, message }) => {
//     // Store message in room history (limit to last 100 messages)
//     if (rooms[roomId]) {
//       rooms[roomId].messages.push(message);
//       if (rooms[roomId].messages.length > 100) {
//         rooms[roomId].messages.shift();
//       }
//     }
    
//     // Broadcast to everyone else in the room
//     socket.to(roomId).emit("chat-message", message);
//   });

//   // 💻 Real-Time Code Sharing
//   socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
//     socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
//   });

//   socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
//     io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
//   });

//   // 🧹 DISCONNECT Handling (Code + Video)
//   socket.on("disconnecting", () => {
//     const rooms = [...socket.rooms];
//     rooms.forEach((roomId) => {
//       // Skip the default room (socket.id)
//       if (roomId === socket.id) return;
      
//       // Notify others of disconnection
//       socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
//         socketId: socket.id,
//         username: userSocketMap[socket.id],
//       });
      
//       // Notify for video disconnect
//       socket.to(roomId).emit("user-disconnected", socket.id);
      
//       // Remove user from room record
//       if (rooms[roomId] && rooms[roomId].users) {
//         delete rooms[roomId].users[socket.id];
        
//         // Clean up empty rooms
//         if (Object.keys(rooms[roomId].users).length === 0) {
//           delete rooms[roomId];
//         }
//       }
//     });
    
//     delete userSocketMap[socket.id];
//   });
  
//   // Handle explicit room leaving
//   socket.on("leave-room", (roomId) => {
//     socket.leave(roomId);
    
//     // Clean up room data
//     if (rooms[roomId] && rooms[roomId].users) {
//       delete rooms[roomId].users[socket.id];
      
//       if (Object.keys(rooms[roomId].users).length === 0) {
//         delete rooms[roomId];
//       }
//     }
    
//     // Notify others
//     socket.to(roomId).emit("user-disconnected", socket.id);
//   });
// });

// // 🛠️ Compiler API Endpoint
// app.post("/compile", async (req, res) => {
//   const { code, language } = req.body;

//   try {
//     const response = await axios.post("https://api.jdoodle.com/v1/execute", {
//       script: code,
//       language,
//       versionIndex: languageConfig[language].versionIndex,
//       clientId: process.env.jDoodle_clientId,
//       clientSecret: process.env.jDoodle_clientSecret,
//     });

//     res.json(response.data);
//   } catch (error) {
//     console.error("Compilation error:", error);
//     res.status(500).json({ error: "Failed to compile code" });
//   }
// });

// // 🚀 Start Server
// const PORT = process.env.PORT || 5000;
// server.listen(PORT, () =>
//   console.log(`✅ Server is running on port ${PORT}`)
// );