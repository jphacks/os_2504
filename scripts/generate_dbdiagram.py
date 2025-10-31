#!/usr/bin/env python3
"""Generate a dbdiagram (DBML) file from the SQLAlchemy models."""

from __future__ import annotations

import importlib
import os
import pkgutil
import sys
from pathlib import Path
from typing import Iterable, List, Sequence, Tuple

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    Integer,
    LargeBinary,
    Numeric,
    Table,
    Text,
    UniqueConstraint,
)
from sqlalchemy.sql.schema import Column
from sqlalchemy.sql.sqltypes import String


MERMAID_BEGIN_MARKER = "<!-- BEGIN ER MERMAID -->"
MERMAID_END_MARKER = "<!-- END ER MERMAID -->"


def ensure_environment() -> None:
    """Ensure mandatory environment variables exist before importing app modules."""
    os.environ.setdefault("DATABASE_URL", "mysql+aiomysql://user:pass@localhost/db")


def extend_sys_path(repo_root: Path) -> None:
    """Make sure the repository root is on sys.path."""
    if str(repo_root) not in sys.path:
        sys.path.insert(0, str(repo_root))


def load_model_modules(models_package: str) -> None:
    """Import all modules within backend.models so metadata is populated."""
    package = importlib.import_module(models_package)
    package_path = Path(package.__file__).resolve().parent

    for module_info in pkgutil.iter_modules([str(package_path)]):
        if module_info.ispkg:
            continue
        if module_info.name.startswith("_") or module_info.name == "base":
            continue
        importlib.import_module(f"{models_package}.{module_info.name}")


def column_type_to_dbml(column: Column) -> str:
    """Convert a SQLAlchemy column type into a DBML-compatible string."""
    col_type = column.type

    if isinstance(col_type, Text):
        return "text"
    if isinstance(col_type, String):
        if col_type.length:
            return f"varchar({col_type.length})"
        return "varchar"
    if isinstance(col_type, Integer):
        return "int"
    if isinstance(col_type, Float):
        return "float"
    if isinstance(col_type, Boolean):
        return "boolean"
    if isinstance(col_type, DateTime):
        return "timestamp"
    if isinstance(col_type, Numeric):
        precision = getattr(col_type, "precision", None)
        scale = getattr(col_type, "scale", None)
        if precision is not None:
            if scale is not None:
                return f"numeric({precision}, {scale})"
            return f"numeric({precision})"
        return "numeric"
    if isinstance(col_type, LargeBinary):
        return "binary"
    if col_type.__class__.__name__.lower() == "json":
        return "json"
    return str(col_type).lower()


def format_attributes(column: Column) -> str:
    """Build the DBML attribute list for a column."""
    attributes: List[str] = []
    if column.primary_key:
        attributes.append("pk")
    elif not column.nullable:
        attributes.append("not null")

    if getattr(column, "unique", False):
        attributes.append("unique")

    if not attributes:
        return ""
    return f" [{', '.join(attributes)}]"


def build_table_section(table: Table) -> Sequence[str]:
    """Create the DBML block for a single table."""
    lines: List[str] = [f"Table {table.name} {{"]
    for column in table.columns:
        column_line = f"  {column.name} {column_type_to_dbml(column)}{format_attributes(column)}"
        lines.append(column_line)

    unique_constraints = [
        constraint
        for constraint in table.constraints
        if isinstance(constraint, UniqueConstraint) and constraint.columns
    ]

    if unique_constraints:
        lines.append("")
        lines.append("  Indexes {")
        for constraint in unique_constraints:
            column_list = ", ".join(column.name for column in constraint.columns)
            attributes = ["unique"]
            if constraint.name:
                attributes.append(f'name: "{constraint.name}"')
            lines.append(f"    ({column_list}) [{', '.join(attributes)}]")
        lines.append("  }")

    lines.append("}")
    return lines


def column_type_to_mermaid(column: Column) -> str:
    """Convert a SQLAlchemy column type into a Mermaid-friendly string."""
    col_type = column.type

    if isinstance(col_type, Text):
        return "text"
    if isinstance(col_type, String):
        if col_type.length:
            return f"varchar({col_type.length})"
        return "varchar"
    if isinstance(col_type, Integer):
        return "int"
    if isinstance(col_type, Float):
        return "float"
    if isinstance(col_type, Boolean):
        return "bool"
    if isinstance(col_type, DateTime):
        return "timestamp"
    if isinstance(col_type, Numeric):
        return "numeric"
    if isinstance(col_type, LargeBinary):
        return "binary"
    if col_type.__class__.__name__.lower() == "json":
        return "json"
    return str(col_type).lower()


