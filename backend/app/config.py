from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite:///./leads.db"
    upload_dir: str = "./uploads"
    email_backend: str = "console"
    attorney_email: str = "attorney@example.com"
    attorney_username: str = "attorney"
    attorney_password: str = "changeme"
    jwt_secret: str = "dev-secret-change-me"
    jwt_expire_minutes: int = 60
    cors_origins: str = "http://localhost:3000"

    model_config = {"env_file": ".env"}


settings = Settings()
