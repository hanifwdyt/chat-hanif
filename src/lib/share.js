"use client";

// Encode/decode conversation snapshot into a URL hash payload.
// Uses CompressionStream (gzip) + base64url when available, falls back to plain base64.

function toBase64Url(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(str) {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function compress(text) {
  if (typeof CompressionStream === "undefined") {
    return new TextEncoder().encode(text);
  }
  const cs = new CompressionStream("gzip");
  const writer = cs.writable.getWriter();
  writer.write(new TextEncoder().encode(text));
  writer.close();
  const buf = await new Response(cs.readable).arrayBuffer();
  return new Uint8Array(buf);
}

async function decompress(bytes, gzipped) {
  if (!gzipped) return new TextDecoder().decode(bytes);
  const ds = new DecompressionStream("gzip");
  const writer = ds.writable.getWriter();
  writer.write(bytes);
  writer.close();
  const buf = await new Response(ds.readable).arrayBuffer();
  return new TextDecoder().decode(buf);
}

export async function encodeShare(conv, messages) {
  const payload = {
    v: 1,
    t: conv.title || "Shared chat",
    m: conv.model || null,
    ts: Date.now(),
    msgs: messages.map((m) => ({ r: m.role, c: m.content, m: m.model || null })),
  };
  const json = JSON.stringify(payload);
  const gzipped = typeof CompressionStream !== "undefined";
  const bytes = await compress(json);
  const prefix = gzipped ? "g" : "p";
  return prefix + toBase64Url(bytes);
}

export async function decodeShare(hash) {
  if (!hash) return null;
  const clean = hash.startsWith("#") ? hash.slice(1) : hash;
  if (clean.length < 2) return null;
  const prefix = clean[0];
  const body = clean.slice(1);
  const gzipped = prefix === "g";
  try {
    const bytes = fromBase64Url(body);
    const json = await decompress(bytes, gzipped);
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}
