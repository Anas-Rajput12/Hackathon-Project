import json
from typing import TypeVar

from pydantic import BaseModel

try:
    from agents import Agent, OpenAIChatCompletionsModel, Runner
except ImportError:
    Agent = None
    OpenAIChatCompletionsModel = None
    Runner = None
    AGENTS_SDK_AVAILABLE = False
else:
    AGENTS_SDK_AVAILABLE = True

try:
    from openai import AsyncOpenAI
except ImportError:
    AsyncOpenAI = None

from core.config import get_settings

settings = get_settings()
T = TypeVar("T", bound=BaseModel)

openai_client = (
    AsyncOpenAI(
        api_key=settings.model_api_key,
        base_url=settings.model_base_url,
        default_headers={
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "AquaTrace",
        },
    )
    if settings.openai_enabled and AsyncOpenAI is not None
    else None
)


def _build_input_text(context: dict) -> str:
    return json.dumps(context, indent=2, default=str)


async def _run_openai_compatible(
    name: str,
    instructions: str,
    output_type: type[T],
    context: dict,
    model: str,
) -> T:
    if openai_client is None:
        raise RuntimeError("The OpenAI-compatible client is not installed.")

    response = await openai_client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": instructions},
            {
                "role": "user",
                "content": (
                    f"Return only valid JSON matching this schema:\n"
                    f"{json.dumps(output_type.model_json_schema(), indent=2)}\n\n"
                    f"Incident context:\n{_build_input_text(context)}"
                ),
            },
        ],
        response_format={"type": "json_object"},
    )
    content = response.choices[0].message.content
    if not content:
        raise RuntimeError(f"{name} returned an empty response")
    return output_type.model_validate(json.loads(content))


async def run_agent(
    name: str,
    instructions: str,
    output_type: type[T],
    context: dict,
    model: str | None = None,
) -> T:
    if not settings.openai_enabled:
        raise RuntimeError(
            "Real AI analysis is unavailable: set OPENROUTER_API_KEY (or OPENAI_API_KEY) in ai/.env."
        )
    if openai_client is None:
        raise RuntimeError("Real AI analysis is unavailable: install the OpenAI Python SDK.")

    selected_model = model or settings.openai_model
    if not AGENTS_SDK_AVAILABLE:
        return await _run_openai_compatible(name, instructions, output_type, context, selected_model)

    agent_model = OpenAIChatCompletionsModel(model=selected_model, openai_client=openai_client)
    agent = Agent(
        name=name,
        instructions=instructions,
        output_type=output_type,
        model=agent_model,
    )

    try:
        result = await Runner.run(agent, _build_input_text(context))
        return result.final_output_as(output_type)
    except Exception as error:
        raise RuntimeError(f"Real AI analysis failed for {name}: {error}") from error
