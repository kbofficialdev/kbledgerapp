"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { marked } from "marked";

interface MarkdownViewProps {
  content: string;
  isStreaming?: boolean;
  className?: string;
}

/**
 * Sanitizes partial markdown string during streaming to avoid
 * breaking syntax (such as unclosed code fences, bold markers, or incomplete tables)
 * which would otherwise cause flickering and unformatted flashes during typing.
 */
function sanitizeStreamingMarkdown(text: string): string {
  if (!text) return "";
  let sanitized = text;

  // 1. Auto-close code blocks (odd number of ```)
  const codeBlockMatches = sanitized.match(/```/g);
  if (codeBlockMatches && codeBlockMatches.length % 2 !== 0) {
    sanitized += "\n```";
  }

  // 2. Auto-close bold markdown markers (odd count of **)
  const boldMatches = sanitized.match(/\*\*/g);
  if (boldMatches && boldMatches.length % 2 !== 0) {
    sanitized += "**";
  }

  // 3. Auto-close single backtick inline code
  const strippedFences = sanitized.replace(/```[\s\S]*?```/g, "");
  const singleBackticks = (strippedFences.match(/`/g) || []).length;
  if (singleBackticks % 2 !== 0) {
    sanitized += "`";
  }

  // 4. Incomplete table rows: if last line starts with | and does not end with |
  const lines = sanitized.split("\n");
  const lastLine = lines[lines.length - 1];
  if (lastLine.trim().startsWith("|") && !lastLine.trim().endsWith("|")) {
    lines[lines.length - 1] = lastLine + " |";
    sanitized = lines.join("\n");
  }

  return sanitized;
}

export const MarkdownView: React.FC<MarkdownViewProps> = ({
  content,
  isStreaming = false,
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Typewriter effect state for letter-by-letter typing like ChatGPT
  const [displayedLength, setDisplayedLength] = useState<number>(() => {
    return isStreaming ? 0 : (content?.length || 0);
  });

  const targetLengthRef = useRef(content?.length || 0);
  targetLengthRef.current = content?.length || 0;

  // Typewriter animation loop
  useEffect(() => {
    if (!isStreaming) {
      setDisplayedLength(content?.length || 0);
      return;
    }

    let animationFrameId: number;
    let lastTick = performance.now();

    const tick = (now: number) => {
      // Dynamic pacing: ~15ms tick with adaptive character steps
      if (now - lastTick >= 15) {
        lastTick = now;

        setDisplayedLength((prev) => {
          const target = targetLengthRef.current;
          if (prev >= target) {
            return target;
          }

          const diff = target - prev;
          let step = 1;
          if (diff > 120) {
            step = 8;
          } else if (diff > 50) {
            step = 4;
          } else if (diff > 20) {
            step = 2;
          }

          return Math.min(prev + step, target);
        });
      }

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isStreaming, content]);

  // Compute text to render safely
  const rawSlice = isStreaming ? (content || "").slice(0, displayedLength) : (content || "");
  const textToRender = isStreaming ? sanitizeStreamingMarkdown(rawSlice) : (content || "");
  const isTypingActive = isStreaming && displayedLength < (content?.length || 0);

  // Parse markdown into HTML safely using marked
  const html = useMemo(() => {
    try {
      marked.setOptions({
        gfm: true,
        breaks: true,
      });
      return marked.parse(textToRender || "") as string;
    } catch {
      return textToRender || "";
    }
  }, [textToRender]);

  // Enhance rendered DOM: wrap tables in horizontal scroll containers and add code copy buttons
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    // 1. Wrap tables in responsive overflow-x-auto containers if not wrapped
    const tables = container.querySelectorAll("table");
    tables.forEach((table) => {
      if (table.parentElement?.classList.contains("kb-table-scroll-wrapper")) return;
      const wrapper = document.createElement("div");
      wrapper.className = "kb-table-scroll-wrapper w-full overflow-x-auto my-3 rounded-xl";
      table.parentNode?.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    });

    // 2. Attach copy buttons and language header to pre/code blocks
    const preBlocks = container.querySelectorAll("pre");
    preBlocks.forEach((pre) => {
      if (pre.querySelector(".code-copy-btn")) return;

      pre.style.position = "relative";
      const codeEl = pre.querySelector("code");
      const codeText = codeEl ? codeEl.innerText : pre.innerText;

      const langMatch = codeEl?.className.match(/language-(\w+)/);
      const language = langMatch ? langMatch[1] : "";

      const headerBar = document.createElement("div");
      headerBar.className =
        "flex items-center justify-between px-3 py-1.5 text-[11px] font-mono text-zinc-400 bg-zinc-900 border-b border-zinc-800 rounded-t-lg select-none";

      const langSpan = document.createElement("span");
      langSpan.innerText = language || "code";
      headerBar.appendChild(langSpan);

      const copyBtn = document.createElement("button");
      copyBtn.className =
        "code-copy-btn inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors py-0.5 px-1.5 rounded";
      copyBtn.innerHTML = `<span>Copy</span>`;

      copyBtn.onclick = async () => {
        try {
          await navigator.clipboard.writeText(codeText);
          copyBtn.innerHTML = `<span class="text-emerald-400 font-semibold">Copied!</span>`;
          setTimeout(() => {
            copyBtn.innerHTML = `<span>Copy</span>`;
          }, 2000);
        } catch {}
      };

      headerBar.appendChild(copyBtn);
      pre.insertBefore(headerBar, pre.firstChild);
    });
  }, [html]);

  return (
    <div className="relative w-full">
      <div
        ref={containerRef}
        className={`kb-markdown-content prose prose-slate dark:prose-invert max-w-none text-[14px] sm:text-[15px] leading-relaxed break-words font-sans ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {/* Blinking typewriter cursor like ChatGPT during streaming */}
      {(isStreaming || isTypingActive) && (
        <span
          className="inline-block w-2 h-4 ml-1 bg-zinc-900 dark:bg-zinc-100 animate-pulse align-middle rounded-xs"
          aria-hidden="true"
        />
      )}
    </div>
  );
};

export default MarkdownView;
