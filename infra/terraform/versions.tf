terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }

  backend "s3" {
    bucket         = "CHANGE_ME_TFSTATE_BUCKET"
    key            = "oldtrailbikes/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "CHANGE_ME_TFSTATE_LOCK_TABLE"
    encrypt        = true
  }
}
