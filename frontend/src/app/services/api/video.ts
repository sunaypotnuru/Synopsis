/**
 * Video Consultation API Client
 * 
 * Provides methods to interact with video consultation endpoints
 */

import { apiClient } from '../apiClient';
import type {
  VideoConsultation,
  CreateVideoConsultationRequest,
  UpdateVideoConsultationRequest,
  VideoConsultationResponse,
  WaitingRoomEntry,
  JoinWaitingRoomRequest,
  WaitingRoomResponse,
  WaitingRoomStats,
  CallQualityMetrics,
  SubmitQualityMetricsRequest,
  QualityStats,
  RecordingConsent,
  SubmitConsentRequest,
  ConsentStatus,
  EmergencyDisconnect,
  InitiateEmergencyDisconnectRequest,
  EmergencyStats,
  SDPMessage,
  ICECandidateMessage,
} from '../../types';

const BASE_PATH = '/api/v1/video';

// ============================================================================
// Video Consultation Session Management
// ============================================================================

/**
 * Create a new video consultation session
 */
export async function createVideoConsultation(
  data: CreateVideoConsultationRequest
): Promise<VideoConsultationResponse> {
  const response = await apiClient.post<VideoConsultationResponse>(
    `${BASE_PATH}/consultations`,
    data
  );
  return response.data;
}

/**
 * Get video consultation by ID
 */
export async function getVideoConsultation(
  consultationId: string
): Promise<VideoConsultation> {
  const response = await apiClient.get<VideoConsultation>(
    `${BASE_PATH}/consultations/${consultationId}`
  );
  return response.data;
}

/**
 * Update video consultation
 */
export async function updateVideoConsultation(
  consultationId: string,
  data: UpdateVideoConsultationRequest
): Promise<VideoConsultation> {
  const response = await apiClient.patch<VideoConsultation>(
    `${BASE_PATH}/consultations/${consultationId}`,
    data
  );
  return response.data;
}

/**
 * Join video consultation
 */
export async function joinVideoConsultation(
  consultationId: string
): Promise<VideoConsultationResponse> {
  const response = await apiClient.post<VideoConsultationResponse>(
    `${BASE_PATH}/consultations/${consultationId}/join`
  );
  return response.data;
}

/**
 * Leave video consultation
 */
export async function leaveVideoConsultation(
  consultationId: string
): Promise<void> {
  await apiClient.post(`${BASE_PATH}/consultations/${consultationId}/leave`);
}

/**
 * End video consultation
 */
export async function endVideoConsultation(
  consultationId: string
): Promise<VideoConsultation> {
  const response = await apiClient.post<VideoConsultation>(
    `${BASE_PATH}/consultations/${consultationId}/end`
  );
  return response.data;
}

// ============================================================================
// Waiting Room Management
// ============================================================================

/**
 * Join waiting room
 */
export async function joinWaitingRoom(
  data: JoinWaitingRoomRequest
): Promise<WaitingRoomResponse> {
  const response = await apiClient.post<WaitingRoomResponse>(
    `${BASE_PATH}/waiting-room/join`,
    data
  );
  return response.data;
}

/**
 * Leave waiting room
 */
export async function leaveWaitingRoom(entryId: string): Promise<void> {
  await apiClient.post(`${BASE_PATH}/waiting-room/${entryId}/leave`);
}

/**
 * Get waiting room position
 */
export async function getWaitingRoomPosition(
  entryId: string
): Promise<WaitingRoomEntry> {
  const response = await apiClient.get<WaitingRoomEntry>(
    `${BASE_PATH}/waiting-room/${entryId}`
  );
  return response.data;
}

/**
 * Get waiting room queue (doctor only)
 */
export async function getWaitingRoomQueue(
  doctorId: string
): Promise<WaitingRoomEntry[]> {
  const response = await apiClient.get<WaitingRoomEntry[]>(
    `${BASE_PATH}/waiting-room/doctor/${doctorId}/queue`
  );
  return response.data;
}

/**
 * Get waiting room statistics (doctor only)
 */
export async function getWaitingRoomStats(
  doctorId: string
): Promise<WaitingRoomStats> {
  const response = await apiClient.get<WaitingRoomStats>(
    `${BASE_PATH}/waiting-room/doctor/${doctorId}/stats`
  );
  return response.data;
}

// ============================================================================
// Call Quality Monitoring
// ============================================================================

/**
 * Submit call quality metrics
 */
