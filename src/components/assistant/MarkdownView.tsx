"use client";

import React, { useState, useEffect, useRef } from "react";
import { marked } from "marked";

interface MarkdownViewProps {
  content: string;
  isStreaming?: boolean;
  className?: string;
}

export const MarkdownView: React.FC<MarkdownViewProps> = ({
  content,
  isStreaming = false,
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Typewriter effect state for letter-by-letter typing like ChatGPT
  const [displayedLength, setDisplayedLength] = useState<number>(() => {
    return isStreaming ? 0 : content.length;
  });

  // Reference to track target content length
  const targetLengthRef = useRef(content.length);
  targetLengthRef.current = content.length;

  // Typewriter animation loop
  useEffect(() => {
    if (!isStreaming) {
      setDisplayedLength(content.length);
      return;
    }

    let animationFrameId: number;
    let lastTick = performance.now();

    const tick = (now: number) => {
      // Run every ~14ms (approx 70 characters/sec) with adaptive speedup
      if (now - lastTick >= 14) {
        lastTick = now;

        setDisplayedLength((prev) => {
          const target = targetLengthRef.current;
          if (prev >= target) {
            return target;
          }

          const diff = target - prev;
          let step = 1;
          if (diff > 50) {
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

  // Compute text to render
  const textToRender = isStreaming ? content.slice(0, displayedLength) : content;
  const isTypingActive = isStreaming && displayedLength < content.length;

  // Parse markdown into HTML safely
  const html = React.useMemo(() => {
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

  // Attach copy buttons to rendered pre/code blocks
  useEffect(() => {
    if (!containerRef.current) return;
    const preBlocks = containerRef.current.querySelectorAll("pre");

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
          copyBtn.innerHTML = `<span class="text-emerald-400">Copied!</span>`;
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
    <div className="relative">
      <div
        ref={containerRef}
        className={`prose prose-zinc dark:prose-invert max-w-none text-[14px] sm:text-[15px] leading-relaxed break-words font-sans
          prose-p:my-2.5 prose-p:leading-relaxed
          prose-headings:font-semibold prose-headings:tracking-tight prose-headings:my-3.5
          prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-h4:text-sm
          prose-ul:my-2 prose-ul:pl-5 prose-li:my-1
          prose-ol:my-2 prose-ol:pl-5
          prose-strong:font-bold prose-strong:text-zinc-900 dark:prose-strong:text-zinc-50
          prose-pre:p-0 prose-pre:my-3 prose-pre:rounded-xl prose-pre:bg-zinc-950 prose-pre:border prose-pre:border-zinc-800
          prose-code:font-mono prose-code:text-[13px] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:bg-zinc-100 dark:prose-code:bg-zinc-800/80 prose-code:text-zinc-800 dark:prose-code:text-zinc-200 prose-code:before:content-none prose-code:after:content-none
          prose-table:my-4 prose-table:w-full prose-table:border-collapse prose-table:text-xs sm:prose-table:text-sm prose-table:shadow-xs prose-table:rounded-xl prose-table:overflow-hidden
          prose-th:border prose-th:border-zinc-200 dark:prose-th:border-zinc-700/80 prose-th:bg-zinc-100/80 dark:prose-th:bg-zinc-800/80 prose-th:p-2.5 prose-th:font-semibold prose-th:text-left
          prose-td:border prose-td:border-zinc-200 dark:prose-td:border-zinc-800 prose-td:p-2.5
          prose-blockquote:border-l-4 prose-blockquote:border-indigo-500/80 prose-blockquote:bg-indigo-50/40 dark:prose-blockquote:bg-indigo-950/20 prose-blockquote:rounded-r-xl prose-blockquote:p-3 prose-blockquote:my-3
          ${className}
        `}
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
