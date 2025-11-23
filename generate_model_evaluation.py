import os
import sys
import logging
import importlib

# Thiết lập logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Import các module cần thiết từ bên ngoài hàm main
from utils import export_model, training_loss_chart, training_stats

def main():
    """Tạo tất cả các đánh giá cho mô hình trong một lần chạy."""
    
    logger.info("Đang tạo đánh giá cho mô hình coedit-large...")
    
    # Tạo thư mục evaluation nếu chưa tồn tại
    base_dir = os.path.dirname(os.path.abspath(__file__))
    eval_dir = os.path.join(base_dir, "evaluation")
    os.makedirs(eval_dir, exist_ok=True)
    
    # Đảm bảo thư mục models/coedit-large tồn tại
    models_dir = os.path.join(base_dir, "models", "coedit-large")
    os.makedirs(models_dir, exist_ok=True)
    
    # 1. Xuất model weights
    logger.info("1. Xuất model weights...")
    try:
        # Sử dụng hàm thay vì wildcard import
        export_model.export_model_weights()
    except Exception as e:
        logger.error(f"Lỗi khi xuất model weights: {str(e)}")
        
    # 2. Tạo biểu đồ loss
    logger.info("2. Tạo biểu đồ training loss...")
    try:
        training_loss_chart.create_loss_chart()
    except Exception as e:
        logger.error(f"Lỗi khi tạo biểu đồ loss: {str(e)}")
    
    # 3. Tạo báo cáo thống kê
    logger.info("3. Tạo báo cáo thống kê training...")
    try:
        training_stats.create_training_stats()
    except Exception as e:
        logger.error(f"Lỗi khi tạo báo cáo thống kê: {str(e)}")
    
    logger.info("Hoàn thành! Các đánh giá được lưu trong thư mục 'evaluation'")

if __name__ == "__main__":
    main()