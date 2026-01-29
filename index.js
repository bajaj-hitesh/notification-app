const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 8080;

// Slack webhook URL - should be set as environment variable
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

// Function to send Slack notification
async function sendSlackNotification(message, channel = '#mobile-badge-provisioning-alerts') {
  try {
    const payload = {
      channel: channel,
      username: 'webhookbot',
      text: message,
      icon_emoji: ':ghost:'
    };

    console.log('Sending Slack notification:', JSON.stringify(payload, null, 2));
    
    const response = await axios.post(SLACK_WEBHOOK_URL, payload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('Slack notification sent successfully:', response.status);
    return { success: true, status: response.status };
  } catch (error) {
    console.error('Failed to send Slack notification:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return { success: false, error: error.message };
  }
}

// Middleware to parse JSON bodies
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Main endpoint - Returns Hello World JSON response
app.get('/', (req, res) => {
  const response = {
    message: 'Hello World from Knative!',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'production'
  };
  
  console.log('Sending response:', JSON.stringify(response));
  res.json(response);
});

// POST endpoint - Accepts and logs request body, sends Slack notification
app.post('/', async (req, res) => {
  console.log('=== POST Request Received ===');
  console.log('Request Body:', JSON.stringify(req.body, null, 2));
  console.log('Content-Type:', req.get('Content-Type'));
  console.log('============================');
  
  // Prepare Slack message from request body
  const slackMessage = req.body.message ||
    `New POST request received:\n${JSON.stringify(req.body, null, 2)}`;
  
  const slackChannel = req.body.channel || '#mobile-badge-provisioning-alerts';
  
  // Send Slack notification
  const slackResult = await sendSlackNotification(slackMessage, slackChannel);
  
  const response = {
    message: 'POST request received successfully',
    timestamp: new Date().toISOString(),
    receivedData: req.body,
    dataSize: JSON.stringify(req.body).length,
    slackNotification: slackResult
  };
  
  res.status(200).json(response);
});

// Health check endpoint for Kubernetes probes
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Readiness probe endpoint
app.get('/ready', (req, res) => {
  res.status(200).json({ 
    status: 'ready',
    timestamp: new Date().toISOString()
  });
});

// Catch-all for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    availableEndpoints: ['/', '/health', '/ready']
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server is running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`🚀 Ready to accept requests`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

// Made with Bob
