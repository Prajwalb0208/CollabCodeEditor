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
//     origin: "*",
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
//   // console.log('Socket connected', socket.id);
//   socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
//     userSocketMap[socket.id] = username;
//     socket.join(roomId);
//     const clients = getAllConnectedClients(roomId);
//     // notify that new user join
//     clients.forEach(({ socketId }) => {
//       io.to(socketId).emit(ACTIONS.JOINED, {
//         clients,
//         username,
//         socketId: socket.id,
//       });
//     });
//   });

//   // sync the code
//   socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
//     socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
//   });
//   // when new user join the room all the code which are there are also shows on that persons editor
//   socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
//     io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
//   });

//   // leave room
//   socket.on("disconnecting", () => {
//     const rooms = [...socket.rooms];
//     // leave all the room
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
//       clientSecret: process.env.kDoodle_clientSecret,
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
const ACTIONS = require("./Actions");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();

// Language configuration for versioning
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

// Enable CORS for all origins (for development purposes, modify for production)
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// HTTP server to work with WebSocket
const server = http.createServer(app);

// Set up Socket.io
const io = new Server(server, {
  cors: {
    origin: "*", // For production, change this to your frontend URL
    methods: ["GET", "POST"],
  },
});

// To track users and map their socket IDs
const userSocketMap = {};

// Utility function to get all connected clients in a room
const getAllConnectedClients = (roomId) => {
  return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map((socketId) => {
    return {
      socketId,
      username: userSocketMap[socketId],
    };
  });
};

// Handle WebSocket connections
io.on("connection", (socket) => {
  // When a user joins a room
  socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
    userSocketMap[socket.id] = username;
    socket.join(roomId);
    const clients = getAllConnectedClients(roomId);
    // Notify others that a new user has joined
    clients.forEach(({ socketId }) => {
      io.to(socketId).emit(ACTIONS.JOINED, {
        clients,
        username,
        socketId: socket.id,
      });
    });
  });

  // Sync code changes across clients in the room
  socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
    socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
  });

  // Sync code with a specific user
  socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
    io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
  });

  // Handle user disconnection
  socket.on("disconnecting", () => {
    const rooms = [...socket.rooms];
    // Notify room members that a user disconnected
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

// Compilation endpoint using JDoodle API
app.post("/compile", async (req, res) => {
  const { code, language } = req.body;

  try {
    const response = await axios.post("https://api.jdoodle.com/v1/execute", {
      script: code,
      language: language,
      versionIndex: languageConfig[language].versionIndex,
      clientId: process.env.jDoodle_clientId,
      clientSecret: process.env.kDoodle_clientSecret,
    });

    res.json(response.data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to compile code" });
  }
});

// Start the server on a specific port
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
