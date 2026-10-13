"""The design assistant: talks to Claude, ChatGPT or a local Ollama model, only about designing
your desktop.

Your API keys are kept in ~/.config/aerie/assistant.json (readable only by you) and are only
ever sent to the service they belong to. The page never sees them. What the assistant gets:
what you type, plus a short description of your current desktop design (colors, widgets and
their positions, 3D shapes). Never your notes, to-dos, files or anything else.
"""

import json
import os
import re
import urllib.error
import urllib.request

from . import __version__, paths

SETTINGS_FILE = paths.CONFIG_DIR / "assistant.json"
PROVIDERS = ("claude", "openai", "ollama")
DEFAULTS = {
    "provider": "",
    "models": {"claude": "claude-sonnet-5-5", "openai": "gpt-5-mini", "ollama": ""},
    "ollamaUrl": "http://127.0.0.1:11434",
    "keys": {},
}

SYSTEM = """You are the design assistant inside Aerie, a live 3D desktop app for Pop!_OS COSMIC.
Your ONLY job is helping the person design their desktop: the 3D scene and background, colors,
lighting, particles, ground cover, widgets and where they sit, 3D objects, the soundscape, the
widget style, and (only when they clearly ask) the look of their COSMIC panel and dock.
If they ask about anything else (general questions, coding, homework, news, other apps, personal
advice), reply briefly and kindly that you can only help design their desktop, with no changes.

Answer with ONE JSON object and nothing else:
{"reply": "<1-3 short, friendly sentences about what you did or suggest>", "changes": [ ... ]}
"changes" may be empty. Only use the operations, paths and values described in the CAPABILITIES
below; anything else is ignored. Prefer a few tasteful, coherent changes over many. Colors are
"#rrggbb". Positions x/y are percent of the screen (0-100, top-left of the widget).
When you change the overall mood, adjust background, light, particles, fog and widget theme together
so it looks designed, not random."""


def _private_write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w") as f:
        json.dump(data, f, indent=1)
    os.replace(tmp, path)


def load():
    data = json.loads(json.dumps(DEFAULTS))
    try:
        saved = json.loads(SETTINGS_FILE.read_text())
        data.update({k: v for k, v in saved.items() if k in data and k != "models"})
        data["models"].update(saved.get("models") or {})
    except (OSError, ValueError):
        pass
    return data


def public():
    """Settings for the page: everything except the keys themselves."""
    s = load()
    return {"provider": s["provider"], "models": s["models"], "ollamaUrl": s["ollamaUrl"],
            "hasKey": {p: bool(s["keys"].get(p)) for p in ("claude", "openai")}}


def update(changes):
    s = load()
    if changes.get("provider") in PROVIDERS + ("",):
        s["provider"] = changes["provider"]
    for p, model in (changes.get("models") or {}).items():
        if p in PROVIDERS and isinstance(model, str) and len(model) < 120:
            s["models"][p] = model.strip()
    url = changes.get("ollamaUrl")
    if isinstance(url, str) and re.match(r"^https?://[^\s]+$", url.strip()):
        s["ollamaUrl"] = url.strip().rstrip("/")
    for p, key in (changes.get("keys") or {}).items():
        if p in ("claude", "openai") and isinstance(key, str):
            if key.strip():
                s["keys"][p] = key.strip()
            else:
                s["keys"].pop(p, None)  # empty = forget the key
    _private_write(SETTINGS_FILE, s)
    return public()


def forget():
    SETTINGS_FILE.unlink(missing_ok=True)


def _post(url, body, headers, timeout=120):
    req = urllib.request.Request(url, data=json.dumps(body).encode(), method="POST",
                                 headers={"Content-Type": "application/json", "User-Agent": f"Aerie/{__version__}", **headers})
    with urllib.request.urlopen(req, timeout=timeout) as res:
        return json.loads(res.read(8 * 1024 * 1024))


def ollama_models():
    s = load()
    req = urllib.request.Request(s["ollamaUrl"] + "/api/tags", headers={"User-Agent": f"Aerie/{__version__}"})
    with urllib.request.urlopen(req, timeout=5) as res:
        data = json.loads(res.read(2 * 1024 * 1024))
    return [m.get("name") for m in data.get("models", []) if m.get("name")]


def chat(messages, context):
    """messages: [{role: user|assistant, content}] (latest last). context: the desktop and what can change.
    Returns {"reply": str, "changes": list}."""
    s = load()
    provider = s["provider"]
    if provider not in PROVIDERS:
        raise ValueError("Pick an AI in the assistant's settings first")
    system = SYSTEM + "\n\nCAPABILITIES AND CURRENT DESKTOP:\n" + str(context)[:24000]
    history = [{"role": m["role"], "content": str(m["content"])[:4000]}
               for m in messages[-12:] if m.get("role") in ("user", "assistant") and m.get("content")]
    if not history or history[-1]["role"] != "user":
        raise ValueError("Nothing to answer")
    model = s["models"].get(provider) or DEFAULTS["models"][provider]

    if provider == "claude":
        key = s["keys"].get("claude")
        if not key:
            raise ValueError("Add your Claude API key in the assistant's settings")
        data = _post("https://api.anthropic.com/v1/messages",
                     {"model": model, "max_tokens": 1500, "system": system, "messages": history},
                     {"x-api-key": key, "anthropic-version": "2023-06-01"})
        text = "".join(b.get("text", "") for b in data.get("content", []) if b.get("type") == "text")
    elif provider == "openai":
        key = s["keys"].get("openai")
        if not key:
            raise ValueError("Add your OpenAI API key in the assistant's settings")
        data = _post("https://api.openai.com/v1/chat/completions",
                     {"model": model, "messages": [{"role": "system", "content": system}] + history,
                      "response_format": {"type": "json_object"}},
                     {"Authorization": f"Bearer {key}"})
        text = (data.get("choices") or [{}])[0].get("message", {}).get("content", "")
    else:
        if not model:
            raise ValueError("Pick one of your Ollama models in the assistant's settings")
        data = _post(s["ollamaUrl"] + "/api/chat",
                     {"model": model, "stream": False, "format": "json",
                      "messages": [{"role": "system", "content": system}] + history}, {}, timeout=300)
        text = data.get("message", {}).get("content", "")
    return _parse(text)


def _parse(text):
    m = re.search(r"\{.*\}", text or "", re.S)
    if m:
        try:
            data = json.loads(m.group(0))
            changes = data.get("changes") if isinstance(data.get("changes"), list) else []
            return {"reply": str(data.get("reply") or "Done.")[:1200], "changes": changes[:40]}
        except ValueError:
            pass
    return {"reply": (text or "I couldn't come up with anything, try asking another way.").strip()[:1200], "changes": []}


def error_message(exc):
    if isinstance(exc, urllib.error.HTTPError):
        if exc.code in (401, 403):
            return "The AI service didn't accept the API key. Check it in the assistant's settings."
        if exc.code == 404:
            return "The AI service doesn't know that model name. Check it in the assistant's settings."
        if exc.code == 429:
            return "The AI service says you've hit a limit (or your account needs credit). Try again later."
        return f"The AI service answered with an error ({exc.code})."
    if isinstance(exc, urllib.error.URLError):
        if load()["provider"] == "ollama":
            return "Couldn't reach Ollama. Is it installed and running? (ollama serve)"
        return "Couldn't reach the AI service. Are you online?"
    if isinstance(exc, TimeoutError):
        return "The AI took too long to answer. Try again, or a smaller model."
    return str(exc)
