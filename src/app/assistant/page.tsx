"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  SquarePen,
  PanelLeftClose,
  PanelLeft,
  ArrowUp,
  Square,
  Trash2,
  Edit2,
  Check,
  X,
  Sun,
  Moon,
  Bot,
  User,
  RotateCcw,
  Copy,
  AlertCircle,
  ArrowDown,
} from "lucide-react";
import MarkdownView from "@/components/assistant/MarkdownView";

interface ConversationItem {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface MessageItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
  isStreaming?: boolean;
  error?: string;
}

const ACTIVE_CONV_STORAGE_KEY = "kb_ai_assistant_active_conv";
const THEME_STORAGE_KEY = "kb_ai_assistant_theme";

const QUICK_PROMPT_CHIPS = [
  {
    icon: "📊",
    title: "Sales & Cash Summary",
    prompt: "Give me an executive summary of our total sales, cash collected (Nagathu), and pending credit (Udhaar).",
  },
  {
    icon: "⚠️",
    title: "Top Udhaar Debtors",
    prompt: "Who are our top customers with unpaid Udhaar, and what are their exact balances and villages?",
  },
  {
    icon: "🏘️",
    title: "Village Performance",
    prompt: "Break down customer count, orders, and total debt for each village in our database.",
  },
  {
    icon: "💡",
    title: "Debt Recovery Plan",
    prompt: "What strategic action plan do you recommend to recover our pending Udhaar without harming customer relationships?",
  },
];

