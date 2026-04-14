"""Tests for system-oriented web-console API routes."""

from __future__ import annotations

from types import SimpleNamespace

import pytest
from aiohttp import web
from aiohttp.test_utils import TestClient, TestServer

from gateway.web_console.routes import register_web_console_routes


class TestSystemApiRoutes:
    @staticmethod
    async def _make_client() -> TestClient:
        app = web.Application()
        register_web_console_routes(app)
        client = TestClient(TestServer(app))
        await client.start_server()
        return client

    @pytest.mark.asyncio
    async def test_reload_route_returns_updated_var_count(self, monkeypatch):
        monkeypatch.setattr(
            "hermes_cli.config.reload_env",
            lambda: 3,
        )

        client = await self._make_client()
        try:
            resp = await client.post("/api/gui/system/reload", json={})
            assert resp.status == 200
            payload = await resp.json()
            assert payload == {
                "ok": True,
                "updated": 3,
                "message": "Reloaded .env (3 var(s) updated)",
            }
        finally:
            await client.close()

    @pytest.mark.asyncio
    async def test_debug_route_returns_uploaded_urls(self, monkeypatch):
        monkeypatch.setattr(
            "hermes_cli.debug._capture_dump",
            lambda: "dump text",
        )
        monkeypatch.setattr(
            "hermes_cli.debug.collect_debug_report",
            lambda log_lines=200, dump_text="": f"report lines={log_lines} dump={dump_text}",
        )
        monkeypatch.setattr(
            "hermes_cli.debug._read_full_log",
            lambda log_name: f"{log_name}-log" if log_name != "gateway" else None,
        )

        uploads: list[tuple[str, int]] = []

        def fake_upload(content: str, expiry_days: int = 7) -> str:
            uploads.append((content, expiry_days))
            return f"https://paste.test/{len(uploads)}"

        monkeypatch.setattr("hermes_cli.debug.upload_to_pastebin", fake_upload)

        client = await self._make_client()
        try:
            resp = await client.post("/api/gui/system/debug", json={"lines": 42, "expire": 5})
            assert resp.status == 200
            payload = await resp.json()
            assert payload["ok"] is True
            assert payload["mode"] == "upload"
            assert payload["report_url"] == "https://paste.test/1"
            assert payload["agent_log_url"] == "https://paste.test/2"
            assert payload["gateway_log_url"] is None
            assert payload["failures"] == []
            assert uploads[0] == ("report lines=42 dump=dump text", 5)
            assert uploads[1] == ("dump text\n\n--- full agent.log ---\nagent-log", 5)
        finally:
            await client.close()

    @pytest.mark.asyncio
    async def test_debug_route_local_mode_returns_report_without_upload(self, monkeypatch):
        monkeypatch.setattr("hermes_cli.debug._capture_dump", lambda: "dump text")
        monkeypatch.setattr(
            "hermes_cli.debug.collect_debug_report",
            lambda log_lines=200, dump_text="": f"local-report lines={log_lines} dump={dump_text}",
        )
        monkeypatch.setattr("hermes_cli.debug._read_full_log", lambda log_name: None)

        def should_not_upload(*args, **kwargs):
            raise AssertionError("upload_to_pastebin should not be called in local mode")

        monkeypatch.setattr("hermes_cli.debug.upload_to_pastebin", should_not_upload)

        client = await self._make_client()
        try:
            resp = await client.post("/api/gui/system/debug", json={"local": True, "lines": 12})
            assert resp.status == 200
            payload = await resp.json()
            assert payload == {
                "ok": True,
                "mode": "local",
                "report": "local-report lines=12 dump=dump text",
                "agent_log": None,
                "gateway_log": None,
            }
        finally:
            await client.close()
