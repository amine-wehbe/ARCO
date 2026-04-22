#!/bin/bash
# Bootstrap script — installs Node 18 + PM2, clones ARCO, writes .env, starts server
set -euxo pipefail

# Install Node.js 18 via NodeSource and git
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs git

# Install PM2 globally for process management and auto-restart
npm install -g pm2

# Clone the repository into the ec2-user home directory
cd /home/ec2-user
git clone ${github_repo} ARCO
chown -R ec2-user:ec2-user ARCO

# Install all server-side Node dependencies
cd /home/ec2-user/ARCO/arco/server
npm install

# Write the server .env file with Terraform-injected values
# Single-quoted heredoc prevents bash from expanding $$ — values are already substituted by Terraform
cat > /home/ec2-user/ARCO/arco/server/.env << 'ENVEOF'
COGNITO_USER_POOL_ID=${cognito_user_pool_id}
COGNITO_CLIENT_ID=${cognito_client_id}
AWS_REGION=${aws_region}
ALLOWED_ORIGIN=${allowed_origin}
PORT=3000
ENVEOF

chown ec2-user:ec2-user /home/ec2-user/ARCO/arco/server/.env

# Start the Express server under ec2-user via PM2
sudo -u ec2-user bash -c "
  cd /home/ec2-user/ARCO/arco/server
  pm2 start index.js --name arco-server
  pm2 save
"

# Register PM2 as a systemd service so it survives reboots
env PATH=\$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ec2-user --hp /home/ec2-user
