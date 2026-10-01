# IAM role assumed by EC2 — grants DynamoDB + Cognito access without any static keys
resource "aws_iam_role" "ec2" {
  name = "${var.project}-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = { Name = "${var.project}-ec2-role" }
}

# Least privilege — only the item operations the server uses, only on the two ARCO tables (+ GSI).
# No Cognito policy is needed: SignUp, ConfirmSignUp, InitiateAuth and GlobalSignOut are public
# app-client APIs that authenticate with the client id / user tokens, not IAM.
resource "aws_iam_role_policy" "dynamo" {
  name = "${var.project}-dynamo-access"
  role = aws_iam_role.ec2.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:Query",
        "dynamodb:Scan",
      ]
      Resource = [
        aws_dynamodb_table.users.arn,
        aws_dynamodb_table.scores.arn,
        "${aws_dynamodb_table.scores.arn}/index/*",
      ]
    }]
  })
}

# Instance profile wraps the role so EC2 can assume it on launch
resource "aws_iam_instance_profile" "ec2" {
  name = "${var.project}-ec2-profile"
  role = aws_iam_role.ec2.name
}
