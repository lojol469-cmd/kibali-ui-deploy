import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Send, FileText, Upload, Globe, MapPin,
  Loader2, Trash2, Image as ImageIcon, Search, Brain, ChevronDown, ChevronUp, User,
  Database, Clock, TrendingUp, AlertCircle, CheckCircle, Zap
} from 'lucide-react';

const API_BASE = "https://belikanm-kibali-api.hf.space";
const LOGO_PATH = "/kibali_logo.svg";

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState({
    doc_chunks: 0,
    memory_entries: 0,
    current_subject: null,
    subject_message_count: 0
  });
  const [showThinking, setShowThinking] = useState({});
  const [uploadProgress, setUploadProgress] = useState(null);
  const scrollRef = useRef(null);
  const pollingInterval = useRef(null);

  // Récupération du status backend au démarrage et périodiquement
  useEffect(() => {
    fetchStatus();
    pollingInterval.current = setInterval(fetchStatus, 10000); // Toutes les 10 secondes
    
    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await axios.get(`${API_BASE}/status`, { timeout: 5000 });
      setStatus(response.data);
    } catch (error) {
      console.error("Erreur récupération status:", error);
    }
  };

  // Auto-scroll vers le bas
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Envoi du message
  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = { role: "user", content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE}/chat`, {
        messages: [...messages, userMsg],
        latitude: 0.4061,
        longitude: 9.4673,
        city: "Libreville",
        thinking_mode: true
      }, {
        timeout: 120000 // 120 secondes pour les requêtes complexes
      });

      const aiResponse = response.data.response || "Réponse reçue du serveur.";
      const aiImages = response.data.images || [];
      const contextInfo = response.data.context_info || {};

      setMessages(prev => [...prev, {
        role: "assistant",
        content: aiResponse,
        images: aiImages,
        context_info: contextInfo,
        timestamp: new Date().toISOString()
      }]);

      // Mise à jour du status après la réponse
      fetchStatus();
    } catch (error) {
      console.error("Erreur lors de l'appel au backend:", error);
      let errorMsg = "Erreur : impossible de contacter le serveur IA.";
      
      if (error.code === 'ERR_NETWORK') {
        errorMsg = "⚠️ Serveur injoignable. Vérifiez que votre backend est lancé sur http://localhost:8000";
      } else if (error.code === 'ECONNABORTED') {
        errorMsg = "⏱️ Timeout : la requête a pris trop de temps. Le modèle est peut-être surchargé.";
      } else if (error.response?.status === 400) {
        errorMsg = `❌ Erreur de requête : ${error.response.data.detail || 'Format invalide'}`;
      } else if (error.response?.status === 500) {
        errorMsg = "🔥 Erreur serveur interne. Vérifiez les logs du backend.";
      } else if (error.response?.data?.detail) {
        errorMsg = `Erreur serveur : ${error.response.data.detail}`;
      }

      setMessages(prev => [...prev, {
        role: "assistant",
        content: errorMsg,
        error: true,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Upload de fichiers PDF avec feedback de progression
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setUploading(true);
    setUploadProgress({ current: 0, total: files.length });

    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    try {
      const res = await axios.post(`${API_BASE}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 180000, // 3 minutes pour les gros PDFs
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(prev => ({ ...prev, percent: percentCompleted }));
        }
      });

      const chunksAdded = res.data.chunks_added || 0;
      const filesProcessed = res.data.files_processed || 0;
      const totalChunks = res.data.total_doc_chunks || 0;

      // Mise à jour du status immédiate
      setStatus(prev => ({ ...prev, doc_chunks: totalChunks }));

      setMessages(prev => [...prev, {
        role: "assistant",
        content: `✅ **Import réussi !**\n\n📄 ${filesProcessed} document(s) traité(s)\n📊 ${chunksAdded} nouveaux segments ajoutés\n💾 Total en base : **${totalChunks} chunks**\n\nVous pouvez maintenant poser des questions sur ces documents !`,
        success: true,
        timestamp: new Date().toISOString()
      }]);

      // Refresh complet du status
      fetchStatus();
    } catch (err) {
      console.error("Erreur upload:", err);
      let errorMsg = "❌ Échec de l'import des documents.";
      
      if (err.code === 'ECONNABORTED') {
        errorMsg += " Timeout : les fichiers sont peut-être trop volumineux.";
      } else if (err.response?.data?.detail) {
        errorMsg += ` Détails : ${err.response.data.detail}`;
      }

      setMessages(prev => [...prev, {
        role: "assistant",
        content: errorMsg,
        error: true,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setUploading(false);
      setUploadProgress(null);
      e.target.value = '';
    }
  };

  // Réinitialisation du chat ET de la mémoire
  const handleReset = async () => {
    if (!window.confirm("Voulez-vous réinitialiser la conversation ET effacer la mémoire du modèle ?")) {
      return;
    }

    try {
      // Appeler l'endpoint de clear memory
      await axios.post(`${API_BASE}/clear-memory`, {}, { timeout: 5000 });
      setMessages([]);
      fetchStatus();
      
      setMessages([{
        role: "assistant",
        content: "✅ Conversation et mémoire réinitialisées avec succès.",
        success: true,
        timestamp: new Date().toISOString()
      }]);
    } catch (error) {
      console.error("Erreur lors de la réinitialisation:", error);
      setMessages([{
        role: "assistant",
        content: "⚠️ Chat réinitialisé, mais impossible de contacter le serveur pour effacer la mémoire.",
        error: true
      }]);
    }
  };

  // Toggle thinking pour chaque message
  const toggleThinking = (msgIndex) => {
    setShowThinking(prev => ({ ...prev, [msgIndex]: !prev[msgIndex] }));
  };

  // Formatage du temps relatif
  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return "";
    const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
    if (seconds < 60) return "à l'instant";
    if (seconds < 3600) return `il y a ${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `il y a ${Math.floor(seconds / 3600)}h`;
    return `il y a ${Math.floor(seconds / 86400)}j`;
  };

  // Styles centralisés
  const styles = {
    container: { display: 'flex', height: '100vh', backgroundColor: '#020617', color: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif' },
    sidebar: { width: '340px', backgroundColor: '#0f172a', borderRight: '1px solid #1e293b', display: 'flex', flexDirection: 'column', overflowY: 'auto' },
    main: { flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', background: 'radial-gradient(circle at 50% 0%, #1e293b 0%, #020617 100%)' },
    messageArea: { flex: 1, overflowY: 'auto', padding: '2rem 10% 2rem 10%' },
    userBubble: { backgroundColor: '#059669', color: 'white', padding: '1rem 1.25rem', borderRadius: '1.25rem 1.25rem 0.25rem 1.25rem', boxShadow: '0 4px 15px rgba(5, 150, 105, 0.2)' },
    aiBubble: { backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f1f5f9', padding: '1rem 1.25rem', borderRadius: '1.25rem 1.25rem 1.25rem 0.25rem', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' },
    successBubble: { backgroundColor: '#064e3b', border: '1px solid #059669', color: '#d1fae5' },
    errorBubble: { backgroundColor: '#7f1d1d', border: '1px solid #991b1b', color: '#fca5a5' },
    inputContainer: { padding: '2rem', background: 'linear-gradient(to top, #020617 70%, transparent)' },
    inputWrapper: { display: 'flex', alignItems: 'center', backgroundColor: 'rgba(30, 41, 59, 0.7)', backdropFilter: 'blur(20px)', border: '1px solid #334155', borderRadius: '1.5rem', padding: '0.6rem 1.2rem', maxWidth: '900px', margin: '0 auto' },
    inputField: { flex: 1, background: 'transparent', border: 'none', color: 'white', padding: '0.8rem', outline: 'none', fontSize: '1rem' },
    sendBtn: { backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '1rem', width: '45px', height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' },
    toolBadge: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', backgroundColor: '#020617', padding: '6px 12px', borderRadius: '10px', border: '1px solid #1e293b', color: '#94a3b8' },
    statCard: { backgroundColor: 'rgba(2, 6, 23, 0.5)', borderRadius: '1rem', padding: '1rem', border: '1px solid #1e293b', marginBottom: '0.8rem' }
  };

  return (
    <div style={styles.container}>
      {/* SIDEBAR */}
      <aside style={styles.sidebar}>
        <div style={{ padding: '2rem', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '45px', height: '45px', backgroundColor: '#1e293b', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #334155' }}>
            <img src={LOGO_PATH} alt="K" style={{ width: '30px', height: '30px', objectFit: 'contain' }} onError={(e) => e.target.style.display = 'none'} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.3rem', fontWeight: '900', margin: 0, letterSpacing: '-0.5px' }}>
              Kibali <span style={{ color: '#10b981' }}>AI</span>
            </h1>
            <p style={{ fontSize: '10px', color: '#475569', margin: 0, marginTop: '4px', fontWeight: '700' }}>
              v1.0 • {status.status === 'ready' ? '🟢 ONLINE' : '🔴 OFFLINE'}
            </p>
          </div>
        </div>

        <div style={{ padding: '2rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Upload de documents */}
          <div>
            <h2 style={{ fontSize: '11px', color: '#475569', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '1rem', fontWeight: '800' }}>
              📚 Documents
            </h2>
            <label style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '130px',
              border: uploading ? '2px solid #10b981' : '2px dashed #1e293b',
              borderRadius: '1.5rem',
              cursor: uploading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s',
              backgroundColor: uploading ? 'rgba(16, 185, 129, 0.05)' : '#020617',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {uploading ? (
                <>
                  <Loader2 className="animate-spin" color="#10b981" size={32} />
                  <span style={{ fontSize: '12px', marginTop: '12px', color: '#10b981', fontWeight: '600' }}>
                    {uploadProgress?.percent ? `${uploadProgress.percent}%` : 'Traitement...'}
                  </span>
                  {uploadProgress?.total && (
                    <span style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
                      {uploadProgress.current}/{uploadProgress.total} fichiers
                    </span>
                  )}
                </>
              ) : (
                <>
                  <Upload color="#10b981" size={32} />
                  <span style={{ fontSize: '12px', marginTop: '12px', color: '#64748b', fontWeight: '500' }}>
                    Importer rapports PDF
                  </span>
                  <span style={{ fontSize: '10px', color: '#475569', marginTop: '4px' }}>
                    Plusieurs fichiers acceptés
                  </span>
                </>
              )}
              <input type="file" hidden multiple accept=".pdf" onChange={handleFileUpload} disabled={uploading} />
            </label>
          </div>

          {/* Statistiques enrichies */}
          <div>
            <h3 style={{ fontSize: '11px', color: '#475569', textTransform: 'uppercase', marginBottom: '1rem', fontWeight: '800', letterSpacing: '1.5px' }}>
              📊 Statistiques
            </h3>
            
            {/* Base de connaissances */}
            <div style={styles.statCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Database size={14} color="#10b981" /> Base documentaire
                </span>
                <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '15px' }}>
                  {status.doc_chunks || 0}
                </span>
              </div>
              <div style={{ fontSize: '10px', color: '#475569', marginTop: '6px' }}>
                segments vectorisés
              </div>
            </div>

            {/* Mémoire conversationnelle */}
            <div style={styles.statCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Brain size={14} color="#3b82f6" /> Mémoire active
                </span>
                <span style={{ color: '#3b82f6', fontWeight: 'bold', fontSize: '15px' }}>
                  {status.memory_entries || 0}
                </span>
              </div>
              <div style={{ fontSize: '10px', color: '#475569', marginTop: '6px' }}>
                échanges mémorisés
              </div>
            </div>

            {/* Contexte conversationnel */}
            {status.current_subject && (
              <div style={styles.statCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <TrendingUp size={14} color="#f59e0b" /> Sujet actuel
                  </span>
                  <span style={{ color: '#f59e0b', fontWeight: 'bold', fontSize: '15px' }}>
                    {status.subject_message_count}
                  </span>
                </div>
                <div style={{ fontSize: '10px', color: '#475569', marginTop: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {status.current_subject}
                </div>
              </div>
            )}

            {/* Localisation */}
            <div style={styles.statCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b', fontSize: '12px' }}>Position</span>
                <span style={{ color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600', fontSize: '13px' }}>
                  <MapPin size={14} color="#ef4444" /> Libreville
                </span>
              </div>
            </div>

            {/* Santé du système */}
            <div style={styles.statCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Zap size={14} color={status.torch_cuda_available ? '#10b981' : '#f59e0b'} /> GPU
                </span>
                <span style={{ color: status.torch_cuda_available ? '#10b981' : '#f59e0b', fontWeight: 'bold', fontSize: '11px' }}>
                  {status.torch_cuda_available ? 'ACTIVÉ' : 'CPU ONLY'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleReset}
          style={{
            margin: '2rem',
            background: '#020617',
            border: '1px solid #1e293b',
            color: '#475569',
            padding: '14px',
            borderRadius: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            fontWeight: '700',
            fontSize: '12px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.target.style.borderColor = '#ef4444';
            e.target.style.color = '#ef4444';
          }}
          onMouseLeave={(e) => {
            e.target.style.borderColor = '#1e293b';
            e.target.style.color = '#475569';
          }}
        >
          <Trash2 size={16} /> RÉINITIALISER TOUT
        </button>
      </aside>

      {/* MAIN CONTENT */}
      <main style={styles.main}>
        <div style={styles.messageArea}>
          {messages.length === 0 && (
            <div style={{ height: '80%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
              <div style={{
                width: '100px',
                height: '100px',
                backgroundColor: '#0f172a',
                borderRadius: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '2rem',
                border: '1px solid #334155',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
              }}>
                <img src={LOGO_PATH} alt="Kibali" style={{ width: '60px' }} onError={(e) => e.target.style.display = 'none'} />
              </div>
              <h2 style={{ fontSize: '2.5rem', fontWeight: '900', marginBottom: '0.8rem', letterSpacing: '-1px' }}>
                Bienvenue sur Kibali AI
              </h2>
              <p style={{ color: '#64748b', maxWidth: '450px', lineHeight: '1.7', fontSize: '1.1rem' }}>
                Assistant IA expert du Gabon avec mémoire contextuelle et analyse documentaire avancée.
              </p>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>{status.doc_chunks}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Chunks PDF</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3b82f6' }}>{status.memory_entries}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Mémoires</div>
                </div>
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: '3rem' }}>
              <div style={{ display: 'flex', gap: '1.2rem', maxWidth: '85%', flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
                <div style={{
                  width: '45px',
                  height: '45px',
                  borderRadius: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: m.role === 'user' ? '#059669' : m.error ? '#7f1d1d' : m.success ? '#064e3b' : '#1e293b',
                  flexShrink: 0,
                  border: '1px solid #334155'
                }}>
                  {m.role === 'user' ? (
                    <User size={24} color="white" />
                  ) : m.error ? (
                    <AlertCircle size={24} color="#ef4444" />
                  ) : m.success ? (
                    <CheckCircle size={24} color="#10b981" />
                  ) : (
                    <img src={LOGO_PATH} style={{ width: '28px' }} alt="K" onError={(e) => e.target.style.display = 'none'} />
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', width: '100%' }}>
                  {/* Informations contextuelles */}
                  {m.role === 'assistant' && !m.error && !m.success && m.context_info && (
                    <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.3)', borderRadius: '12px', padding: '10px 14px', border: '1px solid #1e293b' }}>
                      <button
                        onClick={() => toggleThinking(i)}
                        style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: '700', textTransform: 'uppercase', width: '100%', justifyContent: 'space-between' }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Brain size={14} color="#10b981" /> Intelligence contextuelle
                        </span>
                        {showThinking[i] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      
                      {showThinking[i] && (
                        <>
                          <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                            <div style={styles.toolBadge}>
                              <Globe size={13} color="#3b82f6" /> Web Search
                              {m.context_info.web_results > 0 && <span style={{ color: '#10b981' }}>• {m.context_info.web_results}</span>}
                            </div>
                            <div style={styles.toolBadge}>
                              <FileText size={13} color="#10b981" /> PDF Vault
                              {m.context_info.rag_sources?.length > 0 && <span style={{ color: '#10b981' }}>• {m.context_info.rag_sources.length}</span>}
                            </div>
                            <div style={styles.toolBadge}>
                              <Brain size={13} color="#f59e0b" /> Mémoire
                              {m.context_info.memory_used > 0 && <span style={{ color: '#10b981' }}>• {m.context_info.memory_used}</span>}
                            </div>
                            <div style={styles.toolBadge}>
                              <MapPin size={13} color="#ef4444" /> Geo-Context
                            </div>
                          </div>

                          {/* Détails du contexte */}
                          <div style={{ marginTop: '12px', fontSize: '11px', color: '#64748b', padding: '10px', backgroundColor: '#020617', borderRadius: '8px' }}>
                            {m.context_info.subject_keywords?.length > 0 && (
                              <div style={{ marginBottom: '8px' }}>
                                <strong style={{ color: '#94a3b8' }}>Mots-clés du sujet :</strong> {m.context_info.subject_keywords.join(', ')}
                              </div>
                            )}
                            {m.context_info.message_count > 0 && (
                              <div style={{ marginBottom: '8px' }}>
                                <strong style={{ color: '#94a3b8' }}>Messages sur ce sujet :</strong> {m.context_info.message_count}
                              </div>
                            )}
                            {m.context_info.rag_sources?.length > 0 && (
                              <div>
                                <strong style={{ color: '#94a3b8' }}>Sources documentaires :</strong> {m.context_info.rag_sources.join(', ')}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Bulle de message */}
                  <div style={{
                    ...(m.role === 'user' ? styles.userBubble : m.error ? styles.errorBubble : m.success ? styles.successBubble : styles.aiBubble),
                    position: 'relative'
                  }}>
                    <p style={{ margin: 0, fontSize: '1.05rem', lineHeight: '1.6', fontWeight: '400', whiteSpace: 'pre-wrap' }}>
                      {m.content}
                    </p>
                    {m.timestamp && (
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={10} /> {formatTimeAgo(m.timestamp)}
                      </div>
                    )}
                  </div>

                  {/* Images */}
                  {m.images && m.images.length > 0 && (
                    <div style={{ display: 'flex', gap: '12px', marginTop: '8px', overflowX: 'auto', paddingBottom: '10px' }}>
                      {m.images.map((img, idx) => (
                        <div key={idx} style={{ flexShrink: 0, position: 'relative', borderRadius: '1.2rem', overflow: 'hidden', border: '2px solid #334155', backgroundColor: '#0f172a' }}>
                          <img 
                            src={img} 
                            alt={`Image ${idx + 1}`} 
                            style={{ height: '180px', width: '280px', objectFit: 'cover' }}
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.parentElement.innerHTML = '<div style="height:180px;width:280px;display:flex;align-items:center;justify-content:center;color:#64748b;font-size:12px;"><ImageIcon size={24} /> Image indisponible</div>';
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'center' }}>
              <div style={{
                width: '45px',
                height: '45px',
                borderRadius: '14px',
                backgroundColor: '#1e293b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #334155'
              }}>
                <Loader2 className="animate-spin" color="#10b981" size={24} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ color: '#f1f5f9', fontSize: '15px', fontWeight: '600' }}>
                  Kibali analyse votre demande...
                </div>
                <div style={{ color: '#64748b', fontSize: '12px' }}>
                  Recherche multi-sources • Traitement vectoriel • Génération contextuelle
                </div>
              </div>
            </div>
          )}

          <div ref={scrollRef} />
        </div>

        <div style={styles.inputContainer}>
          <div style={styles.inputWrapper}>
            <Search size={22} color="#475569" style={{ marginRight: '10px' }} />
            <input
              style={styles.inputField}
              placeholder="Posez votre question sur le Gabon, vos documents ou l'actualité..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={loading}
            />
            <button
              style={{ 
                ...styles.sendBtn, 
                opacity: input.trim() && !loading ? 1 : 0.4,
                cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                transform: input.trim() && !loading ? 'scale(1)' : 'scale(0.95)'
              }}
              onClick={handleSend}
              disabled={loading || !input.trim()}
              onMouseEnter={(e) => {
                if (input.trim() && !loading) {
                  e.target.style.backgroundColor = '#059669';
                  e.target.style.transform = 'scale(1.05)';
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#10b981';
                e.target.style.transform = 'scale(1)';
              }}
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
            </button>
          </div>

          <div style={{ textAlign: 'center', marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
            <p style={{
              color: '#334155',
              fontSize: '10px',
              fontWeight: '800',
              letterSpacing: '2px',
              margin: 0
            }}>
              GABONESE SOVEREIGN ARTIFICIAL INTELLIGENCE
            </p>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '9px', color: '#1e293b', fontWeight: '700' }}>
              <span>SYSTEM KIBALI-1</span>
              <span>•</span>
              <span>SETRAF-GABON</span>
              <span>•</span>
              <span style={{ color: status.torch_cuda_available ? '#10b981' : '#f59e0b' }}>
                {status.torch_cuda_available ? '⚡ GPU ACCELERATED' : '⚙️ CPU MODE'}
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;