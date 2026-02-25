/**
 * Data Loader Script
 * 
 * Loads NASA Turbofan Engine Dataset (FD002) into PostgreSQL database.
 * Maps sensor readings to machine_readings and predictions tables.
 */

const fs = require('fs');
const path = require('path');
const pool = require('./db');

// File paths - update these to match your dataset location
const DATA_DIR = 'c:/Users/mohith/Downloads/archive';
const TEST_FILE = path.join(DATA_DIR, 'test_FD002.txt');
const RUL_FILE = path.join(DATA_DIR, 'RUL_FD002.txt');
const TRAIN_FILE = path.join(DATA_DIR, 'train_FD002.txt');

/**
 * Parse a space-separated data file
 */
function parseDataFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  
  return lines.map(line => {
    const values = line.trim().split(/\s+/).map(v => parseFloat(v));
    return values;
  });
}

/**
 * Parse RUL file (one value per line)
 */
function parseRulFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  return lines.map(line => parseFloat(line.trim()));
}

/**
 * Map NASA dataset columns to our schema
 * 
 * NASA FD002 columns:
 * 0: engine_id
 * 1: cycle
 * 2: setting1 (altitude)
 * 3: setting2 (Mach number)
 * 4: setting3 (throttle resolver angle)
 * 5-25: sensor1-21
 * 
 * Sensor mappings (approximate):
 * - sensor2 (col 6): T2 - Total temperature at fan inlet → temperature
 * - sensor7 (col 11): T30 - Total temperature at HPC outlet 
 * - sensor11 (col 15): Ps30 - Static pressure at HPC outlet
 * - sensor15 (col 19): BPR - Bypass Ratio → vibration proxy
 * - sensor9 (col 13): phi - Physical fan speed → current proxy
 */
function mapSensorData(row) {
  const engineId = row[0];
  const cycle = row[1];
  
  // Map sensors to our schema
  // Using sensor averages and scaled values for realistic ranges
  const temperature = row[6] || 45;  // sensor2 - scaled down for realistic temp
  const vibration = (row[19] || 8.5) * 0.5;  // sensor15 BPR - scaled
  const current = row[13] || 12;  // sensor9 - physical fan speed as current proxy
  
  // Additional sensors for health calculation
  const sensor11 = row[15] || 0;  // Ps30 static pressure
  const sensor7 = row[11] || 0;   // T30 temperature
  
  return {
    engineId,
    cycle,
    temperature: Math.round(temperature * 10) / 10,
    vibration: Math.round(vibration * 100) / 100,
    current: Math.round(current * 10) / 10,
    sensor7,
    sensor11
  };
}

/**
 * Calculate health status based on RUL
 */
function getHealthStatus(rul) {
  if (rul > 80) return 'HEALTHY';
  if (rul > 40) return 'WARNING';
  return 'CRITICAL';
}

/**
 * Clear existing data
 */
async function clearTables() {
  console.log('🗑️  Clearing existing data...');
  await pool.query('DELETE FROM predictions');
  await pool.query('DELETE FROM machine_readings');
  console.log('✅ Tables cleared');
}

/**
 * Load test data with RUL values (optimized with batch inserts)
 */
async function loadTestData() {
  console.log('\n📊 Loading test data (FD002)...');
  
  const testData = parseDataFile(TEST_FILE);
  const rulValues = parseRulFile(RUL_FILE);
  
  console.log(`   Found ${testData.length} test readings`);
  console.log(`   Found ${rulValues.length} RUL values`);
  
  // Group by engine to get last cycle for each engine
  const engineLastCycles = {};
  testData.forEach(row => {
    const engineId = row[0];
    const cycle = row[1];
    if (!engineLastCycles[engineId] || cycle > engineLastCycles[engineId]) {
      engineLastCycles[engineId] = cycle;
    }
  });
  
  // Prepare all data first
  const readings = [];
  const predictions = [];
  
  testData.forEach(row => {
    const mapped = mapSensorData(row);
    const engineId = mapped.engineId;
    const currentCycle = mapped.cycle;
    const maxCycle = engineLastCycles[engineId];
    
    // Calculate RUL for this specific reading
    const baseRul = rulValues[engineId - 1] || 100;
    const cyclesRemaining = maxCycle - currentCycle;
    const rul = baseRul + cyclesRemaining;
    
    readings.push([mapped.temperature, mapped.vibration, mapped.current, rul]);
    
    // Add prediction for every 10th reading
    if (currentCycle % 10 === 0 || currentCycle === maxCycle) {
      predictions.push({ rul, status: getHealthStatus(rul), readingIndex: readings.length });
    }
  });
  
  console.log(`   Inserting ${readings.length} readings...`);
  
  // Access the raw database for batch operations
  const Database = require('better-sqlite3');
  const path = require('path');
  const db = new Database(path.join(__dirname, 'machine_health.db'));
  
  // Use transaction for speed
  const insertReading = db.prepare(
    'INSERT INTO machine_readings (temperature, vibration, current, rul) VALUES (?, ?, ?, ?)'
  );
  const insertPrediction = db.prepare(
    'INSERT INTO predictions (reading_id, predicted_rul, health_status) VALUES (?, ?, ?)'
  );
  
  // Batch insert readings in transaction
  const insertReadings = db.transaction((items) => {
    const ids = [];
    for (const item of items) {
      const info = insertReading.run(...item);
      ids.push(info.lastInsertRowid);
    }
    return ids;
  });
  
  const readingIds = insertReadings(readings);
  console.log(`   ✅ Inserted ${readingIds.length} readings`);
  
  // Batch insert predictions
  const insertPredictions = db.transaction((items) => {
    for (const pred of items) {
      insertPrediction.run(readingIds[pred.readingIndex - 1], pred.rul, pred.status);
    }
  });
  
  insertPredictions(predictions);
  console.log(`   ✅ Inserted ${predictions.length} predictions`);
  
  db.close();
}

