// import React, { useEffect, useRef, useState } from 'react';

// const VideoPanel = () => {
//   const videoRef = useRef(null);
//   const streamRef = useRef(null);
//   const [cameraOn, setCameraOn] = useState(true);
//   const [micOn, setMicOn] = useState(true);

//   useEffect(() => {
//     startStream();
//     return () => stopStream();
//   }, []);

//   const startStream = async () => {
//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({
//         video: true,
//         audio: true,
//       });
//       streamRef.current = stream;
//       if (videoRef.current) videoRef.current.srcObject = stream;
//     } catch (err) {
//       console.error('Error accessing media devices.', err);
//     }
//   };

//   const stopStream = () => {
//     streamRef.current?.getTracks().forEach(track => track.stop());
//   };

//   const toggleCamera = () => {
//     const videoTrack = streamRef.current?.getVideoTracks()[0];
//     if (videoTrack) {
//       videoTrack.enabled = !videoTrack.enabled;
//       setCameraOn(videoTrack.enabled);
//     }
//   };

//   const toggleMic = () => {
//     const audioTrack = streamRef.current?.getAudioTracks()[0];
//     if (audioTrack) {
//       audioTrack.enabled = !audioTrack.enabled;
//       setMicOn(audioTrack.enabled);
//     }
//   };

//   const handleEndCall = () => {
//     stopStream();
//     if (videoRef.current) videoRef.current.srcObject = null;
//   };

//   return (
//     <div style={{ padding: '10px', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#f3f3f3' }}>
//       <h3 style={{ textAlign: 'center' }}>Video Call</h3>
//       <video ref={videoRef} autoPlay muted style={{ width: '100%', borderRadius: '8px', background: '#000' }} />

//       <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-around' }}>
//         <button onClick={toggleMic} style={buttonStyle}>
//           {micOn ? '🔊 Mute' : '🔇 Unmute'}
//         </button>
//         <button onClick={toggleCamera} style={buttonStyle}>
//           {cameraOn ? '📹 Off' : '📷 On'}
//         </button>
//         <button onClick={handleEndCall} style={{ ...buttonStyle, backgroundColor: '#e63946', color: 'white' }}>
//           ❌ End Call
//         </button>
//       </div>
//     </div>
//   );
// };

// const buttonStyle = {
//   padding: '8px 12px',
//   borderRadius: '6px',
//   border: 'none',
//   backgroundColor: '#ddd',
//   cursor: 'pointer',
// };

// export default VideoPanel;

import React, { useEffect, useRef, useState } from 'react';
import Peer from 'simple-peer';
import { useParams } from 'react-router-dom';
import io from 'socket.io-client';

const socket = io("http://localhost:5000");

const VideoPanel = () => {
  const [peers, setPeers] = useState([]); // { peerID, peer, stream }
  const [stream, setStream] = useState();
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);

  const peersRef = useRef([]);
  const localVideoRef = useRef();
  const { roomId } = useParams();

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(currentStream => {
      setStream(currentStream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = currentStream;
      }

      socket.emit("join-room", roomId, socket.id);

      socket.on("user-connected", userId => {
        const peer = createPeer(userId, socket.id, currentStream);
        peersRef.current.push({ peerID: userId, peer });
        setPeers(prev => [...prev, { peerID: userId, peer, stream: null }]);
      });

      socket.on("offer", handleReceiveCall);
      socket.on("answer", handleAnswer);
      socket.on("ice-candidate", handleNewICECandidateMsg);

      socket.on("user-disconnected", userId => {
        const peerObj = peersRef.current.find(p => p.peerID === userId);
        if (peerObj) {
          peerObj.peer.destroy();
        }
        peersRef.current = peersRef.current.filter(p => p.peerID !== userId);
        setPeers(prev => prev.filter(p => p.peerID !== userId));
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const createPeer = (userToSignal, callerID, stream) => {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream,
    });

    peer.on("signal", signal => {
      socket.emit("offer", {
        target: userToSignal,
        sdp: signal,
      });
    });

    peer.on("stream", remoteStream => {
      updatePeerStream(userToSignal, remoteStream);
    });

    return peer;
  };

  const handleReceiveCall = ({ sdp, caller }) => {
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream,
    });

    peer.on("signal", signal => {
      socket.emit("answer", {
        target: caller,
        sdp: signal,
      });
    });

    peer.on("stream", remoteStream => {
      updatePeerStream(caller, remoteStream);
    });

    peer.signal(sdp);
    peersRef.current.push({ peerID: caller, peer });
    setPeers(prev => [...prev, { peerID: caller, peer, stream: null }]);
  };

  const updatePeerStream = (peerID, remoteStream) => {
    setPeers(prev =>
      prev.map(p => p.peerID === peerID ? { ...p, stream: remoteStream } : p)
    );
  };

  const handleAnswer = ({ sdp, caller }) => {
    const item = peersRef.current.find(p => p.peerID === caller);
    if (item) item.peer.signal(sdp);
  };

  const handleNewICECandidateMsg = ({ candidate, from }) => {
    const peerObj = peersRef.current.find(p => p.peerID === from);
    if (peerObj) peerObj.peer.signal(candidate);
  };

  const handleEndCall = () => {
    stream?.getTracks().forEach(track => track.stop());
    peersRef.current.forEach(p => p.peer.destroy());
    setPeers([]);
    socket.emit("leave-room", roomId);
    window.location.href = "/";
  };

  const toggleVideo = () => {
    const videoTrack = stream?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoOn(videoTrack.enabled);
    }
  };

  const toggleAudio = () => {
    const audioTrack = stream?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsAudioOn(audioTrack.enabled);
    }
  };

  return (
    <div className="p-2 bg-dark text-white h-100">
      <h5 className="text-center mb-2">Video Call</h5>

      <video
        ref={localVideoRef}
        autoPlay
        muted
        playsInline
        className="w-100 mb-2"
        style={{ borderRadius: '8px' }}
      />

      <div id="remote-videos" style={{ height: "calc(100% - 160px)", overflowY: "auto" }}>
        {peers.map(({ peerID, stream }) => (
          stream && (
            <video
              key={peerID}
              autoPlay
              playsInline
              ref={video => {
                if (video) video.srcObject = stream;
              }}
              className="w-100 mb-2"
              style={{ borderRadius: '8px' }}
            />
          )
        ))}
      </div>

      <div className="d-flex gap-2 mt-2">
        <button className="btn btn-secondary w-100" onClick={toggleVideo}>
          {isVideoOn ? "🎥 Turn Off Camera" : "📷 Turn On Camera"}
        </button>
        <button className="btn btn-secondary w-100" onClick={toggleAudio}>
          {isAudioOn ? "🔊 Mute" : "🔇 Unmute"}
        </button>
        <button className="btn btn-danger w-100" onClick={handleEndCall}>
          ❌ End Call
        </button>
      </div>
    </div>
  );
};

export default VideoPanel;
