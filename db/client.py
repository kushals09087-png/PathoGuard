"""Database abstraction for Genome Firewall.

Provides an asynchronous database interface supporting either:
1. Real MongoDB Atlas / local MongoDB server via PyMongo
2. Durable JSON file-persisted document store (data/db/db_store.json)
   guaranteeing persistence across server restarts, browser refreshes, and CI/dev environments.
"""

import os
import json
import asyncio
import copy
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional, Union
import pymongo
from pymongo import MongoClient
from pymongo.collection import ReturnDocument


class JSONCollection:
    """In-memory collection with JSON file persistence mimicking PyMongo collection behavior."""

    def __init__(self, name: str, db_parent: "DurableJSONDatabase"):
        self.name = name
        self.db = db_parent
        self.indexes = set()

    def _get_docs(self) -> List[Dict[str, Any]]:
        return self.db.data.setdefault(self.name, [])

    def _matches(self, doc: Dict[str, Any], query: Dict[str, Any]) -> bool:
        for k, v in query.items():
            if k == "$or":
                if not any(self._matches(doc, subq) for subq in v):
                    return False
                continue
            if k == "$and":
                if not all(self._matches(doc, subq) for subq in v):
                    return False
                continue

            doc_val = doc.get(k)
            if isinstance(v, dict):
                for op, op_val in v.items():
                    if op == "$eq" and doc_val != op_val:
                        return False
                    elif op == "$ne" and doc_val == op_val:
                        return False
                    elif op == "$in" and doc_val not in op_val:
                        return False
                    elif op == "$nin" and doc_val in op_val:
                        return False
                    elif op == "$lt" and (doc_val is None or not (doc_val < op_val)):
                        return False
                    elif op == "$lte" and (doc_val is None or not (doc_val <= op_val)):
                        return False
                    elif op == "$gt" and (doc_val is None or not (doc_val > op_val)):
                        return False
                    elif op == "$gte" and (doc_val is None or not (doc_val >= op_val)):
                        return False
            else:
                if doc_val != v:
                    return False
        return True

    def create_index(self, keys, **kwargs):
        self.indexes.add(str(keys))

    async def insert_one(self, doc: Dict[str, Any]):
        new_doc = copy.deepcopy(doc)
        if "_id" not in new_doc and "id" not in new_doc:
            new_doc["_id"] = str(len(self._get_docs()) + 1)
        self._get_docs().append(new_doc)
        await self.db.save()
        class InsertResult:
            def __init__(self, inserted_id):
                self.inserted_id = inserted_id
        return InsertResult(new_doc.get("_id"))

    async def insert_many(self, docs: List[Dict[str, Any]]):
        for doc in docs:
            await self.insert_one(doc)

    async def find_one(self, query: Dict[str, Any], projection: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        for doc in self._get_docs():
            if self._matches(doc, query):
                res = copy.deepcopy(doc)
                if projection and projection.get("_id") == 0 and "_id" in res:
                    del res["_id"]
                return res
        return None

    async def find(
        self,
        query: Dict[str, Any] = None,
        sort: Optional[List[tuple]] = None,
        skip: int = 0,
        limit: int = 0,
        projection: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        query = query or {}
        matches = [copy.deepcopy(doc) for doc in self._get_docs() if self._matches(doc, query)]

        if sort:
            for key, direction in reversed(sort):
                matches.sort(
                    key=lambda x: (x.get(key) is None, x.get(key)),
                    reverse=(direction == pymongo.DESCENDING or direction == -1),
                )

        if skip > 0:
            matches = matches[skip:]
        if limit > 0:
            matches = matches[:limit]

        if projection and projection.get("_id") == 0:
            for m in matches:
                if "_id" in m:
                    del m["_id"]

        return matches

    async def count_documents(self, query: Dict[str, Any] = None) -> int:
        query = query or {}
        return sum(1 for doc in self._get_docs() if self._matches(doc, query))

    async def update_one(self, query: Dict[str, Any], update: Dict[str, Any], upsert: bool = False):
        target = None
        for doc in self._get_docs():
            if self._matches(doc, query):
                target = doc
                break

        if not target and upsert:
            new_doc = copy.deepcopy(query)
            if "$setOnInsert" in update:
                for k, v in update["$setOnInsert"].items():
                    new_doc[k] = copy.deepcopy(v)
            self._get_docs().append(new_doc)
            target = new_doc

        modified = 0
        if target:
            if "$set" in update:
                for k, v in update["$set"].items():
                    target[k] = copy.deepcopy(v)
                modified = 1
            if "$inc" in update:
                for k, v in update["$inc"].items():
                    target[k] = target.get(k, 0) + v
                modified = 1
            if "$push" in update:
                for k, v in update["$push"].items():
                    target.setdefault(k, []).append(copy.deepcopy(v))
                modified = 1
            await self.db.save()

        class UpdateResult:
            def __init__(self, matched_count, modified_count):
                self.matched_count = matched_count
                self.modified_count = modified_count
        return UpdateResult(1 if target else 0, modified)

    async def find_one_and_update(
        self,
        query: Dict[str, Any],
        update: Dict[str, Any],
        sort: Optional[List[tuple]] = None,
        return_document: ReturnDocument = ReturnDocument.AFTER,
    ) -> Optional[Dict[str, Any]]:
        matches = [doc for doc in self._get_docs() if self._matches(doc, query)]
        if not matches:
            return None

        if sort:
            for key, direction in reversed(sort):
                matches.sort(
                    key=lambda x: (x.get(key) is None, x.get(key)),
                    reverse=(direction == pymongo.DESCENDING or direction == -1),
                )

        target = matches[0]
        before = copy.deepcopy(target)

        if "$set" in update:
            for k, v in update["$set"].items():
                target[k] = copy.deepcopy(v)
        if "$inc" in update:
            for k, v in update["$inc"].items():
                target[k] = target.get(k, 0) + v
        if "$push" in update:
            for k, v in update["$push"].items():
                target.setdefault(k, []).append(copy.deepcopy(v))

        await self.db.save()
        return copy.deepcopy(target if return_document == ReturnDocument.AFTER else before)

    async def delete_one(self, query: Dict[str, Any]):
        docs = self._get_docs()
        for i, doc in enumerate(docs):
            if self._matches(doc, query):
                del docs[i]
                await self.db.save()
                return 1
        return 0

    async def delete_many(self, query: Dict[str, Any]):
        docs = self._get_docs()
        before_count = len(docs)
        self.db.data[self.name] = [doc for doc in docs if not self._matches(doc, query)]
        deleted_count = before_count - len(self.db.data[self.name])
        if deleted_count > 0:
            await self.db.save()
        return deleted_count


class DurableJSONDatabase:
    """Thread-safe persistent JSON document database."""

    def __init__(self, filepath: str = "data/db/db_store.json"):
        self.filepath = Path(filepath).resolve()
        self.filepath.parent.mkdir(parents=True, exist_ok=True)
        self.data: Dict[str, List[Dict[str, Any]]] = {}
        self._lock = asyncio.Lock()
        self._load()

    def _load(self):
        if self.filepath.exists():
            try:
                with open(self.filepath, "r", encoding="utf-8") as f:
                    self.data = json.load(f)
            except Exception:
                self.data = {}
        else:
            self.data = {}

    async def save(self):
        async with self._lock:
            temp_file = self.filepath.with_suffix(self.filepath.suffix + ".tmp")
            content = json.dumps(self.data, indent=2, default=str)
            with open(temp_file, "w", encoding="utf-8") as f:
                f.write(content)
            temp_file.replace(self.filepath)

    def get_collection(self, name: str) -> JSONCollection:
        return JSONCollection(name, self)

    def __getitem__(self, name: str) -> JSONCollection:
        return self.get_collection(name)


class MongoAsyncCollectionWrapper:
    """Wraps PyMongo sync collection in async execution for real MongoDB connections."""

    def __init__(self, collection):
        self.collection = collection

    async def insert_one(self, doc: Dict[str, Any]):
        return await asyncio.to_thread(self.collection.insert_one, doc)

    async def insert_many(self, docs: List[Dict[str, Any]]):
        return await asyncio.to_thread(self.collection.insert_many, docs)

    async def find_one(self, query: Dict[str, Any], projection: Optional[Dict[str, Any]] = None):
        return await asyncio.to_thread(self.collection.find_one, query, projection)

    async def find(
        self,
        query: Dict[str, Any] = None,
        sort: Optional[List[tuple]] = None,
        skip: int = 0,
        limit: int = 0,
        projection: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        def _exec():
            cursor = self.collection.find(query or {}, projection)
            if sort:
                cursor = cursor.sort(sort)
            if skip > 0:
                cursor = cursor.skip(skip)
            if limit > 0:
                cursor = cursor.limit(limit)
            return list(cursor)
        return await asyncio.to_thread(_exec)

    async def count_documents(self, query: Dict[str, Any] = None) -> int:
        return await asyncio.to_thread(self.collection.count_documents, query or {})

    async def update_one(self, query: Dict[str, Any], update: Dict[str, Any], upsert: bool = False):
        return await asyncio.to_thread(self.collection.update_one, query, update, upsert=upsert)

    async def find_one_and_update(
        self,
        query: Dict[str, Any],
        update: Dict[str, Any],
        sort: Optional[List[tuple]] = None,
        return_document: ReturnDocument = ReturnDocument.AFTER,
    ):
        return await asyncio.to_thread(
            self.collection.find_one_and_update,
            query,
            update,
            sort=sort,
            return_document=return_document,
        )

    async def delete_one(self, query: Dict[str, Any]):
        res = await asyncio.to_thread(self.collection.delete_one, query)
        return res.deleted_count

    async def delete_many(self, query: Dict[str, Any]):
        res = await asyncio.to_thread(self.collection.delete_many, query)
        return res.deleted_count

    def create_index(self, keys, **kwargs):
        return self.collection.create_index(keys, **kwargs)


class DatabaseClient:
    def __init__(self, uri: Optional[str] = None, db_name: str = "genome_firewall"):
        self.uri = uri or os.getenv("MONGODB_URI", "mongodb://localhost:27017")
        self.db_name = db_name or os.getenv("MONGODB_DATABASE", "genome_firewall")
        self.is_connected_to_mongo = False
        self._mongo_client = None
        self._raw_db = None
        self._fallback_db = None

        self._init_connection()

    def _init_connection(self):
        try:
            # Check connection with short 1 second timeout
            client = MongoClient(self.uri, serverSelectionTimeoutMS=1000)
            client.admin.command("ping")
            self._mongo_client = client
            self._raw_db = client[self.db_name]
            self.is_connected_to_mongo = True
        except Exception:
            self.is_connected_to_mongo = False
            self._fallback_db = DurableJSONDatabase("data/db/db_store.json")

    def get_collection(self, collection_name: str):
        if self.is_connected_to_mongo:
            return MongoAsyncCollectionWrapper(self._raw_db[collection_name])
        return self._fallback_db.get_collection(collection_name)

    def __getitem__(self, collection_name: str):
        return self.get_collection(collection_name)


# Global singleton database client instance
_db_instance: Optional[DatabaseClient] = None

def get_db() -> DatabaseClient:
    global _db_instance
    if _db_instance is None:
        _db_instance = DatabaseClient()
    return _db_instance
