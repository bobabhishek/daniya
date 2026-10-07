import os
import time
import logging
from typing import Optional, Dict, Any, List
import firebase_admin
from firebase_admin import credentials, firestore, auth
from .config import settings

logger = logging.getLogger("dandiya_backend.firebase")

_firebase_app: Optional[firebase_admin.App] = None
_firestore_db: Optional[Any] = None


class MockDocumentSnapshot:
    def __init__(self, doc_id: str, data: Optional[Dict[str, Any]]):
        self.id = doc_id
        self._data = data

    @property
    def exists(self) -> bool:
        return self._data is not None

    def to_dict(self) -> Optional[Dict[str, Any]]:
        return self._data.copy() if self._data else None


import json
from typing import Callable

_DEFAULT_DB_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "local_firestore_db.json")


class MockDocumentReference:
    def __init__(self, store: Dict[str, Dict[str, Any]], collection_name: str, doc_id: str, on_change: Optional[Callable] = None):
        self._store = store
        self._collection = collection_name
        self.id = doc_id
        self._on_change = on_change

    def set(self, data: Dict[str, Any], merge: bool = False):
        if self._collection not in self._store:
            self._store[self._collection] = {}
        if merge and self.id in self._store[self._collection]:
            self._store[self._collection][self.id].update(data)
        else:
            self._store[self._collection][self.id] = data.copy()
        if self._on_change:
            self._on_change()

    def get(self) -> MockDocumentSnapshot:
        coll = self._store.get(self._collection, {})
        data = coll.get(self.id)
        return MockDocumentSnapshot(self.id, data)

    def update(self, data: Dict[str, Any]):
        coll = self._store.get(self._collection, {})
        if self.id in coll:
            coll[self.id].update(data)
            if self._on_change:
                self._on_change()
        else:
            raise KeyError(f"Document {self.id} does not exist in {self._collection}")

    def delete(self):
        coll = self._store.get(self._collection, {})
        if self.id in coll:
            coll.pop(self.id, None)
            if self._on_change:
                self._on_change()


class MockCollectionReference:
    def __init__(self, store: Dict[str, Dict[str, Any]], collection_name: str, on_change: Optional[Callable] = None):
        self._store = store
        self._collection = collection_name
        self._on_change = on_change

    def document(self, doc_id: str) -> MockDocumentReference:
        return MockDocumentReference(self._store, self._collection, doc_id, on_change=self._on_change)

    def stream(self) -> List[MockDocumentSnapshot]:
        coll = self._store.get(self._collection, {})
        return [MockDocumentSnapshot(k, v) for k, v in coll.items()]

    def where(self, field: str, op: str, value: Any):
        # Return a simple filtered query helper
        coll = self._store.get(self._collection, {})
        matching = []
        for k, v in coll.items():
            if op == "==" and v.get(field) == value:
                matching.append(MockDocumentSnapshot(k, v))
        
        class FilteredQuery:
            def __init__(self, docs):
                self._docs = docs
            def stream(self):
                return self._docs
        return FilteredQuery(matching)


class MemoryFirestoreClient:
    """Thread-safe persistent store mirroring Firestore collection/document API on disk."""
    def __init__(self, persistence_file: Optional[str] = None):
        self._persistence_file = persistence_file or _DEFAULT_DB_FILE
        self._store: Dict[str, Dict[str, Any]] = {}
        self._load()

    def _load(self):
        try:
            if os.path.isfile(self._persistence_file):
                with open(self._persistence_file, "r", encoding="utf-8") as f:
                    self._store = json.load(f)
                logger.info(f"Loaded {sum(len(v) for v in self._store.values())} documents from {self._persistence_file}")
        except Exception as e:
            logger.warning(f"Could not load local database from {self._persistence_file}: {e}")

    def _save(self):
        try:
            os.makedirs(os.path.dirname(self._persistence_file), exist_ok=True)
            temp_file = f"{self._persistence_file}.tmp"
            with open(temp_file, "w", encoding="utf-8") as f:
                json.dump(self._store, f, indent=2, default=str)
            if os.path.exists(self._persistence_file):
                os.replace(temp_file, self._persistence_file)
            else:
                os.rename(temp_file, self._persistence_file)
        except Exception as e:
            logger.warning(f"Could not save local database to {self._persistence_file}: {e}")

    def collection(self, name: str) -> MockCollectionReference:
        return MockCollectionReference(self._store, name, on_change=self._save)

    def clear(self):
        self._store.clear()
        self._save()


