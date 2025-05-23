// const express = require("express");
// const app = express();
// const http = require("http");
// const { Server } = require("socket.io");
// const ACTIONS = require("./Actions");
// const cors = require("cors");
// const axios = require("axios");
// const server = http.createServer(app);
// require("dotenv").config();

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

// // Enable CORS
// app.use(cors());

// // Parse JSON bodies
// app.use(express.json());

// const io = new Server(server, {
//   cors: {
//     origin: "https://collabcodeeditor.onrender.com",
//     methods: ["GET", "POST"],
//   },
// });

// const userSocketMap = {};
// const getAllConnectedClients = (roomId) => {
//   return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
//     (socketId) => {
//       return {
//         socketId,
//         username: userSocketMap[socketId],
//       };
//     }
//   );
// };

// io.on("connection", (socket) => {
//   console.log("User connected:", socket.id);

//   // JOIN ROOM (already exists)
//   socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
//     userSocketMap[socket.id] = username;
//     socket.join(roomId);
//     const clients = getAllConnectedClients(roomId);

//     clients.forEach(({ socketId }) => {
//       io.to(socketId).emit(ACTIONS.JOINED, {
//         clients,
//         username,
//         socketId: socket.id,
//       });
//     });
//   });

//   // ✅ Video Call Signal Exchange
//   socket.on("video-signal", ({ signal, to }) => {
//     io.to(to).emit("video-signal", { signal, from: socket.id });
//   });

//   socket.on("start-call", ({ to }) => {
//     io.to(to).emit("start-call", { from: socket.id });
//   });

//   // 💻 Sync & code stuff (already present)
//   socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
//     socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
//   });

//   socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
//     io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
//   });

//   // 🧹 Handle Disconnect
//   socket.on("disconnecting", () => {
//     const rooms = [...socket.rooms];
//     rooms.forEach((roomId) => {
//       socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
//         socketId: socket.id,
//         username: userSocketMap[socket.id],
//       });
//     });
//     delete userSocketMap[socket.id];
//     socket.leave();
//   });
// });


// app.post("/compile", async (req, res) => {
//   const { code, language } = req.body;

//   try {
//     const response = await axios.post("https://api.jdoodle.com/v1/execute", {
//       script: code,
//       language: language,
//       versionIndex: languageConfig[language].versionIndex,
//       clientId: process.env.jDoodle_clientId,
//       clientSecret: process.env.jDoodle_clientSecret,
//     });

//     res.json(response.data);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: "Failed to compile code" });
//   }
// });

// const PORT = process.env.PORT || 5000;
// server.listen(PORT, () => console.log(`Server is runnint on port ${PORT}`));

const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();
const { ACTIONS } = require("./Actions");

const server = http.createServer(app);

// JDoodle Language Config
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

// Middleware
app.use(cors());
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // Change to your frontend URL if deployed
    methods: ["GET", "POST"],
  },
});

// Track users and rooms
const userSocketMap = {};
const rooms = {};

const getAllConnectedClients = (roomId) => {
  return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
    (socketId) => ({
      socketId,
      username: userSocketMap[socketId],
    })
  );
};

io.on("connection", (socket) => {
  console.log("⚡ User connected:", socket.id);

  // JOIN room
  socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
    userSocketMap[socket.id] = username;
    socket.join(roomId);

    // Create room if not exist
    if (!rooms[roomId]) rooms[roomId] = { users: {} };
    rooms[roomId].users[socket.id] = { username };

    const clients = getAllConnectedClients(roomId);
    clients.forEach(({ socketId }) => {
      io.to(socketId).emit(ACTIONS.JOINED, {
        clients,
        username,
        socketId: socket.id,
      });
    });
  });

  // CODE CHANGE broadcast
  socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
    socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
  });

  // SYNC CODE for new user
  socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
    io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
  });

  // DISCONNECTING user
  socket.on("disconnecting", () => {
    const joinedRooms = [...socket.rooms];

    joinedRooms.forEach((roomId) => {
      if (roomId === socket.id) return;

      socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
        socketId: socket.id,
        username: userSocketMap[socket.id],
      });

      if (rooms[roomId] && rooms[roomId].users) {
        delete rooms[roomId].users[socket.id];
        if (Object.keys(rooms[roomId].users).length === 0) {
          delete rooms[roomId];
        }
      }
    });

    delete userSocketMap[socket.id];
  });
});

// Compiler API
app.post("/compile", async (req, res) => {
  const { code, language } = req.body;

  try {
    const response = await axios.post("https://api.jdoodle.com/v1/execute", {
      script: code,
      language,
      versionIndex: languageConfig[language].versionIndex,
      clientId: process.env.jDoodle_clientId,
      clientSecret: process.env.jDoodle_clientSecret,
    });

    res.json(response.data);
  } catch (error) {
    console.error("🛑 Compilation error:", error);
    res.status(500).json({ error: "Failed to compile code" });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  console.log(`✅ Server running on http://localhost:${PORT}`)
);
