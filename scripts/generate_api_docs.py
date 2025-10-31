#!/usr/bin/env python3
"""Generate static API documentation (OpenAPI JSON and Swagger UI HTML)."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path


def ensure_environment() -> None:
    """Ensure required environment variables exist before importing app modules."""
    os.environ.setdefault("DATABASE_URL", "mysql+aiomysql://user:pass@localhost/db")


def extend_sys_path(repo_root: Path) -> None:
    """Ensure the repo root is on sys.path."""
    if str(repo_root) not in sys.path:
        sys.path.insert(0, str(repo_root))


def main() -> None:
    repo_root = Path(__file__).resolve().parents[1]
    ensure_environment()
    extend_sys_path(repo_root)

    from backend.main import app

    openapi_schema = app.openapi()
    openapi_json = json.dumps(openapi_schema, indent=2, ensure_ascii=False)
    openapi_js = openapi_json.replace("</", "<\\/")

    output_dir = repo_root / "documents" / "api"
    output_dir.mkdir(parents=True, exist_ok=True)

    openapi_path = output_dir / "openapi.json"
    html_path = output_dir / "swagger.html"

    openapi_path.write_text(openapi_json + "\n", encoding="utf-8")

    html_content = f"""<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <title>MogFinder API Reference</title>
  <link rel="icon" type="image/png" href="https://petstore.swagger.io/favicon-32x32.png" />
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" crossorigin="anonymous" />
  <style>
    body {{
      margin: 0;
      background-color: #fafafa;
    }}
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js" crossorigin="anonymous"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js" crossorigin="anonymous"></script>
  <script>
  window.addEventListener('load', () => {{
    if (!window.SwaggerUIBundle) {{
      document.getElementById('swagger-ui').innerHTML = '<p style="padding:16px;color:#b91c1c;">Swagger UI scriptsの読み込みに失敗しました。ネットワーク設定を確認してください。</p>';
      return;
    }}
    const spec = {openapi_js};
    const presetList = window.SwaggerUIBundle.presets && window.SwaggerUIBundle.presets.apis
      ? [window.SwaggerUIBundle.presets.apis]
      : undefined;
    const options = {{
      spec,
      dom_id: '#swagger-ui',
      layout: 'BaseLayout'
    }};
    if (presetList) {{
      options.presets = presetList;
    }}
    window.SwaggerUIBundle(options);
  }});
  </script>
</body>
</html>
"""
    html_path.write_text(html_content, encoding="utf-8")

    print(f"Wrote OpenAPI JSON to {openapi_path}")
    print(f"Wrote Swagger UI HTML to {html_path}")


if __name__ == "__main__":
    main()
