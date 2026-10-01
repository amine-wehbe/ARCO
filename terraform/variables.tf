# Input variables — all have defaults so terraform apply works with zero configuration

variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "eu-west-1"
}

variable "instance_type" {
  description = "EC2 instance type for the backend server"
  type        = string
  default     = "t3.micro"
}

variable "project" {
  description = "Project name used as a prefix on all resource names"
  type        = string
  default     = "arco"
}

variable "ssh_cidr" {
  description = "CIDR allowed to SSH into the EC2 instance — set to your own IP, e.g. 203.0.113.7/32"
  type        = string
  default     = "127.0.0.1/32" # SSH closed by default; override with -var ssh_cidr=$(curl -s ifconfig.me)/32
}

variable "github_repo" {
  description = "Public GitHub URL cloned onto EC2 during bootstrap"
  type        = string
  default     = "https://github.com/amine-wehbe/ARCO.git"
}
