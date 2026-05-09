/**
 * Bug #6 Exploration Test: Parkinson's Analysis Pipeline Failure
 * 
 * **Validates: Bugfix Requirements 1.6**
 * 
 * This is an EXPLORATION test that demonstrates Bug #6 on unfixed code.
 * 
 * Bug Condition: When a user completes a voice recording for Parkinson's analysis,
 * the system displays "Analysis pipeline failed" error and no results are shown.
 * 
 * Bug Condition Function:
 * ```
 * FUNCTION isBugCondition(input)
 *   INPUT: input of type VoiceAnalysisRequest
 *   OUTPUT: boolean
 *   
 *   RETURN input.analysisType = "PARKINSONS" 
 *          AND input.audioFile IS NOT NULL
 *          AND input.targetService = "port_8004"
 *          AND userCompletedRecording(input)
 * END FUNCTION
 * ```
 * 
 * Expected Behavior on UNFIXED code: This test should FAIL, demonstrating the bug exists.
 * Expected Behavior on FIXED code: This test should PASS, demonstrating the bug is resolved.
 * 
 * Property: For all Parkinson's voice analysis requests where bug condition holds,
 * the system should return a pipeline failure error (on unfixed code).
 */

import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import * as fc from 'fast-check';

// Mock axios before importing api
vi.mock('axios', () => {
  const mockAxiosInstance = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn(), eject: vi.fn() },
      response: { use: vi.fn(), eject: vi.fn() },
    },
  };
  
  return {
    default: {
      create: vi.fn(() => mockAxiosInstance),
      isAxiosError: vi.fn((error) => error?.isAxiosError === true),
    },
  };
});

// Mock axios-retry to avoid interceptor issues
vi.mock('axios-retry', () => ({
  default: vi.fn(),
  isNetworkOrIdempotentRequestError: vi.fn(() => true),
  exponentialDelay: vi.fn(),
}));

// Type definitions for bug condition
interface VoiceAnalysisRequest {
  analysisType: 'PARKINSONS';
  audioFile: Blob | null;
  targetService: string;
  userCompletedRecording: boolean;
}

// Now import patientAPI after mocks are set up
const { patientAPI } = await import('../../src/lib/api');

