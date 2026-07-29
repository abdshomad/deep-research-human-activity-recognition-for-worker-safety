import os

class Settings:
    # Model configuration
    MODEL_PATH: str = "yolov8n-pose.pt"
    DEFAULT_CONF_THRESHOLD: float = 0.5
    
    # Server configuration
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Static & templates settings
    BASE_DIR: str = os.path.dirname(os.path.abspath(__file__))
    TEMPLATES_DIR: str = os.path.join(BASE_DIR, "templates")
    STATIC_DIR: str = os.path.join(os.path.dirname(BASE_DIR), "static")

settings = Settings()
