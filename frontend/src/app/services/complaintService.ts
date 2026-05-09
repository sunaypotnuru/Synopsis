/**
 * Complaint Management Service
 * Handles all complaint-related API calls for patients, doctors, and admins
 */

export interface ComplaintFormData {
  category: string;
  subcategory: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  subject: string;
  description: string;
  patientId?: string;
  appointmentId?: string;
  doctorId?: string;
  attachments?: File[];
  preferredContact: 'email' | 'phone' | 'portal';
  affectsPatientCare?: boolean;
  requiresImmediateAction?: boolean;
  requestRefund?: boolean;
  refundAmount?: number;
  refundReason?: string;
}

export interface Complaint {
  id: string;
  ticketId: string;
  type: 'patient' | 'doctor';
  category: string;
  subcategory: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'submitted' | 'in_review' | 'in_progress' | 'resolved' | 'closed';
  subject: string;
  description: string;
  submittedBy: {
    id: string;
    name: string;
    email: string;
    type: 'patient' | 'doctor';
  };
  submittedAt: string;
  assignedTo?: {
    id: string;
    name: string;
    department: string;
  };
  lastUpdated: string;
  responseTime?: number;
  resolutionTime?: number;
  affectsPatientCare?: boolean;
  requiresImmediateAction?: boolean;
  attachments: number;
  messages: number;
}

export interface ComplaintStats {
  total: number;
  open: number;
  resolved: number;
  avgResponseTime: number;
  avgResolutionTime: number;
  patientComplaints: number;
  doctorComplaints: number;
  highPriority: number;
  affectingPatientCare: number;
}

class ComplaintService {
  private baseUrl = '/api/complaints';

  /**
   * Submit a new complaint
   */
  async submitComplaint(complaintData: ComplaintFormData): Promise<{
    success: boolean;
    complaint?: {
      id: string;
      ticketId: string;
      status: string;
      submittedAt: string;
    };
    error?: string;
  }> {
    try {
      // Get current user context (this would come from auth context in real app)
      const currentUser = this.getCurrentUser();
      
      const payload = {
        ...complaintData,
        submittedBy: currentUser
      };

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit complaint');
      }

      return await response.json();
    } catch (error) {
      console.error('Error submitting complaint:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get complaints with filtering and pagination
   */
  async getComplaints(params?: {
    type?: 'patient' | 'doctor' | 'all';
    status?: string;
    priority?: string;
    category?: string;
    userId?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    complaints: Complaint[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    try {
      const searchParams = new URLSearchParams();
      
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.append(key, value.toString());
          }
        });
      }

      const response = await fetch(`${this.baseUrl}?${searchParams}`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch complaints');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching complaints:', error);
      throw error;
    }
  }