def format_mermaid_attributes(column: Column) -> str:
    """Return suffix tokens for Mermaid based on column attributes."""
    attributes: List[str] = []
    if column.primary_key:
        attributes.append("PK")
    elif not column.nullable:
        attributes.append("NN")
    if getattr(column, "unique", False):
        attributes.append("UQ")
    if not attributes:
        return ""
    return " " + " ".join(attributes)


def build_mermaid_entities(tables: Sequence[Table]) -> List[str]:
    """Build Mermaid entity declarations for tables."""
    lines: List[str] = []
    for table in tables:
        lines.append(f"    {table.name} {{")
        for column in table.columns:
            column_line = (
                f"        {column_type_to_mermaid(column)} {column.name}{format_mermaid_attributes(column)}"
            )
            lines.append(column_line)
        lines.append("    }")
    return lines


def collect_references(tables: Iterable) -> List[Tuple[str, str, str, str]]:
    """Collect foreign key relationships for DBML reference lines."""
    refs = set()
    for table in tables:
        for column in table.columns:
            for foreign_key in column.foreign_keys:
                referred_column = foreign_key.column
                refs.add(
                    (
                        table.name,
                        column.name,
                        referred_column.table.name,
                        referred_column.name,
                    )
                )
    return sorted(refs)


def build_mermaid_relationships(refs: Sequence[Tuple[str, str, str, str]]) -> List[str]:
    """Generate Mermaid relation lines from foreign keys."""
    lines: List[str] = []
    for src_table, src_column, dst_table, _dst_column in refs:
        lines.append(f'    {dst_table} ||--o{{ {src_table} : "{src_column}"')
    return lines


def build_mermaid_diagram(tables: Sequence[Table]) -> List[str]:
    """Construct the Mermaid ER diagram contents."""
    lines: List[str] = ["%%{init: {'theme': 'neutral'}}%%", "erDiagram"]
    lines.extend(build_mermaid_entities(tables))

    refs = collect_references(tables)
    if refs:
        lines.append("")
        lines.extend(build_mermaid_relationships(refs))
    return lines


def update_readme_mermaid(readme_path: Path, mermaid_lines: Sequence[str]) -> None:
    """Replace the Mermaid fenced block in the README with the latest diagram."""
    if not readme_path.exists():
        return
    content = readme_path.read_text(encoding="utf-8")
    begin_idx = content.find(MERMAID_BEGIN_MARKER)
    end_idx = content.find(MERMAID_END_MARKER)
    if begin_idx == -1 or end_idx == -1 or end_idx < begin_idx:
        return

    before = content[: begin_idx + len(MERMAID_BEGIN_MARKER)]
    after = content[end_idx:]
    mermaid_block = "\n```mermaid\n" + "\n".join(mermaid_lines) + "\n```\n"
    updated = before + mermaid_block + after
    readme_path.write_text(updated, encoding="utf-8")


def main() -> None:
    repo_root = Path(__file__).resolve().parents[1]
    ensure_environment()
    extend_sys_path(repo_root)

    load_model_modules("backend.models")

    from backend.models import Base

    tables = sorted(Base.metadata.tables.values(), key=lambda t: t.name)
    lines: List[str] = []

    for table in tables:
        lines.extend(build_table_section(table))
        lines.append("")  # Blank line between tables

    for src_table, src_column, dst_table, dst_column in collect_references(tables):
        lines.append(f"Ref: {src_table}.{src_column} > {dst_table}.{dst_column}")

    output_dir = repo_root / "documents"
    output_dir.mkdir(parents=True, exist_ok=True)

    dbml_path = output_dir / "schema.dbml"
    dbml_path.write_text("\n".join(lines).strip() + "\n", encoding="utf-8")
    print(f"Written DBML to {dbml_path}")

    mermaid_lines = build_mermaid_diagram(tables)
    mermaid_path = output_dir / "schema.mmd"
    mermaid_path.write_text("\n".join(mermaid_lines) + "\n", encoding="utf-8")
    print(f"Written Mermaid ER diagram to {mermaid_path}")

    update_readme_mermaid(output_dir / "README.md", mermaid_lines)


if __name__ == "__main__":
    main()
