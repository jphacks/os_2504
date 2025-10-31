#!/usr/bin/env python3
"""Generate a dbdiagram (DBML) file from the SQLAlchemy models."""

from __future__ import annotations

import importlib
import os
import pkgutil
import sys
from pathlib import Path
from typing import Iterable, List, Sequence, Tuple

from sqlalchemy import Boolean, DateTime, Float, Integer, LargeBinary, Numeric, Table, Text, UniqueConstraint
from sqlalchemy.sql.schema import Column
from sqlalchemy.sql.sqltypes import String


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

    output_path = repo_root / "documents" / "schema.dbml"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text("\n".join(lines).strip() + "\n", encoding="utf-8")
    print(f"Written DBML to {output_path}")


if __name__ == "__main__":
    main()
