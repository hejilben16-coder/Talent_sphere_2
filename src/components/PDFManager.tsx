import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  FileText,
  Trash2,
  RefreshCw,
  Search,
  Eye,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { PDFDocument } from '../types';

interface PDFManagerProps {
  token: string;
}

export const PDFManager: React.FC<PDFManagerProps> = ({ token }) => {
  const [documents, setDocuments] = useState<PDFDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<PDFDocument | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/documents');
      if (!res.ok) throw new Error('Failed to load documents');
      const data = await res.json();
      setDocuments(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    setSuccessMsg(null);

    let uploadedCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isPdf =
        file.name.toLowerCase().endsWith('.pdf') ||
        (file.type && file.type.includes('pdf')) ||
        file.type === 'application/octet-stream' ||
        file.type === '';

      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const resStr = reader.result as string;
            const base64Data = resStr.includes(',') ? resStr.split(',')[1] : resStr;
            resolve(base64Data);
          };
          reader.onerror = () => reject(new Error('Failed to read file from local disk.'));
          reader.readAsDataURL(file);
        });

        const res = await fetch('/api/documents/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            fileName: file.name,
            fileBase64: base64
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Failed to process ${file.name}`);
        }

        uploadedCount++;
      } catch (err: any) {
        setError(err.message || `Error uploading ${file.name}`);
      }
    }

    if (uploadedCount > 0) {
      setSuccessMsg(`Successfully processed and indexed ${uploadedCount} PDF document(s) into vector memory.`);
      setTimeout(() => setSuccessMsg(null), 6000);
      fetchDocuments();
    }

    setUploading(false);
  };

  const handleDelete = async (docId: string, docName: string) => {
    if (!confirm(`Are you sure you want to delete "${docName}" from the RAG knowledge base?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/documents/${docId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete document');
      fetchDocuments();
      if (selectedDoc?.id === docId) setSelectedDoc(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const filteredDocs = documents.filter((d) =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Header Info Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-white border border-slate-200/90 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs tracking-wider uppercase mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Vector Store & RAG Knowledge Engine</span>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">PDF Knowledge Base Store</h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Upload course PDFs to automatically chunk text, generate vector embeddings, and empower the RAG Assistant & Exam Generator with verified source knowledge.
            </p>
          </div>
          <button
            onClick={fetchDocuments}
            disabled={loading}
            className="self-start md:self-auto px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-2 border border-slate-200 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync Vector Store</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Dropzone */}
      <div className="relative p-8 rounded-3xl border-2 border-dashed border-indigo-200 bg-indigo-50/40 hover:bg-indigo-50/80 transition text-center group cursor-pointer shadow-xs">
        <input
          type="file"
          multiple
          accept="application/pdf"
          onChange={(e) => handleFileUpload(e.target.files)}
          className="absolute inset-0 opacity-0 cursor-pointer z-10"
        />
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center group-hover:scale-110 transition shadow-md shadow-indigo-100">
            {uploading ? (
              <RefreshCw className="w-7 h-7 animate-spin" />
            ) : (
              <UploadCloud className="w-7 h-7" />
            )}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">
              {uploading ? 'Processing & Extracting PDF Knowledge Chunks...' : 'Click to upload or drag & drop PDFs'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Supports multiple PDF files with automatic vector indexing
            </p>
          </div>
        </div>
      </div>

      {/* Documents Table Section */}
      <div className="rounded-3xl bg-white border border-slate-200/90 p-6 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search uploaded PDFs by filename..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 text-xs font-medium focus:outline-none focus:bg-white focus:border-indigo-600 transition"
            />
          </div>
          <div className="text-xs text-slate-500 font-semibold">
            Total PDFs: <span className="text-indigo-600 font-extrabold">{documents.length}</span>
          </div>
        </div>

        {filteredDocs.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs font-medium">
            <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
            No PDF documents found in knowledge base.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="text-[11px] uppercase tracking-wider text-slate-500 bg-slate-50 font-bold">
                <tr>
                  <th className="py-3 px-4 rounded-l-xl">Document Title</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">Pages</th>
                  <th className="py-3 px-4">Knowledge Chunks</th>
                  <th className="py-3 px-4">Uploaded</th>
                  <th className="py-3 px-4 rounded-r-xl text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-800 flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span className="truncate max-w-xs">{doc.name}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500">{formatBytes(doc.size)}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-500">{doc.pageCount}</td>
                    <td className="py-3.5 px-4 font-mono text-indigo-600 font-bold">
                      {doc.chunkCount}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(doc.uploadedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => setSelectedDoc(doc)}
                        className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition"
                        title="Preview Summary & Metadata"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id, doc.name)}
                        className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition"
                        title="Delete from RAG Store"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Document Preview Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-lg rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-indigo-700 font-extrabold text-sm">
                <FileText className="w-5 h-5 text-indigo-600" />
                <span className="truncate max-w-xs">{selectedDoc.name}</span>
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold"
              >
                Close
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 block font-bold">Total Pages</span>
                  <span className="font-extrabold text-slate-800 text-sm">{selectedDoc.pageCount}</span>
                </div>
                <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-100">
                  <span className="text-indigo-700 block font-bold">Extracted Chunks</span>
                  <span className="font-extrabold text-indigo-800 text-sm">{selectedDoc.chunkCount}</span>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-800 block mb-1">AI Generated Summary</span>
                <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl leading-relaxed border border-slate-200">
                  {selectedDoc.summary || 'Summary unavailable for this document.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
