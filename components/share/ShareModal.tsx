/**
 * @file ShareModal.tsx
 * @description Modal displayed after publishing a board, providing the shareable URL.
 */

'use client';

import { Check, Copy, ExternalLink, Globe, X } from 'lucide-react';
import React, { useState } from 'react';

import { useToast } from '@/components/ui/ToastProvider';

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
      console.error(error);
      showToast('Failed to copy link', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300" 
        onClick={onClose} 
      />

      {/* Content */}
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="border-b border-neutral-800 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-600/20 p-2 text-blue-400">
                <Globe size={24} />
              </div>
              <h2 className="text-xl font-bold text-white">Board Published</h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-neutral-500 transition-colors hover:bg-neutral-800 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6">
          <p className="mb-4 text-sm text-neutral-400 leading-relaxed">
            Your board is now public! Anyone with the link can view it.
          </p>

          <div className="flex items-center gap-2 rounded-lg bg-black/50 p-2 ring-1 ring-neutral-800 focus-within:ring-blue-500/50 transition-all">
            <input
              readOnly
              value={shareUrl}
              className="flex-1 bg-transparent px-2 py-1.5 text-sm font-mono text-neutral-300 outline-none"
            />
            <button
              onClick={handleCopy}
              className={`flex items-center gap-2 rounded px-4 py-1.5 text-xs font-bold transition-all ${
                copied ? 'bg-green-600 text-white' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white'
              }`}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-400 transition-colors hover:text-white"
            >
              Close
            </button>
            <a
              href={shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-blue-500 active:scale-95 shadow-lg shadow-blue-600/20"
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
