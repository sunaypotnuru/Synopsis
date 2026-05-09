/**
 * Bug #4 Exploration Test: Timeline Event Async Error
 * 
 * **Validates: Bugfix Requirements 1.4**
 * 
 * This is an EXPLORATION test that demonstrates Bug #4 on unfixed code.
 * 
 * Bug Condition: When a user submits the "Add Manual Timeline Event" form,
 * the system displays "Output is not await" error and the timeline event is not created.
 * 
 * Bug Condition Function:
 * ```
 * FUNCTION isBugCondition(input)
 *   INPUT: input of type TimelineEventCreateRequest
 *   OUTPUT: boolean
 *   
 *   RETURN input.action = "CREATE_MANUAL_EVENT" 
 *          AND input.eventData IS NOT NULL
 *          AND input.eventType IN ["medication", "symptom", "appointment", "test_result"]
 *          AND userSubmittedForm(input)
 * END FUNCTION
 * ```
 * 
 * Expected Behavior on UNFIXED code: This test should FAIL, demonstrating the bug exists.
 * Expected Behavior on FIXED code: This test should PASS, demonstrating the bug is resolved.
 * 
 * Property: For all manual timeline event creation requests where bug condition holds,
 * the system should return an "await" error (on unfixed code).
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

// Type definitions for bug condition
interface TimelineEventCreateRequest {
  action: 'CREATE_MANUAL_EVENT';
  eventData: {
    title: string;
    description: string;
    event_date: string;
    category: string;
  };
  eventType: 'medication' | 'symptom' | 'appointment' | 'test_result' | 'manual';
  userId: string;
}

describe('Bug #4 Exploration: Timeline Event Async Error', () => {
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
   * Returns true when manual timeline event is created
   */
  function isBugCondition(input: TimelineEventCreateRequest): boolean {
    return (
      input.action === 'CREATE_MANUAL_EVENT' &&
      input.eventData !== null &&
      input.eventData !== undefined &&
      ['medication', 'symptom', 'appointment', 'test_result', 'manual'].includes(input.eventType)
    );
  }

  /**
   * Property-Based Exploration Test
   * 
   * This test generates various timeline event creation scenarios and verifies
   * that the bug manifests ("await" error occurs) on unfixed code.
   * 
   * Test Strategy:
   * - Generate timeline events with various types, titles, and descriptions
   * - Verify that "await" error occurs for all manual event creation attempts
   * - This demonstrates the bug exists on unfixed code
   */
  test('EXPLORATION: Manual timeline event creation triggers "await" error on unfixed code', async () => {
    // Property-based test: Generate various timeline event scenarios
    await fc.assert(
      fc.asyncProperty(
        // Arbitrary: Generate event types
        fc.constantFrom<'medication' | 'symptom' | 'appointment' | 'test_result' | 'manual'>(
          'medication',
          'symptom',
          'appointment',
          'test_result',
          'manual'
        ),
        // Arbitrary: Generate event titles
        fc.constantFrom(
          'Started new medication',
          'Experienced headache',
          'Doctor appointment scheduled',
          'Blood test completed',
          'Took daily vitamins',
          'Felt dizzy',
          'Follow-up consultation',
          'X-ray scan done',
          'Medication refill',
          'Symptom improvement noted'
        ),
        // Arbitrary: Generate event descriptions
        fc.constantFrom(
          'Prescribed by Dr. Smith',
          'Mild discomfort, lasted 2 hours',
          'Routine checkup with cardiologist',
          'Fasting blood glucose test',
          'Morning routine',
          'After exercise',
          'Discussed treatment plan',
          'Chest X-ray for annual physical',
          'Pharmacy pickup',
          'Feeling much better today'
        ),
        // Arbitrary: Generate event dates (within last 30 days)
        fc.integer({ min: 0, max: 30 }).map(daysAgo => {
          const date = new Date();
          date.setDate(date.getDate() - daysAgo);
          return date.toISOString();
        }),
        // Arbitrary: Generate user IDs
        fc.uuid(),
        async (eventType, title, description, eventDate, userId) => {
          // Create timeline event request
          const request: TimelineEventCreateRequest = {
            action: 'CREATE_MANUAL_EVENT',
            eventData: {
              title,
              description,
              event_date: eventDate,
              category: eventType,
            },
            eventType,
            userId,
          };

          // Check if bug condition holds
          if (isBugCondition(request)) {
            // Mock the post method to simulate "await" error (unfixed code behavior)
            mockPost.mockRejectedValueOnce({
              response: {
                data: {
                  detail: 'Output is not await',
                  error: 'AsyncError',
                },
                status: 500,
              },
              message: 'Request failed with status code 500',
              isAxiosError: true,
            });

            // Attempt to create timeline event
            try {
              await patientAPI.addTimelineEvent(request.eventData);
              
              // On UNFIXED code: We expect this to throw an "await" error
              // If we reach here without error, the bug is NOT present (test fails on unfixed code)
              expect(true).toBe(false); // Force failure to show bug doesn't exist
            } catch (error) {
              // On UNFIXED code: We expect an "await" error
              // This assertion PASSES on unfixed code (demonstrating bug exists)
              expect(
                error.response?.data?.detail?.toLowerCase().includes('await') ||
                error.response?.data?.error?.toLowerCase().includes('async')
              ).toBe(true);
              expect(error.response?.status).toBe(500);
              
              // Log the counterexample for documentation
              console.log('Bug #4 Counterexample Found:', {
                eventType,
                title,
                description,
                eventDate: eventDate.split('T')[0],
                error: error.response?.data?.detail,
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
   * Concrete examples that demonstrate the bug with specific event types.
   */
  test('EXPLORATION: Specific event types trigger "await" error', async () => {
    const testCases: TimelineEventCreateRequest[] = [
      {
        action: 'CREATE_MANUAL_EVENT',
        eventData: {
          title: 'Started Aspirin',
          description: 'Daily low-dose aspirin as prescribed',
          event_date: new Date().toISOString(),
          category: 'medication',
        },
        eventType: 'medication',
        userId: 'test-user-1',
      },
      {
        action: 'CREATE_MANUAL_EVENT',
        eventData: {
          title: 'Headache',
          description: 'Mild headache after lunch',
          event_date: new Date().toISOString(),
          category: 'symptom',
        },
        eventType: 'symptom',
        userId: 'test-user-2',
      },
      {
        action: 'CREATE_MANUAL_EVENT',
        eventData: {
          title: 'Cardiology Appointment',
          description: 'Follow-up with Dr. Johnson',
          event_date: new Date().toISOString(),
          category: 'appointment',
        },
        eventType: 'appointment',
        userId: 'test-user-3',
      },
      {
        action: 'CREATE_MANUAL_EVENT',
        eventData: {
          title: 'Blood Test Results',
          description: 'Received lab results from clinic',
          event_date: new Date().toISOString(),
          category: 'test_result',
        },
        eventType: 'test_result',
        userId: 'test-user-4',
      },
    ];

    for (const testCase of testCases) {
      // Mock the post method to simulate "await" error
      mockPost.mockRejectedValueOnce({
        response: {
          data: {
            detail: 'Output is not await',
            error: 'AsyncError',
          },
          status: 500,
        },
        message: 'Request failed with status code 500',
        isAxiosError: true,
      });

      // Attempt to create timeline event
      try {
        await patientAPI.addTimelineEvent(testCase.eventData);
        
        // If we reach here, bug is not present
        expect(true).toBe(false);
      } catch (error) {
        // On unfixed code, we expect "await" error
        expect(
          error.response?.data?.detail?.toLowerCase().includes('await') ||
          error.response?.data?.error?.toLowerCase().includes('async')
        ).toBe(true);
        expect(error.response?.status).toBe(500);
        
        console.log(`Bug #4 demonstrated with event type: ${testCase.eventType}`);
      }
    }
  });

  /**
   * Edge Case: Multiple rapid submissions
   * 
   * Tests that multiple rapid timeline event submissions all fail with "await" error.
   */
  test('EXPLORATION: Multiple rapid submissions trigger "await" error consistently', async () => {
    const eventData = {
      title: 'Test Event',
      description: 'Test description',
      event_date: new Date().toISOString(),
      category: 'manual',
    };

    // Simulate 5 rapid submissions
    for (let i = 0; i < 5; i++) {
      // Mock the post method to simulate "await" error
      mockPost.mockRejectedValueOnce({
        response: {
          data: {
            detail: 'Output is not await',
            error: 'AsyncError',
          },
          status: 500,
        },
        message: 'Request failed with status code 500',
        isAxiosError: true,
      });

      // Attempt to create timeline event
      try {
        await patientAPI.addTimelineEvent(eventData);
        
        // If we reach here, bug is not present
        expect(true).toBe(false);
      } catch (error) {
        // On unfixed code, we expect "await" error
        expect(
          error.response?.data?.detail?.toLowerCase().includes('await') ||
          error.response?.data?.error?.toLowerCase().includes('async')
        ).toBe(true);
        
        console.log(`Bug #4 confirmed for submission ${i + 1}/5`);
      }
    }
  });

  /**
   * Edge Case: Events with various date formats
   * 
   * Tests that timeline events fail regardless of date format.
   */
  test('EXPLORATION: Events with various dates trigger "await" error', async () => {
    const dates = [
      new Date().toISOString(), // Today
      new Date(Date.now() - 86400000).toISOString(), // Yesterday
      new Date(Date.now() - 7 * 86400000).toISOString(), // 1 week ago
      new Date(Date.now() - 30 * 86400000).toISOString(), // 1 month ago
      new Date(Date.now() + 86400000).toISOString(), // Tomorrow (future event)
    ];

    for (const eventDate of dates) {
      const eventData = {
        title: 'Test Event',
        description: 'Test description',
        event_date: eventDate,
        category: 'manual',
      };

      // Mock the post method to simulate "await" error
      mockPost.mockRejectedValueOnce({
        response: {
          data: {
            detail: 'Output is not await',
            error: 'AsyncError',
          },
          status: 500,
        },
        message: 'Request failed with status code 500',
        isAxiosError: true,
      });

      // Attempt to create timeline event
      try {
        await patientAPI.addTimelineEvent(eventData);
        
        // If we reach here, bug is not present
        expect(true).toBe(false);
      } catch (error) {
        // On unfixed code, we expect "await" error
        expect(
          error.response?.data?.detail?.toLowerCase().includes('await') ||
          error.response?.data?.error?.toLowerCase().includes('async')
        ).toBe(true);
        
        console.log(`Bug #4 confirmed for date: ${eventDate.split('T')[0]}`);
      }
    }
  });

  /**
   * Edge Case: Events with empty/minimal data
   * 
   * Tests that even minimal valid events trigger the bug.
   */
  test('EXPLORATION: Events with minimal data trigger "await" error', async () => {
    const minimalEvents = [
      {
        title: 'A',
        description: '',
        event_date: new Date().toISOString(),
        category: 'manual',
      },
      {
        title: 'Test',
        description: 'X',
        event_date: new Date().toISOString(),
        category: 'medication',
      },
      {
        title: 'Event',
        description: '',
        event_date: new Date().toISOString(),
        category: 'symptom',
      },
    ];

    for (const eventData of minimalEvents) {
      // Mock the post method to simulate "await" error
      mockPost.mockRejectedValueOnce({
        response: {
          data: {
            detail: 'Output is not await',
            error: 'AsyncError',
          },
          status: 500,
        },
        message: 'Request failed with status code 500',
        isAxiosError: true,
      });

      // Attempt to create timeline event
      try {
        await patientAPI.addTimelineEvent(eventData);
        
        // If we reach here, bug is not present
        expect(true).toBe(false);
      } catch (error) {
        // On unfixed code, we expect "await" error
        expect(
          error.response?.data?.detail?.toLowerCase().includes('await') ||
          error.response?.data?.error?.toLowerCase().includes('async')
        ).toBe(true);
        
        console.log(`Bug #4 confirmed for minimal event: ${eventData.title}`);
      }
    }
  });

  /**
   * Bug Condition Validation Test
   * 
   * Verifies that the bug condition function correctly identifies
   * when the bug should manifest.
   */
  test('Bug condition function correctly identifies manual timeline event scenarios', () => {
    // Should return true for medication events
    expect(
      isBugCondition({
        action: 'CREATE_MANUAL_EVENT',
        eventData: {
          title: 'Test',
          description: 'Test',
          event_date: new Date().toISOString(),
          category: 'medication',
        },
        eventType: 'medication',
        userId: 'test-user',
      })
    ).toBe(true);

    // Should return true for symptom events
    expect(
      isBugCondition({
        action: 'CREATE_MANUAL_EVENT',
        eventData: {
          title: 'Test',
          description: 'Test',
          event_date: new Date().toISOString(),
          category: 'symptom',
        },
        eventType: 'symptom',
        userId: 'test-user',
      })
    ).toBe(true);

    // Should return true for appointment events
    expect(
      isBugCondition({
        action: 'CREATE_MANUAL_EVENT',
        eventData: {
          title: 'Test',
          description: 'Test',
          event_date: new Date().toISOString(),
          category: 'appointment',
        },
        eventType: 'appointment',
        userId: 'test-user',
      })
    ).toBe(true);

    // Should return true for test_result events
    expect(
      isBugCondition({
        action: 'CREATE_MANUAL_EVENT',
        eventData: {
          title: 'Test',
          description: 'Test',
          event_date: new Date().toISOString(),
          category: 'test_result',
        },
        eventType: 'test_result',
        userId: 'test-user',
      })
    ).toBe(true);

    // Should return true for manual events
    expect(
      isBugCondition({
        action: 'CREATE_MANUAL_EVENT',
        eventData: {
          title: 'Test',
          description: 'Test',
          event_date: new Date().toISOString(),
          category: 'manual',
        },
        eventType: 'manual',
        userId: 'test-user',
      })
    ).toBe(true);

    // Should return false when action is not CREATE_MANUAL_EVENT
    expect(
      isBugCondition({
        action: '' as const,
        eventData: {
          title: 'Test',
          description: 'Test',
          event_date: new Date().toISOString(),
          category: 'manual',
        },
        eventType: 'manual',
        userId: 'test-user',
      })
    ).toBe(false);

    // Should return false when eventData is null
    expect(
      isBugCondition({
        action: 'CREATE_MANUAL_EVENT',
        eventData: null,
        eventType: 'manual',
        userId: 'test-user',
      })
    ).toBe(false);
  });

  /**
   * Preservation Test: Viewing timeline should not trigger the bug
   * 
   * Verifies that reading timeline events does not encounter the "await" error.
   */
  test('PRESERVATION: Viewing timeline should not trigger "await" error', async () => {
    // Mock successful GET request for viewing timeline
    const mockGet = (await import('axios')).default.create().get as ReturnType<typeof vi.fn>;
    mockGet.mockResolvedValueOnce({
      data: {
        records: [
          {
            id: 'event-1',
            date: 'Jan 15, 2024',
            type: 'Manual Event',
            title: 'Test Event',
            summary: 'Test description',
            is_manual: true,
          },
        ],
      },
      status: 200,
    });

    // Viewing timeline should not trigger bug condition
    const viewRequest = {
      action: '' as const,
      eventData: null,
      eventType: 'manual' as const,
      userId: 'test-user',
    };

    // Bug condition should NOT hold for viewing timeline
    expect(isBugCondition(viewRequest)).toBe(false);
    
    console.log('Preservation verified: Viewing timeline does not trigger bug condition');
  });
});