/**
 * Load training data (sample) - optimized
 */
async function loadTrainData(sampleSize = 500) {
  console.log(`\n📊 Loading training data sample (${sampleSize} rows)...`);
  
  if (!fs.existsSync(TRAIN_FILE)) {
    console.log('   ⚠️  Training file not found, skipping...');
    return;
  }
  
  const trainData = parseDataFile(TRAIN_FILE);
  console.log(`   Found ${trainData.length} training readings`);
  
  // Sample evenly from the data
  const step = Math.max(1, Math.floor(trainData.length / sampleSize));
  const readings = [];
  
  for (let i = 0; i < trainData.length && readings.length < sampleSize; i += step) {
    const row = trainData[i];
    const mapped = mapSensorData(row);
    
    // For training data, calculate RUL based on max cycle - current cycle
    const engineId = mapped.engineId;
    let maxCycle = mapped.cycle;
    for (let j = i; j < trainData.length; j++) {
      if (trainData[j][0] === engineId) {
        maxCycle = Math.max(maxCycle, trainData[j][1]);
      } else {
        break;
      }
    }
    
    const rul = Math.min(125, maxCycle - mapped.cycle);
    readings.push([mapped.temperature, mapped.vibration, mapped.current, rul]);
  }
  
  // Batch insert
  const Database = require('better-sqlite3');
  const path = require('path');
  const db = new Database(path.join(__dirname, 'machine_health.db'));
  
  const insertReading = db.prepare(
    'INSERT INTO machine_readings (temperature, vibration, current, rul) VALUES (?, ?, ?, ?)'
  );
  
  const insertAll = db.transaction((items) => {
    for (const item of items) {
      insertReading.run(...item);
    }
  });
  
  insertAll(readings);
  console.log(`   ✅ Loaded ${readings.length} training samples`);
  
  db.close();
}

/**
 * Display summary statistics
 */
async function displayStats() {
  console.log('\n📈 Database Statistics:');
  
  const readingsCount = await pool.query('SELECT COUNT(*) FROM machine_readings');
  const predictionsCount = await pool.query('SELECT COUNT(*) FROM predictions');
  
  const healthStats = await pool.query(`
    SELECT health_status, COUNT(*) as count 
    FROM predictions 
    GROUP BY health_status 
    ORDER BY health_status
  `);
  
  const avgReadings = await pool.query(`
    SELECT 
      ROUND(AVG(temperature), 2) as avg_temp,
      ROUND(AVG(vibration), 2) as avg_vib,
      ROUND(AVG(current), 2) as avg_current,
      ROUND(AVG(rul), 2) as avg_rul
    FROM machine_readings
  `);
  
  console.log(`   Total Readings: ${readingsCount.rows[0].count}`);
  console.log(`   Total Predictions: ${predictionsCount.rows[0].count}`);
  console.log('\n   Health Distribution:');
  healthStats.rows.forEach(row => {
    console.log(`     ${row.health_status}: ${row.count}`);
  });
  console.log('\n   Average Values:');
  const avg = avgReadings.rows[0];
  console.log(`     Temperature: ${avg.avg_temp}°C`);
  console.log(`     Vibration: ${avg.avg_vib} mm/s`);
  console.log(`     Current: ${avg.avg_current} A`);
  console.log(`     RUL: ${avg.avg_rul} cycles`);
}

/**
 * Main function
 */
async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('   NASA FD002 Dataset Loader');
  console.log('═══════════════════════════════════════════════════');
  
  try {
    // Check if files exist
    if (!fs.existsSync(TEST_FILE)) {
      throw new Error(`Test file not found: ${TEST_FILE}`);
    }
    if (!fs.existsSync(RUL_FILE)) {
      throw new Error(`RUL file not found: ${RUL_FILE}`);
    }
    
    await clearTables();
    await loadTestData();
    await loadTrainData(500);
    await displayStats();
    
    console.log('\n═══════════════════════════════════════════════════');
    console.log('   ✅ Data loading complete!');
    console.log('═══════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the loader
main();
