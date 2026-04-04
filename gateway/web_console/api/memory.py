"""Memory and session-search API routes for the Hermes Web Console backend."""

from __future__ import annotations

import json
from typing import Any

from aiohttp import web

from gateway.web_console.services.memory_service import MemoryService

MEMORY_SERVICE_APP_KEY = web.AppKey("hermes_web_console_memory_service", MemoryService)


def _json_error(*, status: int, code: str, message: str, **extra: Any) -> web.Response:
    payload: dict[str, Any] = {
        "ok": False,
        "error": {
            "code": code,
            "message": message,
        },
    }
    payload["error"].update(extra)
    return web.json_response(payload, status=status)


async def _read_json_body(request: web.Request) -> dict[str, Any] | None:
    try:
        data = await request.json()
    except (json.JSONDecodeError, ValueError, TypeError):
        return None
    if not isinstance(data, dict):
        return None
    return data


def _parse_positive_int(value: str | None, *, field_name: str, default: int) -> int:
    if value is None:
        return default
    try:
        parsed = int(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"The '{field_name}' field must be an integer.") from exc
    if parsed < 1:
        raise ValueError(f"The '{field_name}' field must be >= 1.")
    return parsed


def _get_memory_service(request: web.Request) -> MemoryService:
    service = request.app.get(MEMORY_SERVICE_APP_KEY)
    if service is None:
        service = MemoryService()
        request.app[MEMORY_SERVICE_APP_KEY] = service
    return service


async def handle_get_memory(request: web.Request) -> web.Response:
    service = _get_memory_service(request)
    try:
        memory = service.get_memory(target="memory")
    except ValueError as exc:
        return _json_error(status=400, code="invalid_target", message=str(exc))
    return web.json_response({"ok": True, "memory": memory})


async def handle_get_user_profile(request: web.Request) -> web.Response:
    service = _get_memory_service(request)
    try:
        profile = service.get_memory(target="user")
    except ValueError as exc:
        return _json_error(status=400, code="invalid_target", message=str(exc))
    return web.json_response({"ok": True, "user_profile": profile})


async def handle_post_memory(request: web.Request) -> web.Response:
    data = await _read_json_body(request)
    if data is None:
        return _json_error(status=400, code="invalid_json", message="Request body must be a valid JSON object.")

    service = _get_memory_service(request)
    try:
        memory = service.mutate_memory(
            action="add",
            target=str(data.get("target", "memory")),
            content=data.get("content"),
        )
    except ValueError as exc:
        return _json_error(status=400, code="invalid_request", message=str(exc))
    except PermissionError as exc:
        return _json_error(status=403, code="memory_disabled", message=str(exc))

    if not memory.get("success"):
        return _json_error(
            status=400,
            code="memory_update_failed",
            message=memory.get("error") or "Memory update failed.",
            matches=memory.get("matches"),
            target=memory.get("target"),
        )
    return web.json_response({"ok": True, "memory": memory})


async def handle_patch_memory(request: web.Request) -> web.Response:
    data = await _read_json_body(request)
    if data is None:
        return _json_error(status=400, code="invalid_json", message="Request body must be a valid JSON object.")

    service = _get_memory_service(request)
    try:
        memory = service.mutate_memory(
            action="replace",
            target=str(data.get("target", "memory")),
            content=data.get("content"),
            old_text=data.get("old_text"),
        )
    except ValueError as exc:
        return _json_error(status=400, code="invalid_request", message=str(exc))
    except PermissionError as exc:
        return _json_error(status=403, code="memory_disabled", message=str(exc))

    if not memory.get("success"):
        return _json_error(
            status=400,
            code="memory_update_failed",
            message=memory.get("error") or "Memory update failed.",
            matches=memory.get("matches"),
            target=memory.get("target"),
        )
    return web.json_response({"ok": True, "memory": memory})


async def handle_delete_memory(request: web.Request) -> web.Response:
    data = await _read_json_body(request)
    if data is None:
        return _json_error(status=400, code="invalid_json", message="Request body must be a valid JSON object.")

    service = _get_memory_service(request)
    try:
        memory = service.mutate_memory(
            action="remove",
            target=str(data.get("target", "memory")),
            old_text=data.get("old_text"),
        )
    except ValueError as exc:
        return _json_error(status=400, code="invalid_request", message=str(exc))
    except PermissionError as exc:
        return _json_error(status=403, code="memory_disabled", message=str(exc))

    if not memory.get("success"):
        return _json_error(
            status=400,
            code="memory_update_failed",
            message=memory.get("error") or "Memory update failed.",
            matches=memory.get("matches"),
            target=memory.get("target"),
        )
    return web.json_response({"ok": True, "memory": memory})


async def handle_session_search(request: web.Request) -> web.Response:
    query = request.query.get("query") or request.query.get("q")
    if not query or not query.strip():
        return _json_error(status=400, code="missing_query", message="The 'query' parameter is required.")

    service = _get_memory_service(request)
    try:
        limit = _parse_positive_int(request.query.get("limit"), field_name="limit", default=3)
        payload = service.search_sessions(
            query=query,
            role_filter=request.query.get("role_filter"),
            limit=limit,
            current_session_id=request.query.get("current_session_id"),
        )
    except ValueError as exc:
        return _json_error(status=400, code="invalid_search", message=str(exc))
    except RuntimeError as exc:
        return _json_error(status=500, code="search_failed", message=str(exc))

    if not payload.get("success"):
        error_message = payload.get("error") or "Session search failed."
        status = 503 if "not available" in error_message.lower() else 500
        return _json_error(status=status, code="search_failed", message=error_message)
    return web.json_response({"ok": True, "search": payload})


def register_memory_api_routes(app: web.Application) -> None:
    if app.get(MEMORY_SERVICE_APP_KEY) is None:
        app[MEMORY_SERVICE_APP_KEY] = MemoryService()

    app.router.add_get("/api/gui/memory", handle_get_memory)
    app.router.add_post("/api/gui/memory", handle_post_memory)
    app.router.add_patch("/api/gui/memory", handle_patch_memory)
    app.router.add_delete("/api/gui/memory", handle_delete_memory)
    app.router.add_get("/api/gui/user-profile", handle_get_user_profile)
    app.router.add_get("/api/gui/session-search", handle_session_search)
