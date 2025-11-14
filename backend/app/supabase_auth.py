from supabase import create_client
import os

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
print(f'********* Creating client for url: {SUPABASE_URL}')
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


async def verify_user(email: str, password: str) -> bool:
    try:
        result = supabase.auth.sign_in_with_password({"email": email, "password": password})
        return result.user is not None
    except Exception:
        return False

