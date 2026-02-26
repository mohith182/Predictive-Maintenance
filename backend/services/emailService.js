/**
 * Email Service
 * 
 * Handles sending email notifications for machine health alerts
 * Supports WARNING and CRITICAL status notifications
 * 
 * @author Maintenix AI Team
 */

const nodemailer = require('nodemailer');

// Create transporter for sending emails
const createTransporter = () => {
  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

/**
 * Get email styles (shared across all templates)
 */
const getEmailStyles = () => `
  <style>
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      background-color: #0a0a0f; 
      color: #ffffff; 
      margin: 0;
      padding: 0;
    }
    .container { 
      max-width: 600px; 
      margin: 0 auto; 
      padding: 20px; 
    }
    .header { 
      padding: 25px; 
      border-radius: 12px 12px 0 0; 
      text-align: center; 
    }
    .header-critical { 
      background: linear-gradient(135deg, #dc2626, #991b1b); 
    }
    .header-warning { 
      background: linear-gradient(135deg, #f59e0b, #d97706); 
    }
    .header h1 { 
      margin: 0; 
      color: white; 
      font-size: 24px; 
    }
    .content { 
      background-color: #1a1a2e; 
      padding: 30px; 
      border-radius: 0 0 12px 12px; 
    }
    .alert-box { 
      padding: 15px; 
      margin: 20px 0; 
      border-radius: 0 8px 8px 0; 
    }
    .alert-critical { 
      background-color: #2d1f1f; 
      border-left: 4px solid #dc2626; 
    }
    .alert-warning { 
      background-color: #2d2a1f; 
      border-left: 4px solid #f59e0b; 
    }
    .metrics-container { 
      text-align: center; 
      margin: 30px 0; 
    }
    .metric { 
      display: inline-block; 
      background-color: #0f0f1a; 
      padding: 15px 20px; 
      border-radius: 8px; 
      margin: 5px; 
      text-align: center; 
      min-width: 100px; 
    }
    .metric-value { 
      font-size: 28px; 
      font-weight: bold; 
    }
    .metric-label { 
      font-size: 11px; 
      color: #888; 
      text-transform: uppercase; 
      margin-top: 5px;
    }
    .critical { color: #dc2626; }
    .warning { color: #f59e0b; }
    .healthy { color: #00ff88; }
    .info-box {
      background-color: #0f0f1a;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .footer { 
      text-align: center; 
      padding: 20px; 
      color: #666; 
      font-size: 12px; 
    }
    .button { 
      display: inline-block; 
      background: linear-gradient(135deg, #00ff88, #00ccff); 
      color: #000; 
      padding: 14px 35px; 
      border-radius: 8px; 
      text-decoration: none; 
      font-weight: bold; 
      margin-top: 20px; 
    }
    .sensor-table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    .sensor-table td {
      padding: 10px;
      border-bottom: 1px solid #333;
    }
    .sensor-table td:first-child {
      color: #888;
    }
    .sensor-table td:last-child {
      text-align: right;
      font-weight: bold;
      color: #00ff88;
    }
  </style>
`;

/**
 * Send CRITICAL alert email
 * @param {string} toEmail - Recipient email address
 * @param {object} data - Machine and prediction data
 */
const sendCriticalAlert = async (toEmail, data) => {
  const transporter = createTransporter();
  
  const { 
    machine_id, 
    temperature, 
    vibration, 
    current, 
    predicted_rul, 
    health_percentage,
    confidence 
  } = data;
  
  const mailOptions = {
    from: `"Maintenix AI Alert System" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `🚨 CRITICAL ALERT: Machine ${machine_id} - Immediate Action Required`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        ${getEmailStyles()}
      </head>
      <body>
        <div class="container">
          <div class="header header-critical">
            <h1>🚨 CRITICAL MACHINE ALERT</h1>
          </div>
          <div class="content">
            <h2 style="color: #00ff88; margin-top: 0;">Machine ID: ${machine_id}</h2>
            <p style="color: #888;">Health Status: <span class="critical" style="font-weight: bold;">CRITICAL</span></p>
            
            <div class="alert-box alert-critical">
              <strong style="color: #dc2626;">⚠️ IMMEDIATE ATTENTION REQUIRED</strong>
              <p style="margin: 10px 0 0 0;">This machine is in critical condition and requires immediate maintenance intervention.</p>
            </div>
            
            <div class="metrics-container">
              <div class="metric">
                <div class="metric-value critical">${health_percentage || Math.round((predicted_rul / 125) * 100)}%</div>
                <div class="metric-label">Health Score</div>
              </div>
              <div class="metric">
                <div class="metric-value warning">${Math.round(predicted_rul / 4)} days</div>
                <div class="metric-label">Remaining Life</div>
              </div>
              <div class="metric">
                <div class="metric-value healthy">${Math.round((confidence || 0.9) * 100)}%</div>
                <div class="metric-label">Confidence</div>
              </div>
            </div>
            
            <div class="info-box">
              <strong style="color: #f59e0b;">📊 Current Sensor Readings:</strong>
              <table class="sensor-table">
                <tr>
                  <td>Temperature</td>
                  <td>${temperature}°C</td>
                </tr>
                <tr>
                  <td>Vibration</td>
                  <td>${vibration} mm/s</td>
                </tr>
                <tr>
                  <td>Electrical Current</td>
                  <td>${current} A</td>
                </tr>
                <tr>
                  <td>Predicted RUL</td>
                  <td>${predicted_rul} cycles</td>
                </tr>
              </table>
            </div>
            
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:8080'}/dashboard" class="button">
                View Dashboard →
              </a>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #333;">
              <p style="color: #dc2626; font-weight: bold;">⚡ Recommended Immediate Actions:</p>
              <ul style="color: #ccc; line-height: 1.8;">
                <li>Stop machine operations if safe to do so</li>
                <li>Deploy maintenance team immediately</li>
                <li>Inspect for visible damage or abnormalities</li>
                <li>Review recent operational logs</li>
                <li>Prepare replacement parts if necessary</li>
              </ul>
            </div>
          </div>
          <div class="footer">
            <p>This is an automated alert from <strong>Maintenix AI</strong> Predictive Maintenance System</p>
            <p>Alert generated at: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</p>
            <p style="color: #444;">Machine ID: ${machine_id} | Status: CRITICAL</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
🚨 CRITICAL MACHINE ALERT

Machine ID: ${machine_id}
Health Status: CRITICAL

⚠️ IMMEDIATE ATTENTION REQUIRED
This machine is in critical condition and requires immediate maintenance intervention.

Current Sensor Readings:
- Temperature: ${temperature}°C
- Vibration: ${vibration} mm/s
- Electrical Current: ${current} A
- Predicted RUL: ${predicted_rul} cycles
- Days Remaining: ${Math.round(predicted_rul / 4)} days
- Health Score: ${health_percentage || Math.round((predicted_rul / 125) * 100)}%

Recommended Immediate Actions:
1. Stop machine operations if safe to do so
2. Deploy maintenance team immediately
3. Inspect for visible damage or abnormalities
4. Review recent operational logs
5. Prepare replacement parts if necessary

View Dashboard: ${process.env.FRONTEND_URL || 'http://localhost:8080'}/dashboard

---
Maintenix AI Predictive Maintenance System
Alert generated at: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] CRITICAL alert sent to ${toEmail} for machine ${machine_id}: ${info.messageId}`);
    return { success: true, messageId: info.messageId, type: 'CRITICAL' };
  } catch (error) {
    console.error(`[EMAIL] Failed to send CRITICAL alert to ${toEmail}:`, error.message);
    return { success: false, error: error.message, type: 'CRITICAL' };
  }
};