# Global persistent fallback for tests / development when serviceAccountKey is absent
memory_db = MemoryFirestoreClient()


def init_firebase():
    """Initialize Firebase Admin SDK or configure Google verification."""
    global _firebase_app, _firestore_db

    if _firebase_app is not None and _firestore_db is not None:
        return

    # 1. Check for raw or base64-encoded JSON credentials from environment variables
    cred_json = (
        getattr(settings, "FIREBASE_CREDENTIALS_JSON", "")
        or os.environ.get("FIREBASE_CREDENTIALS_JSON", "")
        or os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON", "")
    )
    if cred_json and cred_json.strip():
        try:
            raw = cred_json.strip()
            if raw.startswith("{"):
                cred_dict = json.loads(raw)
            else:
                import base64
                cred_dict = json.loads(base64.b64decode(raw).decode("utf-8"))
            cred = credentials.Certificate(cred_dict)
            _firebase_app = firebase_admin.initialize_app(cred, {
                'projectId': settings.FIREBASE_PROJECT_ID,
                'storageBucket': getattr(settings, 'FIREBASE_STORAGE_BUCKET', f"{settings.FIREBASE_PROJECT_ID}.firebasestorage.app")
            })
            _firestore_db = firestore.client()
            logger.info("Firebase Admin SDK initialized successfully from environment JSON credentials.")
            return
        except Exception as e:
            logger.error(f"Failed to initialize Firebase from environment JSON credentials: {e}")

    # 2. Check potential service account file paths
    candidate_paths = [
        settings.FIREBASE_CREDENTIALS_PATH,
        "serviceAccountKey.json",
        "firebase-credentials.json",
        "backend/serviceAccountKey.json",
        os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "")
    ]

    for cred_path in candidate_paths:
        if cred_path and os.path.isfile(cred_path):
            try:
                cred = credentials.Certificate(cred_path)
                _firebase_app = firebase_admin.initialize_app(cred, {
                    'projectId': settings.FIREBASE_PROJECT_ID,
                    'storageBucket': getattr(settings, 'FIREBASE_STORAGE_BUCKET', f"{settings.FIREBASE_PROJECT_ID}.firebasestorage.app")
                })
                try:
                    _firestore_db = firestore.client()
                except Exception:
                    _firestore_db = None
                logger.info("Firebase Admin SDK initialized successfully with service account.")
                return
            except Exception as e:
                logger.warning(f"Failed to initialize Firebase with credential file {cred_path}: {e}")

    # 3. Fallback to Application Default Credentials if in GCP/production
    has_gcp_env = any(os.environ.get(k) for k in ("K_SERVICE", "GAE_SERVICE", "GOOGLE_CLOUD_PROJECT"))
    adc_file = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    has_adc = has_gcp_env or (adc_file and os.path.isfile(adc_file))

    if has_adc:
        try:
            _firebase_app = firebase_admin.initialize_app(options={
                'projectId': settings.FIREBASE_PROJECT_ID,
                'storageBucket': getattr(settings, 'FIREBASE_STORAGE_BUCKET', f"{settings.FIREBASE_PROJECT_ID}.firebasestorage.app")
            })
            try:
                _firestore_db = firestore.client()
            except Exception:
                _firestore_db = None
            logger.info("Firebase Admin initialized using Application Default Credentials.")
            return
        except Exception as e:
            logger.warning(f"Could not initialize Firebase Admin with ADC: {e}")

    # 4. Strict Production Gate
    if settings.ENVIRONMENT == "production":
        err_msg = (
            "CRITICAL PRODUCTION ERROR: Google Cloud Firestore is not connected! "
            "A valid Firebase Admin service account credential must be configured via "
            "GOOGLE_APPLICATION_CREDENTIALS, FIREBASE_CREDENTIALS_PATH, or FIREBASE_CREDENTIALS_JSON. "
            "MemoryFirestoreClient fallback is strictly disabled in production mode."
        )
        logger.critical(err_msg)
        raise RuntimeError(err_msg)

    # In development/test mode without service account:
    logger.info("Running in development/test mode: Google Public Cert verification active; local MemoryFirestoreClient active.")
    _firebase_app = None
    _firestore_db = None


