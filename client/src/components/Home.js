import React, { useState } from "react";
import { v4 as uuid } from "uuid";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

function Home() {
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");

  const navigate = useNavigate();

  const generateRoomId = () => {
    const id = uuid();
    setRoomId(id);
    toast.success("Room ID generated");
  };

  const joinRoom = () => {
    if (!roomId || !username) {
      toast.error("Both fields are required");
      return;
    }

    navigate(`/editor/${roomId}`, {
      state: {
        username,
      },
    });
    toast.success("Joined the room");
  };

  const handleInputEnter = (e) => {
    if (e.code === "Enter") {
      joinRoom();
    }
  };

  return (
    <div className="container text-center my-5">
      <h1 className="fw-bold mb-3">Collaborate on Code in Real-Time</h1>
      <p className="text-muted mb-5">
        Create or join a coding session to work together with teammates, share
        your screen, and solve problems together.
      </p>

      <div className="row justify-content-center mb-5">
        <div className="col-md-4">
          <div className="card shadow-sm p-4">
            <div className="mb-3">
              <div className="bg-light rounded-circle d-inline-flex align-items-center justify-content-center" style={{ width: "40px", height: "40px" }}>
                <span className="fs-4 text-primary">+</span>
              </div>
            </div>
            <h5 className="fw-semibold">Create New Session</h5>
            <p className="text-muted">
              Start a new collaborative coding session and invite others to join
            </p>
            <button
              onClick={generateRoomId}
              className="btn btn-primary w-100"
            >
              Create New Room
            </button>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card shadow-sm p-4">
            <h5 className="fw-semibold">Join Existing Session</h5>
            <p className="text-muted">
              Enter a session ID to join an existing collaborative room
            </p>
            <input
              type="text"
              className="form-control mb-2"
              placeholder="Enter session ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              onKeyUp={handleInputEnter}
            />
            <input
              type="text"
              className="form-control mb-3"
              placeholder="Enter your name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyUp={handleInputEnter}
            />
            <button
              onClick={joinRoom}
              className="btn btn-primary w-100"
            >
              Join Session
            </button>
          </div>
        </div>
      </div>

      <div className="row text-center">
        <div className="col-md-4">
          <div className="text-muted">
            <div className="mb-2">🔁</div>
            <h6>Real-time Coding</h6>
            <p className="small">Code together in real-time with teammates across the world</p>
          </div>
        </div>
        <div className="col-md-4">
          <div className="text-muted">
            <div className="mb-2">🔗</div>
            <h6>Share & Collaborate</h6>
            <p className="small">Share your code, get feedback, and collaborate effortlessly</p>
          </div>
        </div>
        <div className="col-md-4">
          <div className="text-muted">
            <div className="mb-2">🎥</div>
            <h6>Built-in Video Chat</h6>
            <p className="small">Communicate with teammates using integrated audio and video chat</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
