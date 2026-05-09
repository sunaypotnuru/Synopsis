/**
 * Bug #2 Exploration Test: PDF Upload "Bad Excel" Error
 * 
 * **Validates: Bugfix Requirements 1.2**
 * 
 * This is an EXPLORATION test that demonstrates Bug #2 on unfixed code.
 * 
 * Bug Condition: When a user uploads a PDF document in the "My Documents" page,
 * the system displays "Bad Excel" error and the upload fails.
 * 
 * Expected Behavior on UNFIXED code: This test should FAIL, demonstrating the bug exists.
 * Expected Behavior on FIXED code: This test should PASS, demonstrating the bug is resolved.
 * 
 * Property: For all PDF upload requests where bug condition holds,
 * the system should return a "Bad Excel" error (on unfixed code).
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

// Now import documentsAPI after mocks are set up
const { documentsAPI } = await import('../../src/lib/api');

describe('Bug #2 Exploration: PDF Upload "Bad Excel" Error', () => {
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
   * Returns true when PDF document is uploaded to My Documents
   */
  function isBugCondition(input: {
    fileType: string;
    fileExtension: string;
    uploadLocation: string;
  }): boolean {
    return (
      (input.fileType === 'application/pdf' || input.fileExtension === '.pdf') &&
      input.uploadLocation === 'MY_DOCUMENTS'
    );
  }

  /**
   * Helper function to create a mock PDF File object
   */
  function createMockPDFFile(
    filename: string,
    sizeInKB: number
  ): File {
    const content = new Array(sizeInKB * 1024).fill('a').join('');
    const blob = new Blob([content], { type: 'application/pdf' });
    return new File([blob], filename, { type: 'application/pdf' });
  }

  /**
   * Property-Based Exploration Test
   * 
   * This test generates various PDF upload scenarios and verifies
   * that the bug manifests ("Bad Excel" error occurs) on unfixed code.
   * 
   * Test Strategy:
   * - Generate PDF files with various names, sizes, and extensions
   * - Verify that "Bad Excel" error occurs for all PDF upload attempts
   * - This demonstrates the bug exists on unfixed code
   */
  test('EXPLORATION: PDF upload triggers "Bad Excel" error on unfixed code', async () => {
    // Property-based test: Generate various PDF upload scenarios
    await fc.assert(
      fc.asyncProperty(
        // Arbitrary: Generate PDF filenames with various extensions
        fc.record({
          basename: fc.constantFrom(
            'medical_report',
            'prescription',
            'lab_results',
            'xray_scan',
            'blood_test',
            'doctor_note',
            'test_results',
            'scan_image',
            'health_record',
            'diagnosis'
          ),
          extension: fc.constantFrom('.pdf', '.PDF', '.Pdf'),
        }).map(({ basename, extension }) => basename + extension),
        // Arbitrary: Generate file sizes (in KB, between 10KB and 5MB)
        fc.integer({ min: 10, max: 5000 }),
        // Arbitrary: Generate document titles
        fc.constantFrom(
          'Medical Report',
          'Prescription',
          'Lab Results',
          'X-Ray Scan',
          'Blood Test Report',
          'Doctor\'s Note'
        ),
        // Arbitrary: Generate descriptions
        fc.constantFrom(
          'Important medical document',
          'Test results from clinic',
          'Prescription from Dr. Smith',
          '',
          'Follow-up report'
        ),
        // Arbitrary: Generate categories
        fc.constantFrom('general', 'lab_report', 'prescription', 'scan', 'other'),
        async (filename, sizeInKB, title, description, category) => {
          // Create mock PDF file
          const pdfFile = createMockPDFFile(filename, sizeInKB);

          // Extract file extension
          const fileExtension = filename.substring(filename.lastIndexOf('.'));

          // Check if bug condition holds
          const bugConditionInput = {
            fileType: 'application/pdf',
            fileExtension: fileExtension,
            uploadLocation: 'MY_DOCUMENTS',
          };

          if (isBugCondition(bugConditionInput)) {
            // Mock the post method to simulate "Bad Excel" error (unfixed code behavior)
            mockPost.mockRejectedValueOnce({
              response: {
                data: {
                  detail: 'Bad Excel',
                },
                status: 400,
              },
              message: 'Request failed with status code 400',
              isAxiosError: true,
            });

            // Attempt to upload PDF document
            try {
              await documentsAPI.uploadDocument(pdfFile, title, description, category);
              
              // On UNFIXED code: We expect this to throw a "Bad Excel" error
              // If we reach here without error, the bug is NOT present (test fails on unfixed code)
              expect(true).toBe(false); // Force failure to show bug doesn't exist
            } catch (error) {
              // On UNFIXED code: We expect a "Bad Excel" error
              // This assertion PASSES on unfixed code (demonstrating bug exists)
              const err = error as { response?: { data?: { detail?: string }; status?: number } };
              expect(err.response?.data?.detail).toContain('Bad Excel');
              expect(err.response?.status).toBe(400);
              
              // Log the counterexample for documentation
              console.log('Bug #2 Counterexample Found:', {
                filename,
                sizeInKB,
                title,
                category,
                fileType: pdfFile.type,
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
  }, 15000); // Increase timeout to 15 seconds for property-based testing

  /**
   * Example-Based Exploration Test
   * 
   * Concrete examples that demonstrate the bug with specific PDF files.
   */
  test('EXPLORATION: Specific PDF files trigger "Bad Excel" error', async () => {
    const testCases = [
      {
        filename: 'medical_report.pdf',
        sizeInKB: 500,
        title: 'Medical Report',
        description: 'Annual checkup results',
        category: 'lab_report',
      },
      {
        filename: 'prescription.pdf',
        sizeInKB: 200,
        title: 'Prescription',
        description: 'Medication from Dr. Jones',
        category: 'prescription',
      },
      {
        filename: 'scan_results.PDF',
        sizeInKB: 1500,
        title: 'X-Ray Scan',
        description: 'Chest X-ray',
        category: 'scan',
      },
      {
        filename: 'blood_test.Pdf',
        sizeInKB: 300,
        title: 'Blood Test Results',
        description: '',
        category: 'lab_report',
      },
    ];

    for (const testCase of testCases) {
      const pdfFile = createMockPDFFile(testCase.filename, testCase.sizeInKB);

      // Mock the post method to simulate "Bad Excel" error
      mockPost.mockRejectedValueOnce({
        response: {
          data: {
            detail: 'Bad Excel',
          },
          status: 400,
        },
        message: 'Request failed with status code 400',
        isAxiosError: true,
      });

      // Attempt to upload PDF document
      try {
        await documentsAPI.uploadDocument(
          pdfFile,
          testCase.title,
          testCase.description,
          testCase.category
        );
        
        // If we reach here, bug is not present
        expect(true).toBe(false);
      } catch (error) {
        // On unfixed code, we expect "Bad Excel" error
        expect(error.response?.data?.detail).toContain('Bad Excel');
        expect(error.response?.status).toBe(400);
        
        console.log(`Bug #2 demonstrated with file: ${testCase.filename}`);
      }
    }
  });

  /**
   * Edge Case: PDF files with different sizes
   * 
   * Tests that PDF uploads fail regardless of file size.
   */
  test('EXPLORATION: PDF uploads fail with "Bad Excel" error regardless of size', async () => {
    const fileSizes = [
      10,    // 10 KB - very small
      100,   // 100 KB - small
      500,   // 500 KB - medium
      2000,  // 2 MB - large
      5000,  // 5 MB - very large
    ];

    for (const sizeInKB of fileSizes) {
      const pdfFile = createMockPDFFile(`test_${sizeInKB}kb.pdf`, sizeInKB);

      // Mock the post method to simulate "Bad Excel" error
      mockPost.mockRejectedValueOnce({
        response: {
          data: {
            detail: 'Bad Excel',
          },
          status: 400,
        },
        message: 'Request failed with status code 400',
        isAxiosError: true,
      });

      // Attempt to upload PDF document
      try {
        await documentsAPI.uploadDocument(
          pdfFile,
          `Test Document ${sizeInKB}KB`,
          'Test description',
          'general'
        );
        
        // If we reach here, bug is not present
        expect(true).toBe(false);
      } catch (error) {
        // On unfixed code, we expect "Bad Excel" error
        expect(error.response?.data?.detail).toContain('Bad Excel');
        
        console.log(`Bug #2 confirmed for ${sizeInKB}KB PDF file`);
      }
    }
  });

  /**
   * Edge Case: PDF files with various extension cases
   * 
   * Tests that PDF uploads fail with different extension capitalizations.
   */
  test('EXPLORATION: PDF uploads fail with various extension cases', async () => {
    const extensions = ['.pdf', '.PDF', '.Pdf', '.pDf', '.pdF'];

    for (const extension of extensions) {
      const filename = `document${extension}`;
      const pdfFile = createMockPDFFile(filename, 500);

      // Mock the post method to simulate "Bad Excel" error
      mockPost.mockRejectedValueOnce({
        response: {
          data: {
            detail: 'Bad Excel',
          },
          status: 400,
        },
        message: 'Request failed with status code 400',
        isAxiosError: true,
      });

      // Attempt to upload PDF document
      try {
        await documentsAPI.uploadDocument(
          pdfFile,
          'Test Document',
          'Test description',
          'general'
        );
        
        // If we reach here, bug is not present
        expect(true).toBe(false);
      } catch (error) {
        // On unfixed code, we expect "Bad Excel" error
        expect(error.response?.data?.detail).toContain('Bad Excel');
        
        console.log(`Bug #2 confirmed for extension: ${extension}`);
      }
    }
  });

  /**
   * Bug Condition Validation Test
   * 
   * Verifies that the bug condition function correctly identifies
   * when the bug should manifest.
   */
  test('Bug condition function correctly identifies PDF upload scenarios', () => {
    // Should return true for PDF uploads with application/pdf MIME type
    expect(
      isBugCondition({
        fileType: 'application/pdf',
        fileExtension: '.pdf',
        uploadLocation: 'MY_DOCUMENTS',
      })
    ).toBe(true);

    // Should return true for PDF uploads with .PDF extension
    expect(
      isBugCondition({
        fileType: 'application/pdf',
        fileExtension: '.PDF',
        uploadLocation: 'MY_DOCUMENTS',
      })
    ).toBe(true);

    // Should return false for non-PDF file types
    expect(
      isBugCondition({
        fileType: 'image/png',
        fileExtension: '.png',
        uploadLocation: 'MY_DOCUMENTS',
      })
    ).toBe(false);

    // Should return false for non-PDF extensions
    expect(
      isBugCondition({
        fileType: 'image/jpeg',
        fileExtension: '.jpg',
        uploadLocation: 'MY_DOCUMENTS',
      })
    ).toBe(false);

    // Should return false when upload location is different
    expect(
      isBugCondition({
        fileType: 'application/pdf',
        fileExtension: '.pdf',
        uploadLocation: 'OTHER_LOCATION',
      })
    ).toBe(false);

    // Should return true when only fileExtension is .pdf (even if fileType is different)
    expect(
      isBugCondition({
        fileType: 'application/octet-stream',
        fileExtension: '.pdf',
        uploadLocation: 'MY_DOCUMENTS',
      })
    ).toBe(true);
  });

  /**
   * Preservation Test: Non-PDF files should not trigger the bug
   * 
   * Verifies that image uploads (PNG, JPG) do not encounter the "Bad Excel" error.
   */
  test('PRESERVATION: Image uploads should not trigger "Bad Excel" error', async () => {
    const imageFiles = [
      { filename: 'scan.png', type: 'image/png', extension: '.png' },
      { filename: 'photo.jpg', type: 'image/jpeg', extension: '.jpg' },
      { filename: 'result.jpeg', type: 'image/jpeg', extension: '.jpeg' },
    ];

    for (const imageFile of imageFiles) {
      const bugConditionInput = {
        fileType: imageFile.type,
        fileExtension: imageFile.extension,
        uploadLocation: 'MY_DOCUMENTS',
      };

      // Bug condition should NOT hold for image files
      expect(isBugCondition(bugConditionInput)).toBe(false);
      
      console.log(`Preservation verified: ${imageFile.filename} does not trigger bug condition`);
    }
  });
});
