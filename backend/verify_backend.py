"""Temporary verification script (deleted after the check)."""

import types

from app.services.ai_service import generate_response
from app.services.providers.gemini_provider import (
    FALLBACK_MODELS,
    MIN_ANSWER_TOKENS,
    THINKING_BUDGET,
    GeminiProvider,
)
from app.services.providers.groq_provider import GroqProvider
from app.services.providers.openai_provider import OpenAIProvider
from app.services import ai_service

CONV = [
    {"role": "user", "content": "earlier"},
    {"role": "assistant", "content": "earlier answer"},
    {"role": "user", "content": "and this"},
    {"role": "assistant", "content": "this answer"},
]


def openai_style(text, capture):
    class FakeCompletions:
        def create(self, **kwargs):
            capture.update(kwargs)
            msg = types.SimpleNamespace(content=text)
            return types.SimpleNamespace(choices=[types.SimpleNamespace(message=msg)])

    return types.SimpleNamespace(
        chat=types.SimpleNamespace(completions=FakeCompletions())
    )


def gemini_style(text, capture):
    class FakeModels:
        def generate_content(self, **kwargs):
            capture.update(kwargs)
            return types.SimpleNamespace(
                text=text,
                prompt_feedback=types.SimpleNamespace(block_reason=None),
            )

    return types.SimpleNamespace(models=FakeModels())


# --- happy path ------------------------------------------------------------
capture = {}
g = GroqProvider(api_key="k", model="m", timeout=5)
g._client = openai_style("## BIS\n\nGroq says hello.", capture)
out = g.generate(system_prompt="SYS", messages=CONV, temperature=0.3, max_tokens=100)
assert out.startswith("## BIS"), out
assert capture["model"] == "m"
assert capture["messages"][0] == {"role": "system", "content": "SYS"}
assert len(capture["messages"]) == 5
from app.services.prompts import BIS_SYSTEM_PROMPT
from app.services.ai_service import build_system_prompt
assert "Bureau of Indian Standards" in BIS_SYSTEM_PROMPT
assert "must NEVER say or imply" in BIS_SYSTEM_PROMPT
assert build_system_prompt("") == BIS_SYSTEM_PROMPT
assert "reference library" in build_system_prompt("ctx")

capture = {}
o = OpenAIProvider(api_key="k", model="gpt-x", timeout=5)
o._client = openai_style("openai ok", capture)
assert o.generate(system_prompt="SYS", messages=CONV, temperature=0.1, max_tokens=50) == "openai ok"
assert capture["max_completion_tokens"] == 50

capture = {}
gm = GeminiProvider(api_key="k", model="gemini-x", timeout=5)
gm._client = gemini_style("gemini ok", capture)
assert gm.generate(system_prompt="SYS", messages=CONV, temperature=0.2, max_tokens=64) == "gemini ok"
assert capture["config"].system_instruction == "SYS"
# A tiny max_tokens is lifted so the thinking budget always has room.
assert capture["config"].max_output_tokens == THINKING_BUDGET + MIN_ANSWER_TOKENS, capture["config"]
assert capture["config"].thinking_config.thinking_budget == THINKING_BUDGET
assert capture["model"] == "gemini-x"
assert capture["contents"][0].role == "user"
assert capture["contents"][1].role == "model"
assert capture["contents"][-1].role == "model"
assert capture["contents"][-1].parts[0].text == "this answer"

# A generous max_tokens is passed through (only capped by the ceiling).
capture = {}
gm_big = GeminiProvider(api_key="k", model="gemini-x", timeout=5)
gm_big._client = gemini_style("big", capture)
gm_big.generate(system_prompt="S", messages=CONV, temperature=0.2, max_tokens=1400)
assert capture["config"].max_output_tokens == 1400, capture["config"].max_output_tokens

# --- gemini model fallback --------------------------------------------------
from google.genai import errors as gerrors


