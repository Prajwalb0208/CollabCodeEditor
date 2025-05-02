import React, { useEffect, useRef, useState } from 'react';

const VideoPanel = () => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);

  useEffect(() => {
    startStream();
    return () => stopStream();
  }, []);

  const startStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      console.error('Error accessing media devices.', err);
    }
  };

  const stopStream = () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
  };

  const toggleCamera = () => {
    const videoTrack = streamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setCameraOn(videoTrack.enabled);
    }
  };

  const toggleMic = () => {
    const audioTrack = streamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setMicOn(audioTrack.enabled);
    }
  };

  const handleEndCall = () => {
    stopStream();
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  return (
    <div style={{ padding: '10px', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#f3f3f3' }}>
      <h3 style={{ textAlign: 'center' }}>Video Call</h3>
      <video ref={videoRef} autoPlay muted style={{ width: '100%', borderRadius: '8px', background: '#000' }} />

      <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-around' }}>
        <button onClick={toggleMic} style={buttonStyle}>
          {micOn ? '🔊 Mute' : '🔇 Unmute'}
        </button>
        <button onClick={toggleCamera} style={buttonStyle}>
          {cameraOn ? '📹 Off' : '📷 On'}
        </button>
        <button onClick={handleEndCall} style={{ ...buttonStyle, backgroundColor: '#e63946', color: 'white' }}>
          ❌ End Call
        </button>
      </div>
    </div>
  );
};

const buttonStyle = {
  padding: '8px 12px',
  borderRadius: '6px',
  border: 'none',
  backgroundColor: '#ddd',
  cursor: 'pointer',
};

export default VideoPanel;
