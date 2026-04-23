
#!/bin/bash
# Bootstrap script — installs Node + PM2, clones ARCO, writes .env, starts server
set -euxo pipefail

# Base packages
yum update -y
yum install -y git

# Write env file first as root, then copy it later
cat > /home/ec2-user/.arco_env <<'ENVEOF'
COGNITO_USER_POOL_ID=${cognito_user_pool_id}
COGNITO_CLIENT_ID=${cognito_client_id}
AWS_REGION=${aws_region}
ALLOWED_ORIGIN=${allowed_origin}
PORT=3000
ENVEOF

chown ec2-user:ec2-user /home/ec2-user/.arco_env

# Everything Node/npm/pm2-related runs as ec2-user with nvm loaded
sudo -u ec2-user -i <<'EOF'
export HOME=/home/ec2-user

curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
export NVM_DIR="$HOME/.nvm"
source "$NVM_DIR/nvm.sh"

nvm install 16
nvm use 16
nvm alias default 16

npm install -g pm2

cd /home/ec2-user
rm -rf ARCO
git clone https://github.com/amine-wehbe/ARCO.git ARCO

cd /home/ec2-user/ARCO/server
cp /home/ec2-user/.arco_env /home/ec2-user/ARCO/server/.env
npm install
pm2 start index.js --name arco-server
pm2 save
EOF