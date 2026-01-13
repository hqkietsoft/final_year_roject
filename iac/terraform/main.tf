terraform {
  required_providers {
    aws = {
        source = "hashicorp/aws"
        version = "~> 5.0"
    }
  }
}

# Terraform tự đi tìm AMI
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

# Security Group (mở cổng mạng)
resource "aws_security_group" "app_sg" {
  name = "english_parser_sg"
  description = "Allow SSH, HTTP and App ports"

  # mở SSH (22)
  ingress {
    from_port = 22
    to_port = 22
    protocol = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # mở Web App (5000)
  ingress {
    from_port = 5000
    to_port = 5000
    protocol = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # mở Grafana (3000)
  ingress {
    from_port = 3000
    to_port = 3000
    protocol = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # cho phép ra ngoài thoải mái (tải package)
  egress {
    from_port = 0
    to_port = 0
    protocol = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# (+) tạo Key Pair (SSH vào server)
# tạo thuật toán mã hoá
resource "tls_private_key" "pk" {
  algorithm = "RSA"
  rsa_bits = 4096
}

# đẩy public key lên AWS
resource "aws_key_pair" "kp" {
  key_name = "my-terraform-key"
  public_key = tls_private_key.pk.public_key_openssh
}

# lưu private key vào máy local
resource "local_file" "ssh_key" {
  filename = "${path.module}/key/ansible_key.pem"
  content = tls_private_key.pk.private_key_pem
  file_permission = "0400" # chỉ chủ sở hữu được đọc
}

# (+) tạo server
resource "aws_instance" "app_server" {
  ami = data.aws_ami.amazon_linux_2023.id #AWS Amazon Linus 2023 (Singapore)
  instance_type = "t3.micro"

  key_name = aws_key_pair.kp.key_name
  vpc_security_group_ids = [aws_security_group.app_sg.id]

  root_block_device {
    volume_size = 30     
    volume_type = "gp3"   
    delete_on_termination = true
  }

  tags = {
    Name = "EnglishParser-Terraform"
  }
}

# (+) tạo IP tĩnh (Elastic IP) gắn vào instance
resource "aws_eip" "app_eip" {
  instance = aws_instance.app_server.id
  domain = "vpc"

  tags = {
    Name = "EnglishParser-Static-IP"
  }
}

# (+) in kết quả ra màn hình
output "final_public_ip" {
  value = aws_eip.app_eip.public_ip
  description = "IP Tĩnh của server"
}