"""Models API routes for the Hermes Web Console backend."""

from aiohttp import web

from hermes_cli.models import list_available_providers, curated_models_for_provider

async def handle_get_models_catalog(request: web.Request) -> web.Response:
    providers = list_available_providers()
    for p in providers:
        # Load the models catalog for each provider
        try:
            models_list = curated_models_for_provider(p["id"])
            p["models"] = [{"id": m[0], "description": m[1]} for m in models_list]
        except Exception:
            p["models"] = []
    
    return web.json_response({
        "ok": True,
        "providers": providers
    })

def register_models_api_routes(app: web.Application) -> None:
    app.router.add_get("/api/gui/models/catalog", handle_get_models_catalog)
