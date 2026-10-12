"use client";

import React, { useMemo, useEffect, useRef } from "react";
import { marked } from "marked";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const html = useMemo(() => {
    try {
      marked.setOptions({
        gfm: true,
        breaks: true,
      });
      return marked.parse(content || "") as string;
    } catch (e) {
      console.error("Markdown parse error:", e);
      return content || "";
    }
  }, [content]);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const tables = container.querySelectorAll("table");
    tables.forEach((table) => {
      if (table.parentElement?.classList.contains("kb-table-scroll-wrapper")) return;
      const wrapper = document.createElement("div");
      wrapper.className = "kb-table-scroll-wrapper w-full overflow-x-auto my-3 rounded-xl";
      table.parentNode?.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    });
  }, [html]);

  return (
    <div
      ref={containerRef}
      className={`kb-markdown-content prose prose-slate dark:prose-invert max-w-none text-slate-800 dark:text-zinc-200 leading-relaxed text-xs sm:text-sm font-sans ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export default MarkdownRenderer;
