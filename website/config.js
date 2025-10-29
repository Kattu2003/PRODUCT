// API Configuration
// For local development, keep these empty to use relative paths through nginx
// For AWS production, update these with your Application Load Balancer DNS names
window.API_CONFIG = {
    // Leave empty for local development (uses nginx proxy)
    // For AWS: Update with ALB DNS after deployment, e.g., 'http://vkare-alb-xxxxxxxxx.us-east-1.elb.amazonaws.com'
    BACKEND_URL: '',
    ORCHESTRATOR_URL: ''
};
