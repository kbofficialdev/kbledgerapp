"use client";

import React, { useMemo } from "react";
import { marked } from "marked";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className = "",
}) => {
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

  return (
    <div
      className={`kb-markdown-content text-slate-800 leading-relaxed text-xs sm:text-sm font-sans ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export default MarkdownRenderer;

