"use client";

import * as XLSX from "xlsx";

function contentToText(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    const parts = [];
    for (const b of content) {
      if (b?.type === "text" && typeof b.text === "string") parts.push(b.text);
      else if (b?.type === "image_url") parts.push("[image]");
    }
    return parts.join(" ");
  }
  return "";
}

export function exportConversationToExcel(conversation, messages) {
  const rows = messages.map((m, i) => ({
    "#": i + 1,
    role: m.role,
    model: m.model || "",
    timestamp: new Date(m.createdAt).toISOString(),
    content: contentToText(m.content),
  }));

  const ws = XLSX.utils.json_to_sheet(rows, {
    header: ["#", "role", "model", "timestamp", "content"],
  });

  ws["!cols"] = [
    { wch: 4 },
    { wch: 10 },
    { wch: 24 },
    { wch: 22 },
    { wch: 100 },
  ];

  const wb = XLSX.utils.book_new();
  const sheetName = (conversation.title || "chat").slice(0, 28).replace(/[\\/?*[\]:]/g, "");
  XLSX.utils.book_append_sheet(wb, ws, sheetName || "chat");

  const safeTitle = (conversation.title || "chat").replace(/[^a-z0-9-_]+/gi, "-").slice(0, 60);
  XLSX.writeFile(wb, `${safeTitle}-${conversation.id.slice(0, 6)}.xlsx`);
}

export function detectExcelRequest(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return (
    lower.includes("excel") ||
    lower.includes("xlsx") ||
    lower.includes("spreadsheet") ||
    lower.includes("kasih file") ||
    lower.includes(".xls")
  );
}

export function parseMarkdownTableToRows(md) {
  if (!md) return null;
  const lines = md.split("\n").map((l) => l.trim()).filter(Boolean);
  const tableLines = [];
  let inTable = false;
  for (const line of lines) {
    if (line.startsWith("|") && line.endsWith("|")) {
      tableLines.push(line);
      inTable = true;
    } else if (inTable) {
      break;
    }
  }
  if (tableLines.length < 2) return null;

  const parseRow = (row) =>
    row.slice(1, -1).split("|").map((c) => c.trim());

  const headers = parseRow(tableLines[0]);
  const rows = tableLines.slice(2).map((line) => {
    const cells = parseRow(line);
    const obj = {};
    headers.forEach((h, i) => {
      obj[h || `col${i + 1}`] = cells[i] || "";
    });
    return obj;
  });

  return { headers, rows };
}

export function exportTableToExcel(headers, rows, filename = "table.xlsx") {
  const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
  ws["!cols"] = headers.map((h) => ({ wch: Math.max(12, Math.min(60, h.length + 4)) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "data");
  XLSX.writeFile(wb, filename);
}