/**
 * Send WARNING alert email
 * @param {string} toEmail - Recipient email address
 * @param {object} data - Machine and prediction data
 */
const sendWarningAlert = async (toEmail, data) => {
  const transporter = createTransporter();
  
  const { 
    machine_id, 
    temperature, 
    vibration, 
    current, 
    predicted_rul, 
    health_percentage,
    confidence 
  } = data;
  
  const mailOptions = {
    from: `"Maintenix AI Alert System" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `⚠️ WARNING: Machine ${machine_id} - Maintenance Recommended`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        ${getEmailStyles()}
      </head>
      <body>
        <div class="container">
          <div class="header header-warning">
            <h1>⚠️ MACHINE WARNING ALERT</h1>
          </div>
          <div class="content">
            <h2 style="color: #00ff88; margin-top: 0;">Machine ID: ${machine_id}</h2>
            <p style="color: #888;">Health Status: <span class="warning" style="font-weight: bold;">WARNING</span></p>
            
            <div class="alert-box alert-warning">
              <strong style="color: #f59e0b;">⚠️ MAINTENANCE RECOMMENDED</strong>
              <p style="margin: 10px 0 0 0;">This machine shows signs of degradation. Schedule maintenance to prevent unplanned downtime.</p>
            </div>
            
            <div class="metrics-container">
              <div class="metric">
                <div class="metric-value warning">${health_percentage || Math.round((predicted_rul / 125) * 100)}%</div>
                <div class="metric-label">Health Score</div>
              </div>
              <div class="metric">
                <div class="metric-value warning">${Math.round(predicted_rul / 4)} days</div>
                <div class="metric-label">Remaining Life</div>
              </div>
              <div class="metric">
                <div class="metric-value healthy">${Math.round((confidence || 0.9) * 100)}%</div>
                <div class="metric-label">Confidence</div>
              </div>
            </div>
            
            <div class="info-box">
              <strong style="color: #f59e0b;">📊 Current Sensor Readings:</strong>
              <table class="sensor-table">
                <tr>
                  <td>Temperature</td>
                  <td>${temperature}°C</td>
                </tr>
                <tr>
                  <td>Vibration</td>
                  <td>${vibration} mm/s</td>
                </tr>
                <tr>
                  <td>Electrical Current</td>
                  <td>${current} A</td>
                </tr>
                <tr>
                  <td>Predicted RUL</td>
                  <td>${predicted_rul} cycles</td>
                </tr>
              </table>
            </div>
            
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:8080'}/dashboard" class="button">
                View Dashboard →
              </a>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #333;">
              <p style="color: #f59e0b; font-weight: bold;">📋 Recommended Actions:</p>
              <ul style="color: #ccc; line-height: 1.8;">
                <li>Schedule preventive maintenance within the next 7 days</li>
                <li>Monitor sensor readings closely</li>
                <li>Prepare maintenance team and spare parts</li>
                <li>Review machine operational parameters</li>
                <li>Consider reducing operational load</li>
              </ul>
            </div>
          </div>
          <div class="footer">
            <p>This is an automated alert from <strong>Maintenix AI</strong> Predictive Maintenance System</p>
            <p>Alert generated at: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</p>
            <p style="color: #444;">Machine ID: ${machine_id} | Status: WARNING</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
⚠️ MACHINE WARNING ALERT

Machine ID: ${machine_id}
Health Status: WARNING

⚠️ MAINTENANCE RECOMMENDED
This machine shows signs of degradation. Schedule maintenance to prevent unplanned downtime.

Current Sensor Readings:
- Temperature: ${temperature}°C
- Vibration: ${vibration} mm/s
- Electrical Current: ${current} A
- Predicted RUL: ${predicted_rul} cycles
- Days Remaining: ${Math.round(predicted_rul / 4)} days
- Health Score: ${health_percentage || Math.round((predicted_rul / 125) * 100)}%

Recommended Actions:
1. Schedule preventive maintenance within the next 7 days
2. Monitor sensor readings closely
3. Prepare maintenance team and spare parts
4. Review machine operational parameters
5. Consider reducing operational load

View Dashboard: ${process.env.FRONTEND_URL || 'http://localhost:8080'}/dashboard

---
Maintenix AI Predictive Maintenance System
Alert generated at: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] WARNING alert sent to ${toEmail} for machine ${machine_id}: ${info.messageId}`);
    return { success: true, messageId: info.messageId, type: 'WARNING' };
  } catch (error) {
    console.error(`[EMAIL] Failed to send WARNING alert to ${toEmail}:`, error.message);
    return { success: false, error: error.message, type: 'WARNING' };
  }
};

