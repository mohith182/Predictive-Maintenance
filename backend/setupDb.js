/**
 * Database Setup Script
 * 
 * Creates the database and tables for the Machine Health Prediction System.
 * Run this script before loading data.
 */

const { Pool } = require('pg');
require('dotenv').config();

// Connect without database to create it
const adminPool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: 'postgres',  // Connect to default postgres database
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function setupDatabase() {
  console.log('═══════════════════════════════════════════════════');
  console.log('   Database Setup Script');
  console.log('═══════════════════════════════════════════════════\n');
  
  const dbName = process.env.DB_NAME || 'machine_health_db';
  
  try {
    // Check if database exists
    const dbCheck = await adminPool.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName]
    );
    
    if (dbCheck.rows.length === 0) {
      console.log(`📦 Creating database: ${dbName}...`);
      await adminPool.query(`CREATE DATABASE ${dbName}`);
      console.log('✅ Database created successfully');
    } else {
      console.log(`📦 Database '${dbName}' already exists`);
    }
    
    await adminPool.end();
    
    // Now connect to the new database to create tables
    const pool = new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: dbName,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
    });
    
    console.log('\n📋 Creating tables...');
    
    // Drop existing tables
    await pool.query('DROP TABLE IF EXISTS predictions CASCADE');
    await pool.query('DROP TABLE IF EXISTS machine_readings CASCADE');
    
    // Create machine_readings table
    await pool.query(`
      CREATE TABLE machine_readings (
        id SERIAL PRIMARY KEY,
        temperature FLOAT NOT NULL,
        vibration FLOAT NOT NULL,
        current FLOAT NOT NULL,
        rul FLOAT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ Created table: machine_readings');
    
    // Create predictions table
    await pool.query(`
      CREATE TABLE predictions (
        id SERIAL PRIMARY KEY,
        reading_id INT REFERENCES machine_readings(id) ON DELETE CASCADE,
        predicted_rul FLOAT,
        health_status VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ Created table: predictions');
    
    // Create indexes
    await pool.query('CREATE INDEX idx_readings_created_at ON machine_readings(created_at DESC)');
    await pool.query('CREATE INDEX idx_predictions_reading_id ON predictions(reading_id)');
    await pool.query('CREATE INDEX idx_predictions_created_at ON predictions(created_at DESC)');
    await pool.query('CREATE INDEX idx_predictions_health_status ON predictions(health_status)');
    console.log('   ✅ Created indexes');
    
    await pool.end();
    
    console.log('\n═══════════════════════════════════════════════════');
    console.log('   ✅ Database setup complete!');
    console.log('   Run: npm run load-data');
    console.log('═══════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    if (error.message.includes('authentication failed')) {
      console.error('\n💡 Check your DB_PASSWORD in .env file');
    } else if (error.message.includes('Connection refused')) {
      console.error('\n💡 Make sure PostgreSQL is running');
    }
    
    process.exit(1);
  }
}

setupDatabase();
