"use client";

import { openDB } from "idb";
import { v4 as uuid } from "uuid";

const DB_NAME = "chat-hanif";
const DB_VERSION = 1;
const CONV_STORE = "conversations";
const MSG_STORE = "messages";

let dbPromise = null;

function getDB() {
  if (typeof window === "undefined") return null;
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(CONV_STORE)) {
          const conv = db.createObjectStore(CONV_STORE, { keyPath: "id" });
          conv.createIndex("updatedAt", "updatedAt");
        }
        if (!db.objectStoreNames.contains(MSG_STORE)) {
          const msg = db.createObjectStore(MSG_STORE, { keyPath: "id" });
          msg.createIndex("conversationId", "conversationId");
          msg.createIndex("createdAt", "createdAt");
        }
      },
    });
  }
  return dbPromise;
}

export async function listConversations() {
  const db = await getDB();
  if (!db) return [];
  const all = await db.getAllFromIndex(CONV_STORE, "updatedAt");
  return all.reverse();
}

export async function getConversation(id) {
  const db = await getDB();
  if (!db) return null;
  return db.get(CONV_STORE, id);
}

export async function createConversation({ title = "New chat", model } = {}) {
  const db = await getDB();
  if (!db) return null;
  const now = Date.now();
  const conv = {
    id: uuid(),
    title,
    model: model || null,
    createdAt: now,
    updatedAt: now,
  };
  await db.put(CONV_STORE, conv);
  return conv;
}

export async function updateConversation(id, patch) {
  const db = await getDB();
  if (!db) return null;
  const existing = await db.get(CONV_STORE, id);
  if (!existing) return null;
  const next = { ...existing, ...patch, updatedAt: Date.now() };
  await db.put(CONV_STORE, next);
  return next;
}

export async function deleteConversation(id) {
  const db = await getDB();
  if (!db) return;
  const tx = db.transaction([CONV_STORE, MSG_STORE], "readwrite");
  await tx.objectStore(CONV_STORE).delete(id);
  const msgStore = tx.objectStore(MSG_STORE);
  const idx = msgStore.index("conversationId");
  let cursor = await idx.openCursor(IDBKeyRange.only(id));
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}

export async function listMessages(conversationId) {
  const db = await getDB();
  if (!db) return [];
  const all = await db.getAllFromIndex(MSG_STORE, "conversationId", conversationId);
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

export async function addMessage({ conversationId, role, content, model = null }) {
  const db = await getDB();
  if (!db) return null;
  const msg = {
    id: uuid(),
    conversationId,
    role,
    content,
    model,
    createdAt: Date.now(),
  };
  await db.put(MSG_STORE, msg);
  await updateConversation(conversationId, {});
  return msg;
}

export async function updateMessage(id, patch) {
  const db = await getDB();
  if (!db) return null;
  const existing = await db.get(MSG_STORE, id);
  if (!existing) return null;
  const next = { ...existing, ...patch };
  await db.put(MSG_STORE, next);
  return next;
}

export async function deleteMessage(id) {
  const db = await getDB();
  if (!db) return;
  await db.delete(MSG_STORE, id);
}

export async function deleteMessagesAfter(conversationId, createdAt) {
  const db = await getDB();
  if (!db) return;
  const tx = db.transaction(MSG_STORE, "readwrite");
  const idx = tx.store.index("conversationId");
  let cursor = await idx.openCursor(IDBKeyRange.only(conversationId));
  while (cursor) {
    if (cursor.value.createdAt >= createdAt) {
      await cursor.delete();
    }
    cursor = await cursor.continue();
  }
  await tx.done;
}

const PREFS_KEY = "chat-hanif:prefs";

export function getPrefs() {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function setPrefs(patch) {
  if (typeof window === "undefined") return;
  const next = { ...getPrefs(), ...patch };
  localStorage.setItem(PREFS_KEY, JSON.stringify(next));
}
