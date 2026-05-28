"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import Message from "@/components/Message";
import Composer from "@/components/Composer";
import CommandPalette from "@/components/CommandPalette";
import SystemPromptModal from "@/components/SystemPromptModal";
import ShareModal from "@/components/ShareModal";
import TagsEditor from "@/components/TagsEditor";
import {
  listConversations,
  createConversation,
  updateConversation,
  deleteConversation,
  listMessages,
  addMessage,
  updateMessage,
  deleteMessagesAfter,
  deleteMessagesFromIncluding,
  getPrefs,
  setPrefs,
  getDraft,
  setDraft,
  clearDraft,
  searchAll,
  listAllTags,
} from "@/lib/storage";
import { fetchModels, streamChat } from "@/lib/api";
import { exportConversationToExcel } from "@/lib/excel";
import { getTheme, setTheme, applyTheme, resolveTheme, watchSystemTheme } from "@/lib/theme";

const THEME_ORDER = ["system", "dark", "light"];

export default function Page() {
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [theme, setThemeState] = useState("system");

  const [cmdOpen, setCmdOpen] = useState(false);
  const [sysPromptOpen, setSysPromptOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [tagsTargetId, setTagsTargetId] = useState(null);
  const [allTags, setAllTags] = useState([]);

  const abortRef = useRef(null);
  const scrollRef = useRef(null);
  const draftRef = useRef("");

  // -------- Theme --------
  useEffect(() => {
    const t = getTheme();
    setThemeState(t);
    applyTheme(t);
    const stop = watchSystemTheme(() => {
      if (getTheme() === "system") applyTheme("system");
    });
    return stop;
  }, []);

  const cycleTheme = useCallback(() => {
    const idx = THEME_ORDER.indexOf(theme);
    const next = THEME_ORDER[(idx + 1) % THEME_ORDER.length];
    setTheme(next);
    applyTheme(next);
    setThemeState(next);
  }, [theme]);

  // -------- Bootstrap --------
  useEffect(() => {
    (async () => {
      const [convs, mdls] = await Promise.all([listConversations(), fetchModels()]);
      setConversations(convs);
      setModels(mdls);

      const prefs = getPrefs();
      const defaultModel =
        prefs.model ||
        mdls.find((m) => m.id.includes("sonnet"))?.id ||
        mdls[0]?.id ||
        "";
      setSelectedModel(defaultModel);

      if (prefs.activeId && convs.find((c) => c.id === prefs.activeId)) {
        setActiveId(prefs.activeId);
      } else if (convs[0]) {
        setActiveId(convs[0].id);
      }
      setAllTags(await listAllTags());
      setHydrated(true);
    })();
  }, []);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const msgs = await listMessages(activeId);
      if (!cancelled) setMessages(msgs);
    })();
    setPrefs({ activeId });
    return () => { cancelled = true; };
  }, [activeId]);

  useEffect(() => {
    if (selectedModel) setPrefs({ model: selectedModel });
  }, [selectedModel]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  // -------- Cmd+K shortcut --------
  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // -------- Helpers --------
  async function refreshConversations() {
    const convs = await listConversations();
    setConversations(convs);
    setAllTags(await listAllTags());
  }

  const activeConv = useMemo(
    () => conversations.find((c) => c.id === activeId) || null,
    [conversations, activeId]
  );

  // -------- Conversation handlers --------
  const handleNewChat = useCallback(async () => {
    if (isStreaming) return;
    const conv = await createConversation({ title: "New chat", model: selectedModel });
    setMessages([]);
    setActiveId(conv.id);
    refreshConversations(); // fire-and-forget sidebar update
  }, [isStreaming, selectedModel]);

  const handleSelect = useCallback(
    (id) => {
      if (isStreaming) return;
      // flush current draft before switching
      if (activeId) setDraft(activeId, draftRef.current);
      setActiveId(id);
    },
    [isStreaming, activeId]
  );

  const handleDelete = useCallback(
    async (id) => {
      await deleteConversation(id);
      clearDraft(id);
      const convs = await listConversations();
      setConversations(convs);
      if (id === activeId) {
        setActiveId(convs[0]?.id || null);
      }
    },
    [activeId]
  );

  const handleRename = useCallback(async (id, title) => {
    await updateConversation(id, { title });
    await refreshConversations();
  }, []);

  const handleTogglePin = useCallback(
    async (id) => {
      const c = conversations.find((x) => x.id === id);
      await updateConversation(id, { pinned: !c?.pinned, _silent: true });
      await refreshConversations();
    },
    [conversations]
  );

  const handleEditTags = useCallback((id) => {
    setTagsTargetId(id);
    setTagsOpen(true);
  }, []);

  const handleSaveTags = useCallback(
    async (tags) => {
      if (tagsTargetId) {
        await updateConversation(tagsTargetId, { tags, _silent: true });
        await refreshConversations();
      }
      setTagsOpen(false);
      setTagsTargetId(null);
    },
    [tagsTargetId]
  );

  // -------- System prompt --------
  const handleSaveSystemPrompt = useCallback(
    async (text) => {
      if (!activeId) {
        // create a fresh conversation if user sets system prompt with no active
        const conv = await createConversation({ title: "New chat", model: selectedModel });
        await updateConversation(conv.id, { systemPrompt: text, _silent: true });
        await refreshConversations();
        setActiveId(conv.id);
      } else {
        await updateConversation(activeId, { systemPrompt: text, _silent: true });
        await refreshConversations();
      }
      setSysPromptOpen(false);
    },
    [activeId, selectedModel]
  );

  // -------- Streaming --------
  async function ensureConversation() {
    if (activeId) return activeId;
    const conv = await createConversation({ title: "New chat", model: selectedModel });
    await refreshConversations();
    setActiveId(conv.id);
    return conv.id;
  }

  async function runStream(convId, history) {
    setIsStreaming(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const conv = await (async () => conversations.find((c) => c.id === convId))();
    const systemPrompt = conv?.systemPrompt || activeConv?.systemPrompt || "";

    const assistant = await addMessage({
      conversationId: convId,
      role: "assistant",
      content: "",
      model: selectedModel,
    });
    setMessages((m) => [...m, assistant]);

    let acc = "";
    let finalStats = null;
    try {
      for await (const chunk of streamChat({
        model: selectedModel,
        messages: history.map((m) => ({ role: m.role, content: m.content })),
        systemPrompt,
        signal: ctrl.signal,
      })) {
        if (chunk.delta) {
          acc += chunk.delta;
          setMessages((m) =>
            m.map((x) => (x.id === assistant.id ? { ...x, content: acc } : x))
          );
        }
        if (chunk.done && chunk.stats) {
          finalStats = chunk.stats;
        }
      }
    } catch (e) {
      if (e.name !== "AbortError") {
        acc += `\n\n_⚠ Error: ${e.message}_`;
      }
    } finally {
      const patch = { content: acc };
      if (finalStats) patch.stats = finalStats;
      await updateMessage(assistant.id, patch);
      setMessages((m) =>
        m.map((x) => (x.id === assistant.id ? { ...x, ...patch } : x))
      );
      setIsStreaming(false);
      abortRef.current = null;
      await refreshConversations();
    }
  }

  const handleSend = useCallback(
    async (text, attachments = []) => {
      if (!selectedModel) return;
      const convId = await ensureConversation();

      // Build multimodal content if images are attached
      const content =
        attachments.length > 0
          ? [
              ...(text ? [{ type: "text", text }] : []),
              ...attachments.map((a) => ({
                type: "image_url",
                image_url: { url: a.url },
              })),
            ]
          : text;

      await addMessage({
        conversationId: convId,
        role: "user",
        content,
      });
      clearDraft(convId);
      draftRef.current = "";

      const currentMessages = await listMessages(convId);
      setMessages(currentMessages);

      const active = conversations.find((c) => c.id === convId);
      const isFirst = !active || active.title === "New chat" || currentMessages.length <= 1;
      if (isFirst) {
        const titleText = typeof content === "string" ? content : (text || "Image");
        const title = titleText.slice(0, 60).replace(/\s+/g, " ").trim();
        await updateConversation(convId, { title: title || "New chat", model: selectedModel });
        await refreshConversations();
      }

      await runStream(convId, currentMessages);
    },
    [selectedModel, conversations]
  );

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const handleRegenerate = useCallback(async () => {
    if (!activeId || isStreaming || messages.length === 0) return;
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    if (!lastAssistant) return;
    await deleteMessagesAfter(activeId, lastAssistant.createdAt);
    const history = await listMessages(activeId);
    setMessages(history);
    await runStream(activeId, history);
  }, [activeId, isStreaming, messages, selectedModel]);

  const handleEditUser = useCallback(
    async (msgId, newContent) => {
      if (!activeId || isStreaming) return;
      const target = messages.find((m) => m.id === msgId);
      if (!target) return;
      // Update the user message content, drop everything after it
      await updateMessage(msgId, { content: newContent });
      // Delete messages strictly after this one
      const afterTime = target.createdAt + 1;
      await deleteMessagesAfter(activeId, afterTime);
      const history = await listMessages(activeId);
      setMessages(history);
      await runStream(activeId, history);
    },
    [activeId, isStreaming, messages, selectedModel]
  );

  const handleDeleteMessage = useCallback(
    async (msgId) => {
      const msg = messages.find((m) => m.id === msgId);
      if (!msg) return;
      await deleteMessagesFromIncluding(activeId, msg.createdAt);
      const history = await listMessages(activeId);
      setMessages(history);
    },
    [activeId, messages]
  );

  const handleExport = useCallback(() => {
    if (!activeConv || messages.length === 0) return;
    exportConversationToExcel(activeConv, messages);
  }, [activeConv, messages]);

  // -------- Draft autosave --------
  const handleDraftChange = useCallback(
    (text) => {
      draftRef.current = text;
      // debounce-write
      if (activeId) {
        setDraft(activeId, text);
      } else {
        setDraft(null, text);
      }
    },
    [activeId]
  );

  const initialDraft = useMemo(() => {
    if (typeof window === "undefined") return "";
    return getDraft(activeId);
  }, [activeId]);

  // -------- Command palette actions --------
  const cmdActions = useMemo(() => {
    const list = [
      {
        id: "new",
        label: "New chat",
        hint: "Buat percakapan baru",
        shortcut: "⌘N",
        run: handleNewChat,
      },
      {
        id: "system-prompt",
        label: activeConv?.systemPrompt ? "Edit system prompt" : "Set system prompt",
        hint: "Atur instruksi khusus untuk percakapan ini",
        run: () => setSysPromptOpen(true),
      },
      {
        id: "share",
        label: "Share percakapan",
        hint: "Generate read-only link",
        run: () => setShareOpen(true),
      },
      {
        id: "tags",
        label: "Edit tags",
        hint: "Beri label percakapan ini",
        run: () => activeId && handleEditTags(activeId),
      },
      {
        id: "pin",
        label: activeConv?.pinned ? "Unpin percakapan" : "Pin percakapan",
        hint: "Tandai percakapan supaya muncul di atas",
        run: () => activeId && handleTogglePin(activeId),
      },
      {
        id: "rename",
        label: "Rename percakapan",
        hint: "Ubah judul",
        run: () => {
          if (!activeConv) return;
          const t = prompt("Judul baru:", activeConv.title);
          if (t && t.trim()) handleRename(activeConv.id, t.trim());
        },
      },
      {
        id: "regenerate",
        label: "Regenerate last response",
        hint: "Hasilkan ulang jawaban AI terakhir",
        run: handleRegenerate,
      },
      {
        id: "export",
        label: "Export ke Excel",
        hint: "Download percakapan sebagai .xlsx",
        run: handleExport,
      },
      {
        id: "theme",
        label: `Theme: ${theme}`,
        hint: "Cycle system → dark → light",
        run: cycleTheme,
      },
      {
        id: "delete",
        label: "Hapus percakapan ini",
        hint: "Tidak bisa di-undo",
        run: () => {
          if (!activeId) return;
          if (confirm(`Hapus "${activeConv?.title || "this chat"}"?`)) handleDelete(activeId);
        },
      },
    ];
    // Plus: jump to other conversations
    for (const c of conversations.slice(0, 12)) {
      if (c.id === activeId) continue;
      list.push({
        id: `goto-${c.id}`,
        label: `Open: ${c.title || "Untitled"}`,
        hint: c.tags?.length ? `#${c.tags.join(" #")}` : "",
        run: () => handleSelect(c.id),
      });
    }
    return list;
  }, [
    activeConv,
    activeId,
    conversations,
    theme,
    handleNewChat,
    handleEditTags,
    handleTogglePin,
    handleRename,
    handleRegenerate,
    handleExport,
    handleDelete,
    handleSelect,
    cycleTheme,
  ]);

  const tagsValue =
    tagsTargetId === activeId
      ? activeConv?.tags || []
      : conversations.find((c) => c.id === tagsTargetId)?.tags || [];

  return (
    <div className="flex h-dvh bg-bg text-text">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={handleSelect}
        onNew={handleNewChat}
        onDelete={handleDelete}
        onRename={handleRename}
        onTogglePin={handleTogglePin}
        onEditTags={handleEditTags}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="flex-1 flex flex-col min-w-0">
        <Header
          models={models}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          onExport={handleExport}
          canExport={messages.length > 0}
          title={activeConv?.title}
          theme={theme}
          onCycleTheme={cycleTheme}
          onEditSystemPrompt={() => setSysPromptOpen(true)}
          hasSystemPrompt={!!activeConv?.systemPrompt}
          onShare={() => setShareOpen(true)}
          canShare={messages.length > 0}
          onOpenCommandPalette={() => setCmdOpen(true)}
        />

        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {!hydrated ? (
            <div className="h-full flex items-center justify-center text-text-dim text-sm">
              Loading...
            </div>
          ) : messages.length === 0 ? (
            <EmptyState selectedModel={selectedModel} onOpenCommand={() => setCmdOpen(true)} />
          ) : (
            <div>
              {messages.map((m, i) => (
                <Message
                  key={m.id}
                  message={m}
                  isStreaming={isStreaming && i === messages.length - 1 && m.role === "assistant"}
                  onRegenerate={handleRegenerate}
                  onDelete={() => handleDeleteMessage(m.id)}
                  onEditUser={handleEditUser}
                  isLast={i === messages.length - 1}
                />
              ))}
            </div>
          )}
        </div>

        <Composer
          onSend={handleSend}
          onStop={handleStop}
          isStreaming={isStreaming}
          disabled={!selectedModel}
          conversationId={activeId}
          initialDraft={initialDraft}
          onDraftChange={handleDraftChange}
        />
      </main>

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} actions={cmdActions} />
      <SystemPromptModal
        open={sysPromptOpen}
        value={activeConv?.systemPrompt || ""}
        onClose={() => setSysPromptOpen(false)}
        onSave={handleSaveSystemPrompt}
      />
      <ShareModal
        open={shareOpen}
        conversation={activeConv}
        messages={messages}
        onClose={() => setShareOpen(false)}
      />
      <TagsEditor
        open={tagsOpen}
        value={tagsValue}
        suggestions={allTags}
        onClose={() => {
          setTagsOpen(false);
          setTagsTargetId(null);
        }}
        onSave={handleSaveTags}
      />
    </div>
  );
}

function EmptyState({ selectedModel, onOpenCommand }) {
  return (
    <div className="h-full flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="size-12 mx-auto rounded-xl bg-accent text-white flex items-center justify-center text-lg font-semibold mb-4">
          H
        </div>
        <h1 className="text-xl font-semibold mb-1">Chat — Hanif</h1>
        <p className="text-sm text-text-dim">
          {selectedModel ? (
            <>Model aktif: <span className="font-mono text-text-muted">{selectedModel}</span></>
          ) : (
            "Pilih model dulu di pojok kanan atas."
          )}
        </p>
        <p className="text-xs text-text-dim mt-3">
          History tersimpan di browser lo · No login · No tracking
        </p>
        <button
          onClick={onOpenCommand}
          className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs bg-bg-2 hover:bg-bg-3 border border-border"
        >
          <kbd className="bg-bg-3 px-1 rounded text-[10px] font-mono">⌘K</kbd>
          Command palette
        </button>
      </div>
    </div>
  );
}
