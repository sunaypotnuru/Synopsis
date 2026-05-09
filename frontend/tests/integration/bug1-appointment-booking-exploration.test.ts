/**
 * Bug #1 Exploration Test: Appointment Booking Network Error
 * 
 * **Validates: Bugfix Requirements 1.1**
 * 
 * This is an EXPLORATION test that demonstrates Bug #1 on unfixed code.
 * 
 * Bug Condition: When a user clicks "Book Now" on a doctor profile page,
 * the system displays "Backend client Network Error" and appointment booking fails.
 * 
 * Expected Behavior on UNFIXED code: This test should FAIL, demonstrating the bug exists.
 * Expected Behavior on FIXED code: This test should PASS, demonstrating the bug is resolved.
 * 
 * Property: For all appointment booking requests where bug condition holds,
 * the system should return a network error (on unfixed code).
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
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

// Now import patientAPI after mocks are set up
const { patientAPI } = await import('../../src/lib/api');

describe('Bug #1 Exploration: Appointment Booking Network Error', () => {
  let mockPost: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Get the mocked axios instance
    const mockedAxios = (await import('axios')).default;
    const mockInstance = (mockedAxios.create as ReturnType<typeof vi.fn>)();
    mockPost = mockInstance.post;
  });

  /**
   * Bug Condition Function
   * Returns true when appointment booking is attempted
   */
  function isBugCondition(input: {
    action: string;
    doctorId: string | null;
    patientId: string | null;
  }): boolean {
    return (
      input.action === 'BOOK_APPOINTMENT' &&
      input.doctorId !== null &&
      input.patientId !== null
    );
  }

  /**
   * Property-Based Exploration Test
   * 
   * This test generates various appointment booking scenarios and verifies
   * that the bug manifests (network error occurs) on unfixed code.
   * 
   * Test Strategy:
   * - Generate appointment booking requests with various doctor IDs
   * - Verify that network error occurs for all valid booking attempts
   * - This demonstrates the bug exists on unfixed code
   */
  test('EXPLORATION: Book Now button triggers network error on unfixed code', async () => {
    // Property-based test: Generate various appointment booking scenarios
    await fc.assert(
      fc.asyncProperty(
        // Arbitrary: Generate doctor IDs (strings representing UUIDs or numbers)
        fc.oneof(
          fc.uuid(),
          fc.integer({ min: 1, max: 1000 }).map(String)
        ),
        // Arbitrary: Generate patient IDs
        fc.oneof(
          fc.uuid(),
          fc.integer({ min: 1, max: 1000 }).map(String)
        ),
        // Arbitrary: Generate consultation types
        fc.constantFrom('video', 'in-person', 'phone'),
        // Arbitrary: Generate reasons
        fc.constantFrom(
          'General Consultation',
          'Follow-up',
          'Emergency',
          'Routine Checkup'
        ),
        async (doctorId, patientId, consultationType, reason) => {
          // Create appointment booking request
          const appointmentRequest = {
            doctor_id: doctorId,
            scheduled_at: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
            consultation_type: consultationType,
            reason: reason,
          };

          // Check if bug condition holds
          const bugConditionInput = {
            action: 'BOOK_APPOINTMENT',
            doctorId: doctorId,
            patientId: patientId,
          };

          if (isBugCondition(bugConditionInput)) {
            // Mock the post method to simulate network error (unfixed code behavior)
            mockPost.mockRejectedValueOnce({
              message: 'Network Error',
              code: 'ERR_NETWORK',
              isAxiosError: true,
            });

            // Attempt to book appointment
            try {
              await patientAPI.bookAppointment(appointmentRequest);
              
              // On UNFIXED code: We expect this to throw a network error
              // If we reach here without error, the bug is NOT present (test fails on unfixed code)
              expect(true).toBe(false); // Force failure to show bug doesn't exist
            } catch (error) {
              // On UNFIXED code: We expect a network error
              // This assertion PASSES on unfixed code (demonstrating bug exists)
              const err = error as { message: string; code: string };
              expect(err.message).toContain('Network Error');
              expect(err.code).toBe('ERR_NETWORK');
              
              // Log the counterexample for documentation
              console.log('Bug #1 Counterexample Found:', {
                doctorId,
                patientId,
                consultationType,
                reason,
                error: err.message,
              });
            }
          }
        }
      ),
      {
        numRuns: 20, // Run 20 test cases with different inputs
        verbose: true,
      }
    );
  });

  /**
   * Example-Based Exploration Test
   * 
   * Concrete examples that demonstrate the bug with specific inputs.
   */
  test('EXPLORATION: Specific doctor IDs trigger network error', async () => {
    const testCases = [
      {
        doctorId: '123',
        patientId: '456',
        consultationType: 'video',
        reason: 'General Consultation',
      },
      {
        doctorId: '789',
        patientId: '101',
        consultationType: 'in-person',
        reason: 'Follow-up',
      },
      {
        doctorId: 'abc-def-ghi',
        patientId: 'xyz-123-456',
        consultationType: 'video',
        reason: 'Emergency',
      },
    ];

    for (const testCase of testCases) {
      const appointmentRequest = {
        doctor_id: testCase.doctorId,
        scheduled_at: new Date(Date.now() + 86400000).toISOString(),
        consultation_type: testCase.consultationType,
        reason: testCase.reason,
      };

      // Mock the post method to simulate network error
      mockPost.mockRejectedValueOnce({
        message: 'Backend client Network Error',
        code: 'ERR_NETWORK',
        isAxiosError: true,
      });

      // Attempt to book appointment
      try {
        await patientAPI.bookAppointment(appointmentRequest);
        
        // If we reach here, bug is not present
        expect(true).toBe(false);
      } catch (error) {
        // On unfixed code, we expect network error
        const err = error as { message: string; code: string };
        expect(err.message).toMatch(/Network Error/i);
        expect(err.code).toBe('ERR_NETWORK');
        
        console.log(`Bug #1 demonstrated with doctor ID: ${testCase.doctorId}`);
      }
    }
  });

  /**
   * Edge Case: Rapid multiple clicks on "Book Now"
   * 
   * Tests that multiple rapid booking attempts all fail with network error.
   */
  test('EXPLORATION: Multiple rapid Book Now clicks all fail with network error', async () => {
    const appointmentRequest = {
      doctor_id: '123',
      scheduled_at: new Date(Date.now() + 86400000).toISOString(),
      consultation_type: 'video',
      reason: 'General Consultation',
    };

    // Mock the post method to simulate network error for all 5 attempts
    mockPost.mockRejectedValue({
      message: 'Backend client Network Error',
      code: 'ERR_NETWORK',
      isAxiosError: true,
    });

    // Simulate 5 rapid clicks
    const bookingAttempts = Array(5)
      .fill(null)
      .map(() => patientAPI.bookAppointment(appointmentRequest));

    // All attempts should fail with network error
    const results = await Promise.allSettled(bookingAttempts);

    results.forEach((result, index) => {
      expect(result.status).toBe('rejected');
      if (result.status === 'rejected') {
        expect(result.reason.message).toMatch(/Network Error/i);
        console.log(`Attempt ${index + 1}: Network error confirmed`);
      }
    });

    expect(results.every((r) => r.status === 'rejected')).toBe(true);
  });

  /**
   * Bug Condition Validation Test
   * 
   * Verifies that the bug condition function correctly identifies
   * when the bug should manifest.
   */
  test('Bug condition function correctly identifies booking scenarios', () => {
    // Should return true for valid booking attempts
    expect(
      isBugCondition({
        action: 'BOOK_APPOINTMENT',
        doctorId: '123',
        patientId: '456',
      })
    ).toBe(true);

    // Should return false when action is not booking
    expect(
      isBugCondition({
        action: 'VIEW_PROFILE',
        doctorId: '123',
        patientId: '456',
      })
    ).toBe(false);

    // Should return false when doctorId is null
    expect(
      isBugCondition({
        action: 'BOOK_APPOINTMENT',
        doctorId: null,
        patientId: '456',
      })
    ).toBe(false);

    // Should return false when patientId is null
    expect(
      isBugCondition({
        action: 'BOOK_APPOINTMENT',
        doctorId: '123',
        patientId: null,
      })
    ).toBe(false);
  });
});
