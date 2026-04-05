"""GUI backend API routes for Memory."""

import json
from pathlib import Path

from aiohttp import web
from hermes_constants import get_hermes_home

def get_memory_file_path() -> Path:
    return get_hermes_home() / "memory" / "MEMORY.md"

async def handle_get_memory(request: web.Request) -> web.Response:
    """Retrieve raw MEMORY.md content."""
    memory_file = get_memory_file_path()
    
    if not memory_file.exists():
        return web.json_response({"ok": True, "content": ""})
        
    try:
        content = memory_file.read_text(encoding="utf-8")
        return web.json_response({"ok": True, "content": content})
    except Exception as e:
        return web.json_response({"ok": False, "error": str(e)}, status=500)

async def handle_update_memory(request: web.Request) -> web.Response:
    """Overwrite MEMORY.md content entirely."""
    try:
        data = await request.json()
        content = data.get("content", "")
    except json.JSONDecodeError:
        return web.json_response({"ok": False, "error": "Invalid JSON"}, status=400)
        
    memory_file = get_memory_file_path()
    try:
        memory_file.parent.mkdir(parents=True, exist_ok=True)
        memory_file.write_text(content, encoding="utf-8")
        return web.json_response({"ok": True})
    except Exception as e:
        return web.json_response({"ok": False, "error": str(e)}, status=500)

def register_memory_api_routes(app: web.Application) -> None:
    app.router.add_get("/api/gui/memory", handle_get_memory)
    app.router.add_post("/api/gui/memory", handle_update_memory)
