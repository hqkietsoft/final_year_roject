# 🤖 High-Availability AI English Grammar Corrector

![Python](https://img.shields.io/badge/Python-3.9-blue?logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Framework-Flask-green?logo=flask&logoColor=white)
![AWS](https://img.shields.io/badge/Cloud-AWS-orange?logo=amazon-aws&logoColor=white)
![Terraform](https://img.shields.io/badge/IaC-Terraform-7B42BC?logo=terraform&logoColor=white)
![Ansible](https://img.shields.io/badge/Config-Ansible-EE0000?logo=ansible&logoColor=white)
![Docker Swarm](https://img.shields.io/badge/Orchestrator-Docker%20Swarm-2496ED?logo=docker&logoColor=white)
![Grafana](https://img.shields.io/badge/Monitoring-Grafana-F46800?logo=grafana&logoColor=white)

## 💡 Project Overview

**English Grammar Corrector** is a real-time web application leveraging the **T5 Transformer model** (`grammarly/coedit-large`) for syntax parsing and grammar correction.

Unlike typical deployments, this project is engineered on a **3-node High-Availability Docker Swarm Cluster**, provisioned fully by **Terraform** and configured via **Ansible**. It features a **Zero-Downtime CI/CD pipeline** and a comprehensive **PLG Monitoring Stack** (Prometheus, Loki, Grafana).

| Project Info | Details |
|:--- |:--- |
| **Live Demo** | `http://52.74.192.203/` (Swarm Manager IP) |
| **Architecture** | 3-Node Cluster (1 Manager, 2 Workers) on AWS |
| **Core Model** | T5 Transformer (`grammarly/coedit-large`) |
| **Observability** | Full Monitoring (CPU/RAM/Logs) via Grafana |

---

## 📸 Product Screenshots

### 1. Core Workflow
Smooth user experience from input to receiving AI analysis results.

| **Smart Editor Interface** | **AI Error Detection** |
|:---:|:---:|
| ![Home](docs/images/homepage.png) | ![Analysis](docs/images/enter_incorrectly.png) |
| *Clean, focused editing interface* | *Real-time syntax analysis* |

*(Screenshots for Advanced Features & User Management omitted for brevity but included in repo)*

---

## ⚙️ Enterprise-Grade Architecture

This project moves beyond simple containerization to a robust, scalable infrastructure:

| Category | Tools & Technologies |
|:--- |:--- |
| **Infrastructure as Code** | **Terraform**: Automates provisioning of AWS VPC, Subnets, Security Groups, and EC2 instances. |
| **Configuration Mgmt** | **Ansible**: Automates Docker installation, Swap creation, and Cluster joining (Manager/Worker tokens). |
| **Orchestration** | **Docker Swarm**: Manages a 3-node cluster with **Overlay Networking** for internal security. |
| **CI/CD Pipeline** | **GitHub Actions**: Implements **Rolling Updates** strategy for Zero-Downtime deployment. |
| **Monitoring (PLG)** | **Prometheus** (Metrics), **Loki** (Logs), **Grafana** (Visualization), **Node Exporter** (Hardware Stats). |

---

## 🧠 DevOps Engineering Highlights

This project showcases practical solutions to complex infrastructure challenges on limited cloud resources:

### 1. High Availability & Fault Tolerance
- **Architecture:** Deployed on a **3-node Swarm Cluster**. If a worker node fails, the Swarm Orchestrator automatically reschedules containers to healthy nodes.
- **Load Balancing:** Configured **Nginx** as an Ingress Controller (Entrypoint) to load-balance traffic across replicas using Docker's internal Mesh Routing.

### 2. Zero-Downtime Deployment Strategy
- **Challenge:** Deploying heavy AI models typically causes downtime during startup (10-30s model loading time).
- **Solution:** Implemented **Rolling Updates** with `order: start-first` and **Healthchecks**.
    - The new container must pass a health check (verifying the model is loaded via `curl`) before traffic is routed to it.
    - The old container is only terminated *after* the new one is healthy.

### 3. Dynamic Service Discovery & Monitoring
- **Challenge:** In a dynamic cluster, containers change IPs frequently, making static monitoring impossible.
- **Solution:** Configured **Prometheus Service Discovery (`dns_sd_configs`)**. Prometheus automatically queries the Docker DNS to find and scrape metrics from all active replicas and Node Exporters across the fleet without manual configuration.

### 4. Cost Optimization (Running Giants on Dwarfs)
- **Challenge:** The T5 Model requires ~3GB RAM, but AWS `t3.micro` instances only provide 1GB RAM, leading to immediate OOM Kills.
- **Solution:**
    - Automated **4GB Swap File** creation via Ansible to extend virtual memory.
    - Optimized Kernel parameters (`vm.swappiness`) to handle memory paging efficiently.
    - Result: Successfully running a heavy NLP stack on the lowest-cost AWS tier.

### 5. Infrastructure Automation
- **Challenge:** Managing SSH keys and dependencies across Windows (Local) and Linux (Cloud) is error-prone.
- **Solution:** Developed cross-platform scripts and Terraform configurations to automatically handle SSH Key permissions and inventory generation for Ansible.

---