export async function submitQualityMetrics(
  consultationId: string,
  data: SubmitQualityMetricsRequest
): Promise<CallQualityMetrics> {
  const response = await apiClient.post<CallQualityMetrics>(
    `${BASE_PATH}/consultations/${consultationId}/quality`,
    data
  );
  return response.data;
}

/**
 * Get call quality metrics
 */
export async function getQualityMetrics(
  consultationId: string
): Promise<CallQualityMetrics[]> {
  const response = await apiClient.get<CallQualityMetrics[]>(
    `${BASE_PATH}/consultations/${consultationId}/quality`
  );
  return response.data;
}

/**
 * Get quality statistics
 */
export async function getQualityStats(
  consultationId: string
): Promise<QualityStats> {
  const response = await apiClient.get<QualityStats>(
    `${BASE_PATH}/consultations/${consultationId}/quality/stats`
  );
  return response.data;
}

// ============================================================================
// Recording Consent Management
// ============================================================================

/**
 * Submit recording consent
 */
export async function submitRecordingConsent(
  consultationId: string,
  data: SubmitConsentRequest
): Promise<RecordingConsent> {
  const response = await apiClient.post<RecordingConsent>(
    `${BASE_PATH}/consultations/${consultationId}/consent`,
    data
  );
  return response.data;
}

/**
 * Get recording consent status
 */
export async function getConsentStatus(
  consultationId: string
): Promise<ConsentStatus> {
  const response = await apiClient.get<ConsentStatus>(
    `${BASE_PATH}/consultations/${consultationId}/consent/status`
  );
  return response.data;
}

/**
 * Get all consents for consultation
 */
export async function getConsents(
  consultationId: string
): Promise<RecordingConsent[]> {
  const response = await apiClient.get<RecordingConsent[]>(
    `${BASE_PATH}/consultations/${consultationId}/consents`
  );
  return response.data;
}

/**
 * Revoke recording consent
 */
export async function revokeConsent(
  consultationId: string
): Promise<RecordingConsent> {
  const response = await apiClient.post<RecordingConsent>(
    `${BASE_PATH}/consultations/${consultationId}/consent/revoke`
  );
  return response.data;
}

// ============================================================================
// Emergency Disconnect
// ============================================================================

/**
 * Initiate emergency disconnect
 */
export async function initiateEmergencyDisconnect(
  consultationId: string,
  data: InitiateEmergencyDisconnectRequest
): Promise<EmergencyDisconnect> {
  const response = await apiClient.post<EmergencyDisconnect>(
    `${BASE_PATH}/consultations/${consultationId}/emergency-disconnect`,
    data
  );
  return response.data;
}

/**
 * Get emergency disconnect incidents
 */
export async function getEmergencyIncidents(
  consultationId: string
): Promise<EmergencyDisconnect[]> {
  const response = await apiClient.get<EmergencyDisconnect[]>(
    `${BASE_PATH}/consultations/${consultationId}/emergency-incidents`
  );
  return response.data;
}

/**
 * Get emergency statistics
 */
export async function getEmergencyStats(): Promise<EmergencyStats> {
  const response = await apiClient.get<EmergencyStats>(
    `${BASE_PATH}/emergency-stats`
  );
  return response.data;
}

// ============================================================================
// WebRTC Signaling (REST fallback)
// ============================================================================

/**
 * Send SDP offer
 */
export async function sendOffer(
  consultationId: string,
  offer: SDPMessage
): Promise<void> {
  await apiClient.post(
    `${BASE_PATH}/consultations/${consultationId}/signaling/offer`,
    offer
  );
}

/**
 * Send SDP answer
 */
export async function sendAnswer(
  consultationId: string,
  answer: SDPMessage
): Promise<void> {
  await apiClient.post(
    `${BASE_PATH}/consultations/${consultationId}/signaling/answer`,
    answer
  );
}

/**
 * Send ICE candidate
 */
export async function sendICECandidate(
  consultationId: string,
  candidate: ICECandidateMessage
): Promise<void> {
  await apiClient.post(
    `${BASE_PATH}/consultations/${consultationId}/signaling/ice-candidate`,
    candidate
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get ICE servers configuration
 */
export async function getICEServers(): Promise<RTCIceServer[]> {
  const response = await apiClient.get<RTCIceServer[]>(
    `${BASE_PATH}/ice-servers`
  );
  return response.data;
}

/**
 * Check if consultation is ready
 */
export async function checkConsultationReady(
  consultationId: string
): Promise<{ ready: boolean; reason?: string }> {
  const response = await apiClient.get<{ ready: boolean; reason?: string }>(
    `${BASE_PATH}/consultations/${consultationId}/ready`
  );
  return response.data;
}
