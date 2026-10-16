'use client';

import { useState } from 'react';
import { Check, Link as LinkIcon, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface ShareButtonProps {
  title: string;
  /** Full absolute URL — the native share sheet needs a real URL, not a relative path. */
  url: string;
  className?: string;
}

const hasNativeShare = () =>
  typeof navigator !== 'undefined' && typeof navigator.share === 'function';

/** No login required — sharing a venue is a public action. On mobile (or any browser that
 * supports the Web Share API), one tap opens the OS share sheet, which already lists every
 * installed app the user can pick — WhatsApp, SMS, email, etc. — nothing custom to build there.
 * The fallback (desktop browsers without that API) is plain "copy link": a dedicated WhatsApp
 * shortcut here would duplicate the owner-contact WhatsApp icon already shown elsewhere on the
 * venue page for a different purpose, which is confusing (same icon, different action). */
export const ShareButton = ({ title, url, className }: ShareButtonProps) => {
  const [copied, setCopied] = useState(false);

  const handleNativeShare = async () => {
    try {
      await navigator.share({ title, url });
    } catch {
      // User closed the share sheet without picking anything — not an error worth a toast.
    }
  };

  /** Legacy fallback for browsers/contexts that deny the modern Clipboard API (seen, for
   * instance, in automated browser contexts that don't grant clipboard-write by default, and
   * historically in some Safari/Firefox versions) -- a temporary offscreen textarea plus the
   * old execCommand still works there since it doesn't go through the Permissions API at all. */
  const legacyCopy = (text: string): boolean => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    let succeeded = false;
    try {
      succeeded = document.execCommand('copy');
    } catch {
      succeeded = false;
    }
    document.body.removeChild(textarea);
    return succeeded;
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copiado');
      setTimeout(() => setCopied(false), 2000);
      return;
    } catch {
      // Fall through to the legacy path below.
    }

    if (legacyCopy(url)) {
      setCopied(true);
      toast.success('Link copiado');
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error('No se pudo copiar el link');
    }
  };

  if (hasNativeShare()) {
    return (
      <Button
        type="button"
        variant="outline"
        size="icon"
        className={className}
        onClick={handleNativeShare}
        aria-label="Compartir"
      >
        <Share2 className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={className}
      onClick={handleCopyLink}
      aria-label="Copiar link"
    >
      {copied ? <Check className="h-4 w-4" /> : <LinkIcon className="h-4 w-4" />}
    </Button>
  );
};
