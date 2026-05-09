/**
 * Video Consultation Types
 * 
 * Type definitions for video consultation features including:
 * - Video sessions
 * - Waiting room
 * - Call quality
 * - Recording consent
 * - Emergency disconnect
 * - WebRTC signaling
 */

// ============================================================================
// Video Consultation Session
// ============================================================================

export interface VideoConsultation {
  id: string;
  appointment_id: string;
  doctor_id: string;
  patient_id: string;
  status: 'scheduled' | 'waiting' | 'in_progress' | 'completed' | 'cancelled' | 'failed';
  scheduled_start: string;
  actual_start: string | null;
  actual_end: string | null;
  duration_minutes: number | null;
  ice_servers: ICEServer[];
  recording_enabled: boolean;
  recording_consent_given: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ICEServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface CreateVideoConsultationRequest {
  appointment_id: string;
  scheduled_start: string;
  recording_enabled?: boolean;
}

export interface UpdateVideoConsultationRequest {
  status?: VideoConsultation['status'];
  notes?: string;
}

// ============================================================================
// Waiting Room
// ============================================================================

export interface WaitingRoomEntry {
  id: string;
  consultation_id: string;
  patient_id: string;
  doctor_id: string;
  priority: 'low' | 'normal' | 'high';
  position: number;
  estimated_wait_minutes: number;
  joined_at: string;
  notified_at: string | null;
  status: 'waiting' | 'notified' | 'joined' | 'timeout' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface JoinWaitingRoomRequest {
  consultation_id: string;
  priority?: WaitingRoomEntry['priority'];
}

export interface WaitingRoomStats {
  total_waiting: number;
  average_wait_minutes: number;
  queue_by_priority: {
    low: number;
    normal: number;
    high: number;
  };
}

// ============================================================================
// WebRTC Signaling
// ============================================================================

export interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice_candidate' | 'connection_state' | 'reconnect';
  data: any;
}

export interface SDPMessage {
  type: 'offer' | 'answer';
  sdp: string;
}

export interface ICECandidateMessage {
  candidate: string;
  sdpMid: string | null;
  sdpMLineIndex: number | null;
}

export interface ConnectionStateMessage {
  state: 'new' | 'connecting' | 'connected' | 'disconnected' | 'failed' | 'closed';
  reason?: string;
}

// ============================================================================
// Call Quality
// ============================================================================

export interface CallQualityMetrics {
  id: string;
  consultation_id: string;
  user_id: string;
  timestamp: string;
  video_bitrate: number;
  audio_bitrate: number;
  packet_loss: number;
  jitter: number;
  round_trip_time: number;
  frames_per_second: number;
  quality_score: number;
  quality_rating: 'excellent' | 'good' | 'fair' | 'poor';
  created_at: string;
}

export interface SubmitQualityMetricsRequest {
  video_bitrate: number;
  audio_bitrate: number;
  packet_loss: number;
  jitter: number;
  round_trip_time: number;
  frames_per_second: number;
}

export interface QualityStats {
  average_score: number;
  average_rating: string;
  total_measurements: number;
  poor_quality_count: number;
  excellent_quality_count: number;
}

// ============================================================================
// Recording Consent
// ============================================================================

export interface RecordingConsent {
  id: string;
  consultation_id: string;
  user_id: string;
  user_role: 'doctor' | 'patient';
  consent_given: boolean;
  consent_timestamp: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface SubmitConsentRequest {
  consent_given: boolean;
}

export interface ConsentStatus {
  all_consents_given: boolean;
  doctor_consent: boolean;
  patient_consent: boolean;
  can_start_recording: boolean;
}

// ============================================================================
// Emergency Disconnect
// ============================================================================

export interface EmergencyDisconnect {
  id: string;
  consultation_id: string;
  initiated_by: string;
  reason: 'medical_emergency' | 'technical_failure' | 'security_concern' | 'patient_distress' | 'inappropriate_behavior' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string | null;
  timestamp: string;
  follow_up_required: boolean;
  follow_up_completed: boolean;
  created_at: string;
}

export interface InitiateEmergencyDisconnectRequest {
  reason: EmergencyDisconnect['reason'];
  description?: string;
}

export interface EmergencyStats {
  total_incidents: number;
  by_reason: Record<EmergencyDisconnect['reason'], number>;
  by_severity: Record<EmergencyDisconnect['severity'], number>;
  follow_up_pending: number;
}

// ============================================================================
// Video Recording
// ============================================================================

export interface VideoRecording {
  id: string;
  consultation_id: string;
  storage_path: string;
  file_size_bytes: number;
  duration_seconds: number;
  format: string;
  encryption_key_id: string | null;
  retention_until: string;
  status: 'recording' | 'processing' | 'available' | 'deleted';
  created_at: string;
  updated_at: string;
}

// ============================================================================
// WebSocket Events
// ============================================================================

export interface VideoWebSocketEvents {
  // Signaling events
  'video:offer': SDPMessage;
  'video:answer': SDPMessage;
  'video:ice_candidate': ICECandidateMessage;
  'video:connection_state': ConnectionStateMessage;
  'video:reconnect': { reason: string };

  // Quality events
  'video:quality_update': CallQualityMetrics;
  'video:quality_warning': { score: number; rating: string };

  // Session events
  'video:session_start': { consultation_id: string };
  'video:session_end': { consultation_id: string; duration: number };
  'video:participant_joined': { user_id: string; role: string };
  'video:participant_left': { user_id: string; role: string };

  // Waiting room events
  'waiting_room:position_update': { position: number; estimated_wait: number };
  'waiting_room:ready': { consultation_id: string };
  'waiting_room:timeout': { consultation_id: string };

  // Recording events
  'recording:started': { consultation_id: string };
  'recording:stopped': { consultation_id: string; duration: number };
  'recording:consent_required': { consultation_id: string };

  // Emergency events
  'emergency:disconnect': EmergencyDisconnect;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface VideoConsultationResponse {
  consultation: VideoConsultation;
  ice_servers: ICEServer[];
}

export interface WaitingRoomResponse {
  entry: WaitingRoomEntry;
  position: number;
  estimated_wait_minutes: number;
}

export interface QualityResponse {
  metrics: CallQualityMetrics;
  score: number;
  rating: string;
}

// ============================================================================
// UI State Types
// ============================================================================

export interface VideoCallState {
  consultation: VideoConsultation | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  peerConnection: RTCPeerConnection | null;
  connectionState: RTCPeerConnectionState;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  qualityMetrics: CallQualityMetrics | null;
  recordingStatus: 'idle' | 'requesting_consent' | 'recording' | 'stopped';
}

export interface WaitingRoomState {
  entry: WaitingRoomEntry | null;
  position: number;
  estimatedWait: number;
  isWaiting: boolean;
}
