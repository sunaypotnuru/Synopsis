/**
 * Database Seed Script for Compliance Data
 * Seeds sample data for FDA APM, IEC 62304, and SOC 2 systems
 */

import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'netra_ai',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function seedRequirements() {
  console.log('Seeding IEC 62304 requirements...');
  
  const requirements = [
    {
      id: 'REQ-DR-001',
      title: 'Diabetic Retinopathy Detection',
      description: 'System shall detect diabetic retinopathy from retinal images with ≥85% sensitivity',
      type: 'functional',
      priority: 'Critical',
      safety_class: 'B',
      rationale: 'Early detection of diabetic retinopathy prevents vision loss',
      verification_method: 'test',
      status: 'approved'
    },
    {
      id: 'REQ-DR-002',
      title: 'Image Quality Validation',
      description: 'System shall validate image quality before analysis',
      type: 'functional',
      priority: 'High',
      safety_class: 'B',
      rationale: 'Poor quality images lead to inaccurate results',
      verification_method: 'test',
      status: 'approved'
    },
    {
      id: 'REQ-SEC-001',
      title: 'Data Encryption',
      description: 'All PHI shall be encrypted at rest using AES-256',
      type: 'security',
      priority: 'Critical',
      safety_class: 'C',
      rationale: 'HIPAA compliance requirement',
      verification_method: 'review',
      status: 'approved'
    },
    {
      id: 'REQ-PERF-001',
      title: 'Analysis Performance',
      description: 'AI analysis shall complete within 5 seconds',
      type: 'performance',
      priority: 'High',
      safety_class: 'B',
      rationale: 'User experience and clinical workflow efficiency',
      verification_method: 'test',
      status: 'approved'
    },
    {
      id: 'REQ-UI-001',
      title: 'Accessibility Compliance',
      description: 'UI shall meet WCAG 2.2 Level AA standards',
      type: 'usability',
      priority: 'High',
      safety_class: 'A',
      rationale: 'Legal requirement and inclusive design',
      verification_method: 'test',
      status: 'approved'
    }
  ];

  for (const req of requirements) {
    await pool.query(
      `INSERT INTO requirements (id, title, description, type, priority, safety_class, rationale, verification_method, status, created_by, approved_by, approved_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
       ON CONFLICT (id) DO NOTHING`,
      [req.id, req.title, req.description, req.type, req.priority, req.safety_class, req.rationale, req.verification_method, req.status, 'system', 'admin']
    );
  }
  
  console.log(`✓ Seeded ${requirements.length} requirements`);
}

async function seedDesignElements() {
  console.log('Seeding design elements...');
  
  const elements = [
    {
      id: 'DES-DR-001',
      name: 'DiabeticRetinopathyDetector',
      description: 'CNN-based model for diabetic retinopathy detection',
      type: 'class',
      safety_class: 'B'
    },
    {
      id: 'DES-IMG-001',
      name: 'ImagePreprocessor',
      description: 'Image quality validation and preprocessing',
      type: 'class',
      safety_class: 'B'
    },
    {
      id: 'DES-SEC-001',
      name: 'EncryptionService',
      description: 'AES-256 encryption for PHI data',
      type: 'module',
      safety_class: 'C'
    }
  ];

  for (const elem of elements) {
    await pool.query(
      `INSERT INTO design_elements (id, name, description, type, safety_class)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO NOTHING`,
      [elem.id, elem.name, elem.description, elem.type, elem.safety_class]
    );
  }
  
  console.log(`✓ Seeded ${elements.length} design elements`);
}

