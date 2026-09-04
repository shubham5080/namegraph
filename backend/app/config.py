"""App settings."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    graph_gateway_url: str = "https://gateway.thegraph.com/api"
    graph_api_key: str = ""
    # Uniswap V3 Ethereum (default demo subgraph)
    graph_subgraph_id: str = "5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV"
    # ENS mainnet subgraph
    ens_subgraph_id: str = "5XqPmWe6gjyrJtFn9cLy237i4cWw2j9HcUJEXsP5qGtH"
    cors_origins: str = "http://localhost:3000"
    agent_ens_name: str = "namegraph.eth"


settings = Settings()
