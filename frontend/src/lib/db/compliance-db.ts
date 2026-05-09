/**
 * Compliance Database Connection Configuration
 * Provides connection pool and query helpers for compliance systems
 */

import { Pool, PoolClient, QueryResult } from 'pg';

// Database configuration
const dbConfig = {
  host: process.env.COMPLIANCE_DB_HOST || process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.COMPLIANCE_DB_PORT || process.env.DB_PORT || '5432'),
  database: process.env.COMPLIANCE_DB_NAME || process.env.DB_NAME || 'netra_ai',
  user: process.env.COMPLIANCE_DB_USER || process.env.DB_USER || 'postgres',
  password: process.env.COMPLIANCE_DB_PASSWORD || process.env.DB_PASSWORD || 'postgres',
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
  maxUses: 7500, // Close (and replace) a connection after it has been used 7500 times
};

// Create connection pool
const pool = new Pool(dbConfig);

// Pool event handlers
pool.on('connect', (_client) => {
  console.log('New compliance database client connected');
});

pool.on('error', (err, _client) => {
  console.error('Unexpected error on idle compliance database client', err);
  process.exit(-1);
});

/**
 * Execute a query with automatic connection management
 */
import { QueryResultRow } from 'pg';
export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const res = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error', { text, params, error });
    throw error;
  }
}

/**
 * Execute multiple queries in a transaction
 */
