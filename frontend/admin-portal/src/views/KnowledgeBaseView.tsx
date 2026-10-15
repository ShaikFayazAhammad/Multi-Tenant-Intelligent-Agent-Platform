import React, { useState, useEffect } from 'react';
import { adminApi } from '../services/api';
import type { KnowledgeDoc, Project } from '../types';

interface KnowledgeBaseViewProps {
  selectedProject: Project | undefined;
  onMessage: (msg: string, type?: 'success' | 'error') => void;
}

export default function KnowledgeBaseView({ selectedProject, onMessage }: KnowledgeBaseViewProps) {
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [loading, setLoading] = useState(false);

  // Web Crawler
  const [crawlUrl, setCrawlUrl] = useState('');
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlResult, setCrawlResult] = useState<KnowledgeDoc | null>(null);

  // File Upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (selectedProject?.id) loadDocs(selectedProject.id);
  }, [selectedProject?.id]);

  const loadDocs = async (projId: string) => {
    setLoading(true);
    try {
      const data = await adminApi.getKbDocs(projId);
      setDocs(data);
    } catch { }
    finally { setLoading(false); }
  };

  const handleCrawl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject?.id || !crawlUrl.trim()) return;
    setIsCrawling(true);
    setCrawlResult(null);
    try {
      const res = await adminApi.crawlUrl(selectedProject.id, crawlUrl.trim());
      setCrawlResult(res);
      setCrawlUrl('');
      loadDocs(selectedProject.id);
      onMessage(`✅ Crawled & indexed ${res.doc_metadata?.chunks_count || 1} semantic chunks`, 'success');
    } catch (err: any) {
      onMessage(err?.response?.data?.detail || 'Web crawl failed', 'error');
    } finally { setIsCrawling(false); }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject?.id || !selectedFile) return;
    setIsUploading(true);
    setUploadProgress(0);
    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress((p) => Math.min(p + 20, 85));
      }, 200);
      await adminApi.uploadKbDoc(selectedProject.id, selectedFile);
      clearInterval(progressInterval);
      setUploadProgress(100);
      setTimeout(() => { setUploadProgress(0); setSelectedFile(null); }, 1000);
      loadDocs(selectedProject.id);
      onMessage(`✅ "${selectedFile.name}" uploaded & indexed into vector store`, 'success');
    } catch (err: any) {
      onMessage(err?.response?.data?.detail || 'Upload failed', 'error');
      setUploadProgress(0);
    } finally { setIsUploading(false); }
  };

  if (!selectedProject) {
    return (
      <div className="empty-state" style={{ marginTop: 60 }}>
        <div className="empty-state-icon">📚</div>
        <div className="empty-state-title">No agent selected</div>
        <div className="empty-state-desc">Select an agent from the header to manage its knowledge base</div>
      </div>
    );
  }

  const totalChunks = docs.reduce((s, d) => s + (d.doc_metadata?.chunks_count || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="section-header">
        <div>
          <div className="section-title">Knowledge Base</div>
          <div className="section-subtitle">
            Vector index for:{' '}
            <strong style={{ color: 'var(--color-text-accent)' }}>{selectedProject.name}</strong>
            {' '}— Collection: <code style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>proj_{selectedProject.id.slice(0,8)}</code>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="badge badge-indigo">{docs.length} Documents</div>
          <div className="badge badge-sky">{totalChunks} Chunks</div>
        </div>
      </div>

      <div className="grid-2">
        {/* Web Crawler */}
        <div className="card" style={{ borderColor: 'rgba(99,102,241,0.2)' }}>
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>🌐</span> RAG Web Crawler
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
              Fetch any webpage, extract clean text, chunk semantically, and index into ChromaDB vector store
            </div>
          </div>
          <form onSubmit={handleCrawl} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Target Webpage URL</label>
              <input
                className="form-input"
                type="url"
                placeholder="https://en.wikipedia.org/wiki/Retail_banking"
                value={crawlUrl}
                onChange={(e) => setCrawlUrl(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={isCrawling}
            >
              {isCrawling ? (
                <><div className="spinner" /> Crawling & Indexing…</>
              ) : (
                '🌐 Crawl & Index to Vector Store'
              )}
            </button>

            {crawlResult && (
              <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#34d399', marginBottom: 6 }}>
                  ✓ Successfully Indexed
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                  <div>Title: {crawlResult.doc_metadata?.title || crawlResult.filename}</div>
                  <div>Semantic Chunks: <strong style={{ color: '#34d399' }}>{crawlResult.doc_metadata?.chunks_count || 1}</strong></div>
                  {crawlResult.doc_metadata?.snippet && (
                    <div style={{ marginTop: 6, padding: '8px', background: 'rgba(0,0,0,0.3)', borderRadius: 6, fontStyle: 'italic', lineHeight: 1.5 }}>
                      "{crawlResult.doc_metadata.snippet.slice(0, 200)}…"
                    </div>
                  )}
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Document Upload */}
        <div className="card">
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#818cf8', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>📄</span> Document File Ingestion
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
              Upload PDF, Markdown, or TXT policy documents. Content is auto-chunked and indexed.
            </div>
          </div>
          <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Drop Zone */}
            <div
              style={{
                border: `2px dashed ${selectedFile ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: 12, padding: '28px 20px', textAlign: 'center',
                background: selectedFile ? 'rgba(99,102,241,0.05)' : 'rgba(255,255,255,0.02)',
                transition: 'all 0.2s', cursor: 'pointer', position: 'relative',
              }}
              onClick={() => document.getElementById('kb-file-input')?.click()}
            >
              <input
                id="kb-file-input"
                type="file"
                style={{ display: 'none' }}
                accept=".txt,.md,.pdf,.csv"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
              {selectedFile ? (
                <>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{selectedFile.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
                    {(selectedFile.size / 1024).toFixed(1)} KB — Click to change
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.5 }}>📁</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Click to select file</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>PDF, TXT, Markdown, CSV supported</div>
                </>
              )}
            </div>

            {/* Progress */}
            {isUploading && uploadProgress > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 11, color: 'var(--color-text-muted)' }}>
                  <span>Uploading & indexing…</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${uploadProgress}%`, background: 'linear-gradient(90deg, #6366f1, #818cf8)' }} />
                </div>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={!selectedFile || isUploading}
            >
              {isUploading ? <><div className="spinner" /> Indexing…</> : '📤 Upload & Index to Vector Store'}
            </button>
          </form>
        </div>
      </div>

      {/* Indexed Documents */}
      <div className="card">
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>Indexed Knowledge Documents</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
              ChromaDB collection: <code style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--color-text-accent)' }}>proj_{selectedProject.id.slice(0, 8)}</code>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="badge badge-emerald">{docs.length} docs</div>
            <div className="badge badge-sky">{totalChunks} chunks</div>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
        ) : docs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📚</div>
            <div className="empty-state-title">No documents indexed yet</div>
            <div className="empty-state-desc">Use the web crawler or file uploader above to ingest your first knowledge document</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {docs.map((doc) => {
              const isWeb = doc.filename.startsWith('Web:');
              return (
                <div key={doc.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 14px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)',
                  gap: 12, transition: 'background 0.15s',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 8, flexShrink: 0,
                      background: isWeb ? 'rgba(14,165,233,0.12)' : 'rgba(99,102,241,0.12)',
                      border: `1px solid ${isWeb ? 'rgba(14,165,233,0.25)' : 'rgba(99,102,241,0.25)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                    }}>
                      {isWeb ? '🌐' : '📄'}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {doc.filename.replace('Web: ', '')}
                      </div>
                      <div style={{ display: 'flex', gap: 10, marginTop: 3, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                          {doc.doc_metadata?.chunks_count || 1} chunks
                        </span>
                        <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>·</span>
                        <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                          {(doc.file_size / 1024).toFixed(1)} KB
                        </span>
                        {doc.doc_metadata?.source && (
                          <><span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>·</span>
                          <span className={`badge badge-${isWeb ? 'sky' : 'indigo'}`} style={{ fontSize: 9 }}>{doc.doc_metadata.source}</span></>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="badge badge-emerald">{doc.status}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
