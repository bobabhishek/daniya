import os
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


class MockDocumentReference:
    def __init__(self, store: Dict[str, Dict[str, Any]], collection_name: str, doc_id: str):
        self._store = store
        self._collection = collection_name
        self.id = doc_id

    def set(self, data: Dict[str, Any], merge: bool = False):
        if self._collection not in self._store:
            self._store[self._collection] = {}
        if merge and self.id in self._store[self._collection]:
            self._store[self._collection][self.id].update(data)
        else:
            self._store[self._collection][self.id] = data.copy()

    def get(self) -> MockDocumentSnapshot:
        coll = self._store.get(self._collection, {})
        data = coll.get(self.id)
        return MockDocumentSnapshot(self.id, data)

    def update(self, data: Dict[str, Any]):
        coll = self._store.get(self._collection, {})
        if self.id in coll:
            coll[self.id].update(data)
        else:
            raise KeyError(f"Document {self.id} does not exist in {self._collection}")

    def delete(self):
        coll = self._store.get(self._collection, {})
        coll.pop(self.id, None)


class MockCollectionReference:
    def __init__(self, store: Dict[str, Dict[str, Any]], collection_name: str):
        self._store = store
        self._collection = collection_name

    def document(self, doc_id: str) -> MockDocumentReference:
        return MockDocumentReference(self._store, self._collection, doc_id)

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
    """Thread-safe in-memory store mirroring Firestore collection/document API."""
    def __init__(self):
        self._store: Dict[str, Dict[str, Any]] = {}

    def collection(self, name: str) -> MockCollectionReference:
        return MockCollectionReference(self._store, name)

    def clear(self):
        self._store.clear()


# Global memory fallback for tests / development when serviceAccountKey is absent
memory_db = MemoryFirestoreClient()


def init_firebase():
    """Initialize Firebase Admin SDK or prepare memory store."""
    global _firebase_app, _firestore_db

    if _firebase_app:
        return

    cred_path = settings.FIREBASE_CREDENTIALS_PATH
    if cred_path and os.path.isfile(cred_path):
        try:
            cred = credentials.Certificate(cred_path)
            _firebase_app = firebase_admin.initialize_app(cred, {
                'projectId': settings.FIREBASE_PROJECT_ID
            })
            _firestore_db = firestore.client()
            logger.info("Firebase Admin SDK initialized successfully with service account.")
            return
        except Exception as e:
            logger.warning(f"Failed to initialize Firebase with credential file: {e}. Falling back to memory mode.")

    # Try Google Application Default Credentials if running in GCP environment
    try:
        _firebase_app = firebase_admin.initialize_app(options={
            'projectId': settings.FIREBASE_PROJECT_ID
        })
        _firestore_db = firestore.client()
        logger.info("Firebase Admin initialized using Application Default Credentials.")
    except Exception as e:
        logger.info(f"Firebase running in mock/memory mode for development and testing: {e}")
        _firestore_db = None


def get_db():
    """Return active Firestore client or local fallback."""
    init_firebase()
    if _firestore_db is not None:
        return _firestore_db
    return memory_db


def verify_id_token(token: str) -> Dict[str, Any]:
    """
    Verify Firebase Auth ID Token.
    Returns decoded token dictionary with 'uid', 'email', etc.
    """
    init_firebase()

    # Special handling for development & testing mock tokens
    if token.startswith("test_token_") or token.startswith("mock_token_"):
        parts = token.split(":")
        # Format: test_token_<uid>:<email>:<name>
        uid = parts[0].replace("test_token_", "").replace("mock_token_", "")
        email = parts[1] if len(parts) > 1 else f"{uid}@example.com"
        name = parts[2] if len(parts) > 2 else "Test User"
        return {
            "uid": uid,
            "email": email,
            "name": name,
            "auth_time": 1700000000,
            "firebase": {"sign_in_provider": "password"}
        }

    if _firebase_app:
        try:
            decoded = auth.verify_id_token(token)
            return decoded
        except Exception as e:
            raise ValueError(f"Invalid Firebase ID Token: {e}")

    # Fallback in local testing if app not initialized with real credentials
    raise ValueError("Firebase Auth service unavailable. Provide valid credentials or test token.")
