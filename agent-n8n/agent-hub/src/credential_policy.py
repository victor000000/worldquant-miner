"""Operator credentials stay in the process environment, never database payloads."""
import hmac
import json
import os
import re


class CredentialConfigurationError(RuntimeError):
    pass


def required_environment(name):
    value = os.environ.get(name, "")
    if not value.strip():
        raise CredentialConfigurationError(f"Required private environment variable is missing: {name}")
    return value


def signing_key():
    value = required_environment("JWT_SECRET")
    if len(value) < 32 or value.startswith("your-super-secret-jwt-key"):
        raise CredentialConfigurationError("JWT_SECRET must be a private value of at least 32 characters")
    return value


def authenticate_operator(username, password):
    if not isinstance(username, str) or not isinstance(password, str):
        return False
    try:
        expected_user = required_environment("AGENT_HUB_USERNAME")
        expected_password = required_environment("AGENT_HUB_PASSWORD")
    except CredentialConfigurationError:
        return False
    return hmac.compare_digest(username.encode(), expected_user.encode()) & hmac.compare_digest(
        password.encode(), expected_password.encode()
    )


_SECRET_KEYS = {
    "password", "passwd", "pwd", "secret", "secretkey", "jwtsecret", "apikey",
    "accesstoken", "refreshtoken", "authtoken", "token", "authorization",
    "credential", "credentials", "privatekey", "clientsecret", "cookie", "setcookie",
}
_SECRET_VALUE = re.compile(
    r"(?i)(?:\bBearer\s+\S+|\bBasic\s+[A-Za-z0-9+/=]+|"
    r"[a-z][a-z0-9+.-]*://[^\s/@:]+:[^\s/@]+@|"
    r"-----BEGIN (?:OPENSSH |RSA |EC )?PRIVATE KEY-----|"
    r"\b(?:sk-|ghp_|github_pat_)[A-Za-z0-9_-]{16,})"
)


def reject_database_credentials(value):
    """Reject named credentials, credential URLs/tokens, and configured operator secrets.

    Ordinary business payloads are preserved. This is not a detector for arbitrary
    unknown secrets hidden under unrelated field names or custom encodings.
    """
    if isinstance(value, dict):
        for key, item in value.items():
            normalized = re.sub(r"[^a-z0-9]", "", str(key).lower())
            if normalized in _SECRET_KEYS and item not in (None, "", {}, []):
                raise ValueError("Credential material is not permitted in database fields")
            reject_database_credentials(item)
    elif isinstance(value, (list, tuple)):
        for item in value:
            reject_database_credentials(item)
    elif isinstance(value, str):
        configured_secrets = [os.environ.get(name, "") for name in (
            "JWT_SECRET", "AGENT_HUB_PASSWORD", "MOONSHOT_API_KEY", "WORLDQUANT_PASSWORD"
        )]
        if _SECRET_VALUE.search(value) or any(secret and secret in value for secret in configured_secrets):
            raise ValueError("Credential material is not permitted in database fields")
        if value.lstrip().startswith(("{", "[")):
            try:
                decoded = json.loads(value)
            except (ValueError, TypeError):
                return
            reject_database_credentials(decoded)