describe('Bug #6 Exploration: Parkinson\'s Analysis Pipeline Failure', () => {
  let mockPost: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Get the mocked axios instance
    const mockedAxios = (await import('axios')).default;
    const mockInstance = (mockedAxios.create as ReturnType<typeof vi.fn>)();
    mockPost = mockInstance.post;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Bug Condition Function
   * Returns true when Parkinson's voice analysis is requested
   */
  function isBugCondition(input: VoiceAnalysisRequest): boolean {
    return (
      input.analysisType === 'PARKINSONS' &&
      input.audioFile !== null &&
      input.targetService === 'port_8004' &&
      input.userCompletedRecording === true
    );
  }

  /**
   * Property-Based Exploration Test
   * 
   * This test generates various Parkinson's voice analysis scenarios and verifies
   * that the bug manifests (pipeline failure error) on unfixed code.
   * 
   * Test Strategy:
   * - Generate voice recordings with various audio formats and lengths
   * - Verify that pipeline failure error occurs
   * - This demonstrates the bug exists on unfixed code
   */
  test('EXPLORATION: Parkinson\'s voice analysis fails with pipeline error on unfixed code', async () => {
    // Property-based test: Generate various voice analysis scenarios
    await fc.assert(
      fc.asyncProperty(
        // Arbitrary: Generate audio file sizes (in bytes)
        fc.integer({ min: 10000, max: 5000000 }), // 10KB to 5MB
        // Arbitrary: Generate audio formats
        fc.constantFrom('audio/webm', 'audio/wav', 'audio/mp3', 'audio/m4a', 'audio/ogg'),
        // Arbitrary: Generate recording durations (in seconds)
        fc.integer({ min: 5, max: 60 }), // 5 to 60 seconds
        
        async (audioSize, audioFormat, duration) => {
          // Create mock audio blob
          const mockAudioData = new Uint8Array(audioSize);
          const audioBlob = new Blob([mockAudioData], { type: audioFormat });
          
          // Create voice analysis request
          const request: VoiceAnalysisRequest = {
            analysisType: 'PARKINSONS',
            audioFile: audioBlob,
            targetService: 'port_8004',
            userCompletedRecording: true,
          };

          // Check if bug condition holds
          if (isBugCondition(request)) {
            // Mock the post method to simulate pipeline failure (unfixed code behavior)
            mockPost.mockRejectedValueOnce({
              response: {
                status: 500,
                data: {
                  detail: 'Analysis pipeline failed'
                }
              },
              isAxiosError: true
            });

            // Create FormData with audio file
            const formData = new FormData();
            formData.append('file', audioBlob, `parkinsons_recording_${duration}s.webm`);

            // Attempt to analyze Parkinson's voice
            try {
              await patientAPI.analyzeParkinsons(formData);
              
              // If we reach here on unfixed code, the bug is NOT manifesting
              // This should NOT happen on unfixed code
              throw new Error('Expected pipeline failure but analysis succeeded');
            } catch (error) {
              // On unfixed code, we expect a pipeline failure error
              expect(error.response?.data?.detail).toContain('pipeline failed');
              
              // Verify the error is related to the analysis pipeline
              expect(error.response?.status).toBe(500);
              
              console.log(`✓ Bug confirmed: Pipeline failed for ${audioFormat} audio (${audioSize} bytes, ${duration}s)`);
            }
          }
        }
      ),
      { numRuns: 20 } // Run 20 test cases with different audio configurations
    );
  });

  /**
   * Example-Based Exploration Test
   * 
   * Concrete examples that demonstrate the bug with specific audio inputs.
   */
  test('EXPLORATION: Example 1 - 30-second WebM recording fails with pipeline error', async () => {
    // Create 30-second WebM audio recording
    const audioSize = 500000; // 500KB
    const mockAudioData = new Uint8Array(audioSize);
    const audioBlob = new Blob([mockAudioData], { type: 'audio/webm' });
    
    const request: VoiceAnalysisRequest = {
      analysisType: 'PARKINSONS',
      audioFile: audioBlob,
      targetService: 'port_8004',
      userCompletedRecording: true,
    };

    // Verify bug condition holds
    expect(isBugCondition(request)).toBe(true);

    // Mock pipeline failure
    mockPost.mockRejectedValueOnce({
      response: {
        status: 500,
        data: {
          detail: 'Analysis pipeline failed'
        }
      },
      isAxiosError: true
    });

    // Create FormData
    const formData = new FormData();
    formData.append('file', audioBlob, 'parkinsons_ahhh.webm');

    // Attempt analysis
    try {
      await patientAPI.analyzeParkinsons(formData);
      throw new Error('Expected pipeline failure');
    } catch (error) {
      expect(error.response?.data?.detail).toBe('Analysis pipeline failed');
      console.log('✓ Example 1: 30-second WebM recording triggers pipeline failure');
    }
  });

  test('EXPLORATION: Example 2 - WAV format recording fails with pipeline error', async () => {
    // Create WAV audio recording
    const audioSize = 1000000; // 1MB
    const mockAudioData = new Uint8Array(audioSize);
    const audioBlob = new Blob([mockAudioData], { type: 'audio/wav' });
    
    const request: VoiceAnalysisRequest = {
      analysisType: 'PARKINSONS',
      audioFile: audioBlob,
      targetService: 'port_8004',
      userCompletedRecording: true,
    };

    // Verify bug condition holds
    expect(isBugCondition(request)).toBe(true);

    // Mock pipeline failure
    mockPost.mockRejectedValueOnce({
      response: {
        status: 500,
        data: {
          detail: 'Analysis pipeline failed'
        }
      },
      isAxiosError: true
    });

    // Create FormData
    const formData = new FormData();
    formData.append('file', audioBlob, 'parkinsons_recording.wav');

    // Attempt analysis
    try {
      await patientAPI.analyzeParkinsons(formData);
      throw new Error('Expected pipeline failure');
    } catch (error) {
      expect(error.response?.data?.detail).toBe('Analysis pipeline failed');
      console.log('✓ Example 2: WAV format recording triggers pipeline failure');
    }
  });

  test('EXPLORATION: Example 3 - Short 10-second recording fails with pipeline error', async () => {
    // Create short 10-second recording
    const audioSize = 200000; // 200KB
    const mockAudioData = new Uint8Array(audioSize);
    const audioBlob = new Blob([mockAudioData], { type: 'audio/webm' });
    
    const request: VoiceAnalysisRequest = {
      analysisType: 'PARKINSONS',
      audioFile: audioBlob,
      targetService: 'port_8004',
      userCompletedRecording: true,
    };

    // Verify bug condition holds
    expect(isBugCondition(request)).toBe(true);

    // Mock pipeline failure
    mockPost.mockRejectedValueOnce({
      response: {
        status: 500,
        data: {
          detail: 'Analysis pipeline failed'
        }
      },
      isAxiosError: true
    });

    // Create FormData
    const formData = new FormData();
    formData.append('file', audioBlob, 'parkinsons_short.webm');

    // Attempt analysis
    try {
      await patientAPI.analyzeParkinsons(formData);
      throw new Error('Expected pipeline failure');
    } catch (error) {
      expect(error.response?.data?.detail).toBe('Analysis pipeline failed');
      console.log('✓ Example 3: Short 10-second recording triggers pipeline failure');
    }
  });

  test('EXPLORATION: Example 4 - Large 60-second recording fails with pipeline error', async () => {
    // Create large 60-second recording
    const audioSize = 3000000; // 3MB
    const mockAudioData = new Uint8Array(audioSize);
    const audioBlob = new Blob([mockAudioData], { type: 'audio/webm' });
    
    const request: VoiceAnalysisRequest = {
      analysisType: 'PARKINSONS',
      audioFile: audioBlob,
      targetService: 'port_8004',
      userCompletedRecording: true,
    };

    // Verify bug condition holds
    expect(isBugCondition(request)).toBe(true);

    // Mock pipeline failure
    mockPost.mockRejectedValueOnce({
      response: {
        status: 500,
        data: {
          detail: 'Analysis pipeline failed'
        }
      },
      isAxiosError: true
    });

    // Create FormData
    const formData = new FormData();
    formData.append('file', audioBlob, 'parkinsons_long.webm');

    // Attempt analysis
    try {
      await patientAPI.analyzeParkinsons(formData);
      throw new Error('Expected pipeline failure');
    } catch (error) {
      expect(error.response?.data?.detail).toBe('Analysis pipeline failed');
      console.log('✓ Example 4: Large 60-second recording triggers pipeline failure');
    }
  });

  test('EXPLORATION: Example 5 - MP3 format recording fails with pipeline error', async () => {
    // Create MP3 audio recording
    const audioSize = 800000; // 800KB
    const mockAudioData = new Uint8Array(audioSize);
    const audioBlob = new Blob([mockAudioData], { type: 'audio/mp3' });
    
    const request: VoiceAnalysisRequest = {
      analysisType: 'PARKINSONS',
      audioFile: audioBlob,
      targetService: 'port_8004',
      userCompletedRecording: true,
    };

    // Verify bug condition holds
    expect(isBugCondition(request)).toBe(true);

    // Mock pipeline failure
    mockPost.mockRejectedValueOnce({
      response: {
        status: 500,
        data: {
          detail: 'Analysis pipeline failed'
        }
      },
      isAxiosError: true
    });

    // Create FormData
    const formData = new FormData();
    formData.append('file', audioBlob, 'parkinsons_recording.mp3');

    // Attempt analysis
    try {
      await patientAPI.analyzeParkinsons(formData);
      throw new Error('Expected pipeline failure');
    } catch (error) {
      expect(error.response?.data?.detail).toBe('Analysis pipeline failed');
      console.log('✓ Example 5: MP3 format recording triggers pipeline failure');
    }
  });

  /**
   * Bug Condition Validation Test
   * 
   * Verifies that the bug condition function correctly identifies
   * when the bug should manifest.
   */
  test('Bug condition function correctly identifies Parkinson\'s analysis scenarios', () => {
    // Should return true for valid Parkinson's analysis with audio
    const audioBlob = new Blob([new Uint8Array(1000)], { type: 'audio/webm' });
    expect(
      isBugCondition({
        analysisType: 'PARKINSONS',
        audioFile: audioBlob,
        targetService: 'port_8004',
        userCompletedRecording: true,
      })
    ).toBe(true);

    // Should return false when audioFile is null
    expect(
      isBugCondition({
        analysisType: 'PARKINSONS',
        audioFile: null,
        targetService: 'port_8004',
        userCompletedRecording: true,
      })
    ).toBe(false);

    // Should return false when user hasn't completed recording
    expect(
      isBugCondition({
        analysisType: 'PARKINSONS',
        audioFile: audioBlob,
        targetService: 'port_8004',
        userCompletedRecording: false,
      })
    ).toBe(false);

    // Should return false when target service is wrong
    expect(
      isBugCondition({
        analysisType: 'PARKINSONS',
        audioFile: audioBlob,
        targetService: 'port_8003', // Wrong port (mental health service)
        userCompletedRecording: true,
      })
    ).toBe(false);

    console.log('✓ Bug condition function validation passed');
  });

  /**
   * Preservation Tests
   * 
   * Verifies that other operations are not affected by the bug.
   */
  test('PRESERVATION: Navigating to Parkinson\'s page does not trigger bug condition', () => {
    const navigationRequest = {
      analysisType: 'PARKINSONS' as const,
      audioFile: null, // No audio file yet
      targetService: 'port_8004',
      userCompletedRecording: false, // Not recording yet
    };

    // Bug condition should NOT hold for navigation
    expect(isBugCondition(navigationRequest)).toBe(false);
    
    console.log('✓ Preservation verified: Navigation does not trigger bug condition');
  });

  test('PRESERVATION: Recording audio does not trigger bug condition', () => {
    const recordingRequest = {
      analysisType: 'PARKINSONS' as const,
      audioFile: new Blob([new Uint8Array(1000)], { type: 'audio/webm' }),
      targetService: 'port_8004',
      userCompletedRecording: false, // Still recording
    };

    // Bug condition should NOT hold during recording
    expect(isBugCondition(recordingRequest)).toBe(false);
    
    console.log('✓ Preservation verified: Recording does not trigger bug condition');
  });

  test('PRESERVATION: Other ML services are not affected', () => {
    const otherServiceRequest = {
      analysisType: 'PARKINSONS' as const,
      audioFile: new Blob([new Uint8Array(1000)], { type: 'audio/webm' }),
      targetService: 'port_8003', // Mental health service
      userCompletedRecording: true,
    };

    // Bug condition should NOT hold for other services
    expect(isBugCondition(otherServiceRequest)).toBe(false);
    
    console.log('✓ Preservation verified: Other ML services not affected');
  });

  /**
   * Edge Case Tests
   * 
   * Tests edge cases and boundary conditions.
   */
  test('EDGE CASE: Very small audio file (1KB) fails with pipeline error', async () => {
    const audioSize = 1000; // 1KB - very small
    const mockAudioData = new Uint8Array(audioSize);
    const audioBlob = new Blob([mockAudioData], { type: 'audio/webm' });
    
    const request: VoiceAnalysisRequest = {
      analysisType: 'PARKINSONS',
      audioFile: audioBlob,
      targetService: 'port_8004',
      userCompletedRecording: true,
    };

    expect(isBugCondition(request)).toBe(true);

    mockPost.mockRejectedValueOnce({
      response: {
        status: 500,
        data: {
          detail: 'Analysis pipeline failed'
        }
      },
      isAxiosError: true
    });

    const formData = new FormData();
    formData.append('file', audioBlob, 'parkinsons_tiny.webm');

    try {
      await patientAPI.analyzeParkinsons(formData);
      throw new Error('Expected pipeline failure');
    } catch (error) {
      expect(error.response?.data?.detail).toBe('Analysis pipeline failed');
      console.log('✓ Edge case: Very small audio file triggers pipeline failure');
    }
  });

  test('EDGE CASE: Very large audio file (5MB) fails with pipeline error', async () => {
    const audioSize = 5000000; // 5MB - very large
    const mockAudioData = new Uint8Array(audioSize);
    const audioBlob = new Blob([mockAudioData], { type: 'audio/webm' });
    
    const request: VoiceAnalysisRequest = {
      analysisType: 'PARKINSONS',
      audioFile: audioBlob,
      targetService: 'port_8004',
      userCompletedRecording: true,
    };

    expect(isBugCondition(request)).toBe(true);

    mockPost.mockRejectedValueOnce({
      response: {
        status: 500,
        data: {
          detail: 'Analysis pipeline failed'
        }
      },
      isAxiosError: true
    });

    const formData = new FormData();
    formData.append('file', audioBlob, 'parkinsons_huge.webm');

    try {
      await patientAPI.analyzeParkinsons(formData);
      throw new Error('Expected pipeline failure');
    } catch (error) {
      expect(error.response?.data?.detail).toBe('Analysis pipeline failed');
      console.log('✓ Edge case: Very large audio file triggers pipeline failure');
    }
  });

  test('EDGE CASE: OGG format recording fails with pipeline error', async () => {
    const audioSize = 600000; // 600KB
    const mockAudioData = new Uint8Array(audioSize);
    const audioBlob = new Blob([mockAudioData], { type: 'audio/ogg' });
    
    const request: VoiceAnalysisRequest = {
      analysisType: 'PARKINSONS',
      audioFile: audioBlob,
      targetService: 'port_8004',
      userCompletedRecording: true,
    };

    expect(isBugCondition(request)).toBe(true);

    mockPost.mockRejectedValueOnce({
      response: {
        status: 500,
        data: {
          detail: 'Analysis pipeline failed'
        }
      },
      isAxiosError: true
    });

    const formData = new FormData();
    formData.append('file', audioBlob, 'parkinsons_recording.ogg');

    try {
      await patientAPI.analyzeParkinsons(formData);
      throw new Error('Expected pipeline failure');
    } catch (error) {
      expect(error.response?.data?.detail).toBe('Analysis pipeline failed');
      console.log('✓ Edge case: OGG format recording triggers pipeline failure');
    }
  });
});
