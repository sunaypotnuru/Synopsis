export const mockPatients = [
    { id: '1', name: 'Rahul Sharma', email: 'rahul@example.com', age: 34, language: 'hi-IN', scans: 3, appointments: 2 },
    { id: '2', name: 'Priya Patel', email: 'priya@example.com', age: 28, language: 'gu-IN', scans: 5, appointments: 4 },
];

export const mockDoctors = [
    { id: 'd1', name: 'Dr. Anjali Mehta', specialty: 'Hematology', languages: ['en', 'hi'], approved: true, rating: 4.8 },
    { id: 'd2', name: 'Dr. Suresh Kumar', specialty: 'General Medicine', languages: ['ta', 'en'], approved: false },
];

export const mockAppointments = [
    { id: 'a1', patientId: '1', doctorId: 'd1', date: '2026-04-01T10:00', status: 'scheduled' },
    { id: 'a2', patientId: '2', doctorId: 'd2', date: '2026-04-02T14:00', status: 'completed' },
];

export const mockScans = [
    { id: 's1', patientId: '1', result: 'Anemic', confidence: 0.94, date: '2026-03-15' },
    { id: 's2', patientId: '2', result: 'Non-Anemic', confidence: 0.89, date: '2026-03-16' },
];

export const mockHealthHistory = {
    '1': [8.2, 9.0, 9.8, 10.5, 11.2], // hemoglobin trend
};

export const mockFamilyAccounts: Record<string, { id: string, name: string, relation: string }[]> = {
    '1': [
        { id: 'f1', name: 'Father (65)', relation: 'father' },
        { id: 'f2', name: 'Mother (62)', relation: 'mother' },
    ],
};

export const mockWaitlist = [
    { id: 'w1', patientName: 'Rahul Sharma', priority: 'high', waitTime: 5 },
    { id: 'w2', patientName: 'Priya Patel', priority: 'medium', waitTime: 12 },
];

export const mockRevenue = [1200, 1500, 1800, 2200, 2500, 2800]; // weekly