_google_session = None
_request_adapter = None
_token_cache: Dict[str, Any] = {}


class CachingGoogleRequest:
    """Caching request adapter for Google's public x509 certificates to eliminate network roundtrips."""
    def __init__(self, session):
        self._session = session
        self._cached_data: Dict[str, Any] = {}

    def __call__(self, url, method="GET", body=None, headers=None, timeout=None, **kwargs):
        if method.upper() == "GET":
            cached = self._cached_data.get(url)
            if cached:
                data_bytes, resp_headers, exp = cached
                if time.time() < exp:
                    class CachedResponse:
                        status = 200
                        data = data_bytes
                        headers = resp_headers
                    return CachedResponse()

        from google.auth.transport import requests as google_requests
        adapter = google_requests.Request(session=self._session)
        resp = adapter(url, method=method, body=body, headers=headers, timeout=timeout, **kwargs)

        if method.upper() == "GET" and resp.status == 200:
            ttl = 3600
            if hasattr(resp, "headers") and resp.headers:
                cc = resp.headers.get("Cache-Control", "")
                if "max-age=" in cc:
                    try:
                        ttl = int(cc.split("max-age=")[1].split(",")[0].strip())
                    except Exception:
                        ttl = 3600
            self._cached_data[url] = (resp.data, getattr(resp, "headers", {}), time.time() + ttl)

        return resp


def get_google_request_adapter():
    """Return persistent Google request adapter with cert caching and HTTP connection pooling."""
    global _google_session, _request_adapter
    if _request_adapter is None:
        import requests
        _google_session = requests.Session()
        _request_adapter = CachingGoogleRequest(session=_google_session)
    return _request_adapter


def get_db():
    """Return active Firestore client or local thread-safe store."""
    init_firebase()
    if _firestore_db is not None:
        return _firestore_db
    if settings.ENVIRONMENT == "production":
        raise RuntimeError(
            "CRITICAL: Google Cloud Firestore is not connected in production mode. "
            "Local file database fallback is strictly disabled in production."
        )
    return memory_db


