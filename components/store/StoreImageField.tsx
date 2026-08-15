'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Link2, Loader2, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import { toast } from '@/components/ui';

/**
 * A picture for the shop front — uploaded, or linked.
 *
 * Both, deliberately, and not as indecision. Uploading is what a shop owner
 * with a photograph on their phone actually wants, and it is the only route
 * that produces a URL they can rely on. But the upload endpoint answers 503
 * until Cloudinary is configured on the server, and on this deployment it is
 * not yet — so an upload-only field would be a field that does nothing, with
 * no way round it. Pasting a link keeps the setting usable meanwhile, and
 * stays useful afterwards for a shop whose photographs already live somewhere.
 *
 * The two are not equal, so they are not presented as equal: uploading is the
 * button, linking is the line underneath.
 */

const ACCEPT = 'image/jpeg,image/png,image/webp,image/avif';
/** Cloudinary's own limit on this route, worth saying before the upload fails. */
const MAX_BYTES = 5 * 1024 * 1024;

interface Props {
  value?: string;
  onChange: (url: string) => void;
  label: string;
  hint?: string;
}

export default function StoreImageField({ value, onChange, label, hint }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showLink, setShowLink] = useState(false);
  /** Only for a picture the browser could not load — see the preview below. */
  const [broken, setBroken] = useState(false);

  const upload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Choose an image file');
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error('That image is over 5MB — try a smaller one');
      return;
    }

    const body = new FormData();
    body.append('image', file);

    setUploading(true);
    try {
      const res = await api.post('/uploads/storefront-image', body);
      const url = res.data?.data?.url;
      if (!url) throw new Error('No image came back');
      setBroken(false);
      onChange(url);
      toast.success('Image uploaded');
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: { message?: string } } };
      // 503 is the server saying image hosting is not set up. That is not
      // something a shop owner can fix or should be asked to decode, so it
      // gets the one instruction that will actually work for them.
      if (err.response?.status === 503) {
        toast.error('Uploads are not switched on yet. Paste a link to your image instead.');
        setShowLink(true);
      } else {
        toast.error(err.response?.data?.message || 'Upload failed');
      }
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div>
      <label className="form-label">
        {label} <span className="text-gray-400 font-normal">(optional)</span>
      </label>

      {value ? (
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="relative aspect-[16/7] bg-gray-50">
            {broken ? (
              // A link that does not resolve is worth saying out loud: saved as
              // it is, the shop front would silently fall back to its colour
              // and the owner would think the picture was showing.
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                <p className="text-sm font-semibold text-red-600">That image would not load</p>
                <p className="text-xs text-gray-500 mt-1">
                  Your shop will show your colour instead. Check the link, or upload the picture.
                </p>
              </div>
            ) : (
              <img
                src={value}
                alt=""
                className="w-full h-full object-cover"
                onError={() => setBroken(true)}
                onLoad={() => setBroken(false)}
                // The mirror of the cached-image problem in ProductStage, and
                // it bites harder here: a link that fails fast — a bad domain,
                // say — has already failed by the time React attaches onError,
                // so the handler never runs and the owner is shown the
                // browser's broken-image glyph rather than the explanation.
                // At commit, complete with no width means it already failed.
                ref={el => {
                  if (el?.complete) setBroken(el.naturalWidth === 0);
                }}
              />
            )}
          </div>

          <div className="flex items-center gap-2 p-2.5 bg-white border-t border-gray-100">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="text-xs font-semibold text-gray-700 hover:text-gray-900 inline-flex items-center gap-1.5 disabled:opacity-60"
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
              Replace
            </button>
            <span className="text-gray-200">|</span>
            <button
              type="button"
              onClick={() => setShowLink(v => !v)}
              className="text-xs font-semibold text-gray-700 hover:text-gray-900 inline-flex items-center gap-1.5"
            >
              <Link2 className="w-3.5 h-3.5" /> Use a link
            </button>
            <button
              type="button"
              onClick={() => { setBroken(false); onChange(''); }}
              className="ml-auto text-xs font-semibold text-red-500 hover:text-red-700 inline-flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full border-2 border-dashed border-gray-200 rounded-xl py-7 px-4 text-sm text-gray-500
            hover:border-gray-300 hover:bg-gray-50 transition-colors flex flex-col items-center gap-2 disabled:opacity-60"
        >
          {uploading ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
              Uploading…
            </>
          ) : (
            <>
              <ImagePlus className="w-6 h-6 text-gray-400" />
              <span className="font-medium text-gray-700">Upload an image</span>
              <span className="text-xs text-gray-400">JPEG, PNG or WebP — up to 5MB</span>
            </>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={e => e.target.files?.[0] && upload(e.target.files[0])}
      />

      {!value && (
        <button
          type="button"
          onClick={() => setShowLink(v => !v)}
          className="mt-2 text-xs font-semibold text-gray-500 hover:text-gray-800 inline-flex items-center gap-1.5"
        >
          <Link2 className="w-3.5 h-3.5" /> …or paste a link instead
        </button>
      )}

      {showLink && (
        <input
          className="form-input mt-2"
          placeholder="https://…"
          value={value || ''}
          onChange={e => { setBroken(false); onChange(e.target.value.trim()); }}
        />
      )}

      {hint && <p className="text-xs text-gray-400 mt-1.5">{hint}</p>}
    </div>
  );
}
