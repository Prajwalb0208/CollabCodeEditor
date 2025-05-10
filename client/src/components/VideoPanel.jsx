// src/components/VideoPanel.jsx
// import React, { useEffect, useRef, useState } from 'react';
// import Peer from 'simple-peer';
// import { useParams, useNavigate } from 'react-router-dom';
// import { initSocket } from '../Socket';

// const RemoteVideo = ({ stream }) => {
//     const videoRef = useRef();

//     useEffect(() => {
//         if (videoRef.current && stream) {
//             videoRef.current.srcObject = stream;
//         }
//     }, [stream]);

//     return (
//         <video
//             ref={videoRef}
//             autoPlay
//             playsInline
//             className="w-100 mb-2"
//             style={{ borderRadius: '8px', maxWidth: '300px' }}
//         />
//     );
// };

// const VideoPanel = () => {
//     const { roomId } = useParams();
//     const navigate = useNavigate();
//     const socketRef = useRef();
//     const localVideoRef = useRef();
//     const peersRef = useRef([]);
    
//     const [stream, setStream] = useState(null);
//     const [peers, setPeers] = useState([]);
//     const [isVideoOn, setIsVideoOn] = useState(true);
//     const [isAudioOn, setIsAudioOn] = useState(true);

//     useEffect(() => {
//         let mounted = true;

//         const setupMediaAndSocket = async () => {
//             try {
//                 const localStream = await navigator.mediaDevices.getUserMedia({
//                     video: true,
//                     audio: true,
//                 });

//                 if (!mounted) return;

//                 setStream(localStream);
//                 if (localVideoRef.current) localVideoRef.current.srcObject = localStream;

//                 const socket = await initSocket();
//                 socketRef.current = socket;

//                 socket.emit("join-room", roomId);

//                 socket.on("all-users", users => {
//                     const peers = [];
//                     users.forEach(userID => {
//                         const peer = createPeer(userID, socket.id, localStream);
//                         peersRef.current.push({ peerID: userID, peer });
//                         peers.push({ peerID: userID, peer, stream: null });
//                     });
//                     setPeers(peers);
//                 });

//                 socket.on("user-joined", payload => {
//                     const peer = addPeer(payload.sdp, payload.callerID, localStream);
//                     peersRef.current.push({ peerID: payload.callerID, peer });
//                     setPeers(prev => [...prev, { peerID: payload.callerID, peer, stream: null }]);
//                 });

//                 socket.on("receive-answer", payload => {
//                     const peerObj = peersRef.current.find(p => p.peerID === payload.id);
//                     if (peerObj) peerObj.peer.signal(payload.sdp);
//                 });

//                 socket.on("receive-ice-candidate", payload => {
//                     const peerObj = peersRef.current.find(p => p.peerID === payload.from);
//                     if (peerObj) peerObj.peer.signal(payload.candidate);
//                 });

//                 socket.on("user-disconnected", id => {
//                     const peerObj = peersRef.current.find(p => p.peerID === id);
//                     if (peerObj) peerObj.peer.destroy();
//                     peersRef.current = peersRef.current.filter(p => p.peerID !== id);
//                     setPeers(prev => prev.filter(p => p.peerID !== id));
//                 });

//             } catch (err) {
//                 console.error("Media error:", err);
//                 alert("Camera/Microphone access is required.");
//             }
//         };

//         setupMediaAndSocket();

//         return () => {
//             mounted = false;
//             stream?.getTracks().forEach(track => track.stop());
//             peersRef.current.forEach(p => p.peer.destroy());
//             socketRef.current?.disconnect();
//             setPeers([]);
//         };
//     }, [roomId]);

//     const createPeer = (userToSignal, callerID, stream) => {
//         const peer = new Peer({
//             initiator: true,
//             trickle: false,
//             stream,
//         });

//         peer.on("signal", signal => {
//             socketRef.current.emit("sending-signal", {
//                 target: userToSignal,
//                 callerID,
//                 sdp: signal,
//             });
//         });

//         peer.on("stream", remoteStream => {
//             updatePeerStream(userToSignal, remoteStream);
//         });

//         return peer;
//     };

//     const addPeer = (sdp, callerID, stream) => {
//         const peer = new Peer({
//             initiator: false,
//             trickle: false,
//             stream,
//         });

//         peer.on("signal", signal => {
//             socketRef.current.emit("returning-signal", {
//                 sdp: signal,
//                 callerID,
//             });
//         });

//         peer.on("stream", remoteStream => {
//             updatePeerStream(callerID, remoteStream);
//         });

//         peer.signal(sdp);

//         return peer;
//     };

//     const updatePeerStream = (peerID, remoteStream) => {
//         setPeers(prevPeers =>
//             prevPeers.map(p =>
//                 p.peerID === peerID ? { ...p, stream: remoteStream } : p
//             )
//         );
//     };

