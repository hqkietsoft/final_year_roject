"""Configuration settings for the grammar correction model."""
import torch # type: ignore

# Model settings
MODEL_NAME = "grammar-t5-base"
MODEL_PATH = "models/saved_model"
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# API settings
API_HOST = "0.0.0.0"
API_PORT = 5000
DEBUG_MODE = True

# Correction settings
MAX_SEQUENCE_LENGTH = 128
BATCH_SIZE = 16