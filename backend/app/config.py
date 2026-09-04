"""App settings."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    graph_gateway_url: str = "https://gateway.thegraph.com/api"
    graph_api_key: str = ""
    graph_subgraph_id: str = ""
    cors_origins: str = "http://localhost:3000"
    agent_ens_name: str = "namegraph.eth"


settings = Settings()