export default function AssistantPage() {
  // Theme state
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Sidebar / Drawer states
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Conversations state
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>("");
  const [loadingConversations, setLoadingConversations] = useState(true);

  // Messages state
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Input & Generation state
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Conversation title editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitleText, setEditingTitleText] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Refs
  const abortControllerRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);

  // 1. Initialize Theme
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as "light" | "dark" | null;
      if (savedTheme) {
        setTheme(savedTheme);
        if (savedTheme === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        setTheme("dark");
        document.documentElement.classList.add("dark");
      }
    } catch {}
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      if (nextTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } catch {}
  };

  // 2. Fetch Conversations on Mount
  const fetchConversations = useCallback(async () => {
    try {
      setLoadingConversations(true);
      const res = await fetch("/api/assistant/conversations");
      const data = await res.json();
      if (data.success && Array.isArray(data.conversations)) {
        setConversations(data.conversations);
        return data.conversations as ConversationItem[];
      }
    } catch (err) {
    } finally {
      setLoadingConversations(false);
    }
    return [];
  }, []);

  // 3. Load Active Conversation Messages
  const loadConversationMessages = useCallback(async (convId: string) => {
    if (!convId) {
      setMessages([]);
      return;
    }
    try {
      setLoadingMessages(true);
      setErrorBanner(null);
      const res = await fetch(`/api/assistant/conversations/${convId}`);
      const data = await res.json();
      if (data.success && data.conversation) {
        setMessages(data.conversation.messages || []);
      } else {
        // If not found, clear active
        setActiveConversationId("");
        setMessages([]);
      }
    } catch (err: any) {
      setErrorBanner("Failed to load conversation messages.");
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    (async () => {
      const list = await fetchConversations();
      const urlParams = new URLSearchParams(window.location.search);
      const urlConvId = urlParams.get("c");

      if (urlConvId && list.some((c) => c.id === urlConvId)) {
        setActiveConversationId(urlConvId);
        loadConversationMessages(urlConvId);
      } else {
        // Present fresh conversation screen
        setActiveConversationId("");
        setMessages([]);
      }
    })();
  }, [fetchConversations, loadConversationMessages]);

  // Persist Active Conversation ID
  useEffect(() => {
    try {
      if (activeConversationId) {
        localStorage.setItem(ACTIVE_CONV_STORAGE_KEY, activeConversationId);
      } else {
        localStorage.removeItem(ACTIVE_CONV_STORAGE_KEY);
      }
    } catch {}
  }, [activeConversationId]);

  // Switch Conversation
  const handleSelectConversation = (convId: string) => {
    if (convId === activeConversationId) {
      setMobileDrawerOpen(false);
      return;
    }
    // Cancel any in-flight generation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
    }
    setActiveConversationId(convId);
    try {
      window.history.pushState({}, "", `/assistant?c=${convId}`);
    } catch {}
    loadConversationMessages(convId);
    setMobileDrawerOpen(false);
  };

  // Start New Conversation
  const handleStartNewConversation = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
    }
    setActiveConversationId("");
    setMessages([]);
    setErrorBanner(null);
    setInput("");
    try {
      window.history.pushState({}, "", "/assistant");
    } catch {}
    setMobileDrawerOpen(false);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // Delete Conversation Modal Trigger
  const handleDeleteConversation = (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmId(convId);
  };

  const handleConfirmDelete = async (convId: string) => {
    try {
      const res = await fetch(`/api/assistant/conversations/${convId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setConversations((prev) => prev.filter((c) => c.id !== convId));
        if (activeConversationId === convId) {
          handleStartNewConversation();
        }
      }
    } catch (err) {
      setErrorBanner("Failed to delete conversation.");
    } finally {
      setDeleteConfirmId(null);
    }
  };

  // Save Renamed Conversation Title
  const handleSaveRename = async (convId: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const newTitle = editingTitleText.trim();
    if (!newTitle) {
      setEditingId(null);
      return;
    }
    try {
      const res = await fetch(`/api/assistant/conversations/${convId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
      const data = await res.json();
      if (data.success) {
        setConversations((prev) =>
          prev.map((c) => (c.id === convId ? { ...c, title: newTitle } : c))
        );
      }
    } catch (err) {
    } finally {
      setEditingId(null);
    }
  };

  // Auto-resize composer textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const nextHeight = Math.min(textareaRef.current.scrollHeight, 180);
      textareaRef.current.style.height = `${Math.max(nextHeight, 44)}px`;
    }
  }, [input]);

  // Scroll Management
  const scrollToBottom = useCallback((smooth = true) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
    }
  }, []);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const distanceToBottom = scrollHeight - (scrollTop + clientHeight);
    const near = distanceToBottom < 80;
    isNearBottomRef.current = near;
    setShowScrollBottomBtn(!near && messages.length > 2);
  };

  useEffect(() => {
    if (isNearBottomRef.current) {
      scrollToBottom(false);
    }
  }, [messages, isGenerating, scrollToBottom]);

  // Send Message / Stream Handling
  const handleSubmitPrompt = async (e?: React.FormEvent, overridePrompt?: string) => {
    if (e) e.preventDefault();
    const promptText = (overridePrompt || input).trim();
    if (!promptText || isGenerating) return;

    setErrorBanner(null);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "44px";
    }

    // Temporary optimistic user message
    const tempUserId = `user-${Date.now()}`;
    const userMsg: MessageItem = {
      id: tempUserId,
      role: "user",
      content: promptText,
      createdAt: new Date().toISOString(),
    };

    // Temporary streaming assistant message
    const tempAssistantId = `asst-${Date.now()}`;
    const assistantMsg: MessageItem = {
      id: tempAssistantId,
      role: "assistant",
      content: "",
      isStreaming: true,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsGenerating(true);
    isNearBottomRef.current = true;
    scrollToBottom(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortController.signal,
        body: JSON.stringify({
          conversationId: activeConversationId || undefined,
          prompt: promptText,
          stream: true,
        }),
      });

      // Update conversation ID if freshly created
      const returnedConvId = response.headers.get("X-Conversation-Id");
      if (returnedConvId && returnedConvId !== activeConversationId) {
        setActiveConversationId(returnedConvId);
        try {
          window.history.replaceState({}, "", `/assistant?c=${returnedConvId}`);
        } catch {}
        fetchConversations();
      }

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(errorJson.error || `Server responded with HTTP ${response.status}`);
      }

      // Read SSE stream
      if (!response.body) {
        throw new Error("No response body received from server.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulatedText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data: ")) {
            const dataStr = trimmed.slice(6).trim();
            if (dataStr === "[DONE]") {
              break;
            }
            try {
              const payload = JSON.parse(dataStr);
              if (payload.text) {
                accumulatedText += payload.text;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === tempAssistantId
                      ? { ...m, content: accumulatedText, isStreaming: true }
                      : m
                  )
                );
              }
            } catch {
              // Ignore partial JSON chunks
            }
          }
        }
      }

      // Mark generation complete
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempAssistantId
            ? { ...m, content: accumulatedText || "No response received.", isStreaming: false }
            : m
        )
      );
      fetchConversations();
    } catch (err: any) {
      if (err.name === "AbortError") {
        // User aborted intentionally
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempAssistantId
              ? { ...m, isStreaming: false }
              : m
          )
        );
      } else {
        setErrorBanner(err.message || "Failed to receive response. Please retry.");
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempAssistantId
              ? {
                  ...m,
                  error: err.message || "An error occurred generating response.",
                  isStreaming: false,
                }
              : m
          )
        );
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  // Stop Generation Handler
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsGenerating(false);
    }
  };

  // Retry Last Message
  const handleRetryLastMessage = () => {
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMessage) {
      // Remove any trailing failed messages
      const lastUserIndex = messages.findIndex((m) => m.id === lastUserMessage.id);
      setMessages((prev) => prev.slice(0, lastUserIndex));
      setInput(lastUserMessage.content);
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  };

  // Copy Message to Clipboard
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const handleCopyMessage = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMsgId(id);
      setTimeout(() => setCopiedMsgId(null), 2000);
    } catch {}
  };

  // Keyboard shortcut handler for composer
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmitPrompt();
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans">
      {/* ========================================================================= */}
      {/* 1. Desktop Collapsible Sidebar (History Panel) */}
      {/* ========================================================================= */}
      <aside
        className={`hidden md:flex flex-col bg-zinc-50 dark:bg-zinc-900/60 border-r border-zinc-200 dark:border-zinc-800 transition-all duration-200 ease-in-out ${
          sidebarOpen ? "w-64 lg:w-72" : "w-0 overflow-hidden border-none"
        }`}
      >
        {/* Sidebar Header: New Conversation Button */}
        <div className="p-3 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between gap-2">
          <button
            onClick={handleStartNewConversation}
            className="flex-1 flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/80 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-700/80 transition-colors"
          >
            <SquarePen className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
            <span>New conversation</span>
          </button>

          <button
            onClick={() => setSidebarOpen(false)}
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
            className="p-2 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 rounded-xl transition-colors"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* Conversations List */}
        <nav aria-label="Conversation history" className="flex-1 overflow-y-auto p-2 space-y-0.5 text-xs">
          {loadingConversations ? (
            <div className="p-4 text-center text-zinc-400 dark:text-zinc-500 text-xs font-mono">
              Loading history...
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-6 text-center text-zinc-400 dark:text-zinc-500 text-xs">
              No conversations yet
            </div>
          ) : (
            conversations.map((c) => {
              const isActive = c.id === activeConversationId;
              const isEditing = editingId === c.id;

              return (
                <div
                  key={c.id}
                  onClick={() => handleSelectConversation(c.id)}
                  className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                    isActive
                      ? "bg-zinc-200/80 dark:bg-zinc-800 text-zinc-900 dark:text-white font-medium"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-zinc-200"
                  }`}
                >
                  {isEditing ? (
                    <form
                      onSubmit={(e) => handleSaveRename(c.id, e)}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 flex items-center gap-1.5"
                    >
                      <input
                        type="text"
                        autoFocus
                        value={editingTitleText}
                        onChange={(e) => setEditingTitleText(e.target.value)}
                        className="flex-1 px-2 py-0.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded text-zinc-900 dark:text-white focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="p-1 text-emerald-600 hover:text-emerald-700"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="p-1 text-zinc-400 hover:text-zinc-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  ) : (
                    <>
                      <span className="truncate flex-1 pr-2 leading-tight">
                        {c.title}
                      </span>

                      {/* Action buttons on hover / active */}
                      <div
                        className={`flex items-center gap-1 transition-opacity ${
                          isActive
                            ? "opacity-100"
                            : "opacity-0 group-hover:opacity-100"
                        }`}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(c.id);
                            setEditingTitleText(c.title);
                          }}
                          title="Rename conversation"
                          className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteConversation(c.id, e)}
                          title="Delete conversation"
                          className="p-1 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </nav>

        {/* Sidebar Footer: Theme Toggle & Info */}
        <div className="p-3 border-t border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-200/60 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
          >
            {theme === "light" ? (
              <>
                <Moon className="w-3.5 h-3.5" />
                <span>Dark theme</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5" />
                <span>Light theme</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. Mobile Slide-Out Drawer */}
      {/* ========================================================================= */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            onClick={() => setMobileDrawerOpen(false)}
            className="fixed inset-0 bg-black/40 transition-opacity"
          />

          {/* Drawer content */}
          <div className="relative w-72 max-w-[80vw] bg-zinc-50 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col z-10">
            <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <button
                onClick={handleStartNewConversation}
                className="flex-1 flex items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl"
              >
                <SquarePen className="w-4 h-4" />
                <span>New conversation</span>
              </button>
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="p-2 ml-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1 text-xs">
              {conversations.map((c) => (
                <div
                  key={c.id}
                  onClick={() => handleSelectConversation(c.id)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer ${
                    c.id === activeConversationId
                      ? "bg-zinc-200 dark:bg-zinc-800 font-medium text-zinc-900 dark:text-white"
                      : "text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  <span className="truncate flex-1">{c.title}</span>
                  <button
                    onClick={(e) => handleDeleteConversation(c.id, e)}
                    className="p-1 text-zinc-400 hover:text-rose-600"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            <div className="p-3 border-t border-zinc-200 dark:border-zinc-800">
              <button
                onClick={toggleTheme}
                className="flex items-center gap-2 px-2 py-1.5 text-xs text-zinc-600 dark:text-zinc-300"
              >
                {theme === "light" ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                <span>Toggle {theme === "light" ? "dark" : "light"} mode</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. Main Assistant App Container */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-white dark:bg-zinc-950 relative">
        {/* --------------------------------------------------------------------- */}
        {/* Simple Header */}
        {/* --------------------------------------------------------------------- */}
        <header className="h-14 border-b border-zinc-200/80 dark:border-zinc-800/80 px-4 flex items-center justify-between flex-shrink-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md z-20">
          <div className="flex items-center gap-2">
            {/* Sidebar toggle button (desktop) */}
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                title="Open history sidebar"
                aria-label="Open sidebar"
                className="hidden md:flex p-2 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
              >
                <PanelLeft className="w-4 h-4" />
              </button>
            )}

            {/* Mobile history drawer trigger */}
            <button
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="Open mobile conversation history"
              title="Open history"
              className="md:hidden p-2 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
            >
              <PanelLeft className="w-4 h-4" />
            </button>

            {/* Assistant Name & Live DB Indicator */}
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-sm sm:text-base text-zinc-900 dark:text-zinc-100 tracking-tight select-none">
                KB AI Assistant
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-[10px] font-medium text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Live DB
              </span>
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              title={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
              aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
              className="p-2 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
            >
              {theme === "light" ? (
                <Moon className="w-4 h-4" />
              ) : (
                <Sun className="w-4 h-4" />
              )}
            </button>

            <button
              onClick={handleStartNewConversation}
              title="New chat"
              aria-label="New chat"
              className="p-2 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
            >
              <SquarePen className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* --------------------------------------------------------------------- */}
        {/* Error Notification Banner */}
        {/* --------------------------------------------------------------------- */}
        {errorBanner && (
          <div className="px-4 py-2 bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between z-10 animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{errorBanner}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRetryLastMessage}
                className="underline font-semibold hover:text-rose-900 dark:hover:text-rose-100"
              >
                Retry
              </button>
              <button
                onClick={() => setErrorBanner(null)}
                className="text-rose-500 hover:text-rose-800"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* --------------------------------------------------------------------- */}
        {/* Central Conversation Area */}
        {/* --------------------------------------------------------------------- */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 sm:px-6 pt-4 pb-48 relative"
        >
          {loadingMessages ? (
            <div className="h-full flex items-center justify-center text-xs text-zinc-400 dark:text-zinc-500 font-mono">
              Loading conversation...
            </div>
          ) : messages.length === 0 ? (
            /* Empty State / Initial Greeting */
            <div className="h-full min-h-[50vh] flex flex-col items-center justify-center text-center max-w-lg mx-auto space-y-4 animate-in fade-in duration-200 py-6">
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-center">
                <Bot className="w-6 h-6 stroke-[1.8]" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                  How can I help you today?
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-sm mx-auto">
                  Connected to your live shop database. Ask any question about sales, debts, customers, villages, or business decisions.
                </p>
              </div>

              {/* Quick Business Decision Prompt Chips */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full pt-3 text-left">
                {QUICK_PROMPT_CHIPS.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setInput(chip.prompt);
                      handleSubmitPrompt(undefined, chip.prompt);
                    }}
                    className="flex flex-col gap-1 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/80 transition-all text-left group"
                  >
                    <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                      <span>{chip.icon}</span>
                      <span>{chip.title}</span>
                    </span>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-1">
                      {chip.prompt}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Conversation Stream */
            <div className="max-w-3xl mx-auto space-y-6 pt-2">
              {messages.map((msg, idx) => {
                const isUser = msg.role === "user";
                const isLastAssistant = !isUser && idx === messages.length - 1;

                return (
                  <div
                    key={msg.id || idx}
                    className={`flex flex-col group ${
                      isUser ? "items-end" : "items-start"
                    }`}
                  >
                    {isUser ? (
                      /* User Prompt Bubble */
                      <div className="max-w-[85%] sm:max-w-[78%] rounded-2xl px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-[14px] leading-relaxed">
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    ) : (
                      /* Assistant Response Block */
                      <div className="w-full flex items-start gap-3.5 sm:gap-4">
                        <div className="w-7 h-7 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Bot className="w-4 h-4" />
                        </div>

                        <div className="flex-1 min-w-0 space-y-1">
                          {msg.error ? (
                            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between">
                              <span>{msg.error}</span>
                              <button
                                onClick={handleRetryLastMessage}
                                className="inline-flex items-center gap-1 font-semibold underline text-rose-800 dark:text-rose-200 ml-2"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Retry</span>
                              </button>
                            </div>
                          ) : (
                            <>
                              {msg.content ? (
                                <MarkdownView content={msg.content} isStreaming={msg.isStreaming} />
                              ) : msg.isStreaming ? (
                                /* Subtle Pulse Loading Indicator */
                                <div className="flex items-center gap-1.5 py-2 text-zinc-400">
                                  <span className="w-2 h-2 rounded-full bg-zinc-400 dark:bg-zinc-600 animate-pulse" />
                                  <span className="w-2 h-2 rounded-full bg-zinc-400 dark:bg-zinc-600 animate-pulse delay-150" />
                                  <span className="w-2 h-2 rounded-full bg-zinc-400 dark:bg-zinc-600 animate-pulse delay-300" />
                                </div>
                              ) : null}

                              {/* Subtle Response Actions (Copy & Retry) */}
                              {!msg.isStreaming && msg.content && (
                                <div className="flex items-center gap-2 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => handleCopyMessage(msg.id, msg.content)}
                                    title="Copy response"
                                    className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded transition-colors"
                                  >
                                    {copiedMsgId === msg.id ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>

                                  {isLastAssistant && (
                                    <button
                                      onClick={handleRetryLastMessage}
                                      title="Regenerate response"
                                      className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded transition-colors"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Scroll-To-Bottom Floating Button */}
        {showScrollBottomBtn && (
          <button
            onClick={() => scrollToBottom(true)}
            aria-label="Scroll to bottom"
            className="fixed bottom-28 right-6 z-40 w-8 h-8 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-all"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
        )}

        {/* --------------------------------------------------------------------- */}
        {/* Floating Input Prompt That Sits at the Viewport Bottom */}
        {/* --------------------------------------------------------------------- */}
        <div className="fixed bottom-6 left-0 right-0 z-30 px-4 sm:px-6 pointer-events-none">
          <div className="max-w-3xl mx-auto w-full pointer-events-auto">
            <form
              onSubmit={(e) => handleSubmitPrompt(e)}
              className="relative flex items-end bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-2xl focus-within:ring-2 focus-within:ring-zinc-400 dark:focus-within:ring-zinc-600 focus-within:border-zinc-400 transition-all px-3.5 py-2 sm:px-4 sm:py-2.5"
            >
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message KB AI Assistant..."
                className="flex-1 max-h-[180px] min-h-[28px] bg-transparent resize-none border-0 text-[14px] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-0 leading-relaxed pr-2"
              />

              {/* Action Button: Send or Stop */}
              {isGenerating ? (
                <button
                  type="button"
                  onClick={handleStopGeneration}
                  title="Stop generating"
                  className="w-8 h-8 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center hover:opacity-85 active:scale-95 transition-all flex-shrink-0 mb-0.5"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  title="Send prompt (Enter)"
                  className="w-8 h-8 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 disabled:bg-zinc-200 dark:disabled:bg-zinc-800 disabled:text-zinc-400 dark:disabled:text-zinc-600 flex items-center justify-center hover:opacity-90 active:scale-95 transition-all flex-shrink-0 mb-0.5"
                >
                  <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                </button>
              )}
            </form>

            {/* Floating Subtitle / Database indicator */}
            <div className="flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500 mt-2 px-3 select-none">
              <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                Live Shop Database Connected
              </span>
              <span>KB AI Assistant</span>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 max-w-sm w-full space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Delete chat?</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                This will delete this conversation permanently. This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmDelete(deleteConfirmId)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
