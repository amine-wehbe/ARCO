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

variable "github_repo" {
  description = "Public GitHub URL cloned onto EC2 during bootstrap"
  type        = string
  default     = "https://github.com/amine-wehbe/ARCO.git"
}
