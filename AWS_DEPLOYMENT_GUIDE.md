# AWS Deployment Guide for Vkare AI Therapy Platform

## Overview
This guide will walk you through deploying your Vkare application on AWS using **EC2 with Docker Compose**. This is the simplest approach with minimal code changes, leveraging your existing containerized architecture.

**Domain:** v-kare.co.in
**Architecture:** 6 Docker containers running on a single EC2 instance behind Application Load Balancer

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Changes Made to Codebase](#changes-made-to-codebase)
4. [Step-by-Step Deployment](#step-by-step-deployment)
5. [Post-Deployment Configuration](#post-deployment-configuration)
6. [Cost Estimate](#cost-estimate)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, ensure you have:
- ✅ AWS Account with billing enabled
- ✅ Domain name: **v-kare.co.in** (already purchased)
- ✅ Azure OpenAI API keys (GPT-5 & Whisper)
- ✅ Maya Research TTS API key
- ✅ Basic familiarity with AWS Console
- ✅ SSH client installed on your computer

---

## Architecture Overview

```
Internet
    │
    ▼
Route 53 (DNS)
    │
    ▼
Application Load Balancer (HTTPS/HTTP)
    │
    ├──► Target Group (Port 80) ──► EC2 Instance
    │                                   │
    │                                   ├─ Nginx (Port 80)
    │                                   ├─ Orchestrator (Port 8000)
    │                                   ├─ STT Service (Port 8001)
    │                                   ├─ LLM Service (Port 8002)
    │                                   ├─ TTS Service (Port 8003)
    │                                   ├─ Backend (Port 9000)
    │                                   └─ SQLite Database
```

**Services:**
1. **EC2 Instance**: Hosts all Docker containers
2. **Application Load Balancer**: Handles SSL/TLS and routes traffic
3. **Route 53**: DNS management for v-kare.co.in
4. **VPC**: Default VPC with security groups
5. **ACM Certificate**: Free SSL certificate for HTTPS

---

## Changes Made to Codebase

### 1. **nginx.conf** ([website/nginx.conf](website/nginx.conf))
**Change:** Added production domain to server_name directive

**Before:**
```nginx
server_name localhost;
```

**After:**
```nginx
server_name localhost v-kare.co.in www.v-kare.co.in;
```

**Why:** Nginx needs to recognize your domain name to properly serve requests. This tells Nginx to respond to requests for both the root domain and www subdomain.

---

### 2. **config.js** ([website/config.js](website/config.js))
**Change:** Updated API configuration with clear instructions

**Before:**
```javascript
BACKEND_URL: 'https://your-backend-alb-url.region.elb.amazonaws.com',
ORCHESTRATOR_URL: 'https://your-orchestrator-alb-url.region.elb.amazonaws.com'
```

**After:**
```javascript
BACKEND_URL: '',
ORCHESTRATOR_URL: ''
```

**Why:** Empty values use relative paths through Nginx proxy (simpler setup). Since Nginx handles all routing, the frontend doesn't need to know about backend URLs. Everything goes through the same domain (v-kare.co.in).

---

### 3. **.env.production** (New File)
**Change:** Created production environment file

**Purpose:** Contains all your API keys and configuration for production deployment. This separates development and production credentials.

**Why:** Keeps production secrets separate from development. You'll upload this to your EC2 instance.

---

### 4. **docker-compose.prod.yml** (New File)
**Change:** Created production Docker Compose configuration

**Key Differences from Development:**
- ✅ Removed `--reload` flag (production doesn't need hot-reloading)
- ✅ Removed volume mounts (no live code editing in production)
- ✅ Changed ALLOWED_ORIGINS to use v-kare.co.in
- ✅ Added `restart: unless-stopped` (auto-restart on crashes)
- ✅ Changed nginx port from 8085 to 80 (standard HTTP port)

**Why:** Production environments need stability and security, not development features like live reloading.

---

## Step-by-Step Deployment

### **PHASE 1: Setup AWS Environment (30 minutes)**

#### Step 1.1: Create EC2 Instance

1. **Login to AWS Console**
   - Go to https://console.aws.amazon.com
   - Navigate to **EC2** service (search for "EC2" in top search bar)

2. **Launch Instance**
   - Click **"Launch Instance"** (orange button)
   - **Name:** `vkare-production-server`

3. **Choose AMI (Operating System)**
   - Select: **Ubuntu Server 24.04 LTS** (Free tier eligible)
   - Architecture: **64-bit (x86)**

4. **Choose Instance Type**
   - Select: **m7i-flex.large** (2 vCPU, 8 GB RAM) ✅ **FREE TIER ELIGIBLE**
   - Why: Your app has 6 services running simultaneously, needs at least 8GB RAM
   - Alternative if m7i-flex not available: **t3.large** (not free tier, ~$60/month)
   - ⚠️ **DO NOT use t3.micro or t3.small** - Not enough memory, will crash!

5. **Create Key Pair (for SSH access)**
   - Click **"Create new key pair"**
   - Name: `vkare-key`
   - Type: **RSA**
   - Format: **PEM** (for Mac/Linux) or **PPK** (for Windows/PuTTY)
   - Click **"Create key pair"**
   - **IMPORTANT:** Save the downloaded `.pem` file securely (you'll need it to connect)

6. **Configure Network Settings**
   - Click **"Edit"** next to Network settings
   - **VPC:** Keep default VPC
   - **Auto-assign Public IP:** Enable
   - **Firewall (Security Group):**
     - Click **"Create security group"**
     - Name: `vkare-sg`
     - Description: `Security group for Vkare application`
     - **Add these rules:**

       | Type | Protocol | Port | Source | Description |
       |------|----------|------|--------|-------------|
       | SSH | TCP | 22 | My IP | SSH access from your IP |
       | HTTP | TCP | 80 | Anywhere (0.0.0.0/0) | Web traffic |
       | HTTPS | TCP | 443 | Anywhere (0.0.0.0/0) | Secure web traffic |
       | Custom TCP | TCP | 8000-8003 | My IP | Development access (optional) |
       | Custom TCP | TCP | 9000 | My IP | Backend access (optional) |

7. **Configure Storage**
   - Size: **30 GB** (minimum)
   - Volume Type: **gp3** (General Purpose SSD)
   - Why: Application files + Docker images need ~20GB

8. **Review and Launch**
   - Click **"Launch instance"**
   - Wait 2-3 minutes for instance to start
   - Click **"View Instances"**
   - Note down the **Public IPv4 address** (e.g., 54.123.45.67)

---

#### Step 1.2: Connect to EC2 Instance

**For Mac/Linux:**
```bash
# Change permissions on key file
chmod 400 ~/Downloads/vkare-key.pem

# Connect to instance (replace with YOUR public IP)
ssh -i ~/Downloads/vkare-key.pem ubuntu@54.123.45.67
```

**For Windows (using PowerShell):**
```powershell
# Connect to instance (replace with YOUR public IP)
ssh -i C:\Users\YourName\Downloads\vkare-key.pem ubuntu@54.123.45.67
```

**For Windows (using PuTTY):**
1. Open PuTTY
2. Host Name: `ubuntu@54.123.45.67`
3. Connection → SSH → Auth → Browse and select your `.ppk` file
4. Click **"Open"**

You should see: `ubuntu@ip-xxx-xxx-xxx-xxx:~$`

---

#### Step 1.3: Install Docker and Docker Compose

Run these commands one by one in your SSH terminal:

```bash
# Update package list
sudo apt update

# Install prerequisites
sudo apt install -y ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add your user to docker group (avoid using sudo)
sudo usermod -aG docker ubuntu

# Apply group changes
newgrp docker

# Verify installation
docker --version
docker compose version
```

**Expected output:**
```
Docker version 24.x.x
Docker Compose version v2.x.x
```

---

### **PHASE 2: Deploy Application (20 minutes)**

#### Step 2.1: Transfer Files to EC2

**Option A: Using SCP (Mac/Linux/Windows PowerShell)**

On your **local computer** (not EC2), open a new terminal and run:

```bash
# Navigate to your project directory
cd c:\Users\aayus\PRODUCT

# Create a zip file of your project (excluding development files)
# On Windows (PowerShell):
Compress-Archive -Path * -DestinationPath vkare-app.zip -Force

# On Mac/Linux:
zip -r vkare-app.zip . -x "*.git*" "*node_modules*" "*__pycache__*" "*.venv*"

# Copy to EC2 (replace with YOUR key path and IP)
scp -i ~/Downloads/vkare-key.pem vkare-app.zip ubuntu@54.123.45.67:~/
```

**Option B: Using Git (Recommended)**

If your code is on GitHub (make sure .env is in .gitignore!):

```bash
# On EC2 instance
git clone https://github.com/yourusername/vkare.git
cd vkare
```

**Option C: Manual File Transfer (Windows - WinSCP)**
1. Download WinSCP: https://winscp.net/
2. Connect using your .ppk key
3. Drag and drop the PRODUCT folder

---

#### Step 2.2: Setup Application on EC2

**Back in your EC2 SSH terminal:**

```bash
# If you used zip file, extract it
cd ~
unzip vkare-app.zip -d vkare
cd vkare

# If you used git clone
cd ~/vkare

# Verify files are present
ls -la
# You should see: docker-compose.prod.yml, services/, website/, .env.production
```

---

#### Step 2.3: Configure Environment Variables

```bash
# Edit the production environment file
nano .env.production
```

**Verify these values are correct:**
- ✅ AZURE_OPENAI_GPT5_ENDPOINT
- ✅ AZURE_OPENAI_GPT5_KEY
- ✅ AZURE_OPENAI_WHISPER_ENDPOINT
- ✅ AZURE_OPENAI_WHISPER_KEY
- ✅ MAYA_API_KEY

Press `Ctrl + X`, then `Y`, then `Enter` to save and exit.

---

#### Step 2.4: Build and Start Services

```bash
# Build all Docker images (this takes 5-10 minutes)
docker compose -f docker-compose.prod.yml build

# Start all services
docker compose -f docker-compose.prod.yml up -d

# Check if all services are running
docker compose -f docker-compose.prod.yml ps
```

**Expected output:** All services should show "Up" status:
```
NAME                STATUS
vkare-stt-1         Up (healthy)
vkare-llm-core-1    Up (healthy)
vkare-tts-1         Up (healthy)
vkare-orchestrator-1 Up (healthy)
vkare-website-1     Up
vkare-backend-1     Up (healthy)
```

**Check logs if any service is failing:**
```bash
docker compose -f docker-compose.prod.yml logs stt
docker compose -f docker-compose.prod.yml logs llm-core
docker compose -f docker-compose.prod.yml logs orchestrator
```

---

#### Step 2.5: Test Application

```bash
# Test from EC2 instance
curl http://localhost/

# You should see HTML output from your landing page
```

**From your browser, visit:**
- `http://YOUR_EC2_PUBLIC_IP/` (replace with actual IP like 54.123.45.67)

You should see your Vkare landing page! 🎉

---

### **PHASE 3: Setup Domain and SSL (45 minutes)**

#### Step 3.1: Create Application Load Balancer

1. **Navigate to EC2 → Load Balancers**
   - Click **"Create Load Balancer"**
   - Select **"Application Load Balancer"**

2. **Basic Configuration**
   - Name: `vkare-alb`
   - Scheme: **Internet-facing**
   - IP address type: **IPv4**

3. **Network Mapping**
   - VPC: Select your default VPC
   - Availability Zones: Select **at least 2 zones** (e.g., us-east-1a, us-east-1b)

4. **Security Groups**
   - Create new: `vkare-alb-sg`
   - Inbound rules:
     - HTTP (80) from Anywhere (0.0.0.0/0)
     - HTTPS (443) from Anywhere (0.0.0.0/0)

5. **Listeners and Routing**

   **HTTP Listener (Port 80):**
   - Click **"Create target group"** (opens new tab)
     - Target type: **Instances**
     - Name: `vkare-targets`
     - Protocol: **HTTP**
     - Port: **80**
     - VPC: Default VPC
     - Health check path: `/`
     - Click **Next**
     - Select your EC2 instance
     - Click **"Include as pending below"**
     - Click **"Create target group"**

   - Back on ALB page, refresh target groups
   - Select `vkare-targets`

6. **HTTPS Listener (Port 443)** - Skip for now, we'll add after SSL certificate

7. **Review and Create**
   - Click **"Create load balancer"**
   - Wait 2-3 minutes for provisioning
   - Note the **DNS name** (e.g., vkare-alb-xxxxxxxxx.us-east-1.elb.amazonaws.com)

---

#### Step 3.2: Test Load Balancer

In your browser, visit:
- `http://vkare-alb-xxxxxxxxx.us-east-1.elb.amazonaws.com/`

You should see your application! ✅

---

#### Step 3.3: Request SSL Certificate

1. **Navigate to Certificate Manager (ACM)**
   - Search for "Certificate Manager" in AWS Console
   - **Important:** Make sure you're in the **same region** as your load balancer

2. **Request Certificate**
   - Click **"Request a certificate"**
   - Certificate type: **Public certificate**
   - Click **Next**

3. **Domain Names**
   - Add these domains:
     - `v-kare.co.in`
     - `www.v-kare.co.in`
     - `*.v-kare.co.in` (optional wildcard)

4. **Validation Method**
   - Select **DNS validation**
   - Click **Request**

5. **Validate Domain Ownership**
   - Click on the certificate ID
   - You'll see validation records for each domain
   - **For each domain**, you'll see:
     - CNAME name: `_xxxxxx.v-kare.co.in`
     - CNAME value: `_xxxxxx.acm-validations.aws.`

---

#### Step 3.4: Configure DNS (Route 53 or External Provider)

**Option A: Using Route 53 (Recommended)**

1. **Transfer domain to Route 53** (if not already)
   - Navigate to **Route 53**
   - Click **"Hosted zones"** → **"Create hosted zone"**
   - Domain name: `v-kare.co.in`
   - Type: **Public hosted zone**
   - Click **Create**

2. **Update nameservers at your domain registrar**
   - Route 53 will show 4 nameservers (ns-xxx.awsdns-xx.com)
   - Go to your domain registrar (where you bought v-kare.co.in)
   - Update nameservers to use these 4 AWS nameservers
   - **Wait 24-48 hours for DNS propagation**

3. **Add validation records**
   - In Route 53 hosted zone for v-kare.co.in
   - Click **"Create record"**
   - For each validation record from ACM:
     - Record name: Copy from ACM (e.g., `_xxxxxx`)
     - Record type: **CNAME**
     - Value: Copy from ACM (e.g., `_xxxxxx.acm-validations.aws.`)
     - Click **Create records**

4. **Add domain records**

   **Record 1: Root domain (v-kare.co.in)**
   - Record name: Leave empty
   - Record type: **A**
   - Alias: **Yes**
   - Route traffic to: **Alias to Application Load Balancer**
   - Region: Select your region
   - Load balancer: Select `vkare-alb`
   - Click **Create records**

   **Record 2: WWW subdomain**
   - Record name: `www`
   - Record type: **A**
   - Alias: **Yes**
   - Route traffic to: **Alias to Application Load Balancer**
   - Region: Select your region
   - Load balancer: Select `vkare-alb`
   - Click **Create records**

**Option B: Using External DNS Provider (GoDaddy, Namecheap, etc.)**

1. **Add validation records**
   - Login to your DNS provider
   - Add CNAME records from ACM for validation

2. **Point domain to Load Balancer**
   - Add A record or CNAME:
     - **Host:** `@` (root)
     - **Points to:** Your ALB DNS (vkare-alb-xxxxxxxxx.us-east-1.elb.amazonaws.com)
     - **TTL:** 3600

   - Add CNAME for www:
     - **Host:** `www`
     - **Points to:** Your ALB DNS
     - **TTL:** 3600

---

#### Step 3.5: Wait for Certificate Validation

- Go back to **Certificate Manager**
- Refresh until status shows **"Issued"** (can take 5-30 minutes)
- If stuck, verify DNS records are correct

---

#### Step 3.6: Add HTTPS Listener to Load Balancer

1. **Navigate to EC2 → Load Balancers**
   - Select `vkare-alb`
   - Go to **"Listeners and rules"** tab

2. **Add HTTPS Listener**
   - Click **"Add listener"**
   - Protocol: **HTTPS**
   - Port: **443**
   - Default action: **Forward to** `vkare-targets`
   - Security policy: **ELBSecurityPolicy-TLS13-1-2-2021-06** (recommended)
   - Default SSL certificate: Select your ACM certificate
   - Click **"Add"**

3. **Modify HTTP Listener to Redirect**
   - Select the HTTP:80 listener
   - Click **"Edit"**
   - Default action: **Redirect**
     - Protocol: **HTTPS**
     - Port: **443**
     - Status code: **301 - Permanently moved**
   - Click **"Save changes"**

---

#### Step 3.7: Update Security Group on EC2

Your EC2 instance should only accept traffic from the Load Balancer, not directly from the internet.

1. **Navigate to EC2 → Security Groups**
   - Find `vkare-sg` (your EC2 security group)

2. **Edit Inbound Rules**
   - **Remove:** HTTP (80) from Anywhere
   - **Add:** HTTP (80) from `vkare-alb-sg` (ALB security group)
   - **Keep:** SSH (22) from My IP
   - **Remove:** HTTPS (443) if present
   - Click **"Save rules"**

---

### **PHASE 4: Final Testing (10 minutes)**

#### Step 4.1: Test Your Domain

Visit these URLs in your browser:
- ✅ `http://v-kare.co.in` → Should redirect to HTTPS
- ✅ `https://v-kare.co.in` → Should load with padlock icon
- ✅ `https://www.v-kare.co.in` → Should work
- ✅ `https://v-kare.co.in/login.html` → Test authentication
- ✅ `https://v-kare.co.in/user-dashboard.html` → Test dashboard

#### Step 4.2: Test Voice Recording

1. Login to application
2. Go to user dashboard
3. Click voice recording
4. Grant microphone permissions
5. Record a test message
6. Verify STT → LLM → TTS pipeline works

#### Step 4.3: Check Service Health

```bash
# SSH to EC2
ssh -i ~/Downloads/vkare-key.pem ubuntu@54.123.45.67

# Check all containers
docker compose -f docker-compose.prod.yml ps

# Check orchestrator logs
docker compose -f docker-compose.prod.yml logs --tail=50 orchestrator

# Check for errors
docker compose -f docker-compose.prod.yml logs --tail=100 | grep -i error
```

---

## Post-Deployment Configuration

### Enable Automated Backups

**For SQLite Database:**

```bash
# Create backup script
cat > ~/backup.sh << 'EOF'
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=~/backups
mkdir -p $BACKUP_DIR

# Backup SQLite database
docker compose -f ~/vkare/docker-compose.prod.yml exec backend cp /app/data.db /tmp/data_${TIMESTAMP}.db
docker cp $(docker compose -f ~/vkare/docker-compose.prod.yml ps -q backend):/tmp/data_${TIMESTAMP}.db $BACKUP_DIR/

# Keep only last 7 days of backups
find $BACKUP_DIR -name "data_*.db" -mtime +7 -delete

echo "Backup completed: data_${TIMESTAMP}.db"
EOF

chmod +x ~/backup.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * ~/backup.sh") | crontab -
```

### Setup Monitoring

**CloudWatch Logs (Optional):**

1. Navigate to **CloudWatch → Log groups**
2. Create log group: `/aws/vkare/application`
3. Install CloudWatch agent on EC2:

```bash
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i -E ./amazon-cloudwatch-agent.deb
```

### Setup Auto-restart on Reboot

```bash
# Edit crontab
crontab -e

# Add this line
@reboot cd ~/vkare && docker compose -f docker-compose.prod.yml up -d
```

---

## Cost Estimate

### Monthly AWS Costs (US East region)

| Service | Configuration | Monthly Cost |
|---------|--------------|--------------|
| EC2 m7i-flex.large | 2 vCPU, 8GB RAM, 750 hours | **$0** (Free tier) |
| EBS Storage | 30 GB gp3 | **$0** (Free tier 30GB) |
| Application Load Balancer | 750 hours | **$0** (Free tier) |
| ALB Data Processing | 15 GB | **$0** (Free tier 15GB) |
| Route 53 Hosted Zone | 1 zone | $0.50 |
| Route 53 Queries | 1M queries | $0.40 |
| Data Transfer Out | 1 GB | **$0** (Free tier 100GB) |
| **TOTAL (First Year)** | | **~$1/month** |
| **TOTAL (After Year 1)** | | **~$80-85/month** |

### Free Tier Benefits (First 12 months)
- ✅ **EC2 m7i-flex.large**: 750 hours/month FREE (enough for 24/7 operation)
- ✅ **EBS Storage**: 30 GB FREE
- ✅ **Application Load Balancer**: 750 hours/month FREE
- ✅ **ALB Data Processing**: 15 GB/month FREE
- ✅ **SSL Certificate**: Free forever
- ✅ **Data Transfer**: 100 GB/month FREE
- ✅ **Route 53**: 50 queries/month FREE

### After Free Tier Expires (Year 2+)
If you need to reduce costs after the free tier:
1. **Downgrade to t3a.medium** (~$30/month) - AMD-based, cheaper
2. **Use EC2 Reserved Instance** (1-year commitment) - Save 30-40%
3. **Use Spot Instance** for non-production - Save 70%
4. **Optimize during low traffic hours** - Stop instance when not needed

---

## Troubleshooting

### Issue: Can't SSH to EC2
**Solution:**
```bash
# Check security group allows SSH from your IP
# Verify key file permissions
chmod 400 vkare-key.pem

# Check EC2 is running
# Try different SSH client
```

### Issue: Docker services won't start
**Solution:**
```bash
# Check logs
docker compose -f docker-compose.prod.yml logs

# Restart specific service
docker compose -f docker-compose.prod.yml restart orchestrator

# Check disk space
df -h

# Check memory
free -h
```

### Issue: SSL certificate stuck in "Pending"
**Solution:**
- Verify DNS CNAME records are correct
- Wait 30 minutes for DNS propagation
- Check domain registrar has correct nameservers

### Issue: Load Balancer shows "unhealthy"
**Solution:**
```bash
# Check if nginx is responding
curl http://localhost/

# Check security group allows ALB to reach EC2
# Verify target group health check path is correct
```

### Issue: Application loads but voice recording doesn't work
**Solution:**
- HTTPS is required for microphone access
- Verify orchestrator service is running
- Check browser console for errors
- Verify CORS settings include your domain

### Issue: High latency or slow responses
**Solution:**
```bash
# Upgrade to larger instance (t3.xlarge)
# Check Azure OpenAI rate limits
# Monitor Docker resource usage
docker stats
```

---

## Maintenance Commands

### View Logs
```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f orchestrator
```

### Restart Services
```bash
# All services
docker compose -f docker-compose.prod.yml restart

# Specific service
docker compose -f docker-compose.prod.yml restart stt
```

### Update Application
```bash
# Pull latest code
cd ~/vkare
git pull origin main

# Rebuild and restart
docker compose -f docker-compose.prod.yml up -d --build
```

### Check Resource Usage
```bash
# Disk usage
df -h

# Memory usage
free -h

# Docker container resources
docker stats

# Top processes
htop
```

---

## Security Best Practices

1. **Never commit .env files to Git**
   ```bash
   # Add to .gitignore
   echo ".env*" >> .gitignore
   ```

2. **Rotate API keys every 90 days**

3. **Enable CloudTrail for audit logs**

4. **Setup AWS Backup for EC2**

5. **Use IAM roles instead of access keys**

6. **Enable EC2 termination protection**

7. **Setup alerts for high costs**

---

## Next Steps (Optional Enhancements)

1. **Setup CI/CD Pipeline**
   - Use GitHub Actions to auto-deploy on push
   - Automated testing before deployment

2. **Add Redis for Session Storage**
   - Replace in-memory sessions with Redis
   - Better for multi-instance scaling

3. **Use RDS instead of SQLite**
   - Amazon RDS PostgreSQL for production database
   - Automated backups and replication

4. **Setup CloudFront CDN**
   - Faster global content delivery
   - Reduce load on origin server

5. **Auto-Scaling**
   - Use Auto Scaling Groups
   - Scale based on CPU/Memory metrics

6. **Container Orchestration**
   - Migrate to ECS/Fargate for better management
   - Or use EKS (Kubernetes) for advanced scaling

---

## Support

For issues or questions:
- AWS Documentation: https://docs.aws.amazon.com/
- Docker Documentation: https://docs.docker.com/
- Azure OpenAI: https://learn.microsoft.com/en-us/azure/ai-services/openai/

---

**Deployment Guide Version:** 1.0
**Last Updated:** 2025-10-21
**Tested On:** AWS us-east-1 region

---

## Summary

You've successfully deployed Vkare on AWS! 🎉

**What you have:**
- ✅ Production-ready application on EC2
- ✅ HTTPS with SSL certificate
- ✅ Custom domain (v-kare.co.in)
- ✅ Load balancer for high availability
- ✅ Automated health checks
- ✅ Secure architecture with proper security groups

**Your application is now accessible at:**
- https://v-kare.co.in
- https://www.v-kare.co.in
