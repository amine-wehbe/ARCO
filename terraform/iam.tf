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

# Full DynamoDB access — read/write arco-users and arco-scores
resource "aws_iam_role_policy_attachment" "dynamo" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess"
}

# Cognito power user — lets the server call SignUp, ConfirmSignUp, InitiateAuth, etc.
resource "aws_iam_role_policy_attachment" "cognito" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonCognitoPowerUser"
}

# Instance profile wraps the role so EC2 can assume it on launch
resource "aws_iam_instance_profile" "ec2" {
  name = "${var.project}-ec2-profile"
  role = aws_iam_role.ec2.name
}