//     const toggleVideo = () => {
//         const videoTrack = stream?.getVideoTracks()[0];
//         if (videoTrack) {
//             videoTrack.enabled = !videoTrack.enabled;
//             setIsVideoOn(videoTrack.enabled);
//         }
//     };

//     const toggleAudio = () => {
//         const audioTrack = stream?.getAudioTracks()[0];
//         if (audioTrack) {
//             audioTrack.enabled = !audioTrack.enabled;
//             setIsAudioOn(audioTrack.enabled);
//         }
//     };

//     const handleEndCall = () => {
//         stream?.getTracks().forEach(track => track.stop());
//         peersRef.current.forEach(p => p.peer.destroy());
//         socketRef.current?.emit("leave-room", roomId);
//         navigate('/');
//     };

//     return (
//         <div className="p-3 bg-dark text-white h-100 d-flex flex-column">
//             <h5 className="text-center mb-3">Video Call</h5>

//             <video
//                 ref={localVideoRef}
//                 autoPlay
//                 muted
//                 playsInline
//                 className="w-100 mb-3"
//                 style={{ borderRadius: '8px' }}
//             />

//             <div className="flex-grow-1 overflow-auto d-flex flex-wrap gap-2" style={{ maxHeight: "40vh" }}>
//                 {peers.map(({ peerID, stream }) =>
//                     stream ? <RemoteVideo key={peerID} stream={stream} /> : null
//                 )}
//             </div>

//             <div className="d-flex justify-content-between gap-2 mt-3">
//                 <button className="btn btn-outline-light w-100" onClick={toggleVideo}>
//                     {isVideoOn ? "🎥 Turn Off Camera" : "📷 Turn On Camera"}
//                 </button>
//                 <button className="btn btn-outline-light w-100" onClick={toggleAudio}>
//                     {isAudioOn ? "🔊 Mute" : "🔇 Unmute"}
//                 </button>
//                 <button className="btn btn-danger w-100" onClick={handleEndCall}>
//                     ❌ End Call
//                 </button>
//             </div>
//         </div>
//     );
// };

// export default VideoPanel;

// src/components/VideoPanel.jsx
import React, { useEffect, useRef, useState } from 'react';
import Peer from 'simple-peer';
import { useParams, useNavigate } from 'react-router-dom';
import socket, { initSocket } from '../Socket';
import { ACTIONS } from '../Actions';

// Component for displaying remote video streams
const RemoteVideo = ({ stream, username }) => {
    const videoRef = useRef();

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <div className="remote-video-container">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-100 mb-2"
                style={{ borderRadius: '8px', maxWidth: '300px' }}
            />
            {username && <div className="text-center text-white-50 small">{username}</div>}
        </div>
    );
};

const ChatMessage = ({ message, isMe }) => (
    <div className={`d-flex mb-2 ${isMe ? 'justify-content-end' : 'justify-content-start'}`}>
        <div
            className={`px-3 py-2 rounded-3 ${
                isMe ? 'bg-primary text-white' : 'bg-secondary bg-opacity-25 text-white'
            }`}
            style={{ maxWidth: '80%', overflowWrap: 'break-word' }}
        >
            {!isMe && <div className="fw-bold small mb-1">{message.sender}</div>}
            <div>{message.text}</div>
            <div className="text-end text-white-50 small mt-1">
                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
        </div>
    </div>
);

