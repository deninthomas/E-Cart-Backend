# AWS Deployment Guide

This guide provides step-by-step instructions for deploying the application on AWS infrastructure.

## Prerequisites

1. AWS Account with appropriate permissions
2. AWS CLI configured with your credentials
3. Node.js and npm installed on your EC2 instance
4. PM2 installed globally (`npm install -g pm2`)
5. Git installed on your EC2 instance

## 1. S3 Bucket Setup

1. Log in to the AWS Management Console
2. Navigate to S3 service
3. Click "Create bucket"
4. Enter a unique bucket name (e.g., `your-app-uploads-{random-string}`)
5. Select the AWS Region where you want to create the bucket
6. Uncheck "Block all public access" and acknowledge the warning
7. Click "Create bucket"

### Configure CORS (Cross-Origin Resource Sharing)

1. Select your bucket and go to the "Permissions" tab
2. Scroll down to "Cross-origin resource sharing (CORS)" and click "Edit"
3. Add the following CORS configuration:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "POST", "PUT", "DELETE", "HEAD"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag"]
  }
]
```

## 2. IAM User Setup

1. Go to IAM service in AWS Console
2. Click "Users" and then "Add user"
3. Enter a user name (e.g., `s3-uploader-user`)
4. Select "Programmatic access"
5. Click "Next: Permissions"
6. Click "Attach existing policies directly"
7. Search for and select "AmazonS3FullAccess"
8. Click "Next: Tags" (optional)
9. Click "Next: Review"
10. Click "Create user"
11. **Important**: Download the CSV file containing the access key ID and secret access key

## 3. EC2 Instance Setup

### Launch an EC2 Instance

1. Go to EC2 service in AWS Console
2. Click "Launch Instance"
3. Choose an Amazon Machine Image (AMI):
   - Select "Amazon Linux 2 AMI" (free tier eligible)
4. Choose an Instance Type:
   - Select "t2.micro" (free tier eligible)
5. Click "Next: Configure Instance Details"
6. Configure instance details:
   - Number of instances: 1 (you'll scale later)
   - Network: Select your VPC
   - Subnet: Select a public subnet
   - Auto-assign Public IP: Enable
7. Click "Next: Add Storage"
8. Modify storage if needed (8GB is usually enough for testing)
9. Click "Next: Add Tags"
10. Add a tag with Key=Name and Value=your-app-name
11. Click "Next: Configure Security Group"
12. Configure security group:
    - Create a new security group
    - Add the following rules:
      - Type: SSH, Protocol: TCP, Port: 22, Source: My IP
      - Type: HTTP, Protocol: TCP, Port: 80, Source: 0.0.0.0/0
      - Type: Custom TCP, Protocol: TCP, Port: 3000, Source: 0.0.0.0/0
13. Click "Review and Launch"
14. Click "Launch"
15. Select an existing key pair or create a new one
16. Click "Launch Instances"

### Connect to EC2 Instance

1. In the EC2 console, select your instance
2. Click "Connect"
3. Follow the SSH connection instructions

### Install Dependencies

```bash
# Update packages
sudo yum update -y

# Install Node.js 16.x
curl -sL https://rpm.nodesource.com/setup_16.x | sudo bash -
sudo yum install -y nodejs

# Install Git
sudo yum install -y git

# Install PM2 globally
sudo npm install -g pm2

# Install Nginx
sudo amazon-linux-extras install nginx1 -y
```

## 4. Application Deployment

### Clone and Set Up the Application

```bash
# Clone your repository
cd ~
git clone <your-repository-url>
cd your-repo/backend

# Install dependencies
npm install

# Create .env file
nano .env
```

### Configure Environment Variables

Edit the `.env` file with your AWS credentials and other settings:

```env
# Server Configuration
PORT=3000
NODE_ENV=production

# AWS Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=your_aws_region
S3_BUCKET_NAME=your_s3_bucket_name

# CORS Configuration (optional)
ALLOWED_ORIGINS=https://your-frontend-domain.com,http://localhost:3000

# Request Limits
REQUEST_BODY_LIMIT=10mb
```

### Start the Application with PM2

```bash
# Start the application
pm2 start server.js --name "your-app-name"

# Configure PM2 to start on system boot
pm2 startup
pm2 save

