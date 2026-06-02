output "backend_public_ip" {
  description = "Public IP for the backend EC2 instance."
  value       = aws_instance.backend.public_ip
}

output "backend_instance_id" {
  description = "Instance ID for the backend EC2 instance."
  value       = aws_instance.backend.id
}

output "backend_security_group_id" {
  description = "Security group ID for the backend instance."
  value       = aws_security_group.backend.id
}
