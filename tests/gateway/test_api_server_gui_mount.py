"""Tests for Hermes Web Console routes mounted by the API server adapter."""

import pytest
from aiohttp import web
from aiohttp.test_utils import TestClient, TestServer

from gateway.config import PlatformConfig
from gateway.platforms.api_server import APIServerAdapter, cors_middleware


def _make_adapter() -> APIServerAdapter:
    return APIServerAdapter(PlatformConfig(enabled=True))


def _create_app(adapter: APIServerAdapter) -> web.Application:
    app = web.Application(middlewares=[cors_middleware])
    adapter._register_routes(app)
    return app


class TestGuiRoutes:
    @pytest.mark.asyncio
    async def test_gui_health_route_exists(self):
        adapter = _make_adapter()
        app = _create_app(adapter)

        async with TestClient(TestServer(app)) as cli:
            resp = await cli.get("/api/gui/health")
            assert resp.status == 200
            assert resp.content_type == "application/json"
            data = await resp.json()
            assert data == {
                "status": "ok",
                "service": "gui-backend",
                "product": "hermes-web-console",
            }

    @pytest.mark.asyncio
    async def test_gui_meta_route_exists(self):
        adapter = _make_adapter()
        app = _create_app(adapter)

        async with TestClient(TestServer(app)) as cli:
            resp = await cli.get("/api/gui/meta")
            assert resp.status == 200
            data = await resp.json()
            assert data["product"] == "hermes-web-console"
            assert data["api_base_path"] == "/api/gui"
            assert data["app_base_path"] == "/app/"
            assert data["adapter"] == adapter.name

    @pytest.mark.asyncio
    async def test_app_placeholder_route_exists(self):
        adapter = _make_adapter()
        app = _create_app(adapter)

        async with TestClient(TestServer(app)) as cli:
            resp = await cli.get("/app/")
            assert resp.status == 200
            assert resp.content_type == "text/html"
            html = await resp.text()
            assert "Hermes Web Console" in html
            assert "/api/gui/health" in html
            assert "/api/gui/meta" in html

    @pytest.mark.asyncio
    async def test_existing_routes_still_work_with_gui_mount(self):
        adapter = _make_adapter()
        app = _create_app(adapter)

        async with TestClient(TestServer(app)) as cli:
            root_resp = await cli.get("/")
            health_resp = await cli.get("/health")
            models_resp = await cli.get("/v1/models")

            assert root_resp.status == 200
            assert health_resp.status == 200
            assert models_resp.status == 200

            health_data = await health_resp.json()
            models_data = await models_resp.json()

            assert health_data["status"] == "ok"
            assert models_data["data"][0]["id"] == "hermes-agent"
