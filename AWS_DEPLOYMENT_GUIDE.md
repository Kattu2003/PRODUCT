# AWS Deployment Guide for Vkare AI Therapy Platform

## Overview
This guide documents the **actual deployment process** used to deploy the Vkare AI therapy platform on AWS. This is a step-by-step walkthrough from scratch to a fully functional production system.

**Final Result:** https://v-kare.co.in (Live and accessible worldwide!)

**Deployment Method:** EC2 with Docker Compose + Direct SSL (Let's Encrypt)
**Total Time:** ~2-3 hours
**Cost:** ~$1/month (first year on free tier)

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Code Changes Required](#code-changes-required)
4. [Phase 1: Setup AWS EC2 Instance](#phase-1-setup-aws-ec2-instance-30-minutes)
5. [Phase 2: Deploy Application](#phase-2-deploy-application-20-minutes)
6. [Phase 3: Setup Domain and SSL](#phase-3-setup-domain-and-ssl-60-minutes)
7. [Post-Deployment](#post-deployment)
8. [Monitoring and Maintenance](#monitoring-and-maintenance)
9. [Troubleshooting](#troubleshooting)
10. [Team Member Checklist](#team-member-checklist)

---

## Prerequisites

Before starting, ensure you have:

### 1. AWS Account
- ✅ Active AWS account (sign up at https://aws.amazon.com)
- ✅ Payment method added (credit card)
- ✅ Free tier available (first 12 months)
- ✅ AWS Console access

### 2. Domain Name
- ✅ Domain purchased (we used v-kare.co.in from GoDaddy)
- ✅ Access to domain DNS management

### 3. API Keys
- ✅ Azure OpenAI GPT-5 endpoint and key
- ✅ Azure OpenAI Whisper endpoint and key
- ✅ Maya Research TTS API key

### 4. Local Tools
- ✅ SSH client (Windows 10+ has built-in OpenSSH)
- ✅ Git installed (optional, for cloning repo)
- ✅ Code editor (VS Code, Notepad++, etc.)

### 5. GitHub Repository
- ✅ Code pushed to GitHub on AWS branch
- ✅ Repository is public (or have GitHub token ready)

---

## Architecture Overview

### Final Production Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         INTERNET                            │
│                  (Users worldwide)                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
            ┌──────────────────────┐
            │   GoDaddy DNS        │
            │  v-kare.co.in        │
            │  A → 13.61.186.207   │
            └──────────┬───────────┘
                       │
                       ▼
            ┌──────────────────────┐
            │   AWS EC2 Instance   │
            │   m7i-flex.large     │
            │   Ubuntu 24.04       │
            │   Public IP          │
            └──────────┬───────────┘
                       │
                       ▼
            ┌──────────────────────┐
            │  Nginx (Host)        │
            │  - SSL Termination   │
            │  - Port 443 → 8085   │
            │  - Let's Encrypt     │
            └──────────┬───────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │    Docker Compose            │
        │                              │
        │  ┌────────────────────────┐  │
        │  │ Nginx Container :8085  │  │
        │  │ (Static Files/Proxy)   │  │
        │  └───┬────────────────────┘  │
        │      │                       │
        │  ┌───┴────────┬──────────┐   │
        │  │            │          │   │
        │  ▼            ▼          ▼   │
        │ Backend   Orchestrator  ...  │
        │  :9000       :8000           │
        │                              │
        │ STT(:8001) LLM(:8002)        │
        │ TTS(:8003)                   │
        └──────────────────────────────┘
```

### Why This Architecture?

**We initially planned to use Application Load Balancer (ALB)**, but encountered this error:
> "This AWS account currently does not support creating load balancers"

**Solution:** We used **direct SSL on EC2** with Let's Encrypt instead. This approach:
- ✅ Works immediately (no AWS support ticket needed)
- ✅ Still provides HTTPS and SSL certificate
- ✅ Free SSL from Let's Encrypt
- ✅ Simpler setup
- ✅ Lower cost
- ⚠️ Single point of failure (but fine for MVP)

---

## Code Changes Required

Before deployment, we made minimal changes to the codebase:

### 1. Updated `website/nginx.conf`

**File:** `website/nginx.conf`
**Line:** 3

**Before:**
```nginx
server_name localhost;
```

**After:**
```nginx
server_name localhost v-kare.co.in www.v-kare.co.in;
```

**Why:** Nginx needs to recognize your production domain names.

---

### 2. Updated `website/config.js`

**File:** `website/config.js`

**Created new file with:**
```javascript
// API Configuration
// For local development, keep these empty to use relative paths through nginx
// For AWS production, update these with your Application Load Balancer DNS names
window.API_CONFIG = {
    // Leave empty for local development (uses nginx proxy)
    // For AWS: Update with ALB DNS after deployment, e.g., 'http://vkare-alb-xxxxxxxxx.us-east-1.elb.amazonaws.com'
    BACKEND_URL: '',
    ORCHESTRATOR_URL: ''
};
```

**Why:** Empty values use relative paths through Nginx proxy, simplifying deployment.

---

### 3. Created `.env.production`

**File:** `.env.production`

**Contains:** Same as your `.env` file with all API keys

**IMPORTANT:** This file is in `.gitignore` and should NEVER be committed to Git!

---

### 4. Updated `.gitignore`

**File:** `.gitignore`

**Added line 28:**
```
.env.production
```

**Why:** Protects your API keys from being exposed in GitHub.

---

### 5. Created `docker-compose.prod.yml`

**File:** `docker-compose.prod.yml`

**Key differences from `docker-compose.yml`:**
- ✅ No `--reload` flag (production doesn't need hot-reloading)
- ✅ No volume mounts (code is baked into images)
- ✅ Added `restart: unless-stopped` (auto-restart on crashes)
- ✅ Changed ALLOWED_ORIGINS to production domain
- ✅ Nginx port changed from 8085 to 80 (initially), then to 8085 (after adding host Nginx)

---

## Phase 1: Setup AWS EC2 Instance (30 minutes)

### Step 1.1: Create EC2 Instance

1. **Login to AWS Console**
   - Go to https://console.aws.amazon.com
   - Sign in with your AWS account

2. **Navigate to EC2**
   - In the search bar at the top, type "EC2"
   - Click on **EC2** (Virtual Servers in the Cloud)

3. **Launch Instance**
   - Click the orange **"Launch Instance"** button
   - Instance name: `vkare-production-server`

4. **Choose AMI (Operating System)**
   - Select: **Ubuntu Server 24.04 LTS**
   - Make sure it says "Free tier eligible"
   - Architecture: **64-bit (x86)**

5. **Choose Instance Type**
   - **IMPORTANT:** Select **m7i-flex.large** (2 vCPU, 8 GB RAM)
   - ✅ **This is FREE TIER ELIGIBLE**

   **Why we need 8GB RAM:**
   - Your app runs 6 Docker containers simultaneously
   - Minimum memory requirement: ~2.5-3 GB
   - Recommended: 8 GB for stability under load

   **Instance comparison:**
   | Instance Type | vCPU | RAM | Free Tier? | Will it work? |
   |---------------|------|-----|------------|---------------|
   | t3.micro | 2 | 1 GB | ✅ Yes | ❌ NO - Too small |
   | t3.small | 2 | 2 GB | ✅ Yes | ❌ NO - Unstable |
   | c7i-flex.large | 2 | 4 GB | ✅ Yes | ⚠️ Maybe - Struggles |
   | **m7i-flex.large** | 2 | 8 GB | ✅ **Yes** | ✅ **YES - Recommended!** |
   | t3.large | 2 | 8 GB | ❌ No | ✅ Yes - But $60/month |

6. **Create Key Pair (SSH Access)**
   - Click **"Create new key pair"**
   - Name: `vkare-key`
   - Type: **RSA**
   - Format:
     - **PEM** (for Windows 10+, Mac, Linux) ← **Recommended**
     - **PPK** (only if using PuTTY)
   - Click **"Create key pair"**
   - **IMPORTANT:** The `.pem` file will download automatically
   - **Save it securely!** (e.g., `C:\Users\YourName\Downloads\vkare-key.pem`)
   - You'll need this file to connect via SSH

7. **Configure Network Settings**
   - Click **"Edit"** next to Network settings
   - **VPC:** Keep default VPC
   - **Auto-assign Public IP:** **Enable**
   - **Firewall (Security Group):**
     - Click **"Create security group"**
     - Security group name: `vkare-sg`
     - Description: `Security group for Vkare application`

   **Add Inbound Rules:**

   Click **"Add security group rule"** for each:

   | Type | Protocol | Port Range | Source Type | Source | Description |
   |------|----------|------------|-------------|--------|-------------|
   | SSH | TCP | 22 | My IP | (auto-detected) | SSH access |
   | HTTP | TCP | 80 | Anywhere | 0.0.0.0/0 | Web traffic |
   | HTTPS | TCP | 443 | Anywhere | 0.0.0.0/0 | Secure web traffic |

   **IMPORTANT:** The SSH rule should use "My IP" to restrict access to only your computer. The other rules use "Anywhere" so anyone can visit your website.

8. **Configure Storage**
   - Size: **30 GB** (minimum)
   - Volume Type: **gp3** (General Purpose SSD)
   - Why: Docker images + application files need ~20GB

9. **Review and Launch**
   - Click **"Launch instance"** (orange button)
   - You'll see "Successfully initiated launch of instance"
   - Click **"View all instances"**

10. **Wait for Instance to Start**
    - Status will show "Pending" → then "Running" (takes 2-3 minutes)
    - **Instance State:** Should be green "Running"
    - **Status Check:** Wait until it shows "2/2 checks passed"

11. **Note Your Public IP**
    - Click on your instance
    - In the details below, find **Public IPv4 address**
    - Example: `13.61.186.207`
    - **Write this down!** You'll need it throughout deployment

---

### Step 1.2: Connect to EC2 Instance via SSH

#### For Windows 10/11 (PowerShell):

1. **Open PowerShell**
   - Press `Windows + X`
   - Click **"Windows PowerShell"** or **"Terminal"**

2. **Change to Downloads folder**
   ```powershell
   cd C:\Users\YourName\Downloads
   ```

3. **Connect via SSH**
   ```powershell
   ssh -i vkare-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
   ```

   **Replace `YOUR_EC2_PUBLIC_IP`** with your actual IP (e.g., `13.61.186.207`)

   **Example:**
   ```powershell
   ssh -i vkare-key.pem ubuntu@13.61.186.207
   ```

4. **First time connection warning**
   - You'll see: "The authenticity of host... Are you sure you want to continue?"
   - Type: `yes` and press Enter

5. **You're connected!**
   - You should see: `ubuntu@ip-xxx-xxx-xxx-xxx:~$`

#### Troubleshooting SSH Connection:

**Problem:** "Connection timed out"

**Cause:** Security group not allowing SSH from your IP

**Solution:**
1. Go to EC2 → Security Groups
2. Select `vkare-sg`
3. Edit inbound rules
4. For SSH rule, change Source to **"My IP"** (AWS will auto-detect)
5. Save rules
6. Wait 30 seconds, try again

**Problem:** Your IP changed

**Solution:**
- Go to https://whatismyipaddress.com/
- Note your current IP
- Update security group SSH rule with new IP

---

### Step 1.3: Install Docker and Docker Compose

**Run these commands one by one in your SSH terminal:**

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

# Update package list again
sudo apt update

# Install Docker Engine (this takes 1-2 minutes)
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
Docker version 27.3.1
Docker Compose version v2.29.7
```

**What each command does:**
- `apt update` - Updates the list of available packages
- `apt install prerequisites` - Installs tools needed for Docker
- `curl/gpg` - Adds Docker's security key to verify packages
- `apt install docker` - Installs Docker Engine
- `usermod` - Allows running Docker without `sudo`
- `docker --version` - Confirms Docker is installed

---

## Phase 2: Deploy Application (20 minutes)

### Step 2.1: Clone Repository to EC2

**On your EC2 instance:**

```bash
# Clone the AWS branch from GitHub
git clone -b AWS https://github.com/Kattu2003/PRODUCT.git ~/vkare

# Navigate into the directory
cd ~/vkare

# Verify files are present
ls -la
```

**You should see:**
- ✅ `docker-compose.prod.yml`
- ✅ `services/` directory
- ✅ `website/` directory
- ✅ `AWS_DEPLOYMENT_GUIDE.md`

**Note:** `.env.production` is NOT in the repo (it's in .gitignore for security)

---

### Step 2.2: Upload .env.production File

**IMPORTANT:** Your `.env.production` file contains API keys and should never be in Git.

#### Method 1: Upload from Windows (Recommended)

**On your Windows computer** (open a NEW PowerShell window):

```powershell
# Navigate to your local project
cd C:\Users\aayus\PRODUCT

# Upload .env.production to EC2
scp -i C:\Users\aayus\Downloads\vkare-key.pem .env.production ubuntu@13.61.186.207:~/vkare/
```

**Replace `13.61.186.207`** with your EC2 public IP.

**Expected output:**
```
.env.production                    100%  2154    50.3KB/s   00:00
```

#### Method 2: Copy-Paste Manually

If SCP doesn't work:

1. **On EC2:**
   ```bash
   cd ~/vkare
   nano .env.production
   ```

2. **On Windows:**
   - Open `C:\Users\aayus\PRODUCT\.env.production` in Notepad
   - Select all (Ctrl+A), Copy (Ctrl+C)

3. **Back in EC2 nano editor:**
   - Right-click to paste (or Shift+Insert)
   - Press `Ctrl + O` to save
   - Press `Enter` to confirm
   - Press `Ctrl + X` to exit

#### Verify Upload:

```bash
# Check file exists
ls -lh ~/vkare/.env.production

# Check first few lines (should show Azure config)
head -n 5 ~/vkare/.env.production
```

You should see your Azure OpenAI configuration.

---

### Step 2.3: Build Docker Images

This downloads base images and builds your application (takes 5-10 minutes):

```bash
cd ~/vkare
docker compose -f docker-compose.prod.yml build
```

**Expected output:**
```
[+] Building 234.5s (45/45) FINISHED
 => [stt internal] load build definition
 => [llm-core internal] load build definition
 => [orchestrator internal] load build definition
 ...
 => exporting to image
Successfully built...
```

**What's happening:**
- Downloading Python 3.11, Node.js 20, Nginx images
- Installing dependencies for each service
- Building 6 Docker images

**If you see errors:**
- Check `.env.production` is present
- Verify internet connection
- Check disk space: `df -h`

---

### Step 2.4: Start All Services

```bash
docker compose -f docker-compose.prod.yml up -d
```

**Expected output:**
```
[+] Running 6/6
 ✔ Container vkare-stt-1          Started
 ✔ Container vkare-llm-core-1     Started
 ✔ Container vkare-tts-1          Started
 ✔ Container vkare-orchestrator-1 Started
 ✔ Container vkare-backend-1      Started
 ✔ Container vkare-website-1      Started
```

**The `-d` flag** means "detached mode" (runs in background).

---

### Step 2.5: Verify Services are Running

```bash
# Check status of all containers
docker compose -f docker-compose.prod.yml ps
```

**Expected output:**
```
NAME                     STATUS
vkare-backend-1          Up 48 minutes (healthy)
vkare-llm-core-1         Up 48 minutes (healthy)
vkare-orchestrator-1     Up 48 minutes (healthy)
vkare-stt-1              Up 48 minutes (healthy)
vkare-tts-1              Up 48 minutes (healthy)
vkare-website-1          Up 15 seconds
```

**All should show "Up" or "Up (healthy)"**

#### If any service shows "Exited" or "Unhealthy":

```bash
# Check logs for that service
docker compose -f docker-compose.prod.yml logs stt
docker compose -f docker-compose.prod.yml logs llm-core
docker compose -f docker-compose.prod.yml logs orchestrator

# Common issues:
# - Missing .env.production file
# - Invalid API keys
# - Port conflicts
```

---

### Step 2.6: Test Application

**Test from EC2:**
```bash
curl http://localhost/
```

You should see HTML output from your landing page.

**Test from your browser:**

Visit: `http://YOUR_EC2_PUBLIC_IP/` (e.g., `http://13.61.186.207/`)

✅ **You should see your Vkare landing page!**

**At this point:**
- ✅ Application is running
- ✅ Accessible via HTTP
- ❌ Microphone WON'T work yet (needs HTTPS)

---

## Phase 3: Setup Domain and SSL (60 minutes)

### Why Do We Need This Phase?

**Modern browsers require HTTPS for microphone access.** Without SSL:
- ❌ Voice recording won't work
- ❌ Users see "Not Secure" warning
- ❌ Looks unprofessional

**After this phase:**
- ✅ HTTPS enabled with padlock 🔒
- ✅ Microphone access works
- ✅ Professional domain (v-kare.co.in)
- ✅ Free SSL certificate (auto-renewing)

---

### Step 3.1: Point Domain to EC2 IP

#### For GoDaddy (as used in our deployment):

1. **Login to GoDaddy**
   - Go to https://dcc.godaddy.com/
   - Sign in with your credentials

2. **Navigate to DNS Management**
   - Find your domain: **v-kare.co.in**
   - Click on it
   - Click **"DNS"** or **"Manage DNS"**

3. **Add/Edit A Record for Root Domain**

   **Look for existing A record with Name "@" or blank:**
   - If exists: Click **Edit** (pencil icon)
   - If not: Click **"Add"** or **"Add New Record"**

   **Fill in:**
   - Type: **A**
   - Name: **@** (represents root domain v-kare.co.in)
   - Data/Value: **YOUR_EC2_PUBLIC_IP** (e.g., `13.61.186.207`)
   - TTL: **1 Hour** (or 3600 seconds)

   Click **Save**

4. **Delete Conflicting CNAME Records**

   **If you see a CNAME record for "www":**
   - It will conflict with the A record we're about to add
   - Click the **trash icon** to delete it
   - Confirm deletion

5. **Add A Record for WWW Subdomain**

   Click **"Add New Record"**

   **Fill in:**
   - Type: **A**
   - Name: **www**
   - Data/Value: **YOUR_EC2_PUBLIC_IP** (same as above)
   - TTL: **1 Hour**

   Click **Save**

6. **Verify DNS Records**

   **You should now have:**
   | Type | Name | Data | TTL |
   |------|------|------|-----|
   | A | @ | 13.61.186.207 | 1 Hour |
   | A | www | 13.61.186.207 | 1 Hour |
   | NS | @ | ns11.domaincontrol.com | 1 Hour |
   | NS | @ | ns12.domaincontrol.com | 1 Hour |

7. **Wait for DNS Propagation**
   - DNS changes take **5-30 minutes** to propagate
   - Sometimes up to 24-48 hours worldwide

8. **Test DNS**

   **After 10 minutes, visit in your browser:**
   - `http://v-kare.co.in`
   - `http://www.v-kare.co.in`

   **Both should show your application!**

#### For Other DNS Providers (Namecheap, Cloudflare, etc.):

**The process is similar:**
1. Login to your DNS provider
2. Find DNS management / Advanced DNS
3. Add A record: @ → YOUR_EC2_IP
4. Add A record: www → YOUR_EC2_IP
5. Save and wait for propagation

---

### Step 3.2: Update EC2 Security Group for HTTPS

**We need to allow HTTPS traffic (port 443):**

1. **Go to AWS Console → EC2**
2. **Click on "Instances"** (left sidebar)
3. **Select your instance** (`vkare-production-server`)
4. **Click "Security" tab** (bottom panel)
5. **Click on the Security Group name** (e.g., `sg-01354e17daaa81f6c` or `vkare-sg`)
6. **Click "Edit inbound rules"**
7. **Check if HTTPS (443) already exists**

   **If you see:**
   ```
   Type: HTTPS
   Port: 443
   Source: 0.0.0.0/0
   ```

   ✅ **Perfect! It already exists.** Click "Cancel" and proceed to next step.

   **If NOT present:**
   - Click **"Add rule"**
   - Type: **HTTPS**
   - Source: **Anywhere-IPv4** (0.0.0.0/0)
   - Description: `HTTPS for SSL`
   - Click **"Save rules"**

**Note:** If you try to add a duplicate rule, AWS will show error:
> "the specified rule already exists"

This is fine - it means the rule is already there!

---

### Step 3.3: Install Certbot on EC2

**SSH to your EC2 instance** and run:

```bash
# Update package list
sudo apt update

# Install Certbot and Nginx plugin
sudo apt install -y certbot python3-certbot-nginx

# Verify installation
certbot --version
```

**Expected output:** `certbot 2.9.0` (or similar version)

**What is Certbot?**
- Free tool from Let's Encrypt
- Automatically obtains and renews SSL certificates
- Validates you own the domain
- Sets up auto-renewal

---

### Step 3.4: Stop Docker Nginx Container

We need to temporarily stop the Docker Nginx so Certbot can use port 80:

```bash
cd ~/vkare
docker compose -f docker-compose.prod.yml stop website
```

**This stops only the website container, others keep running.**

---

### Step 3.5: Install Nginx on Host System

```bash
# Install Nginx on EC2 (not in Docker)
sudo apt install -y nginx

# Start Nginx service
sudo systemctl start nginx
sudo systemctl enable nginx

# Check if it's running
sudo systemctl status nginx
```

**Expected output:**
```
● nginx.service - A high performance web server and a reverse proxy server
     Loaded: loaded
     Active: active (running)
```

Press `q` to exit the status view.

**Why install Nginx on the host?**
- Handles SSL termination
- Proxies HTTPS traffic to Docker containers
- Manages Let's Encrypt certificate renewal

---

### Step 3.6: Obtain SSL Certificate from Let's Encrypt

**IMPORTANT:** Replace `your-email@example.com` with your real email!

```bash
sudo certbot certonly --nginx -d v-kare.co.in -d www.v-kare.co.in --email your-email@example.com --agree-tos --no-eff-email
```

**Example:**
```bash
sudo certbot certonly --nginx -d v-kare.co.in -d www.v-kare.co.in --email neura.sike@gmail.com --agree-tos --no-eff-email
```

**What this command does:**
- `certonly` - Get certificate but don't auto-configure
- `--nginx` - Use Nginx plugin
- `-d v-kare.co.in -d www.v-kare.co.in` - Get cert for both domains
- `--email` - Your email for renewal notifications
- `--agree-tos` - Agree to Let's Encrypt terms
- `--no-eff-email` - Don't share email with EFF

**Expected output:**
```
Saving debug log to /var/log/letsencrypt/letsencrypt.log
Account registered.
Requesting a certificate for v-kare.co.in and www.v-kare.co.in

Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/v-kare.co.in/fullchain.pem
Key is saved at:         /etc/letsencrypt/live/v-kare.co.in/privkey.pem
This certificate expires on 2026-01-19.
These files will be updated when the certificate renews.
Certbot has set up a scheduled task to automatically renew this certificate in the background.
```

✅ **Success!** You now have a free SSL certificate!

**If you see errors:**

**Error:** "Connection refused" or "Failed to connect"
- **Cause:** DNS not propagated yet
- **Solution:** Wait 10 more minutes, try again

**Error:** "Invalid response from http://v-kare.co.in/.well-known"
- **Cause:** Nginx not serving the validation file
- **Solution:** Check if Nginx is running: `sudo systemctl status nginx`

---

### Step 3.7: Configure Nginx as Reverse Proxy with SSL

**Create Nginx configuration file:**

```bash
sudo nano /etc/nginx/sites-available/vkare
```

**Paste this configuration** (right-click or Shift+Insert to paste):

```nginx
# HTTP to HTTPS redirect
server {
    listen 80;
    server_name v-kare.co.in www.v-kare.co.in;

    # Certbot renewal path (keep this!)
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name v-kare.co.in www.v-kare.co.in;

    # SSL certificates from Let's Encrypt
    ssl_certificate /etc/letsencrypt/live/v-kare.co.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/v-kare.co.in/privkey.pem;

    # SSL configuration (modern, secure)
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Proxy to Docker containers
    location / {
        proxy_pass http://localhost:8085;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
        proxy_buffering off;
    }
}
```

**Understanding this configuration:**

**HTTP Server (Port 80):**
- Listens on port 80 (HTTP)
- Keeps `/.well-known/acme-challenge/` for certificate renewal
- Redirects everything else to HTTPS (301 permanent redirect)

**HTTPS Server (Port 443):**
- Listens on port 443 (HTTPS)
- Uses SSL certificates from Let's Encrypt
- Proxies all traffic to Docker Nginx on port 8085
- Passes correct headers (Host, IP, protocol) to backend

**Save the file:**
- Press `Ctrl + O` (WriteOut)
- Press `Enter` to confirm filename
- Press `Ctrl + X` to exit

---

### Step 3.8: Enable Nginx Configuration

```bash
# Create symbolic link to enable the site
sudo ln -s /etc/nginx/sites-available/vkare /etc/nginx/sites-enabled/

# Remove default site (prevents conflicts)
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration (IMPORTANT!)
sudo nginx -t
```

**Expected output:**
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

✅ **If you see "test is successful"**, proceed!

❌ **If you see errors:**
- Check for typos in the config file
- Verify SSL certificate paths exist: `ls /etc/letsencrypt/live/v-kare.co.in/`
- Re-edit the file: `sudo nano /etc/nginx/sites-available/vkare`

**Reload Nginx:**
```bash
sudo systemctl reload nginx
```

---

### Step 3.9: Update Docker Compose Port Mapping

We need to change Docker Nginx from port 80 to port 8085:

```bash
cd ~/vkare
nano docker-compose.prod.yml
```

**Find the `website:` section (around line 67-74):**

```yaml
  website:
    image: nginx:alpine
    ports:
      - "80:80"     # ← FIND THIS LINE
    volumes:
      - "./website:/usr/share/nginx/html:ro"
      - "./website/nginx.conf:/etc/nginx/conf.d/default.conf:ro"
    depends_on:
      orchestrator:
        condition: service_healthy
    restart: unless-stopped
```

**Change to:**
```yaml
  website:
    image: nginx:alpine
    ports:
      - "8085:80"   # ← CHANGED TO 8085
    volumes:
      - "./website:/usr/share/nginx/html:ro"
      - "./website/nginx.conf:/etc/nginx/conf.d/default.conf:ro"
    depends_on:
      orchestrator:
        condition: service_healthy
    restart: unless-stopped
```

**Why this change?**
- Host Nginx listens on port 80 (for HTTP) and 443 (for HTTPS)
- Docker Nginx now listens on port 8085
- Host Nginx proxies requests to Docker Nginx on 8085
- This prevents port conflicts

**Save:**
- Press `Ctrl + O`, `Enter`, `Ctrl + X`

---

### Step 3.10: Restart Docker Containers

```bash
cd ~/vkare
docker compose -f docker-compose.prod.yml up -d
```

**Expected output:**
```
[+] Running 6/6
 ✔ Container vkare-stt-1          Started
 ✔ Container vkare-llm-core-1     Started
 ✔ Container vkare-tts-1          Started
 ✔ Container vkare-orchestrator-1 Started
 ✔ Container vkare-backend-1      Started
 ✔ Container vkare-website-1      Started
```

**Verify all services:**
```bash
docker compose -f docker-compose.prod.yml ps
```

**All should show "Up" or "Up (healthy)"**

---

### Step 3.11: Setup SSL Auto-Renewal

Let's Encrypt certificates expire every **90 days**. Setup automatic renewal:

```bash
# Test renewal (dry run - doesn't actually renew)
sudo certbot renew --dry-run
```

**Expected output:**
```
Congratulations, all simulated renewals succeeded:
  /etc/letsencrypt/live/v-kare.co.in/fullchain.pem (success)
```

**Enable auto-renewal timer:**
```bash
# Enable automatic renewal service
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Check timer status
sudo systemctl status certbot.timer
```

**Expected output:**
```
● certbot.timer - Run certbot twice daily
     Loaded: loaded
     Active: active (waiting)
```

Press `q` to exit.

**What this does:**
- Certbot will check for renewal twice daily
- Automatically renews certificates 30 days before expiration
- No manual intervention needed!

---

### Step 3.12: Test HTTPS and Microphone Access! 🎉

#### Test 1: HTTPS Works

**In your browser, visit:**
```
https://v-kare.co.in
```

**You should see:**
- ✅ **Padlock icon** 🔒 in the address bar
- ✅ URL shows "https://" (not "http://")
- ✅ No security warnings
- ✅ Your Vkare landing page loads

**Click the padlock icon:**
- Should show "Connection is secure"
- Certificate valid
- Issued by: Let's Encrypt

#### Test 2: HTTP Redirects to HTTPS

**Visit:**
```
http://v-kare.co.in
```

**Should automatically redirect to:**
```
https://v-kare.co.in
```

#### Test 3: WWW Works

**Visit:**
```
https://www.v-kare.co.in
```

**Should also work with HTTPS and padlock!**

#### Test 4: Microphone Access (THE MAIN GOAL!)

1. **Visit:** `https://v-kare.co.in`
2. **Click "Login"**
3. **Login** with your account (or create new account)
4. **Go to User Dashboard**
5. **Click the microphone icon** 🎤

**Expected behavior:**
- ✅ Browser asks: "v-kare.co.in wants to use your microphone"
- ✅ Click **"Allow"**
- ✅ Microphone icon becomes active
- ✅ **NO MORE "Microphone access denied" error!**

6. **Record a test message**
   - Say something like "Hello, I'm testing the voice feature"
   - Stop recording

7. **Verify AI pipeline:**
   - ✅ STT transcribes your speech
   - ✅ LLM generates response
   - ✅ TTS converts to audio
   - ✅ You hear the AI response!

**🎉 SUCCESS! Your application is fully deployed!**

---

## Post-Deployment

### Verify Everything is Working

Run these checks:

```bash
# SSH to EC2
ssh -i C:\Users\aayus\Downloads\vkare-key.pem ubuntu@13.61.186.207

# Check all containers
cd ~/vkare
docker compose -f docker-compose.prod.yml ps

# Expected: All show "Up (healthy)"

# Check Nginx host service
sudo systemctl status nginx

# Expected: Active (running)

# Check SSL certificate
sudo certbot certificates

# Expected: Shows certificate valid until 2026-01-19

# Check auto-renewal timer
sudo systemctl status certbot.timer

# Expected: Active (waiting)
```

---

### Architecture Summary

**What's running:**

```
Port 80 (HTTP)  → Nginx Host → Redirects to HTTPS
Port 443 (HTTPS) → Nginx Host → SSL Termination → Port 8085 (Docker Nginx)
                                                   ↓
                                                Backend :9000
                                                Orchestrator :8000
                                                STT :8001
                                                LLM :8002
                                                TTS :8003
```

**Traffic flow:**
1. User visits `https://v-kare.co.in`
2. DNS resolves to EC2 public IP
3. Request hits EC2 port 443 (HTTPS)
4. Host Nginx decrypts SSL
5. Proxies to Docker Nginx on port 8085
6. Docker Nginx serves static files OR proxies to backend services
7. Response returns encrypted via SSL

---

### Your Live System

**Public URL:** https://v-kare.co.in
**Status:** ✅ LIVE and accessible worldwide
**SSL Certificate:** Valid until 2026-01-19 (auto-renews)
**Cost:** ~$1/month (first year)

**Anyone can now:**
- Visit your domain
- Create account
- Login
- Use voice AI therapy
- Access all features

---

## Monitoring and Maintenance

### Daily Checks

**Check service health:**
```bash
ssh -i vkare-key.pem ubuntu@YOUR_EC2_IP
cd ~/vkare
docker compose -f docker-compose.prod.yml ps
```

All should show "Up (healthy)".

---

### View Logs

**All services:**
```bash
docker compose -f docker-compose.prod.yml logs -f
```

Press `Ctrl + C` to stop following.

**Specific service:**
```bash
docker compose -f docker-compose.prod.yml logs -f orchestrator
docker compose -f docker-compose.prod.yml logs -f stt
docker compose -f docker-compose.prod.yml logs -f llm-core
```

**Last 50 lines:**
```bash
docker compose -f docker-compose.prod.yml logs --tail=50 orchestrator
```

**Search for errors:**
```bash
docker compose -f docker-compose.prod.yml logs | grep -i error
docker compose -f docker-compose.prod.yml logs | grep -i exception
```

---

### Restart Services

**Restart all:**
```bash
cd ~/vkare
docker compose -f docker-compose.prod.yml restart
```

**Restart specific service:**
```bash
docker compose -f docker-compose.prod.yml restart orchestrator
docker compose -f docker-compose.prod.yml restart backend
```

**Stop all:**
```bash
docker compose -f docker-compose.prod.yml down
```

**Start all:**
```bash
docker compose -f docker-compose.prod.yml up -d
```

---

### Update Application Code

**When you push new code to GitHub:**

```bash
# SSH to EC2
ssh -i vkare-key.pem ubuntu@YOUR_EC2_IP

# Navigate to project
cd ~/vkare

# Pull latest code
git pull origin AWS

# Rebuild images
docker compose -f docker-compose.prod.yml build

# Restart with new code
docker compose -f docker-compose.prod.yml up -d
```

---

### Backup Database

**Your SQLite database is in the backend container:**

```bash
# Create backup directory
mkdir -p ~/backups

# Backup database
docker compose -f ~/vkare/docker-compose.prod.yml exec backend cp /app/data.db /tmp/backup_$(date +%Y%m%d).db

# Copy to EC2 host
docker cp $(docker compose -f ~/vkare/docker-compose.prod.yml ps -q backend):/tmp/backup_$(date +%Y%m%d).db ~/backups/

# List backups
ls -lh ~/backups/
```

**Download backup to your computer:**
```powershell
# On Windows
scp -i C:\Users\aayus\Downloads\vkare-key.pem ubuntu@YOUR_EC2_IP:~/backups/backup_YYYYMMDD.db C:\Users\aayus\Downloads\
```

**Automated daily backups:**

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

# Keep only last 7 days
find $BACKUP_DIR -name "data_*.db" -mtime +7 -delete

echo "Backup completed: data_${TIMESTAMP}.db"
EOF

chmod +x ~/backup.sh

# Add to crontab (daily at 2 AM UTC)
(crontab -l 2>/dev/null; echo "0 2 * * * ~/backup.sh") | crontab -

# Verify crontab
crontab -l
```

---

### View User Signups

**Query database for user count:**

```bash
# Total users
docker compose -f ~/vkare/docker-compose.prod.yml exec backend sqlite3 /app/data.db "SELECT COUNT(*) as total_users FROM users;"

# Users by role
docker compose -f ~/vkare/docker-compose.prod.yml exec backend sqlite3 /app/data.db "SELECT role, COUNT(*) as count FROM users GROUP BY role;"

# Recent signups (last 10)
docker compose -f ~/vkare/docker-compose.prod.yml exec backend sqlite3 /app/data.db "SELECT email, firstName, lastName, role, createdAt FROM users ORDER BY createdAt DESC LIMIT 10;"

# All user details
docker compose -f ~/vkare/docker-compose.prod.yml exec backend sqlite3 /app/data.db "SELECT * FROM users;"
```

**Interactive database shell:**
```bash
docker compose -f ~/vkare/docker-compose.prod.yml exec backend sqlite3 /app/data.db
```

Then run SQL queries:
```sql
SELECT COUNT(*) FROM users;
SELECT * FROM users;
.quit
```

---

### Monitor Resource Usage

**Check disk space:**
```bash
df -h
```

**Check memory:**
```bash
free -h
```

**Check Docker container resources:**
```bash
docker stats
```

**Check system load:**
```bash
htop
```

Press `q` to exit.

---

### SSL Certificate Management

**Check certificate status:**
```bash
sudo certbot certificates
```

**Manual renewal (if needed):**
```bash
sudo certbot renew
```

**Test renewal:**
```bash
sudo certbot renew --dry-run
```

**Certificate location:**
```
/etc/letsencrypt/live/v-kare.co.in/fullchain.pem
/etc/letsencrypt/live/v-kare.co.in/privkey.pem
```

---

## Cost Estimate

### Monthly AWS Costs

**First 12 Months (Free Tier):**

| Service | Configuration | Monthly Cost |
|---------|--------------|--------------|
| EC2 m7i-flex.large | 750 hours/month | **$0** (Free tier) |
| EBS Storage | 30 GB gp3 | **$0** (Free tier 30GB) |
| Data Transfer Out | Up to 100 GB | **$0** (Free tier) |
| Route 53 Hosted Zone | 1 zone | $0.50 |
| Route 53 DNS Queries | 1M queries | $0.40 |
| SSL Certificate (Let's Encrypt) | Auto-renewal | **$0** (Forever free) |
| **TOTAL** | | **~$1/month** |

**After First Year:**

| Service | Configuration | Monthly Cost |
|---------|--------------|--------------|
| EC2 m7i-flex.large | On-Demand, 730 hours | ~$60 |
| EBS Storage | 30 GB gp3 | ~$2.40 |
| Data Transfer Out | 100 GB | ~$9 |
| Route 53 | Hosted zone + queries | ~$1 |
| **TOTAL** | | **~$72/month** |

### Ways to Reduce Costs After Free Tier:

1. **Use EC2 Reserved Instances**
   - 1-year commitment: Save 30-40%
   - 3-year commitment: Save up to 60%
   - Predictable workload only

2. **Use Spot Instances (Development)**
   - Save up to 90%
   - Can be terminated by AWS
   - Good for dev/test environments

3. **Downgrade Instance Type**
   - t3a.medium (4GB RAM): ~$30/month
   - May struggle under load
   - Monitor performance before downgrading

4. **Stop Instance During Off-Hours**
   - Stop EC2 when not in use
   - Only pay for storage (~$2/month)
   - Good for demos/MVP

5. **Setup Auto Scaling**
   - Scale down during low traffic
   - Scale up during peak hours
   - Pay only for what you use

---

## Troubleshooting

### Issue: Can't SSH to EC2

**Symptom:** `ssh: connect to host X.X.X.X port 22: Connection timed out`

**Causes:**
1. Security group not allowing SSH from your IP
2. Your IP address changed
3. EC2 instance not running

**Solutions:**

1. **Check EC2 is running:**
   - AWS Console → EC2 → Instances
   - Instance state should be "Running"

2. **Fix security group:**
   - Select instance → Security tab
   - Click security group name
   - Edit inbound rules
   - SSH rule → Source: **My IP** (auto-detects)
   - Save rules

3. **Check your current IP:**
   - Visit https://whatismyipaddress.com/
   - Update security group with new IP if changed

4. **Wait 30 seconds, retry SSH**

---

### Issue: Docker Containers Won't Start

**Symptom:** `docker compose ps` shows "Exited" or containers keep restarting

**Solutions:**

1. **Check logs:**
   ```bash
   docker compose -f docker-compose.prod.yml logs stt
   docker compose -f docker-compose.prod.yml logs orchestrator
   ```

2. **Common issues:**

   **Missing .env.production:**
   ```bash
   ls -la ~/vkare/.env.production
   # If not found, upload it again (Step 2.2)
   ```

   **Invalid API keys:**
   - Check Azure OpenAI endpoints and keys
   - Verify Maya API key
   - Edit: `nano ~/vkare/.env.production`

   **Out of memory:**
   ```bash
   free -h
   # If low on memory, restart instance or upgrade
   ```

   **Port conflicts:**
   ```bash
   sudo netstat -tlnp | grep :80
   sudo netstat -tlnp | grep :8085
   # Kill conflicting processes
   ```

3. **Restart from scratch:**
   ```bash
   docker compose -f docker-compose.prod.yml down
   docker compose -f docker-compose.prod.yml up -d
   ```

---

### Issue: SSL Certificate Failed

**Symptom:** `certbot certonly` fails with errors

**Error:** "Failed to connect to domain"

**Causes:**
- DNS not propagated yet
- Domain not pointing to EC2 IP

**Solutions:**
1. Verify DNS:
   ```bash
   nslookup v-kare.co.in
   # Should return your EC2 IP
   ```

2. Wait 10-30 minutes for DNS propagation

3. Check Nginx is running:
   ```bash
   sudo systemctl status nginx
   ```

4. Retry certificate:
   ```bash
   sudo certbot certonly --nginx -d v-kare.co.in -d www.v-kare.co.in --email your@email.com --agree-tos --no-eff-email
   ```

---

### Issue: HTTPS Not Working

**Symptom:** "This site can't be reached" or "Connection refused"

**Solutions:**

1. **Check security group has port 443:**
   - EC2 → Security Groups → vkare-sg
   - Should have HTTPS (443) from 0.0.0.0/0

2. **Check host Nginx is running:**
   ```bash
   sudo systemctl status nginx
   ```

3. **Check Nginx configuration:**
   ```bash
   sudo nginx -t
   # Should say "test is successful"
   ```

4. **Check SSL certificate exists:**
   ```bash
   sudo ls -la /etc/letsencrypt/live/v-kare.co.in/
   # Should show fullchain.pem and privkey.pem
   ```

5. **Restart Nginx:**
   ```bash
   sudo systemctl restart nginx
   ```

---

### Issue: Microphone Still Not Working

**Symptom:** "Microphone access denied" even with HTTPS

**Solutions:**

1. **Verify you're on HTTPS:**
   - URL should show `https://` (not `http://`)
   - Padlock icon should be visible

2. **Check browser permissions:**
   - Click padlock icon
   - Permissions → Microphone → Allow

3. **Try different browser:**
   - Chrome/Edge (best support)
   - Firefox (good support)
   - Safari (limited support)

4. **Check browser console:**
   - Press F12 → Console tab
   - Look for permission errors

5. **Clear browser cache:**
   - Ctrl+Shift+Delete
   - Clear cached images and files
   - Reload page

---

### Issue: High Latency / Slow Responses

**Symptom:** Voice responses take a long time

**Causes:**
- Azure OpenAI rate limits
- Network latency
- Insufficient resources

**Solutions:**

1. **Check Azure OpenAI quotas:**
   - Azure Portal → Cognitive Services
   - Check rate limits and quotas

2. **Monitor container resources:**
   ```bash
   docker stats
   ```
   - If CPU/Memory near 100%, upgrade instance

3. **Check orchestrator logs:**
   ```bash
   docker compose -f docker-compose.prod.yml logs orchestrator | tail -100
   ```

4. **Upgrade instance type:**
   - Stop instance
   - Actions → Instance settings → Change instance type
   - Select m7i-flex.xlarge (16GB RAM)
   - Start instance

---

### Issue: Out of Disk Space

**Symptom:** "No space left on device"

**Solutions:**

1. **Check disk usage:**
   ```bash
   df -h
   # Look for / partition usage
   ```

2. **Clean Docker:**
   ```bash
   # Remove unused images
   docker system prune -a

   # Remove unused volumes
   docker volume prune
   ```

3. **Clean logs:**
   ```bash
   # Truncate large log files
   sudo truncate -s 0 /var/log/nginx/access.log
   sudo truncate -s 0 /var/log/nginx/error.log
   ```

4. **Increase EBS volume:**
   - EC2 → Volumes
   - Select volume → Actions → Modify
   - Increase size to 50 GB
   - Reboot instance

---

## Team Member Checklist

### For New Team Members Deploying from Scratch:

**Pre-Deployment (10 minutes):**
- [ ] AWS account created and verified
- [ ] Domain purchased (e.g., GoDaddy)
- [ ] Azure OpenAI API keys obtained
- [ ] Maya TTS API key obtained
- [ ] Git repository cloned locally
- [ ] `.env.production` file created (NOT committed to Git)

**Phase 1: EC2 Setup (30 minutes):**
- [ ] EC2 instance created (m7i-flex.large, Ubuntu 24.04)
- [ ] Key pair downloaded (vkare-key.pem)
- [ ] Security group configured (SSH, HTTP, HTTPS)
- [ ] SSH connection successful
- [ ] Docker and Docker Compose installed
- [ ] Verified: `docker --version` and `docker compose version`

**Phase 2: Application Deployment (20 minutes):**
- [ ] Repository cloned to EC2 (`~/vkare`)
- [ ] `.env.production` uploaded to EC2
- [ ] Docker images built successfully
- [ ] All 6 containers started
- [ ] All containers show "healthy" status
- [ ] Application accessible via `http://EC2_IP/`

**Phase 3: SSL and Domain (60 minutes):**
- [ ] DNS A records created (@ and www → EC2 IP)
- [ ] DNS propagation verified (can access via domain)
- [ ] Security group has HTTPS (443) rule
- [ ] Certbot installed
- [ ] SSL certificate obtained from Let's Encrypt
- [ ] Host Nginx configured with SSL
- [ ] Docker Nginx port changed to 8085
- [ ] All containers restarted
- [ ] HTTPS working with padlock icon
- [ ] HTTP redirects to HTTPS
- [ ] SSL auto-renewal configured

**Post-Deployment Verification:**
- [ ] https://your-domain.com loads with padlock
- [ ] Login works
- [ ] User dashboard accessible
- [ ] Microphone permission requested
- [ ] Voice recording works
- [ ] AI responds with voice
- [ ] All 6 containers healthy: `docker compose ps`
- [ ] Nginx host running: `sudo systemctl status nginx`
- [ ] SSL certificate valid: `sudo certbot certificates`

**Documentation:**
- [ ] EC2 public IP documented
- [ ] Domain name documented
- [ ] SSH key stored securely
- [ ] `.env.production` backed up (NOT in Git!)
- [ ] Team notified of deployment URL

---

## Quick Reference Commands

### SSH to EC2
```bash
ssh -i ~/Downloads/vkare-key.pem ubuntu@YOUR_EC2_IP
```

### Check Container Status
```bash
cd ~/vkare
docker compose -f docker-compose.prod.yml ps
```

### View Logs
```bash
docker compose -f docker-compose.prod.yml logs -f
docker compose -f docker-compose.prod.yml logs orchestrator --tail=50
```

### Restart Services
```bash
docker compose -f docker-compose.prod.yml restart
docker compose -f docker-compose.prod.yml restart orchestrator
```

### Update Code
```bash
cd ~/vkare
git pull origin AWS
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

### Backup Database
```bash
docker compose -f ~/vkare/docker-compose.prod.yml exec backend cp /app/data.db /tmp/backup.db
docker cp $(docker compose -f ~/vkare/docker-compose.prod.yml ps -q backend):/tmp/backup.db ~/backup_$(date +%Y%m%d).db
```

### Check SSL Certificate
```bash
sudo certbot certificates
```

### Test SSL Renewal
```bash
sudo certbot renew --dry-run
```

### Check System Resources
```bash
df -h                # Disk space
free -h              # Memory
docker stats         # Container resources
htop                 # System monitor
```

---

## Summary

**What We Built:**
- ✅ Production-ready AI therapy platform
- ✅ 6 microservices architecture
- ✅ HTTPS with free SSL certificate
- ✅ Custom domain (v-kare.co.in)
- ✅ Auto-scaling Docker containers
- ✅ Automated SSL renewal
- ✅ Voice AI capabilities (STT, LLM, TTS)

**Infrastructure:**
- AWS EC2 m7i-flex.large (8GB RAM)
- Ubuntu 24.04 LTS
- Docker + Docker Compose
- Nginx (host) for SSL termination
- Nginx (container) for app serving
- Let's Encrypt SSL certificate
- GoDaddy DNS

**Cost:**
- First year: ~$1/month
- After free tier: ~$72/month

**Live URL:** https://v-kare.co.in

**Team Access:**
Anyone with this guide can:
- Deploy from scratch in 2-3 hours
- Maintain and update the system
- Monitor and troubleshoot issues
- Scale as needed

---

**Deployment Guide Version:** 2.0 (Actual Production Deployment)
**Last Updated:** 2025-10-21
**Deployed By:** Aayush Katariya
**Deployment Date:** October 21, 2025
**Status:** ✅ LIVE and OPERATIONAL

---

## Support and Resources

**For Questions:**
- Review this guide thoroughly
- Check Troubleshooting section
- Review logs: `docker compose logs`

**External Documentation:**
- AWS EC2: https://docs.aws.amazon.com/ec2/
- Docker: https://docs.docker.com/
- Let's Encrypt: https://letsencrypt.org/docs/
- Nginx: https://nginx.org/en/docs/

**Monitoring:**
- Check application: https://v-kare.co.in
- Check SSL: https://www.ssllabs.com/ssltest/
- Check DNS: https://dnschecker.org/

---

🎉 **Congratulations on deploying Vkare to production!** 🎉
