import React, { useEffect, useRef, useState } from "react";
import Client from "./Client";
import Editor from "./Editor";
import { initSocket } from "../Socket";
import { ACTIONS } from "./Actions";
import {
  useNavigate,
  useLocation,
  Navigate,
  useParams,
} from "react-router-dom";
import { toast } from "react-hot-toast";
import axios from "axios";
import VideoPanel from "./VideoPanel";

// List of supported languages
const LANGUAGES = [
  "python3",
  "java",
  "cpp",
  "nodejs",
  "c",
  "ruby",
  "go",
  "scala",
  "bash",
  "sql",
  "pascal",
  "csharp",
  "php",
  "swift",
  "rust",
  "r",
];

function EditorPage() {
  const [clients, setClients] = useState([]);
  const [output, setOutput] = useState("");
  const [isCompileWindowOpen, setIsCompileWindowOpen] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("python3");
  const [code, setCode] = useState(""); // Add a state to track code
  
  const location = useLocation();
  const navigate = useNavigate();
  const { roomId } = useParams();

  const socketRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      socketRef.current = await initSocket();
      
      // Handle connection errors
      const handleErrors = (err) => {
        console.log("Socket connection error:", err);
        toast.error("Socket connection failed. Try again later.");
        navigate("/");
      };
      
      socketRef.current.on("connect_error", handleErrors);
      socketRef.current.on("connect_failed", handleErrors);
      
      // Successfully connected
      socketRef.current.on("connect", () => {
        console.log("Socket connected:", socketRef.current.id);
        
        // Join the room
        socketRef.current.emit(ACTIONS.JOIN, {
          roomId,
          username: location.state?.username || "Anonymous",
        });
      });

      // Handle new user joining
      socketRef.current.on(ACTIONS.JOINED, ({ clients, username, socketId }) => {
        if (username !== location.state?.username) {
          toast.success(`${username} joined the room`);
        }
        setClients(clients);
        
        // Send current code to new user
        socketRef.current.emit(ACTIONS.SYNC_CODE, {
          socketId,
          code: code, // Use the current code state
        });
      });

      // Handle user disconnection
      socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
        toast.success(`${username} left the room`);
        setClients((prev) => prev.filter((client) => client.socketId !== socketId));
      });
    };
    
    init();

    // Cleanup function
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current.off(ACTIONS.JOINED);
        socketRef.current.off(ACTIONS.DISCONNECTED);
        socketRef.current.off("connect_error");
        socketRef.current.off("connect_failed");
      }
    };
  }, []);

  // Redirect if no username
  if (!location.state?.username) {
    return <Navigate to="/" />;
  }

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      toast.success("Room ID copied to clipboard");
    } catch (error) {
      console.error("Failed to copy room ID:", error);
      toast.error("Unable to copy the room ID");
    }
  };

  const leaveRoom = () => {
    // Notify others before navigating away
    if (socketRef.current) {
      socketRef.current.emit(ACTIONS.USER_DISCONNECTING, {
        roomId,
        username: location.state?.username
      });
    }
    navigate("/");
  };

  const runCode = async () => {
    setIsCompiling(true);
    try {
      // Make sure we're using the current code state
      const response = await axios.post("http://localhost:5000/compile", {
        code: code,
        language: selectedLanguage,
      });
      
      console.log("Compilation response:", response.data);
      
      // Format the output nicely
      if (response.data.output) {
        setOutput(response.data.output);
      } else if (response.data.error) {
        setOutput(`Error: ${response.data.error}`);
      } else {
        setOutput(JSON.stringify(response.data, null, 2));
      }
    } catch (error) {
      console.error("Error compiling code:", error);
      setOutput(error.response?.data?.error || "An error occurred during compilation");
    } finally {
      setIsCompiling(false);
    }
  };

  const toggleCompileWindow = () => {
    setIsCompileWindowOpen(!isCompileWindowOpen);
  };

  // Handle code changes from the editor
  const handleCodeChange = (newCode) => {
    setCode(newCode);
  };

  return (
    <div className="container-fluid vh-100">
      <div className="row h-100">
        
        {/* LEFT: Participants Panel */}
        <div className="col-md-2 bg-dark text-light d-flex flex-column">
          <img
            src="/images/codecast.png"
            alt="Logo"
            className="img-fluid mx-auto"
            style={{ maxWidth: "150px", marginTop: "20px" }}
          />
          <hr style={{ marginTop: "1rem" }} />
          <div className="d-flex flex-column flex-grow-1 overflow-auto">
            <span className="mb-2">Members ({clients.length})</span>
            {clients.map((client) => (
              <Client key={client.socketId} username={client.username} />
            ))}
          </div>
          <hr />
          <div className="mt-auto mb-3">
            <button className="btn btn-success w-100 mb-2" onClick={copyRoomId}>
              Copy Room ID
            </button>
            <button className="btn btn-danger w-100" onClick={leaveRoom}>
              Leave Room
            </button>
          </div>
        </div>
  
        {/* CENTER: Code Editor + Compiler */}
        <div className="col-md-7 d-flex flex-column text-light p-0">
          {/* Language Selector */}
          <div className="bg-dark p-2 d-flex justify-content-between align-items-center">
            <span>Room: {roomId}</span>
            <select
              className="form-select w-auto"
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
          </div>
  
          {/* Code Editor */}
          <div className="flex-grow-1">
            <Editor
              socketRef={socketRef}
              roomId={roomId}
              onCodeChange={handleCodeChange}
              language={selectedLanguage}
            />
          </div>
  
          {/* Compiler Toggle Button */}
          <div className="bg-dark p-2 text-end">
            <button
              className="btn btn-primary"
              onClick={toggleCompileWindow}
            >
              {isCompileWindowOpen ? "Close Compiler" : "Open Compiler"}
            </button>
          </div>
  
          {/* Compiler Section */}
          {isCompileWindowOpen && (
            <div
              className="bg-dark text-light p-3"
              style={{ height: "30vh", overflowY: "auto" }}
            >
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="m-0">Compiler Output ({selectedLanguage})</h5>
                <div>
                  <button
                    className="btn btn-success me-2"
                    onClick={runCode}
                    disabled={isCompiling}
                  >
                    {isCompiling ? "Compiling..." : "Run Code"}
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={toggleCompileWindow}
                  >
                    Close
                  </button>
                </div>
              </div>
              <pre className="bg-secondary p-3 rounded">
                {output || "Output will appear here after compilation"}
              </pre>
            </div>
          )}
        </div>
  
        {/* RIGHT: Video Call Panel */}
        <div className="col-md-3 bg-black text-light p-2 d-flex flex-column">
          <h6 className="text-center">Live Participants</h6>
          <div className="flex-grow-1 d-flex flex-wrap justify-content-center overflow-auto">
            <VideoPanel />
          </div>
        </div>
      </div>
    </div>
  );  
}

export default EditorPage;