'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { publicApi } from '@/lib/api';
import { ExternalLink, BookOpen } from 'lucide-react';

export default function StorefrontApiDocsPage() {
  const [docs, setDocs] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    publicApi.get('/storefront/docs')
      .then((r) => setDocs(r.data.data))
      .catch(() => setError('Could not load API documentation.'));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-[#0D3B6E] rounded-xl flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">{docs?.title || 'Storefront API'}</h1>
            <p className="text-sm text-gray-500">Headless ecommerce integration reference</p>
          </div>
        </div>

        {error && <p className="text-red-600 bg-red-50 p-4 rounded-xl">{error}</p>}

        {docs && (
          <div className="space-y-6">
            <div className="card">
              <p className="text-sm text-gray-600 mb-2"><strong>Base URL:</strong> <code className="bg-gray-100 px-2 py-0.5 rounded">{docs.base_url}</code></p>
              <p className="text-sm text-gray-500">{docs.authentication}</p>
            </div>

            <div className="card">
              <h2 className="font-bold text-gray-900 mb-4">Endpoints</h2>
              <div className="space-y-3">
                {docs.endpoints?.map((ep: any, i: number) => (
                  <div key={i} className="border border-gray-100 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">{ep.method}</span>
                      <code className="text-sm text-gray-800">{ep.path}</code>
                    </div>
                    <p className="text-sm text-gray-600">{ep.description}</p>
                    {ep.body && <p className="text-xs text-gray-400 mt-1 font-mono">Body: {ep.body}</p>}
                  </div>
                ))}
              </div>
            </div>

            {docs.webhooks?.length > 0 && (
              <div className="card">
                <h2 className="font-bold text-gray-900 mb-3">Webhooks</h2>
                {docs.webhooks.map((wh: any, i: number) => (
                  <div key={i} className="text-sm text-gray-600">
                    <span className="font-bold text-blue-800">{wh.method}</span> {wh.path} — {wh.description}
                  </div>
                ))}
              </div>
            )}

            <Link href="/" className="inline-flex items-center gap-2 text-sm text-[#0D3B6E] font-semibold hover:underline">
              <ExternalLink className="w-4 h-4" /> Back to GEMS
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
