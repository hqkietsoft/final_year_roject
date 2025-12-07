# 🤖 English Grammar Corrector & Syntax Parser

## 💡 Giới thiệu dự án

Dự án **English Grammar Corrector** là một ứng dụng Web (API) sử dụng mô hình **T5 Transformer** để phân tích cú pháp (Syntax Parser) và sửa lỗi ngữ pháp trong thời gian thực.

Ứng dụng được xây dựng trên nền tảng Python Flask và được triển khai toàn diện trên hạ tầng đám mây AWS, có tích hợp quy trình CI/CD hoàn chỉnh.

| Metadata | Chi tiết |
|:---------|:---------|
| **Demo Link (Live)** | `http://47.129.209.29/` |
| **Mô hình lõi (Core Model)** | T5 Transformer (`grammarly/coedit-large`) |
| **Công nghệ Backend** | Python 3.9, Flask, PyTorch, Hugging Face/Transformers |
| **Tình trạng CI/CD** | ✅ Passing |

---

## ⚙️ Kỹ thuật & Hạ tầng (Technical Stack)

| Loại | Công cụ/Kỹ thuật sử dụng |
|:-----|:-------------------------|
| **Cloud & Hạ tầng** | **Amazon Web Services (AWS)**, EC2 (t3.micro), EBS Volume Management, Amazon Linux 2023 |
| **Containerization** | **Docker** (Dockerfile), **Docker Volumes** (Persistent Cache) |
| **DevOps & CI/CD** | **GitHub Actions** (Automated Build & Push), **Nginx Reverse Proxy** |
| **Networking & Môi trường** | Security Groups (Port 80/22), SSH, Linux (Bash Scripting/Systemctl) |

---

## 🚀 Hướng dẫn Triển khai (Deployment)

Quy trình triển khai được tự động hóa hoàn toàn sau khi hạ tầng AWS EC2 được thiết lập.

### 1. Hạ tầng AWS (Infrastructure)

1. Khởi chạy EC2 Instance (**Amazon Linux 2023**) với loại **`t2.micro`** (Free Tier eligible).
2. Cấu hình **Security Group** để mở cổng **SSH (22)** và **HTTP (80)**.
3. **Tăng dung lượng EBS** (Root Volume) lên 25GB hoặc 30GB để chứa Model AI lớn.
4. Cài đặt **Swap Memory (4GB)** trên EC2 để hỗ trợ tải mô hình lớn (3GB+).

### 2. Quy trình CI/CD (GitHub Actions)

Mỗi khi code được đẩy lên nhánh `master`, **GitHub Actions** sẽ tự động build image Docker mới và đẩy lên **Docker Hub**.

### 3. Cập nhật trên Server (Final Deployment)

Sau khi CI/CD chạy xong (Status: ✅ Success), chỉ cần SSH vào EC2 và chạy lệnh sau để cập nhật ứng dụng mới nhất:
```bash
# 1. Kéo bản mới nhất từ Docker Hub về
sudo docker pull hqkietsoft/english-syntax-parser:latest

# 2. Xóa container cũ và chạy lại container mới (có gắn ổ cứng cache model)
sudo docker rm -f nlp-app
sudo docker run -d \
  --restart=always \
  -p 5000:5000 \
  -v /home/ec2-user/hf_cache:/root/.cache/huggingface \
  --name nlp-app \
  hqkietsoft/english-syntax-parser:latest
```

---

## 💻 Quy trình Vận hành & Bảo trì (Operations)

### Quy trình Dừng máy (Stop Instance)

Để ngừng tính phí CPU/RAM, bạn chọn **Instance State → Stop instance** trên AWS Console.

### Quy trình Khởi động lại (Restart)

Vì Public IP của bạn sẽ thay đổi và Swap Memory bị mất hiệu lực sau khi tắt máy, bạn cần làm theo 3 bước sau:

#### Bước 1: Khởi động EC2 và Lấy IP mới (AWS Console)

1. Vào **AWS Console → Instances**.
2. Chọn máy chủ của bạn → Bấm **Instance State** → Chọn **Start instance** (Khởi động phiên bản).
3. Chờ khoảng 1-2 phút cho trạng thái chuyển sang **Running** (Đang chạy).
4. Tìm dòng **Public IPv4 address** và sao chép địa chỉ IP MỚI này.

#### Bước 2: Kích hoạt lại RAM ảo (Swap Memory)

Vì bạn đã tạo Swap mà không thêm vào file `/etc/fstab` để tự khởi động cùng hệ thống, bạn cần SSH vào EC2 và bật lại nó.
```bash
# 1. Kiểm tra xem Swap đã tắt chưa (optional, nhưng nên làm)
free -h

# 2. Bật lại Swap Memory (sử dụng file swap đã tạo trước đó)
sudo swapon /swapfile

# 3. Kiểm tra lại Swap đã lên 4.0Gi chưa
free -h
```

#### Bước 3: Kiểm tra và Bật lại Ứng dụng

Mặc dù `systemctl enable nginx` và `docker restart=always` đã được cấu hình để tự động chạy lại, nhưng kiểm tra là cần thiết:
```bash
# 1. Kiểm tra xem Nginx có chạy chưa (sẽ tự chạy lại)
sudo systemctl status nginx

# 2. Kiểm tra xem Container có chạy chưa
sudo docker ps 

# 3. Nếu Container chưa chạy (STATUS không phải là Up...), bạn hãy bật nó lên:
sudo docker start nlp-app
```

---

## 🧠 Technical Highlights & Troubleshooting

(Phần này là bằng chứng rõ ràng nhất về kỹ năng xử lý sự cố và tối ưu tài nguyên của bạn)

### Cloud & Resource Optimization

- **Live EBS Volume Resize**: Đã xử lý lỗi `no space left on device` bằng cách thực hiện tăng dung lượng ổ cứng (8GB → 30GB) và mở rộng hệ thống tệp Linux (`xfs_growfs`) mà không cần tắt máy chủ (Zero Downtime).

- **Swap Memory Implementation**: Xử lý lỗi Tràn RAM (OOM Killer) bằng cách tạo 4GB RAM ảo (Swap), cho phép máy ảo 1GB RAM tải được Model 3.13GB.

- **Model Caching**: Sử dụng Docker Volumes để duy trì Model Hugging Face đã tải về, rút ngắn thời gian khởi động ứng dụng.

### Reverse Proxy & Stability Tuning

- Đã cấu hình **Nginx Reverse Proxy** và tăng **Nginx Proxy Timeout (300s)** để giải quyết các lỗi Timeout/502 Bad Gateway do thời gian xử lý chậm của ứng dụng.

- Khắc phục lỗi **Restart Loop** bằng cách tắt chế độ `debug=True` trong Flask, đảm bảo ứng dụng chỉ chạy một tiến trình ổn định.

---

## 📝 License

This project is licensed under the MIT License.

## 👤 Author

**HQKietSoft**

- GitHub: [@hqkietsoft](https://github.com/hqkietsoft)
- Docker Hub: [hqkietsoft/english-syntax-parser](https://hub.docker.com/r/hqkietsoft/english-syntax-parser)
