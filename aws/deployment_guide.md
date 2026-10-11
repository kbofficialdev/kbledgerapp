# KB Khata — AWS Cloud Deployment Guide

This document provides step-by-step instructions to deploy **KB Khata** to Amazon Web Services (AWS) in production with high availability, secure PhonePe webhook handling, and daily automated PostgreSQL backups.

---

## 1. Architectural Options on AWS

### Option A: AWS App Runner + AWS RDS PostgreSQL (Recommended)
- **Best For**: Zero server management, auto-scaling, automatic HTTPS SSL certificates.
- **Components**:
  - **Database**: Amazon RDS PostgreSQL 16 (`db.t4g.micro` or `db.t4g.small` in Single-AZ or Multi-AZ).
  - **Application**: AWS App Runner connected directly to your GitHub repository or Amazon ECR container registry.
  - **Networking**: VPC Connector allowing App Runner to securely communicate with private RDS instance.

### Option B: AWS EC2 + Docker Compose + Nginx + Certbot (Cost Effective)
- **Best For**: Maximum control, fixed low monthly cost (t4g.small / t3.small ~\$12-15/month).
- **Components**:
  - 1x EC2 Instance (Ubuntu 22.04 or 24.04 LTS).
  - Docker & Docker Compose running both application container and PostgreSQL 16 container with persistent EBS volumes.
  - Nginx reverse proxy with automated Let's Encrypt SSL.

---

## 2. Step-by-Step Deployment (Option B: AWS EC2 Production)

### Step 1: Launch EC2 Instance & Configure Security Group
1. In the AWS Management Console, launch an **Ubuntu 24.04 LTS** instance:
   - Instance Type: `t4g.small` (ARM Graviton) or `t3.small` (x86).
   - Storage: 30 GB gp3 root volume.
2. Configure Security Group Inbound Rules:
   - Port 22 (SSH): Your IP address
   - Port 80 (HTTP): `0.0.0.0/0`
   - Port 443 (HTTPS): `0.0.0.0/0` (Critical for PhonePe Webhook and Webcam WebRTC SSL requirement)

### Step 2: SSH into EC2 & Install Docker
```bash
ssh -i your-key.pem ubuntu@your-ec2-ip

# Update packages and install Docker
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose git nginx certbot python3-certbot-nginx
sudo usermod -aG docker ubuntu
newgrp docker
```

### Step 3: Clone Repository & Configure Environment
```bash
git clone <your-git-repo-url> /home/ubuntu/kb-khata
cd /home/ubuntu/kb-khata

# Create production .env file
nano .env
```

Set your production variables in `.env`:
```env
DATABASE_URL="postgresql://kbadmin:<STRONG_PASSWORD>@postgres:5432/kb_khata?schema=public"
NEXT_PUBLIC_APP_URL="https://yourshopdomain.com"

# PhonePe Production Credentials
PHONEPE_MERCHANT_ID="<YOUR_PHONEPE_PRODUCTION_MERCHANT_ID>"
PHONEPE_SALT_KEY="<YOUR_PHONEPE_PRODUCTION_SALT_KEY>"
PHONEPE_SALT_INDEX="1"
PHONEPE_ENV="PRODUCTION"
PHONEPE_HOST_URL="https://api.phonepe.com/apis/hermes"

# Admin Authentication
ADMIN_SECRET="<GENERATE_RANDOM_64_CHAR_STRING>"
ADMIN_FALLBACK_PIN="<6_DIGIT_PIN>"
```

### Step 4: Run Database Migrations & Start Containers
```bash
docker-compose build
docker-compose up -d

# Check logs
docker-compose logs -f app
```

### Step 5: Configure Nginx & SSL Certificate
Create `/etc/nginx/sites-available/kb-khata`:
```nginx
server {
    server_name yourshopdomain.com www.yourshopdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site and acquire SSL:
```bash
sudo ln -s /etc/nginx/sites-available/kb-khata /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# Install free auto-renewing SSL certificate
sudo certbot --nginx -d yourshopdomain.com -d www.yourshopdomain.com
```

> **Why HTTPS is Mandatory**:
> 1. Modern browsers strictly block Webcam (`navigator.mediaDevices.getUserMedia`) over non-HTTPS origins (except localhost).
> 2. PhonePe Webhooks require an HTTPS callback endpoint (`https://yourshopdomain.com/api/payments/phonepe/webhook`).

---

## 3. PhonePe Webhook Setup in Merchant Dashboard

1. Log into your [PhonePe Business Dashboard](https://business.phonepe.com/).
2. Navigate to **Developer Settings -> Webhook Configuration**.
3. Add your Webhook URL:
   `https://yourshopdomain.com/api/payments/phonepe/webhook`
4. Test the webhook connection using the PhonePe simulator.
5. In **KB Khata**, all incoming payments will automatically reconcile against the customer's bahi-khata ledger!

---

## 4. Automated Daily Database Backups to AWS S3

Create a backup script `/home/ubuntu/backup_db.sh`:
```bash
#!/bin/bash
BACKUP_DIR="/home/ubuntu/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="kb_khata_${TIMESTAMP}.sql.gz"

mkdir -p $BACKUP_DIR
docker exec -t kb_khata_db pg_dump -U kbadmin kb_khata | gzip > "$BACKUP_DIR/$FILENAME"

# Optional: Upload to private S3 bucket
# aws s3 cp "$BACKUP_DIR/$FILENAME" "s3://your-shop-db-backups/$FILENAME"

# Delete backups older than 30 days
find $BACKUP_DIR -type f -name "*.sql.gz" -mtime +30 -delete
```

Add to crontab:
```bash
crontab -e
# Runs daily at 1:00 AM IST
0 1 * * * /home/ubuntu/backup_db.sh
```
