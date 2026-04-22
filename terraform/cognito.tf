# Cognito User Pool — email-based sign-up with preferred_username attribute
resource "aws_cognito_user_pool" "arco" {
  name = "${var.project}-user-pool"

  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  # preferred_username is stored on every user and returned in the JWT payload
  schema {
    name                     = "preferred_username"
    attribute_data_type      = "String"
    mutable                  = true
    required                 = false
    developer_only_attribute = false

    string_attribute_constraints {
      min_length = 1
      max_length = 50
    }
  }

  password_policy {
    minimum_length                   = 8
    require_lowercase                = true
    require_numbers                  = true
    require_symbols                  = false
    require_uppercase                = false
    temporary_password_validity_days = 7
  }

  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
    email_subject        = "ARCO — Your verification code"
    email_message        = "Your ARCO verification code is {####}"
  }

  tags = { Name = "${var.project}-user-pool" }
}

# SPA App Client — no client secret, USER_PASSWORD_AUTH so the server can call InitiateAuth
resource "aws_cognito_user_pool_client" "arco" {
  name         = "${var.project}-spa-client"
  user_pool_id = aws_cognito_user_pool.arco.id

  generate_secret = false

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
  ]
}