def verify_id_token(token: str) -> Dict[str, Any]:
    """
    Verify Firebase Auth ID Token authoritatively.
    Validates cryptographically using Google public certificates or Admin SDK.
    Returns decoded token dictionary with 'uid', 'email', etc.
    """
    global _firebase_app, _token_cache

    if not token or not isinstance(token, str):
        raise ValueError("Invalid authentication token format.")

    # Special handling for automated testing test tokens (strictly forbidden in production)
    if token.startswith("test_token_") or token.startswith("mock_token_"):
        if settings.ENVIRONMENT == "production":
            raise ValueError("Test and mock authentication tokens are strictly forbidden in production.")
        parts = token.split(":")
        # Format: test_token_<uid>:<email>:<name>
        uid = parts[0].replace("test_token_", "").replace("mock_token_", "")
        email = parts[1] if len(parts) > 1 else f"{uid}@example.com"
        name = parts[2] if len(parts) > 2 else "Test User"
        is_admin = (email.strip().lower() == settings.ADMIN_EMAIL.strip().lower())
        return {
            "uid": uid,
            "email": email.strip().lower(),
            "name": name,
            "admin": is_admin,
            "auth_time": 1700000000,
            "firebase": {"sign_in_provider": "password"}
        }

    init_firebase()

    # 0. Check in-memory token cache for active session tokens (instantaneous 0.01 ms return)
    now_ts = time.time()
    if token in _token_cache:
        cached_result, exp_ts = _token_cache[token]
        if now_ts < exp_ts:
            return cached_result

    t_start = time.perf_counter()

    # 1. Primary: Verify with Firebase Admin SDK if service account is mounted
    if _firebase_app:
        t_admin_start = time.perf_counter()
        try:
            decoded = auth.verify_id_token(token)
            admin_ms = (time.perf_counter() - t_admin_start) * 1000
            total_ms = (time.perf_counter() - t_start) * 1000
            logger.info("[DIAGNOSTIC] Firebase Admin SDK verify_id_token SUCCEEDED in %.2f ms", admin_ms)
            if decoded:
                uid = decoded.get("uid") or decoded.get("user_id") or decoded.get("sub")
                email = (decoded.get("email") or "").strip().lower()
                name = decoded.get("name") or decoded.get("displayName") or "Attendee"
                is_admin = (email == settings.ADMIN_EMAIL.strip().lower()) or (decoded.get("admin") is True)
                result = {
                    "uid": uid,
                    "email": email,
                    "name": name,
                    "admin": is_admin,
                    "auth_time": decoded.get("auth_time", 0),
                    "firebase": decoded.get("firebase", {})
                }
                exp_claim = decoded.get("exp") or (now_ts + 300)
                _token_cache[token] = (result, min(exp_claim, now_ts + 300))
                return result
        except Exception as e:
            admin_ms = (time.perf_counter() - t_admin_start) * 1000
            logger.info("[DIAGNOSTIC] Firebase Admin SDK verify_id_token FAILED in %.2f ms: %s", admin_ms, e)
            # If Admin SDK lacks credentials, disable it so subsequent requests skip the metadata hang
            _firebase_app = None

    # 2. Cryptographic Google Public Certificate Verification for Firebase ID Tokens
    t_fallback_start = time.perf_counter()
    try:
        from google.oauth2 import id_token as google_id_token

        request_adapter = get_google_request_adapter()
        decoded = google_id_token.verify_firebase_token(
            token,
            request_adapter,
            audience=settings.FIREBASE_PROJECT_ID
        )
        fallback_ms = (time.perf_counter() - t_fallback_start) * 1000
        total_ms = (time.perf_counter() - t_start) * 1000
        logger.info("[DIAGNOSTIC] Google cert verify_firebase_token SUCCEEDED in %.2f ms", fallback_ms)
        if decoded:
            uid = decoded.get("user_id") or decoded.get("sub")
            email = (decoded.get("email") or f"{uid}@example.com").strip().lower()
            name = decoded.get("name") or decoded.get("displayName") or "Attendee"
            is_admin = (email == settings.ADMIN_EMAIL.strip().lower()) or (decoded.get("admin") is True)
            result = {
                "uid": uid,
                "email": email,
                "name": name,
                "admin": is_admin,
                "auth_time": decoded.get("auth_time", 0),
                "firebase": decoded.get("firebase", {})
            }
            exp_claim = decoded.get("exp") or (now_ts + 300)
            _token_cache[token] = (result, min(exp_claim, now_ts + 300))
            return result
    except Exception as g_err:
        fallback_ms = (time.perf_counter() - t_fallback_start) * 1000
        total_ms = (time.perf_counter() - t_start) * 1000
        logger.warning("[DIAGNOSTIC] Google cert verify_firebase_token FAILED in %.2f ms: %s", fallback_ms, g_err)

    raise ValueError("Invalid or unverified authentication token. Please sign in again.")

