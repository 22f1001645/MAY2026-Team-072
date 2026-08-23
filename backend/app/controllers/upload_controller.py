"""Local-filesystem uploads (ORG-01, decision D-01) — the serve half.

This is the first upload code in the repository: before this file there was no
`request.files`, no `UPLOAD_FOLDER` and no `send_from_directory` anywhere, so
every control here is built from nothing rather than copied from a neighbour.
Phase 5's CAMPAIGN-03 reuses the identical primitive.

The write half lives in `org_profile_service.store_logo`, which calls
`sniff_image_ext` and `upload_dir` from here — those two, plus the blueprint and
the route below, are this module's whole surface.
"""
from pathlib import Path

from flask import Blueprint, current_app, send_from_directory

from ..constants import UPLOAD_URL_PREFIX

upload_bp = Blueprint("uploads", __name__, url_prefix="/api/v1")

# Every accepted signature and the canonical extension it maps to. The tuple is
# the allowlist: anything that matches no row is refused, so SVG, GIF, PDF, a ZIP
# and an HTML file all fall through to None with no rule of their own.
#
# SVG is excluded DELIBERATELY and is the reason this table exists at all. An SVG
# is an XML document that can carry a <script> element, and serving one from the
# API origin is stored XSS (T-04-17) — it is not "an image we happen not to
# support".
#
# WebP is the one signature that is not a plain prefix: `RIFF` at offset 0 is
# shared with WAV and AVI, and only `WEBP` at offset 8 distinguishes it, so each
# row carries a list of (offset, bytes) checks rather than a single prefix.
IMAGE_MAGIC = (
    (".png", ((0, b"\x89PNG\r\n\x1a\n"),)),
    (".jpg", ((0, b"\xff\xd8\xff"),)),
    (".webp", ((0, b"RIFF"), (8, b"WEBP"))),
)

# 16 bytes is enough for every row above (the deepest check ends at offset 12).
IMAGE_MAGIC_BYTES = 16

# A reimbursement bill is a photo of a receipt OR a PDF invoice, so this table is
# the image allowlist plus one row. It stays SEPARATE from IMAGE_MAGIC because a
# PDF is not acceptable everywhere an image is: an organisation logo and a
# campaign poster are rendered in an <img>, and widening the shared table would
# silently let a PDF through both of those.
#
# SVG stays excluded here for the same reason it is excluded above.
BILL_MAGIC = IMAGE_MAGIC + ((".pdf", ((0, b"%PDF-"),)),)


def upload_dir() -> Path:
    """`<instance_path>/uploads`, created if it is not there.

    Resolved at call time and never at import time, and never assumed to exist:
    `instance/` is gitignored, so this directory is absent on every fresh clone
    and in CI, and a module-level constant would also need an application
    context that does not exist while the package is being imported.
    """
    path = Path(current_app.instance_path) / "uploads"
    path.mkdir(parents=True, exist_ok=True)
    return path


def sniff_image_ext(head: bytes) -> str | None:
    """The canonical extension for these leading bytes, or None to refuse.

    The decision is made from the bytes ALONE. A multipart part's declared
    content type and its filename are both fully client-controlled — `logo.png`
    with `Content-Type: image/png` costs an attacker nothing to send — so
    neither is consulted here or anywhere else (T-04-18).
    """
    return _sniff(head, IMAGE_MAGIC)


def sniff_bill_ext(head: bytes) -> str | None:
    """The canonical extension for a reimbursement bill, or None to refuse.

    Same bytes-only decision as `sniff_image_ext` — the declared content type and
    the client's filename are never consulted — over the wider BILL_MAGIC table.
    """
    return _sniff(head, BILL_MAGIC)


def _sniff(head: bytes, table) -> str | None:
    return next(
        (
            ext
            for ext, signature in table
            if all(head[at:at + len(sig)] == sig for at, sig in signature)
        ),
        None,
    )


@upload_bp.get("/uploads/<filename>")
def serve_upload(filename):
    """An uploaded image. Deliberately UNAUTHENTICATED, for a browser reason.

    The SPA runs on :5173 and this API on :5000, so
    `<img src="http://localhost:5000/api/v1/uploads/x.png">` is a cross-origin
    subresource load: it carries no `Authorization` header (the access token
    lives in memory, not in a cookie the browser could attach) and no cookies. A
    guarded logo URL therefore renders as a broken image in every browser. The
    path holds no `<org_id>`, so `test_rbac_enforcement.py`'s scoped-route walk
    does not require a guard here and no LEGACY_COARSE_ROUTES entry is due.

    P-01: the unguessable `uuid4().hex` name is NOT the security control and may
    never be counted as one. It exists because credentials cannot travel on this
    request. The controls are the size cap, the magic-byte sniff, the
    PNG/JPEG/WebP allowlist and the `nosniff` header below — none of which may be
    relaxed on the grounds that the URL is hard to guess.

    Traversal is refused by `send_from_directory`, which resolves the name
    against the directory and raises NotFound for anything escaping it. A
    hand-rolled path join plus a `..` check is not used on purpose: it misses
    percent-encoded and Windows-separator variants, and this project develops on
    Windows.
    """
    response = send_from_directory(upload_dir(), filename)
    # Without this a browser may re-sniff the bytes into an active document and
    # execute them on the API origin (T-04-19). The serve route is public, so
    # this header is the only thing standing between a stored file and a script
    # context.
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


def served_path(filename: str) -> str:
    """The `logo_url` value for a stored file — the one place the path is built."""
    return f"{UPLOAD_URL_PREFIX}{filename}"


def save_image_upload(file_storage, max_bytes: int = 5 * 1024 * 1024) -> str:
    """Validate and save an uploaded image (PNG, JPEG, WebP) up to max_bytes, returning its served path."""
    from uuid import uuid4
    from ..errors import ApiError

    file_storage.stream.seek(0, 2)
    size = file_storage.stream.tell()
    file_storage.stream.seek(0)
    if size > max_bytes:
        mb = max_bytes // (1024 * 1024)
        raise ApiError(f"Image must be {mb} MB or smaller.", "payload_too_large", 413)

    head = file_storage.read(IMAGE_MAGIC_BYTES)
    file_storage.seek(0)

    ext = sniff_image_ext(head)
    if ext is None:
        raise ApiError("That file isn't a PNG, JPEG or WebP.", "invalid_image", 400)

    name = f"{uuid4().hex}{ext}"
    file_storage.save(str(upload_dir() / name))
    return served_path(name)

