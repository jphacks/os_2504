#!/usr/bin/env python3
"""Backward-compatible wrapper for exporting Swagger documentation."""

from pathlib import Path
import sys

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from backend.scripts.export_swagger import main  # pylint: disable=wrong-import-position


if __name__ == "__main__":
    main()