export async function transaction<T>(
  callback: (_client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get a client from the pool for manual connection management
 */
export async function getClient(): Promise<PoolClient> {
  return await pool.connect();
}

/**
 * Close all connections in the pool
 */
export async function end(): Promise<void> {
  await pool.end();
}

// Compliance-specific query helpers

/**
 * FDA APM Queries
 */
export const fdaApmQueries = {
  /**
   * Get model performance metrics
   */
  async getModelMetrics(modelName: string, startDate?: Date, endDate?: Date) {
    const whereClause = startDate && endDate 
      ? 'WHERE model_name = $1 AND timestamp BETWEEN $2 AND $3'
      : 'WHERE model_name = $1';
    
    const params = startDate && endDate 
      ? [modelName, startDate, endDate]
      : [modelName];

    return query(`
      SELECT 
        model_name,
        timestamp,
        sensitivity,
        specificity,
        ppv,
        npv,
        auc_roc,
        calibration_error,
        prediction_latency,
        total_predictions,
        true_positives,
        true_negatives,
        false_positives,
        false_negatives
      FROM ai_performance_metrics
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT 1000
    `, params);
  },

  /**
   * Get active performance alerts
   */
  async getActiveAlerts() {
    return query(`
      SELECT 
        id,
        model_name,
        alert_type,
        severity,
        message,
        threshold_value,
        actual_value,
        created_at,
        acknowledged,
        acknowledged_by,
        acknowledged_at
      FROM ai_performance_alerts
      WHERE resolved = FALSE
      ORDER BY created_at DESC
    `);
  },

  /**
   * Get data drift metrics
   */
  async getDataDriftMetrics(modelName: string) {
    return query(`
      SELECT 
        model_name,
        timestamp,
        feature_name,
        drift_score,
        drift_type,
        threshold,
        is_drifting
      FROM data_drift_metrics
      WHERE model_name = $1
      ORDER BY timestamp DESC
      LIMIT 100
    `, [modelName]);
  },

  /**
   * Get bias monitoring results
   */
  async getBiasMetrics(modelName: string) {
    return query(`
      SELECT 
        model_name,
        timestamp,
        protected_attribute,
        group_value,
        metric_name,
        metric_value,
        threshold,
        is_biased
      FROM bias_monitoring
      WHERE model_name = $1
      ORDER BY timestamp DESC
      LIMIT 100
    `, [modelName]);
  },

  /**
   * Record new prediction
   */
  async recordPrediction(prediction: {
    model_name: string;
    input_data: unknown;
    prediction: unknown;
    confidence: number;
    patient_id?: string;
    session_id?: string;
  }) {
    return query(`
      INSERT INTO ai_predictions 
      (model_name, input_data, prediction, confidence, patient_id, session_id, timestamp)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING id
    `, [
      prediction.model_name,
      JSON.stringify(prediction.input_data),
      JSON.stringify(prediction.prediction),
      prediction.confidence,
      prediction.patient_id,
      prediction.session_id
    ]);
  }
};

/**
 * IEC 62304 Queries
 */
export const iec62304Queries = {
  /**
   * Get all requirements with filters
   */
  async getRequirements(filters?: {
    safety_class?: string;
    status?: string;
    type?: string;
  }) {
    let whereClause = '';
    const params: unknown[] = [];
    
    if (filters) {
      const conditions = [];
      let paramIndex = 1;
      
      if (filters.safety_class) {
        conditions.push(`safety_class = $${paramIndex++}`);
        params.push(filters.safety_class);
      }
      
      if (filters.status) {
        conditions.push(`status = $${paramIndex++}`);
        params.push(filters.status);
      }
      
      if (filters.type) {
        conditions.push(`type = $${paramIndex++}`);
        params.push(filters.type);
      }
      
      if (conditions.length > 0) {
        whereClause = 'WHERE ' + conditions.join(' AND ');
      }
    }

    return query(`
      SELECT 
        id,
        title,
        description,
        type,
        priority,
        safety_class,
        rationale,
        verification_method,
        status,
        created_at,
        updated_at
      FROM requirements
      ${whereClause}
      ORDER BY safety_class, id
    `, params);
  },

  /**
   * Get design elements
   */
  async getDesignElements() {
    return query(`
      SELECT 
        id,
        name,
        description,
        type,
        safety_class,
        created_at
      FROM design_elements
      ORDER BY safety_class, name
    `);
  },

  /**
   * Get traceability matrix
   */
  async getTraceabilityMatrix() {
    return query(`
      SELECT 
        r.id as requirement_id,
        r.title as requirement_title,
        r.safety_class,
        d.id as design_element_id,
        d.name as design_element_name,
        CASE WHEN rdl.id IS NOT NULL THEN true ELSE false END as is_linked
      FROM requirements r
      CROSS JOIN design_elements d
      LEFT JOIN requirement_design_links rdl ON r.id = rdl.requirement_id AND d.id = rdl.design_element_id
      ORDER BY r.safety_class, r.id, d.name
    `);
  },

  /**
   * Get coverage statistics
   */
  async getCoverageStats() {
    return query(`
      SELECT 
        r.safety_class,
        COUNT(*) as total_requirements,
        COUNT(DISTINCT rdl.requirement_id) as requirements_with_design,
        COUNT(DISTINCT rtl.requirement_id) as requirements_with_tests,
        ROUND(COUNT(DISTINCT rdl.requirement_id)::numeric / COUNT(*)::numeric * 100, 2) as design_coverage_pct,
        ROUND(COUNT(DISTINCT rtl.requirement_id)::numeric / COUNT(*)::numeric * 100, 2) as test_coverage_pct
      FROM requirements r
      LEFT JOIN requirement_design_links rdl ON r.id = rdl.requirement_id
      LEFT JOIN requirement_test_links rtl ON r.id = rtl.requirement_id
      GROUP BY r.safety_class
      ORDER BY r.safety_class
    `);
  }
};

/**
 * SOC 2 Queries
 */
export const soc2Queries = {
  /**
   * Get all controls with status
   */
  async getControls(category?: string) {
    const whereClause = category ? 'WHERE control_category = $1' : '';
    const params = category ? [category] : [];

    return query(`
      SELECT 
        control_id,
        control_name,
        control_category,
        implementation_status,
        test_result,
        last_tested,
        next_test_date,
        updated_at
      FROM soc2_control_status
      ${whereClause}
      ORDER BY control_category, control_id
    `, params);
  },

  /**
   * Get evidence for controls
   */
  async getEvidence(controlId?: string, limit = 100) {
    const whereClause = controlId ? 'WHERE control_id = $1' : '';
    const params = controlId ? [controlId] : [];

    return query(`
      SELECT 
        id,
        control_id,
        evidence_type,
        description,
        file_path,
        collection_date,
        collected_by,
        retention_date
      FROM soc2_evidence
      ${whereClause}
      ORDER BY collection_date DESC
      LIMIT $${params.length + 1}
    `, [...params, limit]);
  },

  /**
   * Record new evidence
   */
  async recordEvidence(evidence: {
    control_id: string;
    evidence_type: string;
    description: string;
    file_path?: string;
    collected_by: string;
  }) {
    return query(`
      INSERT INTO soc2_evidence 
      (control_id, evidence_type, description, file_path, collected_by, collection_date, retention_date)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW() + INTERVAL '7 years')
      RETURNING id
    `, [
      evidence.control_id,
      evidence.evidence_type,
      evidence.description,
      evidence.file_path,
      evidence.collected_by
    ]);
  },

  /**
   * Get control statistics by category
   */
  async getControlStatistics() {
    return query(`
      SELECT 
        control_category,
        COUNT(*) as total_controls,
        COUNT(*) FILTER (WHERE implementation_status = 'implemented') as implemented,
        COUNT(*) FILTER (WHERE implementation_status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE implementation_status = 'not_started') as not_started,
        ROUND(COUNT(*) FILTER (WHERE implementation_status = 'implemented')::numeric / COUNT(*)::numeric * 100, 2) as implementation_pct
      FROM soc2_control_status
      GROUP BY control_category
      ORDER BY control_category
    `);
  }
};

/**
 * System Health Queries
 */
export const systemHealthQueries = {
  /**
   * Get database connection info
   */
  async getConnectionInfo() {
    return query(`
      SELECT 
        count(*) as total_connections,
        count(*) FILTER (WHERE state = 'active') as active_connections,
        count(*) FILTER (WHERE state = 'idle') as idle_connections
      FROM pg_stat_activity
      WHERE datname = current_database()
    `);
  },

  /**
   * Get database size
   */
  async getDatabaseSize() {
    return query(`
      SELECT 
        pg_size_pretty(pg_database_size(current_database())) as size,
        pg_database_size(current_database()) as size_bytes
    `);
  },

  /**
   * Get table sizes
   */
  async getTableSizes() {
    return query(`
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
        pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      LIMIT 20
    `);
  }
};

/**
 * Health check function
 */
export async function healthCheck(): Promise<{
  status: 'healthy' | 'unhealthy';
  details: {
    connection: boolean;
    query: boolean;
    timestamp: string;
  };
}> {
  try {
    // Test connection
    const client = await pool.connect();
    client.release();

    // Test query
    await query('SELECT 1');

    return {
      status: 'healthy',
      details: {
        connection: true,
        query: true,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('Database health check failed:', error);
    return {
      status: 'unhealthy',
      details: {
        connection: false,
        query: false,
        timestamp: new Date().toISOString()
      }
    };
  }
}

// Export the pool for advanced usage
export { pool };

// Default export
export default {
  query,
  transaction,
  getClient,
  end,
  healthCheck,
  fdaApmQueries,
  iec62304Queries,
  soc2Queries,
  systemHealthQueries
};