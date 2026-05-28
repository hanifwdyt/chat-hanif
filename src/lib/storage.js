"use client";

import { openDB } from "idb";
import { v4 as uuid } from "uuid";

const DB_NAME = "chat-hanif";
const DB_VERSION = 3;
const CONV_STORE = "conversations";
const MSG_STORE = "messages";
const ABILITY_STORE = "abilities";

let dbPromise = null;

function getDB() {
  if (typeof window === "undefined") return null;
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains(CONV_STORE)) {
          const conv = db.createObjectStore(CONV_STORE, { keyPath: "id" });
          conv.createIndex("updatedAt", "updatedAt");
        }
        if (!db.objectStoreNames.contains(MSG_STORE)) {
          const msg = db.createObjectStore(MSG_STORE, { keyPath: "id" });
          msg.createIndex("conversationId", "conversationId");
          msg.createIndex("createdAt", "createdAt");
        }
        if (oldVersion < 3) {
          if (!db.objectStoreNames.contains(ABILITY_STORE)) {
            const ab = db.createObjectStore(ABILITY_STORE, { keyPath: "id" });
            ab.createIndex("updatedAt", "updatedAt");
          }
        }
      },
    });
  }
  return dbPromise;
}

function normalizeConv(c) {
  if (!c) return c;
  return {
    ...c,
    pinned: c.pinned || false,
    tags: c.tags || [],
    systemPrompt: c.systemPrompt || "",
    // null = inherit global; array = per-conv override (including [] = explicit none)
    abilityIds: Array.isArray(c.abilityIds) ? c.abilityIds : null,
  };
}

export async function listConversations() {
  const db = await getDB();
  if (!db) return [];
  const all = await db.getAllFromIndex(CONV_STORE, "updatedAt");
  return all.reverse().map(normalizeConv);
}

export async function getConversation(id) {
  const db = await getDB();
  if (!db) return null;
  const c = await db.get(CONV_STORE, id);
  return normalizeConv(c);
}

export async function createConversation({ title = "New chat", model } = {}) {
  const db = await getDB();
  if (!db) return null;
  const now = Date.now();
  const conv = {
    id: uuid(),
    title,
    model: model || null,
    pinned: false,
    tags: [],
    systemPrompt: "",
    abilityIds: null,
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
  // Don't auto-touch updatedAt if only flag fields change
  const touchUpdated = !("_silent" in patch);
  const cleanPatch = { ...patch };
  delete cleanPatch._silent;
  const next = {
    ...existing,
    ...cleanPatch,
    updatedAt: touchUpdated ? Date.now() : existing.updatedAt,
  };
  await db.put(CONV_STORE, next);
  return normalizeConv(next);
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
  // Clear draft
  clearDraft(id);
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

export async function deleteMessagesFromIncluding(conversationId, fromCreatedAt) {
  return deleteMessagesAfter(conversationId, fromCreatedAt);
}

function messageContentToText(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((b) => b?.type === "text" && typeof b.text === "string")
      .map((b) => b.text)
      .join(" ");
  }
  return "";
}

// Full-text search across conversation titles and message contents.
// Returns: [{ conversation, snippet }]
export async function searchAll(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const db = await getDB();
  if (!db) return [];

  const convs = await db.getAll(CONV_STORE);
  const msgs = await db.getAll(MSG_STORE);

  const msgByConv = new Map();
  for (const m of msgs) {
    if (!msgByConv.has(m.conversationId)) msgByConv.set(m.conversationId, []);
    msgByConv.get(m.conversationId).push(m);
  }

  const results = [];
  for (const c of convs) {
    const title = (c.title || "").toLowerCase();
    const tags = (c.tags || []).join(" ").toLowerCase();
    const conversationHit = title.includes(q) || tags.includes(q);
    let messageHit = null;
    const myMsgs = msgByConv.get(c.id) || [];
    for (const m of myMsgs) {
      const raw = messageContentToText(m.content);
      const txt = raw.toLowerCase();
      const idx = txt.indexOf(q);
      if (idx !== -1) {
        const start = Math.max(0, idx - 40);
        const end = Math.min(raw.length, idx + q.length + 60);
        messageHit = (start > 0 ? "…" : "") + raw.slice(start, end) + (end < raw.length ? "…" : "");
        break;
      }
    }
    if (conversationHit || messageHit) {
      results.push({
        conversation: normalizeConv(c),
        snippet: messageHit || (c.tags?.length ? `#${c.tags.join(" #")}` : ""),
      });
    }
  }
  results.sort((a, b) => b.conversation.updatedAt - a.conversation.updatedAt);
  return results;
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

// Drafts: per-conversation unsent text
const DRAFT_KEY = (id) => `chat-hanif:draft:${id || "__new__"}`;

export function getDraft(convId) {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(DRAFT_KEY(convId)) || "";
  } catch {
    return "";
  }
}

export function setDraft(convId, text) {
  if (typeof window === "undefined") return;
  try {
    if (!text) localStorage.removeItem(DRAFT_KEY(convId));
    else localStorage.setItem(DRAFT_KEY(convId), text);
  } catch {}
}

export function clearDraft(convId) {
  setDraft(convId, "");
}

// Collect all unique tags from existing conversations
export async function listAllTags() {
  const db = await getDB();
  if (!db) return [];
  const all = await db.getAll(CONV_STORE);
  const set = new Set();
  for (const c of all) {
    for (const t of c.tags || []) set.add(t);
  }
  return [...set].sort();
}

// -------- Abilities (reusable system-prompt patterns) --------

function normalizeAbility(a) {
  if (!a) return a;
  return {
    ...a,
    name: a.name || "Untitled",
    description: a.description || "",
    prompt: a.prompt || "",
    icon: a.icon || "",
  };
}

export async function listAbilities() {
  const db = await getDB();
  if (!db) return [];
  const all = await db.getAllFromIndex(ABILITY_STORE, "updatedAt");
  return all.reverse().map(normalizeAbility);
}

export async function getAbility(id) {
  const db = await getDB();
  if (!db) return null;
  const a = await db.get(ABILITY_STORE, id);
  return normalizeAbility(a);
}

export async function createAbility({ name, description = "", prompt = "", icon = "" } = {}) {
  const db = await getDB();
  if (!db) return null;
  const now = Date.now();
  const ab = {
    id: uuid(),
    name: name || "Untitled ability",
    description,
    prompt,
    icon,
    createdAt: now,
    updatedAt: now,
  };
  await db.put(ABILITY_STORE, ab);
  return ab;
}

export async function updateAbility(id, patch) {
  const db = await getDB();
  if (!db) return null;
  const existing = await db.get(ABILITY_STORE, id);
  if (!existing) return null;
  const next = { ...existing, ...patch, updatedAt: Date.now() };
  await db.put(ABILITY_STORE, next);
  return normalizeAbility(next);
}

export async function deleteAbility(id) {
  const db = await getDB();
  if (!db) return;
  await db.delete(ABILITY_STORE, id);
}
