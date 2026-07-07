"""
Export the persisted metric history (fleet_metricsample) to a readable text file.

This is the on-disk, human-viewable dump of exactly what backs the history
graphs — the same table the frontend reads via /api/system/history. Run:

    python manage.py export_history                 # → repo-root metric-history.txt
    python manage.py export_history --output foo.txt
    python manage.py export_history --limit 500      # newest 500 rows only

Columns are emitted in the intentional LOGICAL order (matching the model /
history._FIELDS), NOT SQLite's migration-driven physical `SELECT *` order. NULLs
render as "---" to honor the project's data-honesty rule (a missing sensor is a
gap, never a guessed value). Rows are timestamped (the `ts` column) so the file
shows when each reading was collected.
"""
from __future__ import annotations

from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from fleet.history import _FIELDS
from fleet.models import MetricSample

# Explicit, stable column order for the export (id + ts + numeric fields + the
# power_est flag). Pinned here so the header never drifts with migration history.
_COLUMNS = ("id", "ts", *_FIELDS, "power_est")

# Per-column display width for the fixed-width table.
_TS_WIDTH = 26
_NUM_WIDTH = 9


def _default_output() -> Path:
    """Repo root (two levels up from this file: backend/.. == project root)."""
    # settings.BASE_DIR is the backend dir; its parent is the project root.
    return Path(settings.BASE_DIR).parent / "metric-history.txt"


class Command(BaseCommand):
    help = "Export stored metric history to a readable text table."

    def add_arguments(self, parser):
        parser.add_argument(
            "--output", "-o", default=None,
            help="Output file path (default: <repo-root>/metric-history.txt).",
        )
        parser.add_argument(
            "--limit", "-n", type=int, default=None,
            help="Export only the newest N rows (default: all).",
        )

    def handle(self, *args, **options):
        out_path = Path(options["output"]) if options["output"] else _default_output()
        limit = options["limit"]

        qs = MetricSample.objects.order_by("ts")  # chronological in the file
        total = qs.count()
        if limit:
            # Newest N, but still written oldest→newest in the file.
            ids = list(
                MetricSample.objects.order_by("-ts").values_list("id", flat=True)[:limit]
            )
            qs = MetricSample.objects.filter(id__in=ids).order_by("ts")

        lines = self._render(qs, total, limit)
        out_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

        self.stdout.write(self.style.SUCCESS(
            f"Wrote {qs.count():,} rows (of {total:,} total) to {out_path}"
        ))

    def _render(self, qs, total: int, limit: int | None) -> list[str]:
        lines: list[str] = []
        lines.append("=" * 72)
        lines.append("NDS-CMS — Stored Metric History")
        lines.append("Table: fleet_metricsample   (source: backend/db.sqlite3)")
        lines.append("One row per streamed frame (~1/sec). NULL sensor = '---'.")
        lines.append(f"Rows in file: {qs.count():,}" + (f" of {total:,} (newest {limit})" if limit else f" of {total:,}"))

        first = qs.first()
        last = qs.last()
        if first and last:
            lines.append(f"Time range:  {first.ts.isoformat()}  →  {last.ts.isoformat()}")
        lines.append("=" * 72)
        lines.append("")

        # Header row.
        lines.append(self._fmt_row([self._head(c) for c in _COLUMNS]))
        lines.append("-" * len(lines[-1]))

        # Data rows.
        for row in qs.iterator():
            cells = []
            for c in _COLUMNS:
                v = getattr(row, c)
                if c == "ts":
                    cells.append(str(v.isoformat()))
                elif c == "id":
                    cells.append(str(v))
                elif c == "power_est":
                    cells.append("EST" if v else "—")  # measured vs estimated
                else:
                    cells.append("---" if v is None else f"{v:g}")
            lines.append(self._fmt_row(cells))

        return lines

    @staticmethod
    def _head(col: str) -> str:
        return {"power_est": "pwr?", "power_w": "power_w"}.get(col, col)

    @staticmethod
    def _fmt_row(cells: list[str]) -> str:
        out = []
        for i, (col, cell) in enumerate(zip(_COLUMNS, cells)):
            if col == "id":
                out.append(cell.rjust(6))
            elif col == "ts":
                out.append(cell.ljust(_TS_WIDTH))
            else:
                out.append(cell.rjust(_NUM_WIDTH))
        return " ".join(out)
