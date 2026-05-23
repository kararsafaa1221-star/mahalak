import React, { useState } from "react";
import { Copy, Check } from "lucide-react";

interface CopyButtonProps {
  text: string | null | undefined;
  className?: string;
  size?: number;
}

export const CopyButton: React.FC<CopyButtonProps> = ({ text, className = "", size = 12 }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      // Fallback
      try {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (fallbackErr) {
        console.error("Fallback copy failed:", fallbackErr);
      }
    }
  };

  if (!text) return null;

  return (
    <button
      onClick={handleCopy}
      type="button"
      className={`inline-flex items-center justify-center p-1 rounded-md text-slate-400 hover:text-purple-600 hover:bg-purple-50 active:scale-90 transition-all cursor-pointer ${className}`}
      title={copied ? "تم النسخ!" : "نسخ الكود"}
    >
      {copied ? (
        <Check size={size} className="text-emerald-500 scale-110 transition-transform duration-200" />
      ) : (
        <Copy size={size} className="transition-transform duration-200" />
      )}
    </button>
  );
};
