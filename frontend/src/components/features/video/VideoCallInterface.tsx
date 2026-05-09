/**
 * Video Call Interface Component
 * 
 * Main video consultation interface with WebRTC support
 * Features:
 * - Local and remote video streams
 * - Audio/video controls
 * - Screen sharing
 * - Call quality monitoring
 * - Recording consent
 * - Emergency disconnect
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { videoAPI } from '@/services/api';
import { getWebSocketManager } from '@/services/websocket';
import type {
  VideoConsultation,
  CallQualityMetrics,
  SDPMessage,
  ICECandidateMessage,
} from '@/types';
import { CallQualityIndicator } from './CallQualityIndicator';
import { RecordingConsentDialog } from './RecordingConsentDialog';
import { EmergencyDisconnectButton } from './EmergencyDisconnectButton';
import { QualityDiagnostics } from './QualityDiagnostics';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  Phone,
  Settings,
} from 'lucide-react';

interface VideoCallInterfaceProps {
  consultationId: string;
  onEnd?: () => void;
}

export function VideoCallInterface({
  consultationId,
  onEnd,
}: VideoCallInterfaceProps) {
  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const qualityIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // State
  const [consultation, setConsultation] = useState<VideoConsultation | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [qualityMetrics, setQualityMetrics] = useState<CallQualityMetrics | null>(null);
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');

  /**
   * Initialize video consultation
   */
  useEffect(() => {
    initializeCall();
    return () => cleanup();
  }, [consultationId]);

  /**
   * Initialize call
   */
  const initializeCall = async () => {
    try {
      // Get consultation details
      const consultationData = await videoAPI.getVideoConsultation(consultationId);
      setConsultation(consultationData);

      // Check recording consent
      const consentStatus = await videoAPI.getConsentStatus(consultationId);
      if (consultationData.recording_enabled && !consentStatus.all_consents_given) {
        setShowConsentDialog(true);
        return;
      }

      // Join consultation
      const { ice_servers } = await videoAPI.joinVideoConsultation(consultationId);

      // Setup WebRTC
      await setupWebRTC(ice_servers);

      // Connect WebSocket
      await connectWebSocket();

      // Get local media
      await getLocalMedia();

      // Start quality monitoring
      startQualityMonitoring();
    } catch (err) {
      console.error('Failed to initialize call:', err);
      setError('Failed to initialize video call. Please try again.');
    }
  };

  /**
   * Setup WebRTC peer connection
   */
  const setupWebRTC = async (iceServers: RTCIceServer[]) => {
    const pc = new RTCPeerConnection({
      iceServers,
      iceCandidatePoolSize: 10,
    });

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendICECandidate(event.candidate);
      }
    };

    // Handle remote stream
    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      setConnectionState(pc.connectionState);
      setIsConnected(pc.connectionState === 'connected');

      if (pc.connectionState === 'failed') {
        handleConnectionFailure();
      }
    };

    peerConnectionRef.current = pc;
  };

  /**
   * Connect to WebSocket for signaling
   */
  const connectWebSocket = async () => {
    const wsManager = getWebSocketManager();
    const ws = await wsManager.connect(`video/${consultationId}`);

    // Handle signaling messages
    ws.on('video:offer', handleOffer);
    ws.on('video:answer', handleAnswer);
    ws.on('video:ice_candidate', handleRemoteICECandidate);
    ws.on('video:connection_state', handleConnectionState);
    ws.on('video:quality_update', setQualityMetrics);
  };

  /**
   * Get local media (camera and microphone)
   */
  const getLocalMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Add tracks to peer connection
      if (peerConnectionRef.current) {
        stream.getTracks().forEach((track) => {
          peerConnectionRef.current!.addTrack(track, stream);
        });
      }

      // Create and send offer
      await createOffer();
    } catch (err) {
      console.error('Failed to get local media:', err);
      setError('Failed to access camera/microphone. Please check permissions.');
    }
  };

  /**
   * Create and send WebRTC offer
   */
  const createOffer = async () => {
    if (!peerConnectionRef.current) return;

    try {
      const offer = await peerConnectionRef.current.createOffer();
      await peerConnectionRef.current.setLocalDescription(offer);

      const wsManager = getWebSocketManager();
      const ws = wsManager.getConnection(`video/${consultationId}`);
      ws.send('video:offer', {
        type: 'offer',
        sdp: offer.sdp,
      });
    } catch (err) {
      console.error('Failed to create offer:', err);
    }
  };

  /**
   * Handle incoming offer
   */
  const handleOffer = async (offer: SDPMessage) => {
    if (!peerConnectionRef.current) return;

    try {
      await peerConnectionRef.current.setRemoteDescription(
        new RTCSessionDescription(offer)
      );

      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);

      const wsManager = getWebSocketManager();
      const ws = wsManager.getConnection(`video/${consultationId}`);
      ws.send('video:answer', {
        type: 'answer',
        sdp: answer.sdp,
      });
    } catch (err) {
      console.error('Failed to handle offer:', err);
    }
  };

  /**
   * Handle incoming answer
   */
  const handleAnswer = async (answer: SDPMessage) => {
    if (!peerConnectionRef.current) return;

    try {
      await peerConnectionRef.current.setRemoteDescription(
        new RTCSessionDescription(answer)
      );
    } catch (err) {
      console.error('Failed to handle answer:', err);
    }
  };

  /**
   * Send ICE candidate
   */
  const sendICECandidate = (candidate: RTCIceCandidate) => {
    const wsManager = getWebSocketManager();
    const ws = wsManager.getConnection(`video/${consultationId}`);
    ws.send('video:ice_candidate', {
      candidate: candidate.candidate,
      sdpMid: candidate.sdpMid,
      sdpMLineIndex: candidate.sdpMLineIndex,
    });
  };

  /**
   * Handle remote ICE candidate
   */
  const handleRemoteICECandidate = async (candidateData: ICECandidateMessage) => {
    if (!peerConnectionRef.current) return;

    try {
      const candidate = new RTCIceCandidate(candidateData);
      await peerConnectionRef.current.addIceCandidate(candidate);
    } catch (err) {
      console.error('Failed to add ICE candidate:', err);
    }
  };

  /**
   * Handle connection state changes
   */
  const handleConnectionState = (data: { state: string; reason?: string }) => {
    console.log('Connection state:', data);
    if (data.state === 'failed' || data.state === 'disconnected') {
      handleConnectionFailure();
    }
  };

  /**
   * Handle connection failure
   */
  const handleConnectionFailure = () => {
    setError('Connection lost. Attempting to reconnect...');
    // Attempt reconnection
    setTimeout(() => {
      initializeCall();
    }, 3000);
  };

  /**
   * Start quality monitoring
   */
  const startQualityMonitoring = () => {
    qualityIntervalRef.current = setInterval(async () => {
      if (!peerConnectionRef.current || !isConnected) return;

      try {
        const stats = await peerConnectionRef.current.getStats();
        const metrics = extractQualityMetrics(stats);

        // Submit to backend
        const qualityData = await videoAPI.submitQualityMetrics(
          consultationId,
          metrics
        );
        setQualityMetrics(qualityData);
      } catch (err) {
        console.error('Failed to collect quality metrics:', err);
      }
    }, 5000); // Every 5 seconds
  };

  /**
   * Extract quality metrics from WebRTC stats
   */
  const extractQualityMetrics = (stats: RTCStatsReport) => {
    let videoBitrate = 0;
    let audioBitrate = 0;
    let packetLoss = 0;
    let jitter = 0;
    let roundTripTime = 0;
    let framesPerSecond = 0;

    stats.forEach((report) => {
      if (report.type === 'inbound-rtp') {
        if (report.kind === 'video') {
          videoBitrate = report.bytesReceived * 8 / 1000; // kbps
          framesPerSecond = report.framesPerSecond || 0;
        } else if (report.kind === 'audio') {
          audioBitrate = report.bytesReceived * 8 / 1000; // kbps
          jitter = report.jitter || 0;
        }
        packetLoss = report.packetsLost / (report.packetsReceived + report.packetsLost) * 100;
      }
      if (report.type === 'candidate-pair' && report.state === 'succeeded') {
        roundTripTime = report.currentRoundTripTime * 1000 || 0; // ms
      }
    });

    return {
      video_bitrate: videoBitrate,
      audio_bitrate: audioBitrate,
      packet_loss: packetLoss,
      jitter,
      round_trip_time: roundTripTime,
      frames_per_second: framesPerSecond,
    };
  };

  /**
   * Toggle audio
   */
  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  }, []);

  /**
   * Toggle video
   */
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  }, []);

  /**
   * Toggle screen sharing
   */
  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      // Stop screen sharing
      await getLocalMedia();
      setIsScreenSharing(false);
    } else {
      // Start screen sharing
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });

        const videoTrack = screenStream.getVideoTracks()[0];
        const sender = peerConnectionRef.current
          ?.getSenders()
          .find((s) => s.track?.kind === 'video');

        if (sender) {
          sender.replaceTrack(videoTrack);
        }

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        videoTrack.onended = () => {
          getLocalMedia();
          setIsScreenSharing(false);
        };

        setIsScreenSharing(true);
      } catch (err) {
        console.error('Failed to share screen:', err);
      }
    }
  }, [isScreenSharing]);

  /**
   * End call
   */
  const endCall = async () => {
    try {
      await videoAPI.endVideoConsultation(consultationId);
      cleanup();
      onEnd?.();
    } catch (err) {
      console.error('Failed to end call:', err);
    }
  };

  /**
   * Cleanup resources
   */
  const cleanup = () => {
    // Stop quality monitoring
    if (qualityIntervalRef.current) {
      clearInterval(qualityIntervalRef.current);
    }

    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    // Disconnect WebSocket
    const wsManager = getWebSocketManager();
    wsManager.disconnect(`video/${consultationId}`);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      {/* Video Grid */}
      <div className="flex-1 relative">
        {/* Remote Video (Main) */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />

        {/* Local Video (Picture-in-Picture) */}
        <div className="absolute top-4 right-4 w-64 h-48 bg-gray-800 rounded-lg overflow-hidden shadow-lg">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          {!isVideoEnabled && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
              <VideoOff className="w-12 h-12 text-gray-400" />
            </div>
          )}
        </div>

        {/* Call Quality Indicator */}
        <div className="absolute top-4 left-4">
          <CallQualityIndicator metrics={qualityMetrics} />
        </div>

        {/* Connection Status */}
        {!isConnected && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <Card className="p-6 bg-gray-800 text-white">
              <p className="text-lg">
                {connectionState === 'connecting' ? 'Connecting...' : 'Reconnecting...'}
              </p>
            </Card>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2">
            <Card className="p-4 bg-red-500 text-white">
              <p>{error}</p>
            </Card>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-gray-800 p-4">
        <div className="flex items-center justify-center space-x-4">
          {/* Audio Toggle */}
          <Button
            onClick={toggleAudio}
            variant={isAudioEnabled ? 'default' : 'destructive'}
            size="lg"
            className="rounded-full w-14 h-14"
          >
            {isAudioEnabled ? (
              <Mic className="w-6 h-6" />
            ) : (
              <MicOff className="w-6 h-6" />
            )}
          </Button>

          {/* Video Toggle */}
          <Button
            onClick={toggleVideo}
            variant={isVideoEnabled ? 'default' : 'destructive'}
            size="lg"
            className="rounded-full w-14 h-14"
          >
            {isVideoEnabled ? (
              <Video className="w-6 h-6" />
            ) : (
              <VideoOff className="w-6 h-6" />
            )}
          </Button>

          {/* Screen Share Toggle */}
          <Button
            onClick={toggleScreenShare}
            variant={isScreenSharing ? 'secondary' : 'default'}
            size="lg"
            className="rounded-full w-14 h-14"
          >
            {isScreenSharing ? (
              <MonitorOff className="w-6 h-6" />
            ) : (
              <Monitor className="w-6 h-6" />
            )}
          </Button>

          {/* End Call */}
          <Button
            onClick={endCall}
            variant="destructive"
            size="lg"
            className="rounded-full w-14 h-14"
          >
            <Phone className="w-6 h-6 transform rotate-135" />
          </Button>

          {/* Diagnostics */}
          <Button
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            variant="outline"
            size="lg"
            className="rounded-full w-14 h-14"
          >
            <Settings className="w-6 h-6" />
          </Button>

          {/* Emergency Disconnect */}
          <EmergencyDisconnectButton
            consultationId={consultationId}
            onDisconnect={endCall}
          />
        </div>
      </div>

      {/* Recording Consent Dialog */}
      {showConsentDialog && (
        <RecordingConsentDialog
          consultationId={consultationId}
          onConsent={() => {
            setShowConsentDialog(false);
            initializeCall();
          }}
          onDecline={() => {
            setShowConsentDialog(false);
            onEnd?.();
          }}
        />
      )}

      {/* Quality Diagnostics */}
      {showDiagnostics && (
        <QualityDiagnostics
          consultationId={consultationId}
          metrics={qualityMetrics}
          connectionState={connectionState}
          onClose={() => setShowDiagnostics(false)}
        />
      )}
    </div>
  );
}
