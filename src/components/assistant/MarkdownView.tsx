"use client";

import React, { useState, useEffect, useRef } from "react";
import { marked } from "marked";
import { Copy, Check } from "lucide-react";

interface MarkdownViewProps {
  content: string;
  className?: string;
}

export const MarkdownView: React.FC<MarkdownViewProps> = ({
  content,
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse markdown into HTML safely
  const html = React.useMemo(() => {
    try {
      marked.setOptions({
        gfm: true,
        breaks: true,
      });
      return marked.parse(content || "") as string;
    } catch {
      return content || "";
    }
  }, [content]);

  // Attach copy buttons to rendered pre/code blocks
  useEffect(() => {
    if (!containerRef.current) return;
    const preBlocks = containerRef.current.querySelectorAll("pre");

    preBlocks.forEach((pre) => {
      // Avoid adding duplicate buttons
      if (pre.querySelector(".code-copy-btn")) return;

      pre.style.position = "relative";
      const codeEl = pre.querySelector("code");
      const codeText = codeEl ? codeEl.innerText : pre.innerText;

      // Extract language from className (e.g., "language-typescript")
      const langMatch = codeEl?.className.match(/language-(\w+)/);
      const language = langMatch ? langMatch[1] : "";

      // Create code header bar
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
    <div
      ref={containerRef}
      className={`prose prose-zinc dark:prose-invert max-w-none text-[14px] leading-relaxed break-words font-sans
        prose-p:my-2 prose-p:leading-relaxed
        prose-headings:font-semibold prose-headings:tracking-tight prose-headings:my-3
        prose-h1:text-xl prose-h2:text-lg prose-h3:text-base
        prose-ul:my-2 prose-ul:pl-5 prose-li:my-0.5
        prose-ol:my-2 prose-ol:pl-5
        prose-pre:p-0 prose-pre:my-3 prose-pre:rounded-lg prose-pre:bg-zinc-950 prose-pre:border prose-pre:border-zinc-800
        prose-code:font-mono prose-code:text-[13px] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:bg-zinc-100 dark:prose-code:bg-zinc-800/80 prose-code:text-zinc-800 dark:prose-code:text-zinc-200 prose-code:before:content-none prose-code:after:content-none
        prose-table:my-3 prose-table:w-full prose-table:border-collapse prose-table:text-xs
        prose-th:border prose-th:border-zinc-300 dark:prose-th:border-zinc-700 prose-th:bg-zinc-100 dark:prose-th:bg-zinc-800 prose-th:p-2 prose-th:font-semibold prose-th:text-left
        prose-td:border prose-td:border-zinc-200 dark:prose-td:border-zinc-800 prose-td:p-2
        prose-blockquote:border-l-2 prose-blockquote:border-zinc-300 dark:prose-blockquote:border-zinc-700 prose-blockquote:pl-3 prose-blockquote:italic prose-blockquote:my-2
        ${className}
      `}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export default MarkdownView;
