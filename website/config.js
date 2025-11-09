/**
 * V-Kare Frontend Configuration
 *
 * Update ORCHESTRATOR_URL with your AWS backend endpoint
 */

// Backend API Configuration
// For local development: use 'http://localhost:8000' or your local backend URL
// For AWS deployment: use your AWS orchestrator endpoint (e.g., 'https://your-domain.com/api')
window.ORCHESTRATOR_URL = '/api';

// You can also set it directly to your AWS endpoint:
// window.ORCHESTRATOR_URL = 'https://your-aws-endpoint.com';

/**
 * Configuration Notes:
 *
 * 1. If deploying to AWS and your backend is on a different domain:
 *    - Set ORCHESTRATOR_URL to the full URL of your orchestrator service
 *    - Make sure CORS is properly configured on your backend
 *
 * 2. If using a reverse proxy (recommended):
 *    - Keep it as '/api' and configure your web server to proxy /api to the backend
 *
 * 3. For testing locally:
 *    - Update to 'http://localhost:8000' (or your local backend port)
 */
