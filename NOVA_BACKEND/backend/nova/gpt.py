import os
from typing import Any

from openai import OpenAI
from pydantic import BaseModel

from ..logging_utils import get_logger, log_raise

logger = get_logger(__name__)


class GPTClient:
    """Small wrapper around the OpenAI client with optional structured output."""

    def __init__(
        self,
        model: str = "gpt-4.1-mini",
        api_key_env: str = "OPENAI_API_KEY",
    ) -> None:
        api_key = os.getenv(api_key_env)
        if not api_key:
            log_raise(
                logger,
                "Missing OpenAI API key environment variable",
                api_key_env=api_key_env,
            )
            raise ValueError(
                f"Missing OpenAI API key. Set the `{api_key_env}` environment variable."
            )

        self.model = model
        self.client = OpenAI(api_key=api_key)

    def get_client(self) -> OpenAI:
        """Return the underlying OpenAI client for advanced use cases."""
        return self.client

    def chat(
        self,
        prompt: str | None = None,
        *,
        system_prompt: str | None = None,
        model: str | None = None,
        response_model: type[BaseModel] | None = None,
        temperature: float = 0.7,
        input_data: Any | None = None,
        **kwargs: Any,
    ) -> str | BaseModel:
        """Send a prompt and optionally parse the response into a Pydantic model."""
        request_model = model or self.model
        request_input = input_data if input_data is not None else prompt
        if request_input is None:
            log_raise(
                logger,
                "GPTClient.chat called without prompt or input_data",
                model=request_model,
            )
            raise ValueError("Either `prompt` or `input_data` must be provided.")

        if response_model is not None:
            response = self.client.responses.parse(
                model=request_model,
                input=request_input,
                instructions=system_prompt,
                text_format=response_model,
                temperature=temperature,
                **kwargs,
            )
            if response.output_parsed is None:
                log_raise(
                    logger,
                    "OpenAI response did not include parsed structured output",
                    model=request_model,
                )
                raise ValueError("The model did not return a parsed structured response.")
            return response.output_parsed

        response = self.client.responses.create(
            model=request_model,
            input=request_input,
            instructions=system_prompt,
            temperature=temperature,
            **kwargs,
        )
        return response.output_text
