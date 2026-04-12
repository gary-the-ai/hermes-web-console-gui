"""Backup and restore API routes for the Hermes Web Console.

Provides:
  GET  /api/gui/system/backup   — stream a zip backup of ~/.hermes/ to the browser
  POST /api/gui/system/restore  — accept a zip upload and restore into ~/.hermes/
"""

from __future__ import annotations

import asyncio
import io
import logging
import os
import tempfile
import time
import zipfile
from datetime import datetime
from pathlib import Path

from aiohttp import web

logger = logging.getLogger(__name__)


async def handle_system_backup(request: web.Request) -> web.StreamResponse:
    """Stream a zip backup of HERMES_HOME to the browser."""
    loop = asyncio.get_running_loop()

    def _create_backup_bytes() -> tuple[bytes, int, str]:
        from hermes_constants import get_default_hermes_root
        from hermes_cli.backup import _should_exclude, _EXCLUDED_DIRS

        hermes_root = get_default_hermes_root()
        if not hermes_root.is_dir():
            raise FileNotFoundError(f"Hermes home not found: {hermes_root}")

        stamp = datetime.now().strftime("%Y-%m-%d-%H%M%S")
        filename = f"hermes-backup-{stamp}.zip"

        buf = io.BytesIO()
        file_count = 0
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
            for dirpath, dirnames, filenames in os.walk(hermes_root, followlinks=False):
                dp = Path(dirpath)
                rel_dir = dp.relative_to(hermes_root)
                dirnames[:] = [d for d in dirnames if d not in _EXCLUDED_DIRS]

                for fname in filenames:
                    fpath = dp / fname
                    rel = fpath.relative_to(hermes_root)
                    if _should_exclude(rel):
                        continue
                    try:
                        zf.write(fpath, arcname=str(rel))
                        file_count += 1
                    except (PermissionError, OSError):
                        continue

        return buf.getvalue(), file_count, filename

    try:
        data, file_count, filename = await loop.run_in_executor(None, _create_backup_bytes)
    except FileNotFoundError as e:
        return web.json_response({"ok": False, "error": str(e)}, status=404)
    except Exception as e:
        logger.exception("Backup creation failed")
        return web.json_response({"ok": False, "error": str(e)}, status=500)

    response = web.StreamResponse(
        status=200,
        headers={
            "Content-Type": "application/zip",
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Length": str(len(data)),
            "X-Backup-Files": str(file_count),
        },
    )
    await response.prepare(request)
    await response.write(data)
    await response.write_eof()
    return response


async def handle_system_restore(request: web.Request) -> web.Response:
    """Accept a zip upload and restore it into HERMES_HOME."""
    reader = await request.multipart()
    if reader is None:
        return web.json_response(
            {"ok": False, "error": "Expected multipart/form-data with a 'file' part"},
            status=400,
        )

    zip_data = None
    while True:
        part = await reader.next()
        if part is None:
            break
        if part.name == "file":
            zip_data = await part.read(decode=False)
            break

    if zip_data is None:
        return web.json_response(
            {"ok": False, "error": "No 'file' part found in upload"},
            status=400,
        )

    loop = asyncio.get_running_loop()

    def _do_restore() -> dict:
        from hermes_constants import get_default_hermes_root
        from hermes_cli.backup import _validate_backup_zip, _detect_prefix

        hermes_root = get_default_hermes_root()
        hermes_root.mkdir(parents=True, exist_ok=True)

        buf = io.BytesIO(zip_data)
        if not zipfile.is_zipfile(buf):
            return {"ok": False, "error": "Uploaded data is not a valid zip file"}

        buf.seek(0)
        with zipfile.ZipFile(buf, "r") as zf:
            ok, reason = _validate_backup_zip(zf)
            if not ok:
                return {"ok": False, "error": reason}

            prefix = _detect_prefix(zf)
            members = [n for n in zf.namelist() if not n.endswith("/")]

            errors = []
            restored = 0

            for member in members:
                if prefix and member.startswith(prefix):
                    rel = member[len(prefix):]
                else:
                    rel = member

                if not rel:
                    continue

                target = hermes_root / rel

                # Security: reject absolute paths and traversals
                try:
                    target.resolve().relative_to(hermes_root.resolve())
                except ValueError:
                    errors.append(f"{rel}: path traversal blocked")
                    continue

                try:
                    target.parent.mkdir(parents=True, exist_ok=True)
                    with zf.open(member) as src, open(target, "wb") as dst:
                        dst.write(src.read())
                    restored += 1
                except (PermissionError, OSError) as exc:
                    errors.append(f"{rel}: {exc}")

        return {
            "ok": True,
            "restored": restored,
            "total": len(members),
            "errors": errors[:20],
        }

    try:
        result = await loop.run_in_executor(None, _do_restore)
    except Exception as e:
        logger.exception("Restore failed")
        return web.json_response({"ok": False, "error": str(e)}, status=500)

    return web.json_response(result)


def register_system_api_routes(app: web.Application) -> None:
    """Register system backup/restore API routes."""
    app.router.add_get("/api/gui/system/backup", handle_system_backup)
    app.router.add_post("/api/gui/system/restore", handle_system_restore)
