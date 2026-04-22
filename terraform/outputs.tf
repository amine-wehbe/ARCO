# All key values printed after terraform apply completes

output "app_url" {
  description = "Live ARCO URL — open this in the browser"
  value       = "https://${aws_cloudfront_distribution.arco.domain_name}"
}

output "ec2_public_ip" {
  description = "EC2 Elastic IP (same as nip.io origin used by CloudFront)"
  value       = aws_eip.ec2.public_ip
}

output "ssh_command" {
  description = "Command to SSH into the EC2 instance"
  value       = "ssh -i terraform/arco-key.pem ec2-user@${aws_eip.ec2.public_ip}"
}

output "cognito_user_pool_id" {
  description = "Cognito User Pool ID — set as COGNITO_USER_POOL_ID on the server"
  value       = aws_cognito_user_pool.arco.id
}

output "cognito_client_id" {
  description = "Cognito App Client ID — set as COGNITO_CLIENT_ID on the server"
  value       = aws_cognito_user_pool_client.arco.id
}

output "s3_bucket_name" {
  description = "S3 bucket holding the compiled frontend"
  value       = aws_s3_bucket.frontend.bucket
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID (used for cache invalidations)"
  value       = aws_cloudfront_distribution.arco.id
}
