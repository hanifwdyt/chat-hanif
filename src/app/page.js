"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import Message from "@/components/Message";
import Composer from "@/components/Composer";
import {
  listConversations,
  createConversation,
  updateConversation,
  deleteConversation,
  listMessages,
  addMessage,
  updateMessage,
  deleteMessagesAfter,
  getPrefs,
  setPrefs,
} from "@/lib/storage";
import { fetchModels, streamChat } from "@/lib/api";
import { exportConversationToExcel } from "@/lib/excel";

export default function Page() {
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const abortRef = useRef(null);
  const scrollRef = useRef(null);

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
      setHydrated(true);
    })();
  }, []);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    (async () => {
      const msgs = await listMessages(activeId);
      setMessages(msgs);
    })();
    setPrefs({ activeId });
  }, [activeId]);

  useEffect(() => {
    if (selectedModel) setPrefs({ model: selectedModel });
  }, [selectedModel]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function refreshConversations() {
    const convs = await listConversations();
    setConversations(convs);
  }

  const handleNewChat = useCallback(async () => {
    if (isStreaming) return;
    const conv = await createConversation({ title: "New chat", model: selectedModel });
    await refreshConversations();
    setActiveId(conv.id);
    setMessages([]);
  }, [isStreaming, selectedModel]);

  const handleSelect = useCallback((id) => {
    if (isStreaming) return;
    setActiveId(id);
  }, [isStreaming]);

  const handleDelete = useCallback(async (id) => {
    await deleteConversation(id);
    const convs = await listConversations();
    setConversations(convs);
    if (id === activeId) {
      setActiveId(convs[0]?.id || null);
    }
  }, [activeId]);

  const handleRename = useCallback(async (id, title) => {
    await updateConversation(id, { title });
    await refreshConversations();
  }, []);

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

    const assistant = await addMessage({
      conversationId: convId,
      role: "assistant",
      content: "",
      model: selectedModel,
    });
    setMessages((m) => [...m, assistant]);

    let acc = "";
    try {
      for await (const delta of streamChat({
        model: selectedModel,
        messages: history.map((m) => ({ role: m.role, content: m.content })),
        signal: ctrl.signal,
      })) {
        acc += delta;
        setMessages((m) =>
          m.map((x) => (x.id === assistant.id ? { ...x, content: acc } : x))
        );
      }
    } catch (e) {
      if (e.name !== "AbortError") {
        acc += `\n\n_⚠ Error: ${e.message}_`;
      }
    } finally {
      await updateMessage(assistant.id, { content: acc });
      setMessages((m) =>
        m.map((x) => (x.id === assistant.id ? { ...x, content: acc } : x))
      );
      setIsStreaming(false);
      abortRef.current = null;
      await refreshConversations();
    }
  }

  const handleSend = useCallback(
    async (text) => {
      if (!selectedModel) return;
      const convId = await ensureConversation();

      const userMsg = await addMessage({
        conversationId: convId,
        role: "user",
        content: text,
      });

      const currentMessages = await listMessages(convId);
      setMessages(currentMessages);

      const active = conversations.find((c) => c.id === convId);
      const isFirst = !active || active.title === "New chat" || currentMessages.length <= 1;
      if (isFirst) {
        const title = text.slice(0, 60).replace(/\s+/g, " ").trim();
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

  const handleDeleteMessage = useCallback(
    async (msgId) => {
      const msg = messages.find((m) => m.id === msgId);
      if (!msg) return;
      await deleteMessagesAfter(activeId, msg.createdAt);
      const history = await listMessages(activeId);
      setMessages(history);
    },
    [activeId, messages]
  );

  const handleExport = useCallback(() => {
    const conv = conversations.find((c) => c.id === activeId);
    if (!conv || messages.length === 0) return;
    exportConversationToExcel(conv, messages);
  }, [conversations, activeId, messages]);

  const activeConv = conversations.find((c) => c.id === activeId);

  return (
    <div className="flex h-dvh bg-bg text-text">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={handleSelect}
        onNew={handleNewChat}
        onDelete={handleDelete}
        onRename={handleRename}
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
        />

        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {!hydrated ? (
            <div className="h-full flex items-center justify-center text-text-dim text-sm">
              Loading...
            </div>
          ) : messages.length === 0 ? (
            <EmptyState selectedModel={selectedModel} />
          ) : (
            <div>
              {messages.map((m, i) => (
                <Message
                  key={m.id}
                  message={m}
                  isStreaming={isStreaming && i === messages.length - 1 && m.role === "assistant"}
                  onRegenerate={handleRegenerate}
                  onDelete={() => handleDeleteMessage(m.id)}
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
        />
      </main>
    </div>
  );
}

function EmptyState({ selectedModel }) {
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
      </div>
    </div>
  );
}
