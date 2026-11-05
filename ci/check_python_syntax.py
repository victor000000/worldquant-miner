"""Compile tracked Python sources without importing or running any component."""
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
files = subprocess.check_output(
    ["git", "ls-files", "-z", "--", "*.py"], cwd=ROOT
).decode().split("\0")
failures = []
count = 0
for name in filter(None, files):
    count += 1
    try:
        compile((ROOT / name).read_bytes(), name, "exec")
    except (SyntaxError, UnicodeError) as error:
        failures.append(f"{name}:{getattr(error, 'lineno', '?')}: {error}")
print(f"Syntax checked {count} tracked Python files; {len(failures)} failures.")
for failure in failures:
    print(failure)
sys.exit(bool(failures))