def flaky_client(failing):
    """`failing` maps model name -> http status; other models succeed."""
    seen = []

    def generate_content(**kwargs):
        model = kwargs.get("model")
        seen.append(model)
        if model in failing:
            code = failing[model]
            body = {"error": {"message": "nope"}}
            raise (
                gerrors.ServerError(code, body)
                if code >= 500
                else gerrors.ClientError(code, body)
            )
        return types.SimpleNamespace(
            text=f"answered by {model}",
            prompt_feedback=types.SimpleNamespace(block_reason=None),
        )

    return types.SimpleNamespace(
        models=types.SimpleNamespace(generate_content=generate_content)
    ), seen


fb = GeminiProvider(api_key="k", model="gone-model", timeout=1)
fb._client, seen = flaky_client({"gone-model": 404})
assert fb.generate(system_prompt="S", messages=CONV, temperature=0, max_tokens=1) == f"answered by {FALLBACK_MODELS[0]}"
assert seen == ["gone-model", FALLBACK_MODELS[0]], seen
assert fb.used_model == FALLBACK_MODELS[0]

# A capacity spike (503) also falls back to the next model.
fb1 = GeminiProvider(api_key="k", model="busy-model", timeout=1)
fb1._client, seen = flaky_client({"busy-model": 503})
fb1.generate(system_prompt="S", messages=CONV, temperature=0, max_tokens=1)
assert seen == ["busy-model", FALLBACK_MODELS[0]], seen

# When every model fails the last provider error surfaces.
fb2 = GeminiProvider(api_key="k", model="gone-model", timeout=1)
fb2._client, _ = flaky_client({m: 503 for m in ("gone-model", *FALLBACK_MODELS)})
try:
    fb2.generate(system_prompt="S", messages=CONV, temperature=0, max_tokens=1)
    raise AssertionError("expected error")
except Exception as exc:
    assert exc.http_status == 503, exc.http_status
    assert exc.code == "provider_unavailable", exc.code

# A 400 is a bad request: never retried against another model.
fb3 = GeminiProvider(api_key="k", model="gemini-x", timeout=1)
calls = []

def bad_request(**kwargs):
    calls.append(kwargs.get("model"))
    raise gerrors.ClientError(400, {"error": {"message": "bad"}})

fb3._client = types.SimpleNamespace(models=types.SimpleNamespace(generate_content=bad_request))
try:
    fb3.generate(system_prompt="S", messages=CONV, temperature=0, max_tokens=1)
    raise AssertionError("expected error")
except Exception as exc:
    assert exc.code == "provider_error", exc.code
    assert calls == ["gemini-x"], calls

# An empty completion is not retried either.
fb4 = GeminiProvider(api_key="k", model="gemini-x", timeout=1)
empty_calls = []

def empty_text(**kwargs):
    empty_calls.append(kwargs.get("model"))
    return types.SimpleNamespace(text="  ", prompt_feedback=types.SimpleNamespace(block_reason=None))

fb4._client = types.SimpleNamespace(models=types.SimpleNamespace(generate_content=empty_text))
try:
    fb4.generate(system_prompt="S", messages=CONV, temperature=0, max_tokens=1)
    raise AssertionError("expected error")
except Exception as exc:
    assert exc.code == "empty_response", exc.code
    assert empty_calls == ["gemini-x"], empty_calls


# --- error mapping ---------------------------------------------------------
class Boom:
    def __init__(self, name, status=None):
        self.__class__ = type(name, (Boom,), {})
        if status:
            self.status_code = status


class FakeRequest:
    method = "POST"
    url = "https://example.invalid/v1/chat/completions"


class FakeHTTPResponse:
    status_code = 401
    request = FakeRequest()


def fake_response(status: int):
    response = type("R", (), {})()
    response.status_code = status
    response.request = FakeRequest()
    return response


class FakeFail:
    def __init__(self, exc):
        self.exc = exc


def failing_client(exc):
    class FakeCompletions:
        def create(self, **kwargs):
            raise exc

    return types.SimpleNamespace(
        chat=types.SimpleNamespace(completions=FakeCompletions())
    )


import groq
import openai as openai_sdk

g2 = GroqProvider(api_key="k", model="m", timeout=1)
g2._client = failing_client(groq.AuthenticationError(
    "invalid api key gsk_secret_value", response=FakeHTTPResponse(), body=None))
try:
    g2.generate(system_prompt="s", messages=CONV, temperature=0, max_tokens=1)
    raise AssertionError("expected error")
