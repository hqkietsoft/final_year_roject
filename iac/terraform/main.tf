terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Terraform tự đi tìm AMI (Amazon Linux 2023)
data "aws_ami" "amazon_linux_2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-x86_64"]
  }
}

provider "aws" {
  region = "ap-southeast-1"
}

# =================================================================
# 1. SECURITY GROUP
# =================================================================
resource "aws_security_group" "app_sg" {
  name        = "swarm_sg"
  description = "Allow SSH, HTTP, Swarm ports"

  # SSH
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Web App (Port 5000)
  ingress {
    from_port   = 5000
    to_port     = 5000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Grafana (Port 3000)
  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Swarm Management (Cluster Management)
  ingress {
    from_port = 2377
    to_port   = 2377
    protocol  = "tcp"
    self      = true
  }

  # Node Communication (TCP)
  ingress {
    from_port = 7946
    to_port   = 7946
    protocol  = "tcp"
    self      = true
  }

  # Node Communication (UDP)
  ingress {
    from_port = 7946
    to_port   = 7946
    protocol  = "udp"
    self      = true
  }

  # Overlay Network (UDP)
  ingress {
    from_port = 4789
    to_port   = 4789
    protocol  = "udp"
    self      = true
  }

  # Egress (Cho phép ra ngoài thoải mái)
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# =================================================================
# 2. KEY PAIR (SSH KEY)
# =================================================================
resource "tls_private_key" "pk" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_key_pair" "kp" {
  key_name   = "my-terraform-key"
  public_key = tls_private_key.pk.public_key_openssh
}

resource "local_file" "ssh_key" {
  filename        = "${path.module}/key/ansible_key.pem"
  content         = tls_private_key.pk.private_key_pem
  file_permission = "0400" 
}

# =================================================================
# 3. INSTANCES (CẤU HÌNH SWARM CLUSTER)
# =================================================================

# --- MÁY MANAGER ---
resource "aws_instance" "manager" {
  ami           = data.aws_ami.amazon_linux_2023.id
  instance_type = "t3.micro"
  key_name      = aws_key_pair.kp.key_name
  vpc_security_group_ids = [aws_security_group.app_sg.id]
  
  # Giữ cấu hình ổ cứng 30GB gp3 cho mạnh
  root_block_device {
    volume_size           = 30
    volume_type           = "gp3"
    delete_on_termination = true
  }

  tags = { Name = "Swarm-Manager" }
}

# --- MÁY WORKERS (2 MÁY) ---
resource "aws_instance" "worker" {
  count         = 2
  ami           = data.aws_ami.amazon_linux_2023.id
  instance_type = "t3.micro" 
  key_name      = aws_key_pair.kp.key_name
  vpc_security_group_ids = [aws_security_group.app_sg.id]

  # Cũng cho Worker 30GB ổ cứng
  root_block_device {
    volume_size           = 30
    volume_type           = "gp3"
    delete_on_termination = true
  }

  tags = { Name = "Swarm-Worker-${count.index + 1}" }
}

# =================================================================
# 4. ELASTIC IP (IP TĨNH CHO MANAGER)
# =================================================================
resource "aws_eip" "manager_eip" {
  instance = aws_instance.manager.id
  domain   = "vpc"

  tags = {
    Name = "Swarm-Manager-IP"
  }
}

# =================================================================
# 5. OUTPUT
# =================================================================
output "manager_ip" {
  value       = aws_eip.manager_eip.public_ip
  description = "IP Tĩnh của Swarm Manager"
}

output "worker_ips" {
  value       = aws_instance.worker[*].public_ip
  description = "IP Public của các Worker Nodes"
}