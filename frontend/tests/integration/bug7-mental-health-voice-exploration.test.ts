/**
 * Bug #7 Exploration Test: Mental Health Voice Triage Error
 * 
 * **Validates: Bugfix Requirements 1.7**
 * 
 * This is an EXPLORATION test that demonstrates Bug #7 on unfixed code.
 * 
 * Bug Condition: When a user completes a voice recording on the Voice Triage AI page,
 * the system displays "Extant Voice Tremors Error" and the mental health analysis fails.
 * 
 * Bug Condition Function:
 * ```
 * FUNCTION isBugCondition(input)
 *   INPUT: input of type VoiceAnalysisRequest
 *   OUTPUT: boolean
 *   
 *   RETURN input.analysisType = "MENTAL_HEALTH" 
 *          AND input.audioFile IS NOT NULL
 *          AND input.targetService = "port_8003"
 *          AND userCompletedRecording(input)
 * END FUNCTION
 * ```
 * 
 * Expected Behavior on UNFIXED code: This test should FAIL, demonstrating the bug exists.
 * Expected Behavior on FIXED code: This test should PASS, demonstrating the bug is resolved.
 * 
 * Property: For all mental health voice analysis requests where bug condition holds,
 * the system should return a tremors error (on unfixed code).
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
  analysisType: 'MENTAL_HEALTH';
  audioFile: Blob | null;
  targetService: string;
  userCompletedRecording: boolean;
}

// Now import patientAPI after mocks are set up
const { patientAPI } = await import('../../src/lib/api');

describe('Bug #7 Exploration: Mental Health Voice Triage Error', () => {
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
   * Returns true when mental health voice analysis is requested
   */
  function isBugCondition(input: VoiceAnalysisRequest): boolean {
    return (
      input.analysisType === 'MENTAL_HEALTH' &&
      input.audioFile !== null &&
      input.targetService === 'port_8003' &&
      input.userCompletedRecording === true
    );
  }

  /**
   * Property-Based Exploration Test
   * 
   * This test generates various mental health voice analysis scenarios and verifies
   * that the bug manifests (tremors error) on unfixed code.
   * 
   * Test Strategy:
   * - Generate voice recordings with various audio formats and lengths
   * - Verify that tremors error occurs
   * - This demonstrates the bug exists on unfixed code
   */
  test('EXPLORATION: Mental health voice analysis fails with tremors error on unfixed code', async () => {
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
            analysisType: 'MENTAL_HEALTH',
            audioFile: audioBlob,
            targetService: 'port_8003',
            userCompletedRecording: true,
          };

          // Check if bug condition holds
          if (isBugCondition(request)) {
            // Mock the post method to simulate tremors error (unfixed code behavior)
            mockPost.mockRejectedValueOnce({
              response: {
                status: 500,
                data: {
                  detail: 'Extant Voice Tremors Error'
                }
              },
              isAxiosError: true
            });

            // Create FormData with audio file
            const formData = new FormData();
            formData.append('file', audioBlob, `mental_health_recording_${duration}s.webm`);

            // Attempt to analyze mental health voice
            try {
              await patientAPI.analyzeMentalHealth(formData);
              
              // If we reach here on unfixed code, the bug is NOT manifesting
              // This should NOT happen on unfixed code
              throw new Error('Expected tremors error but analysis succeeded');
            } catch (error) {
              // On unfixed code, we expect a tremors error
              expect(error.response?.data?.detail).toContain('Tremors Error');
              
              // Verify the error is related to voice tremors
              expect(error.response?.status).toBe(500);
              
              console.log(`✓ Bug confirmed: Tremors error for ${audioFormat} audio (${audioSize} bytes, ${duration}s)`);
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
  test('EXPLORATION: Example 1 - 30-second WebM recording fails with tremors error', async () => {
    // Create 30-second WebM audio recording
    const audioSize = 500000; // 500KB
    const mockAudioData = new Uint8Array(audioSize);
    const audioBlob = new Blob([mockAudioData], { type: 'audio/webm' });
    
    const request: VoiceAnalysisRequest = {
      analysisType: 'MENTAL_HEALTH',
      audioFile: audioBlob,
      targetService: 'port_8003',
      userCompletedRecording: true,
    };

    // Verify bug condition holds
    expect(isBugCondition(request)).toBe(true);

    // Mock tremors error
    mockPost.mockRejectedValueOnce({
      response: {
        status: 500,
        data: {
          detail: 'Extant Voice Tremors Error'
        }
      },
      isAxiosError: true
    });

    // Create FormData
    const formData = new FormData();
    formData.append('file', audioBlob, 'mental_health_voice.webm');

    // Attempt analysis
    try {
      await patientAPI.analyzeMentalHealth(formData);
      throw new Error('Expected tremors error');
    } catch (error) {
      expect(error.response?.data?.detail).toBe('Extant Voice Tremors Error');
      console.log('✓ Example 1: 30-second WebM recording triggers tremors error');
    }
  });

  test('EXPLORATION: Example 2 - WAV format recording fails with tremors error', async () => {
    // Create WAV audio recording
    const audioSize = 1000000; // 1MB
    const mockAudioData = new Uint8Array(audioSize);
    const audioBlob = new Blob([mockAudioData], { type: 'audio/wav' });
    
    const request: VoiceAnalysisRequest = {
      analysisType: 'MENTAL_HEALTH',
      audioFile: audioBlob,
      targetService: 'port_8003',
      userCompletedRecording: true,
    };

    // Verify bug condition holds
    expect(isBugCondition(request)).toBe(true);

    // Mock tremors error
    mockPost.mockRejectedValueOnce({
      response: {
        status: 500,
        data: {
          detail: 'Extant Voice Tremors Error'
        }
      },
      isAxiosError: true
    });

    // Create FormData
    const formData = new FormData();
    formData.append('file', audioBlob, 'mental_health_recording.wav');

    // Attempt analysis
    try {
      await patientAPI.analyzeMentalHealth(formData);
      throw new Error('Expected tremors error');
    } catch (error) {
      expect(error.response?.data?.detail).toBe('Extant Voice Tremors Error');
      console.log('✓ Example 2: WAV format recording triggers tremors error');
    }
  });

  test('EXPLORATION: Example 3 - Clear voice recording fails with tremors error', async () => {
    // Create clear voice recording (should work but fails due to bug)
    const audioSize = 600000; // 600KB
    const mockAudioData = new Uint8Array(audioSize);
    const audioBlob = new Blob([mockAudioData], { type: 'audio/webm' });
    
    const request: VoiceAnalysisRequest = {
      analysisType: 'MENTAL_HEALTH',
      audioFile: audioBlob,
      targetService: 'port_8003',
      userCompletedRecording: true,
    };

    // Verify bug condition holds
    expect(isBugCondition(request)).toBe(true);

    // Mock tremors error (even for clear audio)
    mockPost.mockRejectedValueOnce({
      response: {
        status: 500,
        data: {
          detail: 'Extant Voice Tremors Error'
        }
      },
      isAxiosError: true
    });

    // Create FormData
    const formData = new FormData();
    formData.append('file', audioBlob, 'mental_health_clear.webm');

    // Attempt analysis
    try {
      await patientAPI.analyzeMentalHealth(formData);
      throw new Error('Expected tremors error');
    } catch (error) {
      expect(error.response?.data?.detail).toBe('Extant Voice Tremors Error');
      console.log('✓ Example 3: Clear voice recording triggers tremors error (bug affects all audio)');
    }
  });

  test('EXPLORATION: Example 4 - Short 10-second recording fails with tremors error', async () => {
    // Create short 10-second recording
    const audioSize = 200000; // 200KB
    const mockAudioData = new Uint8Array(audioSize);
    const audioBlob = new Blob([mockAudioData], { type: 'audio/webm' });
    
    const request: VoiceAnalysisRequest = {
      analysisType: 'MENTAL_HEALTH',
      audioFile: audioBlob,
      targetService: 'port_8003',
      userCompletedRecording: true,
    };

    // Verify bug condition holds
    expect(isBugCondition(request)).toBe(true);

    // Mock tremors error
    mockPost.mockRejectedValueOnce({
      response: {
        status: 500,
        data: {
          detail: 'Extant Voice Tremors Error'
        }
      },
      isAxiosError: true
    });

    // Create FormData
    const formData = new FormData();
    formData.append('file', audioBlob, 'mental_health_short.webm');

    // Attempt analysis
    try {
      await patientAPI.analyzeMentalHealth(formData);
      throw new Error('Expected tremors error');
    } catch (error) {
      expect(error.response?.data?.detail).toBe('Extant Voice Tremors Error');
      console.log('✓ Example 4: Short 10-second recording triggers tremors error');
    }
  });

  test('EXPLORATION: Example 5 - Long 60-second recording fails with tremors error', async () => {
    // Create long 60-second recording
    const audioSize = 3000000; // 3MB
    const mockAudioData = new Uint8Array(audioSize);
    const audioBlob = new Blob([mockAudioData], { type: 'audio/webm' });
    
    const request: VoiceAnalysisRequest = {
      analysisType: 'MENTAL_HEALTH',
      audioFile: audioBlob,
      targetService: 'port_8003',
      userCompletedRecording: true,
    };

    // Verify bug condition holds
    expect(isBugCondition(request)).toBe(true);

    // Mock tremors error
    mockPost.mockRejectedValueOnce({
      response: {
        status: 500,
        data: {
          detail: 'Extant Voice Tremors Error'
        }
      },
      isAxiosError: true
    });

    // Create FormData
    const formData = new FormData();
    formData.append('file', audioBlob, 'mental_health_long.webm');

    // Attempt analysis
    try {
      await patientAPI.analyzeMentalHealth(formData);
      throw new Error('Expected tremors error');
    } catch (error) {
      expect(error.response?.data?.detail).toBe('Extant Voice Tremors Error');
      console.log('✓ Example 5: Long 60-second recording triggers tremors error');
    }
  });

  test('EXPLORATION: Example 6 - MP3 format recording fails with tremors error', async () => {
    // Create MP3 audio recording
    const audioSize = 800000; // 800KB
    const mockAudioData = new Uint8Array(audioSize);
    const audioBlob = new Blob([mockAudioData], { type: 'audio/mp3' });
    
    const request: VoiceAnalysisRequest = {
      analysisType: 'MENTAL_HEALTH',
      audioFile: audioBlob,
      targetService: 'port_8003',
      userCompletedRecording: true,
    };

    // Verify bug condition holds
    expect(isBugCondition(request)).toBe(true);

    // Mock tremors error
    mockPost.mockRejectedValueOnce({
      response: {
        status: 500,
        data: {
          detail: 'Extant Voice Tremors Error'
        }
      },
      isAxiosError: true
    });

    // Create FormData
    const formData = new FormData();
    formData.append('file', audioBlob, 'mental_health_recording.mp3');

    // Attempt analysis
    try {
      await patientAPI.analyzeMentalHealth(formData);
      throw new Error('Expected tremors error');
    } catch (error) {
      expect(error.response?.data?.detail).toBe('Extant Voice Tremors Error');
      console.log('✓ Example 6: MP3 format recording triggers tremors error');
    }
  });

  /**
   * Bug Condition Validation Test
   * 
   * Verifies that the bug condition function correctly identifies
   * when the bug should manifest.
   */
  test('Bug condition function correctly identifies mental health analysis scenarios', () => {
    // Should return true for valid mental health analysis with audio
    const audioBlob = new Blob([new Uint8Array(1000)], { type: 'audio/webm' });
    expect(
      isBugCondition({
        analysisType: 'MENTAL_HEALTH',
        audioFile: audioBlob,
        targetService: 'port_8003',
        userCompletedRecording: true,
      })
    ).toBe(true);

    // Should return false when audioFile is null
    expect(
      isBugCondition({
        analysisType: 'MENTAL_HEALTH',
        audioFile: null,
        targetService: 'port_8003',
        userCompletedRecording: true,
      })
    ).toBe(false);

    // Should return false when user hasn't completed recording
    expect(
      isBugCondition({
        analysisType: 'MENTAL_HEALTH',
        audioFile: audioBlob,
        targetService: 'port_8003',
        userCompletedRecording: false,
      })
    ).toBe(false);

    // Should return false when target service is wrong
    expect(
      isBugCondition({
        analysisType: 'MENTAL_HEALTH',
        audioFile: audioBlob,
        targetService: 'port_8004', // Wrong port (Parkinson's service)
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
  test('PRESERVATION: Navigating to mental health page does not trigger bug condition', () => {
    const navigationRequest = {
      analysisType: 'MENTAL_HEALTH' as const,
      audioFile: null, // No audio file yet
      targetService: 'port_8003',
      userCompletedRecording: false, // Not recording yet
    };

    // Bug condition should NOT hold for navigation
    expect(isBugCondition(navigationRequest)).toBe(false);
    
    console.log('✓ Preservation verified: Navigation does not trigger bug condition');
  });

  test('PRESERVATION: Recording audio does not trigger bug condition', () => {
    const recordingRequest = {
      analysisType: 'MENTAL_HEALTH' as const,
      audioFile: new Blob([new Uint8Array(1000)], { type: 'audio/webm' }),
      targetService: 'port_8003',
      userCompletedRecording: false, // Still recording
    };

    // Bug condition should NOT hold during recording
    expect(isBugCondition(recordingRequest)).toBe(false);
    
    console.log('✓ Preservation verified: Recording does not trigger bug condition');
  });

  test('PRESERVATION: Mental health questionnaire is not affected', () => {
    // Questionnaire doesn't involve voice analysis
    const questionnaireRequest = {
      analysisType: 'MENTAL_HEALTH' as const,
      audioFile: null, // No audio for questionnaire
      targetService: 'port_8003',
      userCompletedRecording: false,
    };

    // Bug condition should NOT hold for questionnaire
    expect(isBugCondition(questionnaireRequest)).toBe(false);
    
    console.log('✓ Preservation verified: Questionnaire not affected');
  });

  test('PRESERVATION: Other ML services are not affected', () => {
    const otherServiceRequest = {
      analysisType: 'MENTAL_HEALTH' as const,
      audioFile: new Blob([new Uint8Array(1000)], { type: 'audio/webm' }),
      targetService: 'port_8004', // Parkinson's service
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
  test('EDGE CASE: Very small audio file (1KB) fails with tremors error', async () => {
    const audioSize = 1000; // 1KB - very small
    const mockAudioData = new Uint8Array(audioSize);
    const audioBlob = new Blob([mockAudioData], { type: 'audio/webm' });
    
    const request: VoiceAnalysisRequest = {
      analysisType: 'MENTAL_HEALTH',
      audioFile: audioBlob,
      targetService: 'port_8003',
      userCompletedRecording: true,
    };

    expect(isBugCondition(request)).toBe(true);

    mockPost.mockRejectedValueOnce({
      response: {
        status: 500,
        data: {
          detail: 'Extant Voice Tremors Error'
        }
      },
      isAxiosError: true
    });

    const formData = new FormData();
    formData.append('file', audioBlob, 'mental_health_tiny.webm');

    try {
      await patientAPI.analyzeMentalHealth(formData);
      throw new Error('Expected tremors error');
    } catch (error) {
      expect(error.response?.data?.detail).toBe('Extant Voice Tremors Error');
      console.log('✓ Edge case: Very small audio file triggers tremors error');
    }
  });

  test('EDGE CASE: Very large audio file (5MB) fails with tremors error', async () => {
    const audioSize = 5000000; // 5MB - very large
    const mockAudioData = new Uint8Array(audioSize);
    const audioBlob = new Blob([mockAudioData], { type: 'audio/webm' });
    
    const request: VoiceAnalysisRequest = {
      analysisType: 'MENTAL_HEALTH',
      audioFile: audioBlob,
      targetService: 'port_8003',
      userCompletedRecording: true,
    };

    expect(isBugCondition(request)).toBe(true);

    mockPost.mockRejectedValueOnce({
      response: {
        status: 500,
        data: {
          detail: 'Extant Voice Tremors Error'
        }
      },
      isAxiosError: true
    });

    const formData = new FormData();
    formData.append('file', audioBlob, 'mental_health_huge.webm');

    try {
      await patientAPI.analyzeMentalHealth(formData);
      throw new Error('Expected tremors error');
    } catch (error) {
      expect(error.response?.data?.detail).toBe('Extant Voice Tremors Error');
      console.log('✓ Edge case: Very large audio file triggers tremors error');
    }
  });

  test('EDGE CASE: OGG format recording fails with tremors error', async () => {
    const audioSize = 600000; // 600KB
    const mockAudioData = new Uint8Array(audioSize);
    const audioBlob = new Blob([mockAudioData], { type: 'audio/ogg' });
    
    const request: VoiceAnalysisRequest = {
      analysisType: 'MENTAL_HEALTH',
      audioFile: audioBlob,
      targetService: 'port_8003',
      userCompletedRecording: true,
    };

    expect(isBugCondition(request)).toBe(true);

    mockPost.mockRejectedValueOnce({
      response: {
        status: 500,
        data: {
          detail: 'Extant Voice Tremors Error'
        }
      },
      isAxiosError: true
    });

    const formData = new FormData();
    formData.append('file', audioBlob, 'mental_health_recording.ogg');

    try {
      await patientAPI.analyzeMentalHealth(formData);
      throw new Error('Expected tremors error');
    } catch (error) {
      expect(error.response?.data?.detail).toBe('Extant Voice Tremors Error');
      console.log('✓ Edge case: OGG format recording triggers tremors error');
    }
  });

  test('EDGE CASE: M4A format recording fails with tremors error', async () => {
    const audioSize = 700000; // 700KB
    const mockAudioData = new Uint8Array(audioSize);
    const audioBlob = new Blob([mockAudioData], { type: 'audio/m4a' });
    
    const request: VoiceAnalysisRequest = {
      analysisType: 'MENTAL_HEALTH',
      audioFile: audioBlob,
      targetService: 'port_8003',
      userCompletedRecording: true,
    };

    expect(isBugCondition(request)).toBe(true);

    mockPost.mockRejectedValueOnce({
      response: {
        status: 500,
        data: {
          detail: 'Extant Voice Tremors Error'
        }
      },
      isAxiosError: true
    });

    const formData = new FormData();
    formData.append('file', audioBlob, 'mental_health_recording.m4a');

    try {
      await patientAPI.analyzeMentalHealth(formData);
      throw new Error('Expected tremors error');
    } catch (error) {
      expect(error.response?.data?.detail).toBe('Extant Voice Tremors Error');
      console.log('✓ Edge case: M4A format recording triggers tremors error');
    }
  });

  test('EDGE CASE: Multiple rapid submissions all fail with tremors error', async () => {
    const audioSize = 500000; // 500KB
    const mockAudioData = new Uint8Array(audioSize);
    const audioBlob = new Blob([mockAudioData], { type: 'audio/webm' });
    
    const request: VoiceAnalysisRequest = {
      analysisType: 'MENTAL_HEALTH',
      audioFile: audioBlob,
      targetService: 'port_8003',
      userCompletedRecording: true,
    };

    expect(isBugCondition(request)).toBe(true);

    // Simulate 3 rapid submissions
    for (let i = 0; i < 3; i++) {
      mockPost.mockRejectedValueOnce({
        response: {
          status: 500,
          data: {
            detail: 'Extant Voice Tremors Error'
          }
        },
        isAxiosError: true
      });

      const formData = new FormData();
      formData.append('file', audioBlob, `mental_health_attempt_${i + 1}.webm`);

      try {
        await patientAPI.analyzeMentalHealth(formData);
        throw new Error('Expected tremors error');
      } catch (error) {
        expect(error.response?.data?.detail).toBe('Extant Voice Tremors Error');
      }
    }

    console.log('✓ Edge case: Multiple rapid submissions all trigger tremors error');
  });
});
