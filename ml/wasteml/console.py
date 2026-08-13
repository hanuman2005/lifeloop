"""Console encoding guard.

Windows terminals default to cp1252, which cannot encode the symbols used in these
scripts' progress output. Without this, a training run dies on a print statement
rather than on anything that matters.
"""

import sys


def enable_utf8() -> None:
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except (AttributeError, ValueError):
            pass  # already UTF-8, or a stream that does not support reconfiguration
