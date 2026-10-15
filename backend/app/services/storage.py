import httpx

from app.config import settings

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_SLIP_BYTES = 5 * 1024 * 1024


def upload_slip(order_id: int, file: bytes, content_type: str, filename: str) -> str:
    """Upload a slip image to Supabase Storage and return its object path."""
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise RuntimeError("Supabase Storage is not configured")

    bucket = settings.supabase_storage_bucket
    safe_name = filename.strip() or "slip.jpg"
    object_path = f"orders/{order_id}/{safe_name}"
    url = f"{settings.supabase_url}/storage/v1/object/{bucket}/{object_path}"

    response = httpx.post(
        url,
        content=file,
        headers={
            "Authorization": f"Bearer {settings.supabase_service_role_key}",
            "Content-Type": content_type or "application/octet-stream",
            "x-upsert": "true",
        },
        timeout=30.0,
    )
    if response.status_code >= 300:
        raise RuntimeError(f"Slip upload failed: {response.status_code} {response.text}")

    return f"{bucket}/{object_path}"


def signed_slip_url(object_path: str, expires_in: int = 3600) -> str:
    """Create a short-lived signed URL for admin slip viewing."""
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise RuntimeError("Supabase Storage is not configured")

    url = f"{settings.supabase_url}/storage/v1/object/sign/{object_path}"
    response = httpx.post(
        url,
        json={"expiresIn": expires_in},
        headers={
            "Authorization": f"Bearer {settings.supabase_service_role_key}",
            "Content-Type": "application/json",
        },
        timeout=15.0,
    )
    if response.status_code >= 300:
        raise RuntimeError(f"Signed URL failed: {response.status_code} {response.text}")

    signed = response.json().get("signedURL", "")
    if signed.startswith("http"):
        return signed
    return f"{settings.supabase_url}/storage/v1{signed}"
