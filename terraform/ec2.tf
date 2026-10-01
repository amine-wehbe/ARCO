# Generate an RSA key pair so the submitter can SSH into the EC2 if needed
resource "tls_private_key" "arco" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

# Register the public key in AWS
resource "aws_key_pair" "arco" {
  key_name   = "${var.project}-key"
  public_key = tls_private_key.arco.public_key_openssh
}

# Write the private key to disk with strict permissions (chmod 600)
resource "local_file" "private_key" {
  content         = tls_private_key.arco.private_key_pem
  filename        = "${path.module}/arco-key.pem"
  file_permission = "0600"
}

# AWS-managed list of CloudFront's origin-facing IP ranges
data "aws_ec2_managed_prefix_list" "cloudfront" {
  name = "com.amazonaws.global.cloudfront.origin-facing"
}

# Security group — SSH only from your IP, app port only reachable through CloudFront
resource "aws_security_group" "ec2" {
  name        = "${var.project}-ec2-sg"
  description = "ARCO EC2 - SSH (22) and app (3000)"

  ingress {
    description = "SSH (restricted to var.ssh_cidr)"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.ssh_cidr]
  }

  # Without this restriction anyone could hit :3000 directly and bypass CloudFront
  ingress {
    description     = "Node.js app - CloudFront only"
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    prefix_list_ids = [data.aws_ec2_managed_prefix_list.cloudfront.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project}-ec2-sg" }
}

# Latest Amazon Linux 2023 AMI — needed for Node 20 (Amazon Linux 2's glibc tops out at Node 16,
# but the pinned AWS SDK v3 packages require Node >= 20)
data "aws_ami" "amazon_linux_2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-x86_64"]
  }
}

# Elastic IP allocated BEFORE the instance so CloudFront can reference its IP
# without a circular dependency (CloudFront origin → EIP, EC2 user_data → CF domain)
resource "aws_eip" "ec2" {
  domain = "vpc"
  tags   = { Name = "${var.project}-eip" }
}

# EC2 instance — user_data installs Node/PM2, clones the repo, and starts the server
resource "aws_instance" "arco" {
  ami                  = data.aws_ami.amazon_linux_2023.id
  instance_type        = var.instance_type
  key_name             = aws_key_pair.arco.key_name
  iam_instance_profile = aws_iam_instance_profile.ec2.name
  security_groups      = [aws_security_group.ec2.name]

  # Terraform substitutes these values before the script reaches EC2
  user_data = templatefile("${path.module}/userdata.sh", {
    cognito_user_pool_id = aws_cognito_user_pool.arco.id
    cognito_client_id    = aws_cognito_user_pool_client.arco.id
    aws_region           = var.aws_region
    github_repo          = var.github_repo
    allowed_origin       = "https://${aws_cloudfront_distribution.arco.domain_name}"
  })

  tags = { Name = "${var.project}-server" }
}

# Associate the pre-allocated EIP with the instance after it's created
resource "aws_eip_association" "ec2" {
  instance_id   = aws_instance.arco.id
  allocation_id = aws_eip.ec2.id
}