except Exception as exc:
    assert exc.code == "invalid_api_key", exc.code
    assert exc.status_code == 502
    assert "gsk_secret_value" not in exc.user_message

g3 = GroqProvider(api_key="k", model="m", timeout=1)
g3._client = failing_client(groq.RateLimitError(
    "slow down", response=fake_response(429), body=None))
try:
    g3.generate(system_prompt="s", messages=CONV, temperature=0, max_tokens=1)
    raise AssertionError("expected error")
except Exception as exc:
    assert exc.code == "rate_limited" and exc.status_code == 429, (exc.code, exc.status_code)

g4 = GroqProvider(api_key="k", model="m", timeout=1)
g4._client = failing_client(groq.APITimeoutError(request=FakeRequest()))
try:
    g4.generate(system_prompt="s", messages=CONV, temperature=0, max_tokens=1)
    raise AssertionError("expected error")
except Exception as exc:
    assert exc.code == "timeout" and exc.status_code == 504, (exc.code, exc.status_code)

o2 = OpenAIProvider(api_key="k", model="m", timeout=1)
o2._client = failing_client(openai_sdk.APIConnectionError(request=FakeRequest()))
try:
    o2.generate(system_prompt="s", messages=CONV, temperature=0, max_tokens=1)
    raise AssertionError("expected error")
except Exception as exc:
    assert exc.code == "provider_unavailable", exc.code

from google.genai import errors as gerrors

gm2 = GeminiProvider(api_key="k", model="m", timeout=1)
gm2._client = types.SimpleNamespace(
    models=types.SimpleNamespace(
        generate_content=lambda **kw: (_ for _ in ()).throw(
            gerrors.ClientError(400, {"error": {"message": "API key not valid"}})
        )
    )
)
try:
    gm2.generate(system_prompt="s", messages=CONV, temperature=0, max_tokens=1)
    raise AssertionError("expected error")
except Exception as exc:
    assert exc.code in ("invalid_api_key", "provider_error"), exc.code
    assert "API key not valid" not in exc.user_message

# empty completion
g5 = GroqProvider(api_key="k", model="m", timeout=1)
g5._client = openai_style("   ", {})
try:
    g5.generate(system_prompt="s", messages=CONV, temperature=0, max_tokens=1)
    raise AssertionError("expected error")
except Exception as exc:
    assert exc.code == "empty_response", exc.code

# blocked gemini
gm3 = GeminiProvider(api_key="k", model="m", timeout=1)
gm3._client = types.SimpleNamespace(
    models=types.SimpleNamespace(
        generate_content=lambda **kw: types.SimpleNamespace(
            text=None, prompt_feedback=types.SimpleNamespace(block_reason="SAFETY")
        )
    )
)
try:
    gm3.generate(system_prompt="s", messages=CONV, temperature=0, max_tokens=1)
    raise AssertionError("expected error")
except Exception as exc:
    assert exc.detail == "gemini_blocked:SAFETY", exc.detail

# --- ai_service end to end with a patched provider ------------------------
capture = {}
fake = GroqProvider(api_key="k", model="m", timeout=5)
fake._client = openai_style("Answer body", capture)
ai_service.get_provider = lambda name=None: fake  # type: ignore[assignment]

res = generate_response(
    "What is IS 456?",
    conversation_id="conv-1",
    history=[{"role": "user", "content": "hi"}],
)
assert res.answer == "Answer body"
assert res.provider == "groq" and res.conversation_id == "conv-1"
assert res.retrieval_used is False
assert capture["messages"][-1] == {"role": "user", "content": "What is IS 456?"}

res2 = generate_response("second question", conversation_id="conv-1")
assert res2.answer == "Answer body"
roles = [m["role"] for m in capture["messages"]]
assert roles == ["system", "user", "assistant", "user"], roles

# duplicate question is not doubled
generate_response("second question", conversation_id="conv-1")
last_two = capture["messages"][-2:]
assert last_two[0] == {"role": "assistant", "content": "Answer body"}, last_two
assert last_two[1] == {"role": "user", "content": "second question"}, last_two

print("ALL BACKEND CHECKS PASSED")

