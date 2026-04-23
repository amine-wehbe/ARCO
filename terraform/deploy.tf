# Automatically builds the React frontend and deploys it to S3 after infra is ready
resource "null_resource" "frontend_deploy" {

  # Re-run if the CloudFront domain or bucket ever changes
  triggers = {
    cloudfront_domain = aws_cloudfront_distribution.arco.domain_name
    bucket_name       = aws_s3_bucket.frontend.bucket
  }

  depends_on = [
    aws_cloudfront_distribution.arco,
    aws_s3_bucket_policy.frontend,
    aws_eip_association.ec2,
  ]

  provisioner "local-exec" {
  working_dir = "${path.module}/.."

  interpreter = ["C:/Program Files/Git/bin/bash.exe", "-c"]

  command = <<-EOT
    set -e
    echo "VITE_API_BASE_URL=https://${aws_cloudfront_distribution.arco.domain_name}" > .env
    npm install
    npm run build
    aws s3 sync dist/ s3://${aws_s3_bucket.frontend.bucket} --delete
    aws cloudfront create-invalidation --distribution-id ${aws_cloudfront_distribution.arco.id} --paths "/*"
  EOT
}
}
