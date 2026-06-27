'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import api from '@/lib/api';
import { toast } from '@/components/ui';

const MAX_IMAGES = 8;
const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

interface ProductImageUploadProps {
  images: string[];
  onChange: (images: string[]) => void;
  disabled?: boolean;
}

export default function ProductImageUpload({ images, onChange, disabled }: ProductImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const remaining = MAX_IMAGES - images.length;

  const uploadFiles = async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (!list.length) {
      toast.error('Please choose image files only');
      return;
    }
    if (list.length > remaining) {
      toast.error(`You can add up to ${MAX_IMAGES} images (${remaining} slot(s) left)`);
      return;
    }

    const formData = new FormData();
    list.forEach((file) => formData.append('images', file));

    setUploading(true);
    try {
      const res = await api.post('/uploads/product-images', formData);
      const urls = (res.data.data || []).map((item: { url: string }) => item.url).filter(Boolean);
      onChange([...images, ...urls]);
      toast.success(`${urls.length} image(s) uploaded`);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Image upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <label className="form-label mb-0">Product Images</label>
        <span className="text-xs text-gray-400">{images.length}/{MAX_IMAGES}</span>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {images.map((src, i) => (
            <div key={`${src}-${i}`} className="relative aspect-square rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
              <img src={src} alt={`Product ${i + 1}`} className="w-full h-full object-cover" />
              {i === 0 && (
                <span className="absolute top-1 left-1 text-[10px] font-semibold bg-black/60 text-white px-1.5 py-0.5 rounded">
                  Cover
                </span>
              )}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute top-1 right-1 p-1 rounded-full bg-white/90 text-red-500 hover:bg-white shadow"
                  title="Remove image"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {remaining > 0 && !disabled && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            multiple
            className="hidden"
            onChange={(e) => e.target.files && uploadFiles(e.target.files)}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="w-full border-2 border-dashed border-gray-200 rounded-xl py-6 px-4 text-sm text-gray-500 hover:border-blue-300 hover:bg-blue-50/50 transition-colors flex flex-col items-center gap-2 disabled:opacity-60"
          >
            {uploading ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                Uploading to Cloudinary…
              </>
            ) : (
              <>
                <ImagePlus className="w-6 h-6 text-blue-600" />
                <span>Click to upload images</span>
                <span className="text-xs text-gray-400">JPEG, PNG, WebP, GIF — up to 5MB each</span>
              </>
            )}
          </button>
        </>
      )}
    </div>
  );
}
