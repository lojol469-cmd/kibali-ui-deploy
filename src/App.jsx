import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { startRegistration } from '@simplewebauthn/browser';
import {
  Send, FileText, Upload, Globe, MapPin,
  Loader2, Trash2, Image as ImageIcon, Search, Brain, ChevronDown, ChevronUp, User,
  Database, Clock, TrendingUp, AlertCircle, CheckCircle, Zap, Lock
} from 'lucide-react';

const API_BASE = "https://belikanm-kibali-api.hf.space";
const AUTH_API = "https://kibali-iadeploy.onrender.com"; // ← Ton backend Render en ligne
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

  // --- AUTHENTIFICATION BIOMÉTRIQUE ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  const handleBiometricAuth = async () => {
    setAuthLoading(true);
    try {
      const username = "belikan"; // Tu peux le rendre dynamique plus tard

      // 1. Obtenir les options du backend
      const resp = await axios.post(`${AUTH_API}/auth/register-options`, {
        username
      });

      const options = resp.data;
      console.log("Options reçues du serveur :", options);

      // 2. Lancer l'authentification biométrique (CORRECTION CRITIQUE)
      const regResponse = await startRegistration({
        optionsJSON: options  // ← Syntaxe obligatoire pour @simplewebauthn/browser v9+
      });

      // 3. Envoyer la réponse au backend pour vérification
      const verifyResp = await axios.post(`${AUTH_API}/auth/register-verify`, {
        username,
        body: regResponse
      });

      if (verifyResp.data.verified) {
        setIsAuthenticated(true);
        alert("✅ Authentification Biométrique réussie ! Accès déverrouillé.");
      } else {
        alert("❌ Vérification échouée côté serveur.");
      }
    } catch (error) {
      console.error("❌ Erreur Auth Biométrique:", error);

      if (error.name === 'SecurityError') {
        alert("🔒 Erreur de sécurité : Le domaine du site ne correspond pas au RP_ID configuré sur le serveur. Vérifiez vos variables Render.");
      } else if (error.message?.includes('not supported')) {
        alert("🌐 WebAuthn non supporté ici. Assurez-vous d'être en HTTPS et sur le bon domaine.");
      } else {
        alert("❌ Erreur lors de l'authentification : " + (error.message || "Inconnue"));
      }
    } finally {
      setAuthLoading(false);
    }
  };

  // Récupération du status backend seulement après authentification
  useEffect(() => {
    if (isAuthenticated) {
      fetchStatus();
      pollingInterval.current = setInterval(fetchStatus, 10000);

      return () => {
        if (pollingInterval.current) clearInterval(pollingInterval.current);
      };
    }
  }, [isAuthenticated]);

  const fetchStatus = async () => {
    try {
      const response = await axios.get(`${API_BASE}/status`, { timeout: 5000 });
      setStatus(response.data);
    } catch (error) {
      console.error("Erreur récupération status:", error);
    }
  };

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // --- FONCTIONS CHAT (inchangées) ---
  const handleSend = async () => {
    // ... (ton code existant)
  };

  const handleFileUpload = async (e) => {
    // ... (ton code existant)
  };

  const handleReset = async () => {
    // ... (ton code existant)
  };

  const toggleThinking = (msgIndex) => {
    setShowThinking(prev => ({ ...prev, [msgIndex]: !prev[msgIndex] }));
  };

  const formatTimeAgo = (timestamp) => {
    // ... (ton code existant)
  };

  // Styles (inchangés)
  const styles = {
    // ... (tes styles existants)
  };

  // --- RENDU : ÉCRAN DE VERROUILLAGE OU INTERFACE COMPLÈTE ---
  if (!isAuthenticated) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#020617' }}>
        <div style={{ textAlign: 'center', padding: '3rem', background: '#0f172a', borderRadius: '2rem', border: '1px solid #1e293b', maxWidth: '420px' }}>
          <Lock size={60} color="#10b981" style={{ marginBottom: '1.5rem' }} />
          <h2 style={{ fontSize: '1.8rem', color: 'white', marginBottom: '1rem' }}>Accès Sécurisé Kibali</h2>
          <p style={{ color: '#64748b', marginBottom: '2rem' }}>
            Authentification biométrique requise<br />
            Face ID • Touch ID • Windows Hello • Empreinte
          </p>
          <button
            onClick={handleBiometricAuth}
            disabled={authLoading}
            style={{
              width: '100%',
              padding: '16px',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontWeight: 'bold',
              fontSize: '1.1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px'
            }}
          >
            {authLoading ? <Loader2 className="animate-spin" size={24} /> : <Zap size={24} />}
            {authLoading ? "Authentification en cours..." : "DÉVERROUILLER AVEC BIOMÉTRIE"}
          </button>
          <p style={{ fontSize: '10px', color: '#334155', marginTop: '2rem' }}>
            KIBALI-1 • IA SOUVERAINE GABONAISE • SETRAF-GABON
          </p>
        </div>
      </div>
    );
  }

  // --- INTERFACE COMPLÈTE UNE FOIS AUTHENTIFIÉE ---
  return (
    <div style={styles.container}>
      {/* TON SIDEBAR ET MAIN EXISTANTS ICI */}
      {/* ... tout ton code actuel de sidebar, messages, input, etc. ... */}
      
      {/* Exemple minimal si tu veux tester rapidement */}
      <div style={{ padding: '2rem', textAlign: 'center', color: 'white' }}>
        <h1>✅ Accès autorisé !</h1>
        <p>Bienvenue dans Kibali AI sécurisé par biométrie.</p>
        <p>Tu peux maintenant intégrer le reste de ton interface chat ici.</p>
      </div>
    </div>
  );
}

export default App;