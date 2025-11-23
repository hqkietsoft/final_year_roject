import torch
from transformers import T5ForConditionalGeneration
import os
import logging
import tempfile
import shutil
try:
    import psutil
except ImportError:
    pass

# Thiết lập logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def export_model_weights():
    """Xuất weights của mô hình sang định dạng .pt"""
    try:
        # Lấy đường dẫn gốc của dự án
        BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        
        # Tạo thư mục evaluation và subdirectories
        eval_dir = os.path.join(BASE_DIR, "evaluation")
        os.makedirs(eval_dir, exist_ok=True)
        
        # Kiểm tra không gian ổ đĩa
        try:
            disk = psutil.disk_usage(BASE_DIR)
            free_space_gb = disk.free / (1024 * 1024 * 1024)
            logger.info(f"Không gian trống: {free_space_gb:.2f} GB")
            
            if free_space_gb < 5:  # Cần ít nhất 5GB để lưu model
                logger.warning(f"Không đủ không gian ổ đĩa (cần ít nhất 5GB)")
                # Tạo bản ghi nhỏ hơn thay vì model đầy đủ
                with open(os.path.join(eval_dir, "model_info.txt"), 'w', encoding='utf-8') as f:
                    f.write("Model: grammarly/coedit-large\n")
                    f.write("Tham số: 770M\n")
                    f.write("Không thể lưu model do thiếu không gian ổ đĩa\n")
                logger.info(f"Đã tạo file thông tin model tại: {os.path.join(eval_dir, 'model_info.txt')}")
                return os.path.join(eval_dir, "model_info.txt")
        except NameError:
            # psutil không được cài đặt
            logger.warning("Không thể kiểm tra dung lượng ổ đĩa (thiếu psutil)")
        
        # Tải mô hình từ Hugging Face
        model_name = "grammarly/coedit-large"
        logger.info(f"Đang tải mô hình từ Hugging Face: {model_name}")
        
        model = T5ForConditionalGeneration.from_pretrained(model_name)
        
        # Sử dụng thư mục tạm để tránh vấn đề với đường dẫn Unicode
        with tempfile.TemporaryDirectory() as temp_dir:
            # Lưu model vào thư mục tạm trước
            temp_path = os.path.join(temp_dir, "model_weights.pt")
            logger.info(f"Đang lưu model tạm tại: {temp_path}")
            torch.save(model.state_dict(), temp_path)
            
            # Di chuyển file từ thư mục tạm sang thư mục đích
            output_path = os.path.join(eval_dir, "model_weights.pt")
            logger.info(f"Đang di chuyển model tới: {output_path}")
            shutil.copy2(temp_path, output_path)
            
            logger.info(f"Đã lưu model weights thành công tại: {output_path}")
            return output_path
        
    except Exception as e:
        logger.error(f"Lỗi khi xuất model: {str(e)}")
        # Tạo file ghi nhận lỗi
        error_log_path = os.path.join(BASE_DIR, "export_error.log")
        with open(error_log_path, 'w', encoding='utf-8') as f:
            f.write(f"Lỗi xuất model: {str(e)}")
        logger.info(f"Đã ghi log lỗi tại: {error_log_path}")
        return None

if __name__ == "__main__":
    export_model_weights()