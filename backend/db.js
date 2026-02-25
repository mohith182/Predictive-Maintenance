/**
 * Database Configuration
 * 
 * This module creates and exports a SQLite database connection.
 * SQLite is file-based and requires no server installation.
 */

const Database = require('better-sqlite3');
const path = require('path');

// Database file path
const DB_PATH = path.join(__dirname, 'machine_health.db');

// Create database connection
const db = new Database(DB_PATH);

// Enable foreign keys
db.pragma('foreign_keys = ON');

console.log('✅ Connected to SQLite database:', DB_PATH);

// Create a wrapper to match PostgreSQL pool interface
const pool = {
  query: (sql, params = []) => {
    // Handle parameterized queries (convert $1, $2 to ?)
    let query = sql.replace(/\$(\d+)/g, '?');
    
    // Check if it's a SELECT query
    const isSelect = query.trim().toUpperCase().startsWith('SELECT');
    const isReturning = query.toUpperCase().includes('RETURNING');
    
    try {
      if (isSelect) {
        const rows = db.prepare(query).all(...params);
        return Promise.resolve({ rows });
      } else if (isReturning) {
        // Handle INSERT/UPDATE with RETURNING
        const returningMatch = query.match(/RETURNING\s+(.+)$/i);
        const baseQuery = query.replace(/\s+RETURNING\s+.+$/i, '');
        
        const stmt = db.prepare(baseQuery);
        const info = stmt.run(...params);
        
        // If RETURNING *, fetch the inserted row
        if (returningMatch) {
          const tableName = baseQuery.match(/(?:INSERT INTO|UPDATE)\s+(\w+)/i)?.[1];
          if (tableName && info.lastInsertRowid) {
            const row = db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`).get(info.lastInsertRowid);
            return Promise.resolve({ rows: row ? [row] : [] });
          }
        }
        return Promise.resolve({ rows: [], changes: info.changes });
      } else {
        const stmt = db.prepare(query);
        const info = stmt.run(...params);
        return Promise.resolve({ rows: [], changes: info.changes, lastInsertRowid: info.lastInsertRowid });
      }
    } catch (err) {
      return Promise.reject(err);
    }
  },
  
  end: () => {
    db.close();
    return Promise.resolve();
  }
};

// Initialize tables
function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS machine_readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      temperature REAL NOT NULL,
      vibration REAL NOT NULL,
      current REAL NOT NULL,
      rul REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reading_id INTEGER REFERENCES machine_readings(id) ON DELETE CASCADE,
      predicted_rul REAL,
      health_status TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create indexes
  db.exec(`CREATE INDEX IF NOT EXISTS idx_readings_created_at ON machine_readings(created_at DESC)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_predictions_reading_id ON predictions(reading_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_predictions_health_status ON predictions(health_status)`);
  
  console.log('✅ Database tables initialized');
}

initTables();

module.exports = pool;
module.exports.db = db;  // Export raw db for advanced operations