async function seedTraceabilityLinks() {
  console.log('Seeding traceability links...');
  
  const links = [
    { req: 'REQ-DR-001', design: 'DES-DR-001' },
    { req: 'REQ-DR-002', design: 'DES-IMG-001' },
    { req: 'REQ-SEC-001', design: 'DES-SEC-001' }
  ];

  for (const link of links) {
    await pool.query(
      `INSERT INTO requirement_design_links (requirement_id, design_element_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [link.req, link.design]
    );
  }
  
  console.log(`✓ Seeded ${links.length} traceability links`);
}

async function seedSOC2Controls() {
  console.log('Seeding SOC 2 controls...');
  
  const controls = [
    { id: 'CC1.1', name: 'Organizational Structure', category: 'CC', status: 'implemented' },
    { id: 'CC1.2', name: 'Code of Conduct', category: 'CC', status: 'implemented' },
    { id: 'CC6.1', name: 'Logical Access Controls', category: 'CC', status: 'implemented' },
    { id: 'CC6.2', name: 'Access Reviews', category: 'CC', status: 'implemented' },
    { id: 'CC7.1', name: 'System Monitoring', category: 'CC', status: 'implemented' },
    { id: 'CC7.2', name: 'Incident Response', category: 'CC', status: 'implemented' },
    { id: 'A1.1', name: 'System Availability', category: 'A', status: 'implemented' },
    { id: 'A1.2', name: 'Incident Response', category: 'A', status: 'implemented' },
    { id: 'C1.1', name: 'Data Classification', category: 'C', status: 'implemented' },
    { id: 'PI1.1', name: 'Input Validation', category: 'PI', status: 'implemented' },
    { id: 'P1.1', name: 'Privacy Notice', category: 'P', status: 'implemented' },
    { id: 'P2.1', name: 'Consent Management', category: 'P', status: 'implemented' }
  ];

  for (const control of controls) {
    await pool.query(
      `INSERT INTO soc2_control_status (control_id, control_name, control_category, implementation_status, test_result, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (control_id) DO UPDATE SET
         control_name = EXCLUDED.control_name,
         implementation_status = EXCLUDED.implementation_status,
         updated_at = NOW()`,
      [control.id, control.name, control.category, control.status, 'pass']
    );
  }
  
  console.log(`✓ Seeded ${controls.length} SOC 2 controls`);
}

async function seedModelVersions() {
  console.log('Seeding AI model versions...');
  
  const models = [
    {
      name: 'diabetic_retinopathy',
      version: 'v1.0.0',
      deployed_at: new Date(),
      pccp_authorized: true,
      approval_status: 'approved',
      approved_by: 'FDA Compliance Team'
    },
    {
      name: 'cataract_detection',
      version: 'v1.0.0',
      deployed_at: new Date(),
      pccp_authorized: true,
      approval_status: 'approved',
      approved_by: 'FDA Compliance Team'
    },
    {
      name: 'anemia_detection',
      version: 'v1.0.0',
      deployed_at: new Date(),
      pccp_authorized: true,
      approval_status: 'approved',
      approved_by: 'FDA Compliance Team'
    }
  ];

  for (const model of models) {
    await pool.query(
      `INSERT INTO model_versions (model_name, version, deployed_at, pccp_authorized, approval_status, approved_by, approved_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (version) DO NOTHING`,
      [model.name, model.version, model.deployed_at, model.pccp_authorized, model.approval_status, model.approved_by]
    );
  }
  
  console.log(`✓ Seeded ${models.length} model versions`);
}

async function seedSampleMetrics() {
  console.log('Seeding sample performance metrics...');
  
  const now = new Date();
  const metrics = [];
  
  // Generate 30 days of sample metrics
  for (let i = 0; i < 30; i++) {
    const timestamp = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    metrics.push({
      model_name: 'diabetic_retinopathy',
      timestamp,
      sensitivity: 0.87 + (Math.random() * 0.04 - 0.02),
      specificity: 0.89 + (Math.random() * 0.04 - 0.02),
      ppv: 0.85 + (Math.random() * 0.04 - 0.02),
      npv: 0.91 + (Math.random() * 0.04 - 0.02),
      auc_roc: 0.92 + (Math.random() * 0.04 - 0.02),
      calibration_error: 0.05 + (Math.random() * 0.02),
      prediction_latency: 2.5 + (Math.random() * 1.0),
      total_predictions: Math.floor(100 + Math.random() * 50),
      true_positives: Math.floor(40 + Math.random() * 10),
      true_negatives: Math.floor(45 + Math.random() * 10),
      false_positives: Math.floor(3 + Math.random() * 3),
      false_negatives: Math.floor(2 + Math.random() * 3)
    });
  }

  for (const metric of metrics) {
    await pool.query(
      `INSERT INTO ai_performance_metrics 
       (model_name, timestamp, sensitivity, specificity, ppv, npv, auc_roc, calibration_error, 
        prediction_latency, total_predictions, true_positives, true_negatives, false_positives, false_negatives)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [metric.model_name, metric.timestamp, metric.sensitivity, metric.specificity, metric.ppv, metric.npv,
       metric.auc_roc, metric.calibration_error, metric.prediction_latency, metric.total_predictions,
       metric.true_positives, metric.true_negatives, metric.false_positives, metric.false_negatives]
    );
  }
  
  console.log(`✓ Seeded ${metrics.length} performance metrics`);
}

async function main() {
  console.log('========================================');
  console.log('Seeding Compliance Data');
  console.log('========================================\n');

  try {
    await seedRequirements();
    await seedDesignElements();
    await seedTraceabilityLinks();
    await seedSOC2Controls();
    await seedModelVersions();
    await seedSampleMetrics();

    console.log('\n========================================');
    console.log('✓ All data seeded successfully!');
    console.log('========================================\n');
  } catch (error) {
    console.error('✗ Error seeding data:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
