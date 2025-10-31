#!/usr/bin/env python3
"""Export Swagger documentation from the FastAPI application to static files."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any, Mapping, MutableMapping

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = Path(__file__).resolve().parents[1]


def ensure_environment() -> None:
    """Populate environment variables required for importing the app."""
    os.environ.setdefault("DATABASE_URL", "mysql+aiomysql://user:pass@localhost:3306/db")


def add_repo_to_sys_path() -> None:
    """Ensure the repository root is importable."""
    repo_path = str(REPO_ROOT)
    if repo_path not in sys.path:
        sys.path.insert(0, repo_path)


def sort_mapping(obj: Any) -> Any:
    """Recursively sort dictionaries to stabilise OpenAPI output."""
    if isinstance(obj, Mapping):
        return {key: sort_mapping(obj[key]) for key in sorted(obj.keys())}
    if isinstance(obj, list):
        return [sort_mapping(item) for item in obj]
    return obj


HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="utf-8" />
    <title>{title} - Swagger UI</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" type="image/png" href="https://petstore.swagger.io/favicon-32x32.png" />
    <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.9.0/swagger-ui.css" />
    <style>
        html {{
            box-sizing: border-box;
            overflow-y: scroll;
        }}
        *, *::before, *::after {{
            box-sizing: inherit;
        }}
        body {{
            margin: 0;
            background: #f8fafc;
        }}
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.9.0/swagger-ui-standalone-preset.js"></script>
    <script>
        window.onload = function () {{
            if (!window.SwaggerUIBundle) {{
                document.getElementById('swagger-ui').innerHTML =
                    '<p style="padding:16px;color:#b91c1c;">Swagger UI の読み込みに失敗しました。</p>';
                return;
            }}
            const spec = {spec_json};
            window.ui = SwaggerUIBundle({{
                spec: spec,
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                ],
                plugins: [
                    SwaggerUIBundle.plugins.DownloadUrl
                ],
                layout: 'StandaloneLayout'
            }});
        }};
    </script>
</body>
</html>
"""


def generate_html(schema: MutableMapping[str, Any]) -> str:
    """Generate a Swagger UI HTML page embedding the OpenAPI schema."""
    title = schema.get("info", {}).get("title", "API Documentation")
    spec_json = json.dumps(schema, indent=2, ensure_ascii=False).replace("</", "<\\/")
    return HTML_TEMPLATE.format(title=title, spec_json=spec_json)


def export_files(openapi_schema: MutableMapping[str, Any]) -> None:
    """Write the HTML and JSON artefacts under documents/api."""
    output_dir = REPO_ROOT / "documents" / "api"
    output_dir.mkdir(parents=True, exist_ok=True)

    html_path = output_dir / "swagger.html"
    json_path = output_dir / "openapi.json"

    html_path.write_text(generate_html(openapi_schema), encoding="utf-8")
    json_path.write_text(json.dumps(openapi_schema, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"✅ Swagger HTML exported to: {html_path}")
    print(f"📄 OpenAPI JSON exported to: {json_path}")


def main() -> None:
    ensure_environment()
    add_repo_to_sys_path()

    from backend.main import app  # Imported after environment is prepared

    schema = app.openapi()
    sorted_schema = sort_mapping(schema)
    export_files(sorted_schema)


if __name__ == "__main__":
    main()