  /**
   * Get complaint statistics
   */
  async getComplaintStats(params?: {
    timeframe?: 'all' | 'week' | 'month' | 'quarter';
    type?: 'patient' | 'doctor' | 'all';
  }): Promise<ComplaintStats> {
    try {
      const searchParams = new URLSearchParams();
      
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.append(key, value.toString());
          }
        });
      }

      const response = await fetch(`${this.baseUrl}/stats?${searchParams}`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch complaint statistics');
      }

      const data = await response.json();
      return data.data.overview;
    } catch (error) {
      console.error('Error fetching complaint statistics:', error);
      throw error;
    }
  }

  /**
   * Update complaint status or assignment
   */
  async updateComplaint(complaintId: string, updates: {
    status?: string;
    assignedTo?: {
      id: string;
      name: string;
      department: string;
    };
    priority?: string;
    notes?: string;
  }): Promise<{
    success: boolean;
    complaint?: Complaint;
    error?: string;
  }> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({
          id: complaintId,
          ...updates
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update complaint');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating complaint:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get user's own complaints
   */
  async getMyComplaints(userId: string): Promise<Complaint[]> {
    try {
      const response = await this.getComplaints({ userId });
      return response.complaints;
    } catch (error) {
      console.error('Error fetching user complaints:', error);
      return [];
    }
  }

  /**
   * Track analytics event
   */
  async trackAnalytics(action: string, complaintId: string, data?: Record<string, unknown>): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/stats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({
          action,
          complaintId,
          userId: this.getCurrentUser().id,
          ...data
        })
      });
    } catch (error) {
      console.error('Error tracking analytics:', error);
      // Don't throw error for analytics failures
    }
  }

  /**
   * Upload complaint attachments
   */
  async uploadAttachments(files: File[]): Promise<string[]> {
    try {
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'complaint_attachment');

        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.getAuthToken()}`
          },
          body: formData
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }

        const data = await response.json();
        return data.url;
      });

      return await Promise.all(uploadPromises);
    } catch (error) {
      console.error('Error uploading attachments:', error);
      throw error;
    }
  }

  /**
   * Get complaint categories for a specific user type
   */
  getComplaintCategories(userType: 'patient' | 'doctor') {
    if (userType === 'patient') {
      return {
        billing: {
          label: 'Billing & Payment Issues',
          subcategories: [
            'Incorrect charges',
            'Insurance claim denied',
            'Unexpected balance',
            'Payment processing error',
            'Refund request',
            'Consultation fee dispute',
            'Subscription billing issue',
            'Double charging'
          ]
        },
        technical: {
          label: 'Technical Issues',
          subcategories: [
            'App crashes or freezes',
            'Login problems',
            'Video call connection issues',
            'File upload failures',
            'Portal access problems',
            'Slow loading times',
            'Mobile app bugs',
            'Browser compatibility issues'
          ]
        },
        dataAccess: {
          label: 'Data Access & Records',
          subcategories: [
            'Cannot download medical records',
            'Missing test results',
            'Incorrect information in records',
            'FHIR export issues',
            'Report generation problems',
            'Data synchronization errors',
            'Historical data missing',
            'Record sharing problems'
          ]
        },
        privacy: {
          label: 'Privacy & Security',
          subcategories: [
            'Unauthorized access to records',
            'Privacy breach concern',
            'Data sharing without consent',
            'Security vulnerability',
            'HIPAA violation',
            'Account security issue',
            'Identity verification problems',
            'Consent management issues'
          ]
        },
        service: {
          label: 'Service Quality',
          subcategories: [
            'Long wait times',
            'Appointment scheduling issues',
            'Doctor unavailability',
            'Poor consultation quality',
            'Missed appointments by doctor',
            'Inadequate follow-up',
            'Prescription delays',
            'Referral problems'
          ]
        },
        communication: {
          label: 'Communication Issues',
          subcategories: [
            'Rude or unprofessional staff',
            'Language barrier',
            'Unclear instructions',
            'No response to messages',
            'Miscommunication about treatment',
            'Poor bedside manner',
            'Inadequate explanation of diagnosis',
            'Consent form confusion'
          ]
        },
        accessibility: {
          label: 'Accessibility & Discrimination',
          subcategories: [
            'Disability accommodation denied',
            'Discrimination based on race/gender',
            'Language interpretation not provided',
            'Accessibility features not working',
            'Cultural insensitivity',
            'Age-based discrimination',
            'Insurance-based discrimination',
            'Religious accommodation issues'
          ]
        },
        other: {
          label: 'Other Issues',
          subcategories: [
            'Facility cleanliness',
            'Equipment malfunction',
            'Medication errors',
            'Safety concerns',
            'Policy disagreements',
            'Family member access issues',
            'Emergency response problems',
            'General feedback'
          ]
        }
      };
    } else {
      return {
        platform: {
          label: 'Platform & Technical Issues',
          subcategories: [
            'System downtime during consultation',
            'Video call quality issues',
            'AI analysis system errors',
            'Patient portal malfunctions',
            'EMR integration problems',
            'Prescription system failures',
            'Mobile app crashes',
            'Slow system performance',
            'Data synchronization errors',
            'Login authentication issues'
          ]
        },
        billing: {
          label: 'Billing & Compensation',
          subcategories: [
            'Incorrect consultation fees',
            'Delayed payment processing',
            'Commission calculation errors',
            'Missing payments for consultations',
            'Insurance reimbursement issues',
            'Platform fee disputes',
            'Refund processing problems',
            'Payment method issues',
            'Tax documentation problems',
            'Subscription billing errors'
          ]
        },
        patients: {
          label: 'Patient-Related Issues',
          subcategories: [
            'Patient no-show without notice',
            'Inappropriate patient behavior',
            'Patient harassment or threats',
            'False accusations by patient',
            'Patient non-compliance with treatment',
            'Unreasonable patient demands',
            'Patient privacy violations',
            'Fake or spam patient accounts',
            'Patient review manipulation',
            'Emergency situations mishandled'
          ]
        },
        clinical: {
          label: 'Clinical & Medical Issues',
          subcategories: [
            'AI diagnostic accuracy concerns',
            'Missing patient medical history',
            'Incomplete lab results access',
            'Medication interaction warnings',
            'Clinical decision support errors',
            'FHIR data integration issues',
            'Medical imaging quality problems',
            'Prescription verification delays',
            'Clinical protocol violations',
            'Medical record discrepancies'
          ]
        },
        scheduling: {
          label: 'Scheduling & Availability',
          subcategories: [
            'Appointment scheduling conflicts',
            'Availability settings not working',
            'Double-booked appointments',
            'Incorrect time zone handling',
            'Emergency slot allocation issues',
            'Recurring appointment problems',
            'Calendar synchronization errors',
            'Notification delivery failures',
            'Cancellation policy disputes',
            'Buffer time not respected'
          ]
        },
        compliance: {
          label: 'Compliance & Legal',
          subcategories: [
            'HIPAA compliance violations',
            'Medical licensing verification issues',
            'Audit trail discrepancies',
            'Consent management problems',
            'Data breach concerns',
            'Regulatory reporting errors',
            'Professional liability issues',
            'Credentialing process problems',
            'Quality assurance failures',
            'Legal documentation issues'
          ]
        },
        support: {
          label: 'Support & Communication',
          subcategories: [
            'Inadequate technical support',
            'Slow response to urgent issues',
            'Poor customer service quality',
            'Language barrier with support',
            'Unresolved support tickets',
            'Lack of training resources',
            'Communication delays',
            'Escalation process failures',
            'Documentation inadequacy',
            'Feedback not addressed'
          ]
        },
        administrative: {
          label: 'Administrative Issues',
          subcategories: [
            'Profile information errors',
            'Credential verification delays',
            'Contract terms disputes',
            'Policy changes without notice',
            'Administrative fee issues',
            'Document upload problems',
            'Reporting system errors',
            'Analytics data inaccuracy',
            'Workflow inefficiencies',
            'Integration with other systems'
          ]
        }
      };
    }
  }

  // Helper methods
  private getCurrentUser() {
    // In a real app, this would get user from auth context
    return {
      id: 'current_user_id',
      name: 'Current User',
      email: 'user@example.com',
      type: 'patient' as const
    };
  }

  private getAuthToken(): string {
    // In a real app, this would get token from auth context
    return 'mock_auth_token';
  }
}

export const complaintService = new ComplaintService();
export default complaintService;