locals {
  # AWS managed cache/origin-request policy IDs (no need to create custom ones)
  cache_disabled_id         = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad" # CachingDisabled
  cache_optimized_id        = "658327ea-f89d-4fab-a63d-7e88639e58f6" # CachingOptimized
  all_viewer_policy_id      = "216adef6-5edf-4b71-9614-a15a26e67f6f" # AllViewer (forwards all headers incl. Authorization)
  all_viewer_except_host_id = "b689b0a8-53d0-40ab-baf2-68738e2966ac" # AllViewerExceptHostHeader (safe for S3)
}

resource "aws_cloudfront_distribution" "arco" {
  enabled             = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100" # US + Canada + Europe — lowest cost tier

  # EC2 backend origin — uses nip.io because CloudFront rejects raw IPs
  origin {
    origin_id   = "ec2-backend"
    domain_name = "${aws_eip.ec2.public_ip}.nip.io"

    custom_origin_config {
      http_port                = 3000
      https_port               = 443
      origin_protocol_policy   = "http-only"
      origin_ssl_protocols     = ["TLSv1.2"]
      origin_read_timeout      = 60
      origin_keepalive_timeout = 60
    }
  }

  # S3 frontend origin — website endpoint so CloudFront gets index.html redirects
  origin {
    origin_id   = "s3-frontend"
    domain_name = aws_s3_bucket_website_configuration.frontend.website_endpoint

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # /socket.io* — WebSocket handshake; allow-all so the HTTP→WS upgrade passes through
  ordered_cache_behavior {
    path_pattern             = "/socket.io*"
    target_origin_id         = "ec2-backend"
    viewer_protocol_policy   = "allow-all"
    allowed_methods          = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods           = ["GET", "HEAD"]
    cache_policy_id          = local.cache_disabled_id
    origin_request_policy_id = local.all_viewer_policy_id
    compress                 = false
  }

  # /auth* — signup, confirm, login, logout
  ordered_cache_behavior {
    path_pattern             = "/auth*"
    target_origin_id         = "ec2-backend"
    viewer_protocol_policy   = "redirect-to-https"
    allowed_methods          = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods           = ["GET", "HEAD"]
    cache_policy_id          = local.cache_disabled_id
    origin_request_policy_id = local.all_viewer_policy_id
    compress                 = true
  }

  # /scores* — submit score + leaderboard queries
  ordered_cache_behavior {
    path_pattern             = "/scores*"
    target_origin_id         = "ec2-backend"
    viewer_protocol_policy   = "redirect-to-https"
    allowed_methods          = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods           = ["GET", "HEAD"]
    cache_policy_id          = local.cache_disabled_id
    origin_request_policy_id = local.all_viewer_policy_id
    compress                 = true
  }

  # /users* — profile create, fetch, patch
  ordered_cache_behavior {
    path_pattern             = "/users*"
    target_origin_id         = "ec2-backend"
    viewer_protocol_policy   = "redirect-to-https"
    allowed_methods          = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods           = ["GET", "HEAD"]
    cache_policy_id          = local.cache_disabled_id
    origin_request_policy_id = local.all_viewer_policy_id
    compress                 = true
  }

  # /admin* — admin stats, Bearer-gated server-side
  ordered_cache_behavior {
    path_pattern             = "/admin*"
    target_origin_id         = "ec2-backend"
    viewer_protocol_policy   = "redirect-to-https"
    allowed_methods          = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods           = ["GET", "HEAD"]
    cache_policy_id          = local.cache_disabled_id
    origin_request_policy_id = local.all_viewer_policy_id
    compress                 = true
  }

  # /stats* — public player count endpoint
  ordered_cache_behavior {
    path_pattern             = "/stats*"
    target_origin_id         = "ec2-backend"
    viewer_protocol_policy   = "redirect-to-https"
    allowed_methods          = ["GET", "HEAD", "OPTIONS"]
    cached_methods           = ["GET", "HEAD"]
    cache_policy_id          = local.cache_disabled_id
    origin_request_policy_id = local.all_viewer_policy_id
    compress                 = true
  }

  # /health — liveness probe
  ordered_cache_behavior {
    path_pattern             = "/health"
    target_origin_id         = "ec2-backend"
    viewer_protocol_policy   = "redirect-to-https"
    allowed_methods          = ["GET", "HEAD"]
    cached_methods           = ["GET", "HEAD"]
    cache_policy_id          = local.cache_disabled_id
    origin_request_policy_id = local.all_viewer_policy_id
    compress                 = true
  }

  # /* default — serve the React SPA from S3
  default_cache_behavior {
    target_origin_id         = "s3-frontend"
    viewer_protocol_policy   = "redirect-to-https"
    allowed_methods          = ["GET", "HEAD"]
    cached_methods           = ["GET", "HEAD"]
    cache_policy_id          = local.cache_optimized_id
    origin_request_policy_id = local.all_viewer_except_host_id
    compress                 = true
  }

  # Return index.html for any 403/404 so client-side routing works
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  # Use the default CloudFront SSL cert (*.cloudfront.net) — no ACM needed
  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = { Name = "${var.project}-distribution" }
}
