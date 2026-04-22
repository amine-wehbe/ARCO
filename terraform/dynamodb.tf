# Users table — one item per Cognito user, keyed by their sub (userId)
resource "aws_dynamodb_table" "users" {
  name         = "arco-users"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "userId"

  attribute {
    name = "userId"
    type = "S"
  }

  tags = { Name = "arco-users" }
}

# Scores table — one item per game run; GSI enables sorted leaderboard queries
resource "aws_dynamodb_table" "scores" {
  name         = "arco-scores"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "gameId"
  range_key    = "sk"

  attribute {
    name = "gameId"
    type = "S"
  }

  attribute {
    name = "sk"
    type = "S"
  }

  attribute {
    name = "score"
    type = "N"
  }

  # GSI used by GET /scores/:gameId to return top-10 sorted by score descending
  global_secondary_index {
    name            = "gameId-score-index"
    hash_key        = "gameId"
    range_key       = "score"
    projection_type = "ALL"
  }

  tags = { Name = "arco-scores" }
}
