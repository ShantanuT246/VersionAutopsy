"""
VersionAutopsy — File-based TTL cache for PyPI API responses.

Layout:
    /cache/<key>.json   → { "expires_at": <unix timestamp>, "data": <PyPI JSON> }

TTL defaults to 3600 seconds (1 hour).
Writes are atomic: we write to a .tmp file then rename, so a crash mid-write
never leaves a corrupt cache entry.
"""

import json
import os
import time

# Cache directory lives next to this file
_CACHE_DIR = os.path.join(os.path.dirname(__file__), 'cache')
_TTL = 3600  # seconds (1 hour)


def _ensure_dir() -> None:
    """Create the cache directory if it doesn't exist."""
    os.makedirs(_CACHE_DIR, exist_ok=True)


def _key_to_path(cache_key: str) -> str:
    """Map a cache key to its file path, sanitising the key for filesystem use."""
    safe = cache_key.lower().replace('/', '__').replace('\\', '__')
    return os.path.join(_CACHE_DIR, f"{safe}.json")


def get(cache_key: str):
    """
    Return cached data for *cache_key*, or None if the entry is absent / expired.

    Returns:
        dict  — the cached PyPI payload
        None  — cache miss (absent or expired)
    """
    path = _key_to_path(cache_key)
    try:
        with open(path, 'r', encoding='utf-8') as f:
            entry = json.load(f)
        if time.time() < entry.get('expires_at', 0):
            return entry['data']
        # Expired — remove silently
        _remove(path)
        return None
    except (FileNotFoundError, KeyError, json.JSONDecodeError, OSError):
        return None


def set(cache_key: str, data: dict, ttl: int = _TTL) -> None:  # noqa: A001
    """
    Persist *data* under *cache_key* with a TTL-based expiry.

    Args:
        cache_key : unique string identifier (e.g. "flask" or "flask/2.0.0")
        data      : the JSON-serialisable payload to store
        ttl       : time-to-live in seconds (default 1 hour)
    """
    _ensure_dir()
    entry = {
        'expires_at': time.time() + ttl,
        'data': data,
    }
    path = _key_to_path(cache_key)
    tmp  = path + '.tmp'
    try:
        with open(tmp, 'w', encoding='utf-8') as f:
            json.dump(entry, f, separators=(',', ':'))
        os.replace(tmp, path)       # atomic on POSIX; best-effort on Windows
    except OSError:
        pass                        # silently degrade to no-cache


def invalidate(cache_key: str) -> None:
    """Delete the cache entry for *cache_key* if it exists."""
    _remove(_key_to_path(cache_key))


def clear_expired() -> int:
    """
    Remove all expired entries from the cache directory.

    Returns:
        Number of files deleted.
    """
    _ensure_dir()
    now = time.time()
    removed = 0
    for fname in os.listdir(_CACHE_DIR):
        if not fname.endswith('.json'):
            continue
        path = os.path.join(_CACHE_DIR, fname)
        try:
            with open(path, 'r', encoding='utf-8') as f:
                entry = json.load(f)
            if now >= entry.get('expires_at', 0):
                _remove(path)
                removed += 1
        except (json.JSONDecodeError, KeyError, OSError):
            _remove(path)
            removed += 1
    return removed


# ── internal ──────────────────────────────────────────────────────────────────

def _remove(path: str) -> None:
    try:
        os.remove(path)
    except OSError:
        pass