# Check application logs
pm2 logs your-app-name
```

## 5. Configure Nginx as Reverse Proxy

```bash
# Edit Nginx configuration
sudo nano /etc/nginx/conf.d/your-app.conf
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Test and restart Nginx:

```bash
# Test Nginx configuration
sudo nginx -t

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

## 6. Set Up Application Load Balancer (ALB)

1. Go to EC2 service in AWS Console
2. Click "Load Balancers" in the left sidebar
3. Click "Create Load Balancer"
4. Select "Application Load Balancer"
5. Configure Load Balancer:
   - Name: your-app-alb
   - Scheme: internet-facing
   - IP address type: ipv4
6. Listeners: HTTP:80
7. Availability Zones: Select at least 2 AZs
8. Click "Next: Configure Security Settings" (skip the warning for now)
9. Configure Security Groups:
   - Select an existing security group or create a new one
   - Ensure it allows HTTP (port 80) traffic from 0.0.0.0/0
10. Configure Routing:
    - Target group: new target group
    - Name: your-app-tg
    - Protocol: HTTP
    - Port: 3000
    - Health check path: /health
11. Register Targets:
    - Select your EC2 instance
    - Click "Add to registered"
12. Click "Next: Review"
13. Click "Create"

## 7. Auto Scaling Setup

1. Go to EC2 service in AWS Console
2. Click "Auto Scaling Groups" in the left sidebar
3. Click "Create Auto Scaling group"
4. Choose "Launch Template" and create a new one:
   - Name: your-app-template
   - AMI: Select your existing EC2 instance's AMI
   - Instance type: t2.micro
   - Key pair: Select your key pair
   - Security groups: Select your app's security group
   - User data (paste the following, replacing placeholders):
     ```bash
     #!/bin/bash
     cd /home/ec2-user/your-repo/backend
     git pull
     npm install
     pm2 restart all
     ```
5. Configure Auto Scaling group:
   - Group name: your-app-asg
   - Group size: 2
   - VPC and subnets: Select at least 2 subnets in different AZs
6. Configure scaling policies:
   - Target tracking scaling policy: Average CPU Utilization at 70%
   - Min: 2 instances
   - Max: 5 instances
   - Desired: 2 instances
7. Add notifications and tags as needed
8. Click "Create Auto Scaling group"

## 8. Set Up HTTPS (Optional but Recommended)

1. Request an SSL certificate from AWS Certificate Manager (ACM)
2. Update the ALB listener to use HTTPS (port 443) and attach the certificate
3. Redirect HTTP to HTTPS in the ALB
4. Update security groups to allow HTTPS traffic

## 9. Monitoring and Logging

### CloudWatch Logs

```bash
# Install CloudWatch agent
sudo yum install -y awslogs

# Configure CloudWatch agent
sudo nano /etc/awslogs/awslogs.conf

# Add your application log configuration
[/var/log/your-app.log]
file = /home/ec2-user/.pm2/logs/your-app-out.log
log_group_name = /ec2/your-app/application
log_stream_name = {instance_id}

# Start and enable CloudWatch agent
sudo systemctl start awslogsd
sudo systemctl enable awslogsd
```

### PM2 Log Rotation

```bash
# Install PM2 log rotate
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

## 10. Maintenance

### Updating the Application

```bash
# Connect to an EC2 instance
ssh -i your-key.pem ec2-user@your-instance-ip

# Pull latest changes
cd ~/your-repo/backend
git pull
npm install

# Restart the application
pm2 restart all

# Check logs
pm2 logs
```

### Monitoring

1. Use CloudWatch to monitor:
   - CPU utilization
   - Memory usage
   - Request count and latency
   - Error rates
2. Set up CloudWatch Alarms for critical metrics

## Troubleshooting

### Common Issues

1. **EC2 Instance Not Registering with ALB**
   - Check security group rules
   - Verify the target group health check path is correct
   - Ensure the application is running on the configured port

2. **S3 Upload Permission Issues**
   - Verify IAM role policies
   - Check S3 bucket policy
   - Ensure CORS is properly configured

3. **High Latency**
   - Check CloudWatch metrics
   - Consider enabling CloudFront CDN for S3 assets
   - Review database query performance

For additional help, refer to the AWS documentation or contact support.