/**
 * Send alert based on health status
 * Automatically determines whether to send WARNING or CRITICAL email
 * Does NOT send email if status is NORMAL/HEALTHY
 * 
 * @param {string} toEmail - Recipient email address
 * @param {object} data - Machine and prediction data with health_status
 * @returns {object} Result of email send operation
 */
const sendHealthAlert = async (toEmail, data) => {
  const { health_status } = data;
  
  // Do not send email for NORMAL/HEALTHY status
  if (!health_status || health_status === 'NORMAL' || health_status === 'HEALTHY') {
    console.log(`[EMAIL] No alert sent - machine status is ${health_status || 'NORMAL'}`);
    return { success: true, skipped: true, reason: 'Status is NORMAL/HEALTHY' };
  }
  
  // Send appropriate alert based on status
  if (health_status === 'CRITICAL') {
    return await sendCriticalAlert(toEmail, data);
  } else if (health_status === 'WARNING') {
    return await sendWarningAlert(toEmail, data);
  }
  
  // Unknown status
  console.log(`[EMAIL] Unknown health status: ${health_status}`);
  return { success: false, error: `Unknown health status: ${health_status}` };
};

/**
 * Send test email to verify configuration
 * @param {string} toEmail - Recipient email address
 */
const sendTestEmail = async (toEmail) => {
  const transporter = createTransporter();
  
  const mailOptions = {
    from: `"Maintenix AI Alert System" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: '✅ Maintenix AI Email Alerts Configured Successfully',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        ${getEmailStyles()}
      </head>
      <body>
        <div class="container">
          <div class="header" style="background: linear-gradient(135deg, #00ff88, #00ccff);">
            <h1 style="color: #000;">✅ Email Alerts Activated</h1>
          </div>
          <div class="content">
            <h2 style="color: #00ff88; margin-top: 0;">Configuration Successful!</h2>
            <p style="color: #ccc;">Your email has been successfully registered for Maintenix AI machine alerts.</p>
            
            <div class="info-box">
              <p style="margin: 0; color: #ccc;">You will receive notifications when machines reach:</p>
              <ul style="color: #ccc; margin-top: 10px;">
                <li><span class="warning">⚠️ WARNING</span> - Maintenance recommended</li>
                <li><span class="critical">🚨 CRITICAL</span> - Immediate action required</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:8080'}/dashboard" class="button">
                Go to Dashboard →
              </a>
            </div>
          </div>
          <div class="footer">
            <p>Maintenix AI Predictive Maintenance System</p>
            <p>Test email sent at: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
✅ Email Alerts Activated

Your email has been successfully registered for Maintenix AI machine alerts.

You will receive notifications when machines reach:
- WARNING - Maintenance recommended
- CRITICAL - Immediate action required

Go to Dashboard: ${process.env.FRONTEND_URL || 'http://localhost:8080'}/dashboard

---
Maintenix AI Predictive Maintenance System
Test email sent at: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] Test email sent to ${toEmail}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[EMAIL] Failed to send test email to ${toEmail}:`, error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendCriticalAlert,
  sendWarningAlert,
  sendHealthAlert,
  sendTestEmail,
};