const VideoPanel = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const socketRef = useRef(null);
    const localVideoRef = useRef();
    const chatInputRef = useRef();
    const chatContainerRef = useRef();
    const peersRef = useRef([]);
    
    const [stream, setStream] = useState(null);
    const [peers, setPeers] = useState([]);
    const [isVideoOn, setIsVideoOn] = useState(true);
    const [isAudioOn, setIsAudioOn] = useState(true);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [username, setUsername] = useState('');
    const [peerUsernames, setPeerUsernames] = useState({});
    const [showChat, setShowChat] = useState(false);

    // Scroll chat to bottom when new messages arrive
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    useEffect(() => {
        let mounted = true;

        const setupMediaAndSocket = async () => {
            try {
                // Get stored username from localStorage or use Anonymous
                const storedUsername = localStorage.getItem('username') || 'Anonymous';
                if(storedUsername) setUsername(storedUsername);

                // Make sure socket connection is established first
                socketRef.current = socket;
                if (!socketRef.current.connected) {
                    socketRef.current.connect();
                }

                const localStream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true,
                });

                if (!mounted) return;

                setStream(localStream);
                if (localVideoRef.current) localVideoRef.current.srcObject = localStream;

                // Join room with roomId and username
                socketRef.current.emit(ACTIONS.JOIN, { roomId, username: storedUsername });

                // Setup peer connections when new users join
                socketRef.current.on(ACTIONS.JOINED, ({ clients, username, socketId }) => {
                    // Store username for new peer
                    if (socketId !== socketRef.current.id) {
                        setPeerUsernames(prev => ({ ...prev, [socketId]: username }));
                        
                        // Create a peer connection if this is a new user
                        if (!peersRef.current.some(p => p.peerID === socketId)) {
                            const peer = createPeer(socketId, socketRef.current.id, localStream);
                            peersRef.current.push({ peerID: socketId, peer });
                            setPeers(prev => [...prev, { peerID: socketId, peer, stream: null }]);
                        }
                    }
                });

                // Handle video signal
                socketRef.current.on(ACTIONS.VIDEO_SIGNAL, ({ signal, from }) => {
                    const peerObj = peersRef.current.find(p => p.peerID === from);
                    if (peerObj) {
                        peerObj.peer.signal(signal);
                    } else {
                        // If peer doesn't exist yet, create it
                        const peer = addPeer(signal, from, localStream);
                        peersRef.current.push({ peerID: from, peer });
                        setPeers(prev => [...prev, { peerID: from, peer, stream: null }]);
                    }
                });

                // Handle start call
                socketRef.current.on(ACTIONS.START_CALL, ({ from }) => {
                    const peerObj = peersRef.current.find(p => p.peerID === from);
                    if (!peerObj) {
                        const peer = createPeer(from, socketRef.current.id, localStream);
                        peersRef.current.push({ peerID: from, peer });
                        setPeers(prev => [...prev, { peerID: from, peer, stream: null }]);
                    }
                });

                // Handle code changes
                socketRef.current.on(ACTIONS.CODE_CHANGE, ({ code }) => {
                    // Handle code updates
                });

                // Handle chat messages
                socketRef.current.on(ACTIONS.CHAT_MESSAGE, message => {
                    setMessages(prev => [...prev, message]);
                });

                // Handle user disconnection
                socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
                    console.log(`User disconnected: ${username} (${socketId})`);
                    const peerObj = peersRef.current.find(p => p.peerID === socketId);
                    if (peerObj) peerObj.peer.destroy();
                    peersRef.current = peersRef.current.filter(p => p.peerID !== socketId);
                    setPeers(prev => prev.filter(p => p.peerID !== socketId));
                    
                    // Remove username
                    setPeerUsernames(prev => {
                        const updated = { ...prev };
                        delete updated[socketId];
                        return updated;
                    });
                });

            } catch (err) {
                console.error("Media error:", err);
                alert("Camera/Microphone access is required for video. Please allow and refresh.");
            }
        };

        setupMediaAndSocket();

        return () => {
            mounted = false;
            stream?.getTracks().forEach(track => track.stop());
            peersRef.current.forEach(p => p.peer.destroy());
            
            // Don't disconnect the socket, just leave the room
            if (socketRef.current) {
                socketRef.current.emit(ACTIONS.DISCONNECTING);
                socketRef.current.off(ACTIONS.JOINED);
                socketRef.current.off(ACTIONS.VIDEO_SIGNAL);
                socketRef.current.off(ACTIONS.START_CALL);
                socketRef.current.off(ACTIONS.CODE_CHANGE);
                socketRef.current.off(ACTIONS.CHAT_MESSAGE);
                socketRef.current.off(ACTIONS.DISCONNECTED);
            }
            
            setPeers([]);
        };
    }, [roomId]);

    const createPeer = (userToSignal, callerID, stream) => {
        const peer = new Peer({
            initiator: true,
            trickle: false,
            stream,
        });

        peer.on("signal", signal => {
            socketRef.current.emit(ACTIONS.VIDEO_SIGNAL, {
                to: userToSignal,
                signal,
            });
        });

        peer.on("stream", remoteStream => {
            updatePeerStream(userToSignal, remoteStream);
        });

        return peer;
    };

    const addPeer = (incomingSignal, callerID, stream) => {
        const peer = new Peer({
            initiator: false,
            trickle: false,
            stream,
        });

        peer.on("signal", signal => {
            socketRef.current.emit(ACTIONS.VIDEO_SIGNAL, {
                to: callerID,
                signal,
            });
        });

        peer.on("stream", remoteStream => {
            updatePeerStream(callerID, remoteStream);
        });

        peer.signal(incomingSignal);

        return peer;
    };

    const updatePeerStream = (peerID, remoteStream) => {
        setPeers(prevPeers =>
            prevPeers.map(p =>
                p.peerID === peerID ? { ...p, stream: remoteStream } : p
            )
        );
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

    const handleEndCall = () => {
        stream?.getTracks().forEach(track => track.stop());
        peersRef.current.forEach(p => p.peer.destroy());
        
        // Emit leave room event
        if (socketRef.current) {
            socketRef.current.emit(ACTIONS.DISCONNECTING);
        }
        
        navigate('/');
    };

    const sendMessage = (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !socketRef.current) return;
        
        const messageData = {
            sender: username || 'Anonymous',
            text: newMessage.trim(),
            timestamp: Date.now(),
            senderID: socketRef.current.id
        };
        
        // Add to local messages
        setMessages(prev => [...prev, messageData]);
        
        // Send to others
        socketRef.current.emit(ACTIONS.CHAT_MESSAGE, {
            roomId,
            message: messageData
        });
        
        setNewMessage('');
    };

    const toggleChat = () => {
        setShowChat(!showChat);
        // Focus input when opening chat
        if (!showChat) {
            setTimeout(() => {
                chatInputRef.current?.focus();
            }, 100);
        }
    };

    return (
        <div className="bg-dark text-white h-100 d-flex flex-column">
            <div className="p-3 pb-0">
                <h5 className="text-center mb-3">Video Call</h5>
                
                <div className="container-fluid p-0">
                    <div className="row g-2">
                        {/* Main content area - videos and chat */}
                        <div className={`col ${showChat ? 'col-md-8' : 'col-12'}`}>
                            {/* Local video */}
                            <div className="position-relative mb-3">
                                <video
                                    ref={localVideoRef}
                                    autoPlay
                                    muted
                                    playsInline
                                    className="w-100"
                                    style={{ borderRadius: '8px', maxHeight: '30vh', objectFit: 'cover' }}
                                />
                                <div className="position-absolute bottom-0 start-0 m-2 badge bg-primary">
                                    You {!isAudioOn && '🔇'} {!isVideoOn && '📵'}
                                </div>
                            </div>
                            
                            {/* Remote videos */}
                            <div className="d-flex flex-wrap gap-2 justify-content-center overflow-auto" 
                                 style={{ maxHeight: "40vh" }}>
                                {peers.map(({ peerID, stream }) =>
                                    stream ? (
                                        <RemoteVideo 
                                            key={peerID} 
                                            stream={stream} 
                                            username={peerUsernames[peerID] || 'Participant'}
                                        />
                                    ) : null
                                )}
                                {peers.length === 0 && (
                                    <div className="text-center text-muted py-5 w-100">
                                        Waiting for other participants to join...
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {/* Chat section - only visible when showChat is true */}
                        {showChat && (
                            <div className="col-md-4 d-flex flex-column">
                                <div className="bg-dark border border-secondary rounded p-2 d-flex flex-column" 
                                     style={{ height: '60vh' }}>
                                    <h6 className="border-bottom border-secondary pb-2 mb-2">Chat</h6>
                                    
                                    {/* Chat messages */}
                                    <div 
                                        ref={chatContainerRef}
                                        className="flex-grow-1 overflow-auto mb-2 px-1" 
                                        style={{ maxHeight: 'calc(60vh - 120px)' }}
                                    >
                                        {messages.length === 0 ? (
                                            <div className="text-center text-muted py-3">
                                                No messages yet. Start a conversation!
                                            </div>
                                        ) : (
                                            messages.map((msg, index) => (
                                                <ChatMessage 
                                                    key={index} 
                                                    message={msg} 
                                                    isMe={socketRef.current && msg.senderID === socketRef.current.id}
                                                />
                                            ))
                                        )}
                                    </div>
                                    
                                    {/* Chat input */}
                                    <form onSubmit={sendMessage} className="d-flex mt-auto">
                                        <input
                                            ref={chatInputRef}
                                            type="text"
                                            className="form-control form-control-sm bg-dark text-white border-secondary"
                                            placeholder="Type a message..."
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                        />
                                        <button 
                                            type="submit" 
                                            className="btn btn-sm btn-primary ms-2"
                                            disabled={!newMessage.trim()}
                                        >
                                            Send
                                        </button>
                                    </form>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Control buttons */}
            <div className="d-flex justify-content-between gap-2 mt-auto p-3">
                <button className="btn btn-outline-light" onClick={toggleVideo}>
                    {isVideoOn ? "🎥 Turn Off Camera" : "📷 Turn On Camera"}
                </button>
                <button className="btn btn-outline-light" onClick={toggleAudio}>
                    {isAudioOn ? "🔊 Mute" : "🔇 Unmute"}
                </button>
                <button className="btn btn-outline-light" onClick={toggleChat}>
                    💬 {showChat ? "Hide Chat" : "Show Chat"}
                </button>
                <button className="btn btn-danger" onClick={handleEndCall}>
                    ❌ End Call
                </button>
            </div>
        </div>
    );
};

export default VideoPanel;