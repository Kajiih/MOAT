/**
 * @file ShareModal.tsx
 * @description Modal displayed after publishing a board, providing the shareable URL.
 */

'use client';

import { Check, Copy, ExternalLink, Globe, X } from 'lucide-react';
import React, { useState } from 'react';

import { useToast } from '@/core/ui/ToastProvider';
import { logger } from '@/infra/logger';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrl: string;
}

/**
 * Modal displayed after publishing a board, providing the shareable URL.
 * @param props - The props for the component.
 * @param props.isOpen - Whether the modal is visible.
 * @param props.onClose - Callback to close the modal.
 * @param props.shareUrl - The URL to be shared.
 * @returns The rendered ShareModal component.
 */
export function ShareModal({ isOpen, onClose, shareUrl }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      showToast('Link copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      logger.error({ error }, 'Failed to copy link');
      showToast('Failed to copy link', 'error');
    }
  };

  return (
    <div className="z-modal fixed inset-0 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="animate-in fade-in duration-normal absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Content */}
      <div className="animate-in zoom-in-95 border-border bg-surface shadow-floating duration-fast relative w-full max-w-md overflow-hidden rounded-2xl border">
        <div className="border-border border-b p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary/20 text-primary rounded-full p-2">
                <Globe size={24} />
              </div>
              <h2 className="text-foreground text-xl font-bold">Board Published</h2>
            </div>
            <button
              onClick={onClose}
              className="text-secondary hover:bg-surface-hover hover:text-foreground rounded-full p-2 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6">
          <p className="text-secondary mb-4 text-sm leading-relaxed">
            Your board is now public! Anyone with the link can view it.
          </p>

          <div className="ring-border focus-within:ring-primary flex items-center gap-2 rounded-lg bg-black/50 p-2 ring-1 transition-all focus-within:ring-2 focus-within:outline-none">
            <input
              readOnly
              value={shareUrl}
              className="text-secondary flex-1 bg-transparent px-2 py-1.5 font-mono text-sm outline-none"
            />
            <button
              onClick={handleCopy}
              className={`flex items-center gap-2 rounded-md px-4 py-1.5 text-xs font-bold transition-all ${
                copied
                  ? 'bg-success text-foreground'
                  : 'bg-surface-hover text-secondary hover:bg-surface hover:text-foreground'
              }`}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="text-secondary hover:text-foreground rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              Close
            </button>
            <a
              href={shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-primary text-foreground shadow-card shadow-primary/20 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all hover:bg-blue-500 active:scale-95"
            >
              <ExternalLink size={16} />
              Visit Page
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
