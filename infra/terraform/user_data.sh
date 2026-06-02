#!/bin/bash
set -euo pipefail

APP_DIR="${app_dir}"

dnf update -y

dnf install -y docker awscli
systemctl enable --now docker
usermod -aG docker ec2-user

mkdir -p "$APP_DIR"
chown ec2-user:ec2-user "$APP_DIR"
