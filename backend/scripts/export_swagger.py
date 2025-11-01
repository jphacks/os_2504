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


SWAGGER_UI_VERSION = "5.9.0"


HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="utf-8" />
    <title>{title} - Swagger UI</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" type="image/png" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@{swagger_version}/favicon-32x32.png" />
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
        #swagger-ui {{
            min-height: 100vh;
        }}
        .swagger-load-error {{
            margin: 32px;
            padding: 24px;
            background: #fff;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            color: #1e293b;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            line-height: 1.6;
        }}
        .swagger-load-error h1 {{
            margin-top: 0;
            font-size: 20px;
        }}
        .swagger-load-error code {{
            background: #f1f5f9;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 13px;
        }}
        .swagger-load-error details {{
            margin-top: 16px;
        }}
    </style>
</head>
<body>
    <div id="swagger-ui">
        <p style="padding:16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#475569;">Swagger UI を読み込んでいます...</p>
    </div>
    <script>
        (function () {{
            const CSS_SOURCES = [
                'https://cdn.jsdelivr.net/npm/swagger-ui-dist@{swagger_version}/swagger-ui.css',
                'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/{swagger_version}/swagger-ui.min.css',
                'https://unpkg.com/swagger-ui-dist@{swagger_version}/swagger-ui.css'
            ];
            const BUNDLE_SOURCES = [
                'https://cdn.jsdelivr.net/npm/swagger-ui-dist@{swagger_version}/swagger-ui-bundle.js',
                'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/{swagger_version}/swagger-ui-bundle.min.js',
                'https://unpkg.com/swagger-ui-dist@{swagger_version}/swagger-ui-bundle.js'
            ];
            const PRESET_SOURCES = [
                'https://cdn.jsdelivr.net/npm/swagger-ui-dist@{swagger_version}/swagger-ui-standalone-preset.js',
                'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/{swagger_version}/swagger-ui-standalone-preset.min.js',
                'https://unpkg.com/swagger-ui-dist@{swagger_version}/swagger-ui-standalone-preset.js'
            ];

            const target = document.getElementById('swagger-ui');

            function loadStylesheetSequential(urls, index = 0) {{
                return new Promise((resolve, reject) => {{
                    if (index >= urls.length) {{
                        reject(new Error('All stylesheet sources failed'));
                        return;
                    }}
                    const link = document.createElement('link');
                    link.rel = 'stylesheet';
                    link.href = urls[index];
                    link.onload = () => resolve(urls[index]);
                    link.onerror = () => {{
                        link.remove();
                        loadStylesheetSequential(urls, index + 1).then(resolve).catch(reject);
                    }};
                    document.head.appendChild(link);
                }});
            }}

            function loadScriptSequential(urls, index = 0) {{
                return new Promise((resolve, reject) => {{
                    if (index >= urls.length) {{
                        reject(new Error('All script sources failed'));
                        return;
                    }}
                    const script = document.createElement('script');
                    script.src = urls[index];
                    script.onload = () => resolve(urls[index]);
                    script.onerror = () => {{
                        script.remove();
                        loadScriptSequential(urls, index + 1).then(resolve).catch(reject);
                    }};
                    document.head.appendChild(script);
                }});
            }}

            async function bootstrapSwaggerUI() {{
                try {{
                    const cssUrl = await loadStylesheetSequential(CSS_SOURCES);
                    const bundleUrl = await loadScriptSequential(BUNDLE_SOURCES);
                    const presetUrl = await loadScriptSequential(PRESET_SOURCES);

                    if (typeof SwaggerUIBundle !== 'function') {{
                        throw new Error('SwaggerUIBundle is not available (last tried ' + bundleUrl + ')');
                    }}

                    const spec = {spec_json};
                    target.innerHTML = '';
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
                }} catch (error) {{
                    console.error('Swagger UI bootstrap failed:', error);
                    target.innerHTML = `
                        <section class="swagger-load-error">
                            <h1>Swagger UI の読み込みに失敗しました</h1>
                            <p>ネットワーク制限や CDN へのアクセス遮断が原因の可能性があります。以下を確認してください。</p>
                            <ul>
                                <li><code>cdn.jsdelivr.net</code> や <code>cdnjs.cloudflare.com</code> などへのアクセスが許可されているか</li>
                                <li>ブラウザの拡張機能でスクリプトや CSS がブロックされていないか</li>
                                <li>ネットワークプロキシやファイアウォールが外部 CDN を制限していないか</li>
                            </ul>
                            <details>
                                <summary>エラー詳細</summary>
                                <pre>${{error.message}}</pre>
                            </details>
                        </section>
                    `;
                }}
            }}

            window.addEventListener('load', bootstrapSwaggerUI);
        }})();
    </script>
</body>
</html>
"""


def generate_html(schema: MutableMapping[str, Any]) -> str:
    """Generate a Swagger UI HTML page embedding the OpenAPI schema."""
    title = schema.get("info", {}).get("title", "API Documentation")
    spec_json = json.dumps(schema, indent=2, ensure_ascii=False).replace("</", "<\\/")
    return HTML_TEMPLATE.format(title=title, spec_json=spec_json, swagger_version=SWAGGER_UI_VERSION)


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
