variable "aws_region" {
  type        = string
  description = "AWS region to deploy into."
  default     = "us-east-1"
}

variable "instance_type" {
  type        = string
  description = "EC2 instance type."
  default     = "t3.micro"
}

variable "key_name" {
  type        = string
  description = "Existing EC2 key pair name for SSH access."
}

variable "ssh_cidr" {
  type        = string
  description = "CIDR block allowed to SSH into the instance."
  default     = "0.0.0.0/0"
}

variable "app_port" {
  type        = number
  description = "Container port the backend listens on."
  default     = 4000
}

variable "app_cidr" {
  type        = string
  description = "CIDR block allowed to reach the backend port."
  default     = "0.0.0.0/0"
}

variable "app_dir" {
  type        = string
  description = "Directory on the instance for app artifacts."
  default     = "/opt/oldtrailbikes"
}

variable "tags" {
  type        = map(string)
  description = "Tags applied to AWS resources."
  default     = {}
}
