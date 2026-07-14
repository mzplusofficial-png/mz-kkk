import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { initAdmin, sendPush, sendMulticast } from './notifications.js';
import { runPriorityDispatcher } from './services/priorityDispatcher.js';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Supabase and Admin Clients globally at the top level
const RAW_URL = process.env.VITE_SUPABASE_URL || '';
if (!RAW_URL) {
  console.error("[Server] VITE_SUPABASE_URL environment variable is not defined!");
}
const SUPABASE_URL = RAW_URL.replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
if (!SUPABASE_ANON_KEY) {
  console.error("[Server] VITE_SUPABASE_ANON_KEY environment variable is not defined!");
}
const supabase = createClient(SUPABASE_URL || 'https://placeholder-fill-env-vars.supabase.co', SUPABASE_ANON_KEY || 'placeholder');

const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn("[Server] SUPABASE_SERVICE_ROLE_KEY is not defined in environment! Falling back to PUBLIC ANON KEY.");
}
const supabaseAdmin = createClient(
  SUPABASE_URL || 'https://placeholder-fill-env-vars.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY || 'placeholder',
  {
    auth: { autoRefreshToken: false, persistSession: false }
  }
);

// Chemin d’écriture persistant pour les webhooks Chariow
const PULSES_FILE = path.join(process.cwd(), 'chariow_webhooks.json');

async function logChariowPulseToDisk(payload: any) {
  // 1. Écriture locale sur disque pour compatibilité et performance locale
  try {
    let pulses: any[] = [];
    if (fs.existsSync(PULSES_FILE)) {
      const content = fs.readFileSync(PULSES_FILE, 'utf-8');
      try {
        pulses = JSON.parse(content);
      } catch (e) {
        pulses = [];
      }
    }
    pulses.unshift({
      id: Math.random().toString(36).substring(2, 9),
      received_at: new Date().toISOString(),
      payload: payload
    });
    // Garder seulement les 100 derniers webhooks reçus
    if (pulses.length > 100) {
      pulses = pulses.slice(0, 100);
    }
    fs.writeFileSync(PULSES_FILE, JSON.stringify(pulses, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error logging chariow pulse to file:', err);
  }

  // 2. Synchronisation instantanée dans Supabase pour être lisible sur l'instance Netlify
  try {
    const { data, error } = await supabaseAdmin
      .from('platform_settings')
      .select('value')
      .eq('id', 'chariow_webhook_logs')
      .maybeSingle();

    let dbPulses: any[] = [];
    if (!error && data && Array.isArray(data.value)) {
      dbPulses = data.value;
    }

    const newLog = {
      id: Math.random().toString(36).substring(2, 9),
      received_at: new Date().toISOString(),
      payload: payload
    };

    dbPulses.unshift(newLog);
    if (dbPulses.length > 100) {
      dbPulses = dbPulses.slice(0, 100);
    }

    await supabaseAdmin
      .from('platform_settings')
      .upsert({ id: 'chariow_webhook_logs', value: dbPulses });
  } catch (err) {
    console.error('Error logging chariow pulse to Supabase platform_settings:', err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // LOGS DE DÉBOGAGE API
  app.use((req, res, next) => {
    if (req.url.startsWith('/api/')) {
      console.log(`[FIREBASE API] ${req.method} ${req.url}`);
    }
    next();
  });

  // Cache variables to prevent abusive Supabase reads and minimize egress
  let cachedIconBuffer: Buffer | null = null;
  let cachedIconTimestamp = 0;
  let cachedManifest: any = null;
  let cachedManifestTimestamp = 0;
  const ICON_CACHE_TTL = 15 * 60 * 1000;      // 15 minutes cache
  const MANIFEST_CACHE_TTL = 15 * 60 * 1000;  // 15 minutes cache

  // Dynamic Icon Route
  app.get('/icon.png', async (req, res) => {
    try {
      const now = Date.now();
      // 1. Env Variable Override Support
      const envIconUrl = process.env.VITE_APP_ICON_URL || process.env.APP_ICON_URL;
      if (envIconUrl) {
        const val = envIconUrl.trim();
        const isUrl = val.startsWith('http://') || val.startsWith('https://') || val.includes('drive.google.com') || val.includes('googleusercontent.com');
        const gDriveMatch = val.match(/\/d\/([a-zA-Z0-9_-]{15,120})/);
        const queryIdMatch = val.match(/[?&]id=([a-zA-Z0-9_-]{15,120})/);
        const justIdMatch = val.match(/^[a-zA-Z0-9_-]{19,80}$/);
        const gDriveId = (gDriveMatch && gDriveMatch[1]) || (queryIdMatch && queryIdMatch[1]) || (justIdMatch && justIdMatch[0]);

        if (isUrl || gDriveId) {
          let redirectUrl = val;
          if (gDriveId) {
            redirectUrl = `https://lh3.googleusercontent.com/d/${gDriveId}=w512`;
          }
          res.redirect(redirectUrl);
          return;
        }
      }

      // If cached in memory, return immediately with Cache-Control headers
      if (cachedIconBuffer && (now - cachedIconTimestamp < ICON_CACHE_TTL)) {
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Content-Length', cachedIconBuffer.length);
        res.setHeader('Cache-Control', 'public, max-age=86400, must-revalidate'); // 24 hours browser-side cache
        res.send(cachedIconBuffer);
        return;
      }

      const { data } = await supabase.from('mz_app_config').select('icon_base64').eq('id', 'main-config').maybeSingle();
      if (data?.icon_base64) {
        const val = data.icon_base64.trim();
        
        // Supporter les liens ou IDs Google Drive ou URLs classiques
        const isUrl = val.startsWith('http://') || val.startsWith('https://') || val.includes('drive.google.com') || val.includes('googleusercontent.com');
        const gDriveMatch = val.match(/\/d\/([a-zA-Z0-9_-]{15,120})/);
        const queryIdMatch = val.match(/[?&]id=([a-zA-Z0-9_-]{15,120})/);
        const justIdMatch = val.match(/^[a-zA-Z0-9_-]{19,80}$/);
        const gDriveId = (gDriveMatch && gDriveMatch[1]) || (queryIdMatch && queryIdMatch[1]) || (justIdMatch && justIdMatch[0]);

        if (isUrl || gDriveId) {
          let redirectUrl = val;
          if (gDriveId) {
            redirectUrl = `https://lh3.googleusercontent.com/d/${gDriveId}=w512`;
          }
          res.redirect(redirectUrl);
          return;
        }

        // Sinon décoder en Base64 classique
        const parts = val.split(',');
        const base64Data = parts.length > 1 ? parts[1] : parts[0];
        if (base64Data && base64Data.length > 100) {
          const img = Buffer.from(base64Data, 'base64');
          cachedIconBuffer = img;
          cachedIconTimestamp = now;

          res.setHeader('Content-Type', 'image/png');
          res.setHeader('Content-Length', img.length);
          res.setHeader('Cache-Control', 'public, max-age=86400, must-revalidate'); // 24 hours browser-side cache
          res.send(img);
          return;
        }
      }
      res.redirect('https://ui-avatars.com/api/?name=MZ&background=ca8a04&color=fff&size=512&format=png');
    } catch (error) {
      console.warn('[Proxy Icon] Database query failed or table does not exist. Redirecting to default avatar fallback:', error);
      res.redirect('https://ui-avatars.com/api/?name=MZ&background=ca8a04&color=fff&size=512&format=png');
    }
  });

  // Dynamic Manifest Route
  app.get('/manifest.json', async (req, res) => {
    try {
      const now = Date.now();
      if (cachedManifest && (now - cachedManifestTimestamp < MANIFEST_CACHE_TTL)) {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate'); // 1 hour browser cache
        res.send(JSON.stringify(cachedManifest));
        return;
      }

      const { data } = await supabase.from('mz_app_config').select('*').eq('id', 'main-config').maybeSingle();
      
      const customName = data?.app_name || 'MZ+ Elite';
      // Use the stable route for icons instead of raw base64 for better compatibility
      const iconUrl = '/icon.png?v=' + (data?.updated_at ? new Date(data.updated_at).getTime() : Date.now());

      const manifest = {
        "id": "mz-plus-elite-system",
        "name": customName,
        "short_name": customName.substring(0, 12),
        "description": "Système Élite - " + customName,
        "icons": [
          {
            "src": iconUrl,
            "sizes": "192x192",
            "type": "image/png",
            "purpose": "any"
          },
          {
            "src": iconUrl,
            "sizes": "512x512",
            "type": "image/png",
            "purpose": "maskable"
          }
        ],
        "start_url": "/",
        "display": "standalone",
        "background_color": "#000000",
        "theme_color": "#ca8a04",
        "scope": "/",
        "gcm_sender_id": "627912091228"
      };

      cachedManifest = manifest;
      cachedManifestTimestamp = now;

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
      res.send(JSON.stringify(manifest));
    } catch (error) {
      console.error('Manifest generation error, using memory fallback:', error);
      const fallbackManifest = {
        "id": "mz-plus-elite-system",
        "name": "Millionaire Zone Plus - Elite",
        "short_name": "MZ+ Elite",
        "description": "Système Élite Millionaire Zone Plus",
        "icons": [
          {
            "src": "/icon.png",
            "sizes": "192x192",
            "type": "image/png",
            "purpose": "any"
          },
          {
            "src": "/icon.png",
            "sizes": "512x512",
            "type": "image/png",
            "purpose": "maskable"
          }
        ],
        "start_url": "/",
        "display": "standalone",
        "background_color": "#000000",
        "theme_color": "#ca8a04",
        "scope": "/"
      };
      res.setHeader('Content-Type', 'application/json');
      res.json(fallbackManifest);
    }
  });

  // API Route for local-only physical uploads (no cloud storage, no database size usage)
  app.post('/api/admin/upload', express.raw({ type: '*/*', limit: '50mb' }), async (req, res) => {
    try {
      const fileNameHeader = req.headers['x-file-name'] as string;
      const filePathHeader = req.headers['x-file-path'] as string;

      if (!fileNameHeader && !filePathHeader) {
        return res.status(400).json({ error: "En-têtes d'upload manquants (x-file-name ou x-file-path)." });
      }

      const relativePath = filePathHeader || fileNameHeader;
      // Prevent directory traversal
      const safePath = relativePath.replace(/\.\./g, '');
      const fullPath = path.join(process.cwd(), 'public', safePath);

      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(fullPath, req.body);
      console.log(`[Admin Upload] Fichier enregistré localement avec succès : ${fullPath}`);

      const publicUrl = `/${safePath}`;
      return res.status(200).json({
        success: true,
        publicUrl: publicUrl
      });
    } catch (err: any) {
      console.error('[Admin Upload API] Exception attrapée:', err);
      return res.status(500).json({ error: err.message || 'Une erreur interne s’est produite.' });
    }
  });

  // Robust server-side replication helper for Google Drive files
  // This downloads the file safely, saves it in public/uploads/ and returns the local static URL /uploads/gdrive_FILE_ID.ext
  async function replicateGDriveFileOnServer(fileId: string, fileName?: string, accessToken?: string): Promise<string> {
    const safeId = fileId.replace(/[^a-zA-Z0-9_-]/g, '');
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Check if we already have a matching file in public/uploads/
    const existingFiles = fs.readdirSync(uploadDir);
    const matchingFile = existingFiles.find(f => f.startsWith(`gdrive_${safeId}`));
    if (matchingFile) {
      console.log(`[GDrive Replication Code] Found existing replicated static file: ${matchingFile}`);
      return `/uploads/${matchingFile}`;
    }

    console.log(`[GDrive Replication Code] Start downloading and replicating Google Drive file ${fileId} statically...`);
    let buffer: Buffer | null = null;
    let contentType = 'image/png';
    let successFetched = false;

    // 1. Authenticated Google Drive API Method
    if (accessToken) {
      try {
        const downloadUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`;
        const apiResponse = await fetch(downloadUrl, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (apiResponse.ok) {
          const arr = await apiResponse.arrayBuffer();
          buffer = Buffer.from(arr);
          contentType = apiResponse.headers.get('content-type') || 'image/png';
          successFetched = true;
          console.log(`[GDrive Replication Code] Authenticated download successful (${buffer.length} bytes)`);
        }
      } catch (e: any) {
        console.warn(`[GDrive Replication Code] Authenticated download failed:`, e.message);
      }
    }

    // 2. Anonymous fallbacks if auth fails or not provided
    if (!successFetched) {
      // Looks like an image -> lh3 image endpoint
      const looksLikeImage = fileName && (
        fileName.toLowerCase().endsWith('.png') ||
        fileName.toLowerCase().endsWith('.jpg') ||
        fileName.toLowerCase().endsWith('.jpeg') ||
        fileName.toLowerCase().endsWith('.gif') ||
        fileName.toLowerCase().endsWith('.webp')
      );

      if (looksLikeImage || !fileName) {
        try {
          const lh3Url = `https://lh3.googleusercontent.com/d/${fileId}`;
          const imgResponse = await fetch(lh3Url, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
          });
          if (imgResponse.ok) {
            const arr = await imgResponse.arrayBuffer();
            buffer = Buffer.from(arr);
            contentType = imgResponse.headers.get('content-type') || 'image/png';
            if (!contentType.includes('text/html')) {
              successFetched = true;
              console.log(`[GDrive Replication Code] Anonymous lh3 download successful (${buffer.length} bytes)`);
            }
          }
        } catch (e: any) {
          console.warn(`[GDrive Replication Code] lh3 download failed:`, e.message);
        }
      }

      // Generic direct docs download with confirmation parsing
      if (!successFetched) {
        try {
          const tryDocDownload = async (hasConfirmed = false, confirmToken = ''): Promise<{ buffer: Buffer; contentType: string } | null> => {
            let fetchUrl = `https://docs.google.com/uc?export=download&id=${fileId}`;
            if (hasConfirmed && confirmToken) {
              fetchUrl += `&confirm=${confirmToken}`;
            }
            const docResponse = await fetch(fetchUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': '*/*'
              }
            });

            if (!docResponse.ok) {
              throw new Error(`Google HTTP ${docResponse.status} ${docResponse.statusText}`);
            }

            const typeHeader = docResponse.headers.get('content-type') || '';
            const arr = await docResponse.arrayBuffer();
            const buf = Buffer.from(arr);

            if (typeHeader.includes('text/html') && buf.length < 150 * 1024) {
              const text = buf.toString('utf-8');
              const tokenMatch = text.match(/confirm=([a-zA-Z0-9_-]+)/);
              if (tokenMatch && tokenMatch[1] && !hasConfirmed) {
                return await tryDocDownload(true, tokenMatch[1]);
              }
            }

            return { buffer: buf, contentType: typeHeader };
          };

          const docResult = await tryDocDownload();
          if (docResult && !docResult.contentType.includes('text/html')) {
            buffer = docResult.buffer;
            contentType = docResult.contentType;
            successFetched = true;
            console.log(`[GDrive Replication Code] Anonymous doc download bypass successful (${buffer.length} bytes)`);
          }
        } catch (e: any) {
          console.warn(`[GDrive Replication Code] Anonymous doc download bypass failed:`, e.message);
        }
      }
    }

    if (!successFetched || !buffer) {
      throw new Error(`Le fichier Google Drive ${fileId} n'a pas pu être téléchargé. Veuillez vous assurer que le fichier possède les permissions de partage public ('Tous les utilisateurs disposant du lien peuvent consulter').`);
    }

    let extension = '.png';
    if (contentType.includes('image/jpeg') || contentType.includes('image/jpg')) {
      extension = '.jpg';
    } else if (contentType.includes('image/gif')) {
      extension = '.gif';
    } else if (contentType.includes('image/webp')) {
      extension = '.webp';
    } else if (contentType.includes('audio/mpeg') || contentType.includes('audio/mp3')) {
      extension = '.mp3';
    } else if (contentType.includes('audio/wav')) {
      extension = '.wav';
    } else if (contentType.includes('audio/ogg')) {
      extension = '.ogg';
    } else if (contentType.includes('application/pdf')) {
      extension = '.pdf';
    } else if (fileName) {
      const dotIndex = fileName.lastIndexOf('.');
      if (dotIndex !== -1) {
        extension = fileName.substring(dotIndex);
      }
    }

    const localFileName = `gdrive_${safeId}${extension}`;
    const fullPath = path.join(uploadDir, localFileName);
    fs.writeFileSync(fullPath, buffer);
    console.log(`[GDrive Replication Code] Fichier répliqué avec succès : ${fullPath} (${buffer.length} octets)`);
    return `/uploads/${localFileName}`;
  }

  // API Route to securely download / replicate any Google Drive file locally using the user's active client OAuth Access Token or robust public fallbacks.
  app.post('/api/gdrive/import', async (req, res) => {
    try {
      const { fileId, accessToken, fileName } = req.body;

      if (!fileId) {
        return res.status(400).json({ success: false, error: "Identifiant de fichier Drive manquant." });
      }

      console.log(`[Google Drive Import API] Demande de réplication du fichier ${fileId}...`);
      const publicUrl = await replicateGDriveFileOnServer(fileId, fileName, accessToken);
      
      return res.status(200).json({
        success: true,
        publicUrl
      });
    } catch (err: any) {
      console.error('[Google Drive Import API] Exception critique:', err);
      return res.status(500).json({ success: false, error: err.message || 'Erreur interne de réplication' });
    }
  });

  // High-performance cache for sound effects configuration
  let cachedSoundEffects: any = null;
  let cachedSoundEffectsTimestamp = 0;
  const SOUNDS_CACHE_TTL = 30 * 60 * 1000; // 30 minutes in ms

  const RUNTIME_DEFAULT_SOUNDS = [
    { category: 'reward_appear', url: 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3', description: "Apparition de la récompense (Ouverture du coffre/Pop-up)" },
    { category: 'reward_claim', url: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3', description: "Réclamation des points XP (Bouton 'Récupérer')" },
    { category: 'surprise', url: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3', description: "Effet de surprise (Présentation d'un défi par Axis)" },
    { category: 'level_up', url: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3', description: "Célébration du passage de niveau / de rang" }
  ];

  // Proxy for Google Drive sound playing (bypasses browser CORS & iframe sandboxing blocks)
  app.get('/api/proxy-audio', async (req, res) => {
    try {
      const audioUrl = req.query.url as string;
      if (!audioUrl) {
        return res.status(400).json({ error: "Paramètre URL manquant." });
      }

      const gDriveMatch = audioUrl.match(/\/d\/([a-zA-Z0-9_-]{15,120})/);
      const queryIdMatch = audioUrl.match(/[?&]id=([a-zA-Z0-9_-]{15,120})/);
      const rawIdMatch = audioUrl.trim().match(/^[a-zA-Z0-9_-]{19,80}$/);
      const fileId = (gDriveMatch && gDriveMatch[1]) || (queryIdMatch && queryIdMatch[1]) || (rawIdMatch && rawIdMatch[0]);
      const isGDrive = audioUrl.includes('google.com') || audioUrl.includes('googleusercontent.com') || fileId;

      if (isGDrive && fileId) {
        try {
          console.log(`[Proxy Audio] Audio de Google Drive détecté: ${audioUrl}. Réplication statique en cours...`);
          const localStaticPath = await replicateGDriveFileOnServer(fileId, 'sound.mp3');
          console.log(`[Proxy Audio] Réplication réussie. Redirection vers le fichier statique local : ${localStaticPath}`);
          return res.redirect(localStaticPath);
        } catch (replErr: any) {
          console.warn(`[Proxy Audio] Échec de la réplication rapide, repli vers le stream proxy traditionnel:`, replErr.message);
        }
      }

      let targetUrl = audioUrl;
      const id = fileId;
      if (isGDrive && id) {
        targetUrl = `https://docs.google.com/uc?export=download&id=${id}`;
      }

      console.log(`[Proxy Audio] Proxying request from ${audioUrl} -> ${targetUrl}`);

      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*'
        }
      });

      if (!response.ok) {
        console.error(`[Proxy Audio] Failed to fetch target : ${response.status} ${response.statusText}`);
        return res.status(response.status).json({ error: `Erreur d'accès au fichier : ${response.statusText}` });
      }

      let contentType = response.headers.get('content-type') || 'audio/mpeg';
      
      if (contentType.includes('text/html')) {
        console.warn(`[Proxy Audio] Target returned HTML instead of audio, might be a Google Drive size/auth/cookie limitation page.`);
        contentType = 'audio/mpeg';
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=31536000');

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      console.log(`[Proxy Audio] Successfully proxied ${buffer.length} bytes with content type ${contentType}`);
      return res.status(200).send(buffer);
    } catch (err: any) {
      console.error('[Proxy Audio] Exception attrapée:', err);
      return res.status(500).json({ error: err.message || 'Une erreur de proxy s’est produite.' });
    }
  });

  const SOUNDS_FILE = path.join(process.cwd(), 'public', 'sound_effects_config.json');

  // API Route for local-file-based sound effects reading from admin panel/users
  app.get('/api/sound-effects', async (req, res) => {
    try {
      console.log(`[API GET /api/sound-effects] Accès local au fichier de configuration des sons.`);
      let sounds = RUNTIME_DEFAULT_SOUNDS;
      if (fs.existsSync(SOUNDS_FILE)) {
        try {
          const content = fs.readFileSync(SOUNDS_FILE, 'utf-8');
          sounds = JSON.parse(content);
        } catch (e) {
          console.error('[API GET /api/sound-effects] Erreur lecture fichier json:', e);
        }
      } else {
        // Crée le fichier de base s'il n'existe pas
        try {
          fs.writeFileSync(SOUNDS_FILE, JSON.stringify(RUNTIME_DEFAULT_SOUNDS, null, 2), 'utf-8');
        } catch (e) {
          console.error('[API GET /api/sound-effects] Impossible d\'écrire le fichier par défaut:', e);
        }
      }
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      return res.status(200).json({ success: true, count: sounds.length, data: sounds });
    } catch (err: any) {
      console.error('[API GET /api/sound-effects] Exception attrapée:', err);
      return res.status(500).json({ error: err.message || 'Une erreur interne s’est produite.' });
    }
  });

  // API Route for local-file-based sound effects saving from admin panel
  app.post('/api/admin/sound-effects', express.json(), async (req, res) => {
    try {
      const updates = req.body;
      if (!Array.isArray(updates)) {
        return res.status(400).json({ error: 'Format invalide. Un tableau de sons est attendu.' });
      }

      console.log(`[Admin Sound Effects API] Sauvegarde de ${updates.length} sons dans le fichier de config local.`);
      
      // Merge updates with default sounds or existing sounds to ensure everything remains intact
      let currentSounds = RUNTIME_DEFAULT_SOUNDS;
      if (fs.existsSync(SOUNDS_FILE)) {
        try {
          const content = fs.readFileSync(SOUNDS_FILE, 'utf-8');
          currentSounds = JSON.parse(content);
        } catch (e) {}
      }

      const updatedSounds = await Promise.all(currentSounds.map(async (def) => {
        const found = updates.find((upd: any) => upd.category === def.category);
        if (found) {
          let soundUrl = found.url;
          const gDriveMatch = soundUrl.match(/\/d\/([a-zA-Z0-9_-]{15,120})/);
          const queryIdMatch = soundUrl.match(/[?&]id=([a-zA-Z0-9_-]{15,120})/);
          const rawIdMatch = soundUrl.trim().match(/^[a-zA-Z0-9_-]{19,80}$/);
          const fileId = (gDriveMatch && gDriveMatch[1]) || (queryIdMatch && queryIdMatch[1]) || (rawIdMatch && rawIdMatch[0]);
          if (fileId) {
            try {
              console.log(`[Admin Sound Effects API] Réplication automatique du son Google Drive ${fileId}...`);
              soundUrl = await replicateGDriveFileOnServer(fileId, 'sound.mp3');
            } catch (err: any) {
              console.error(`[Admin Sound Effects API] Échec de la réplication automatique pour ${fileId}:`, err.message);
            }
          }
          return { ...def, url: soundUrl };
        }
        return def;
      }));

      fs.writeFileSync(SOUNDS_FILE, JSON.stringify(updatedSounds, null, 2), 'utf-8');
      
      console.log('[Admin Sound Effects API] Sauvegarde réussie sur le disque.');
      return res.status(200).json({ success: true, message: "Configuration sauvegardée sur le disque avec succès !" });
    } catch (err: any) {
      console.error('[Admin Sound Effects API] Exception attrapée:', err);
      return res.status(500).json({ error: err.message || 'Une erreur interne s’est produite.' });
    }
  });

  const PROOFS_FILE = path.join(process.cwd(), 'public', 'premium_proofs_config.json');

  const DEFAULT_PREMIUM_PROOFS: any[] = [
    {
      "id": "fb-1",
      "name": "Souffa Bakari",
      "milestone_title": "Dépassement d'espoir",
      "before_amount": "0 FCFA",
      "after_amount": "350 000 FCFA",
      "time_frame": "En 18 jours",
      "description": "Une réussite marquante de Souffa Bakari qui de 0 est passé à un total de 350 000 FCFA en seulement 18 jours de travail !",
      "before_image_url": "https://drive.google.com/file/d/1ufBs7y_MYdOcw9st0BpScHoy_3hV26jW/view?usp=sharing",
      "after_image_url": "https://drive.google.com/file/d/1ufBs7y_MYdOcw9st0BpScHoy_3hV26jW/view?usp=sharing",
      "country_flag": "🇨🇮 Côte d'Ivoire",
      "award_type": "exceptional_result",
      "is_active": true,
      "sort_order": 1
    },
    {
      "id": "fb-2",
      "name": "Aladin Moussa",
      "milestone_title": "Premiers gains majeurs",
      "before_amount": "0 FCFA",
      "after_amount": "475 000 XAF",
      "time_frame": "En 28 jours",
      "description": "Détermination et persévérance payantes ! Aladin Moussa a généré 475 000 XAF de profit en moins d'un mois (28 jours) !",
      "before_image_url": "",
      "after_image_url": "https://drive.google.com/file/d/1vKMy7iKAc4yUaNI-kClV9ovGKbe8HiWK/view?usp=sharing",
      "country_flag": "🇨🇲 Cameroun",
      "award_type": "first_sale",
      "is_active": true,
      "sort_order": 2
    },
    {
      "id": "fb-3",
      "name": "Mr. YAMIS",
      "milestone_title": "Première victoire",
      "before_amount": "0 FCFA",
      "after_amount": "60 000 FCFA",
      "time_frame": "En 7 jours",
      "description": "Une merveilleuse entrée en matière pour Mr. YAMIS avec 60 000 FCFA cumulés lors de sa première semaine d'activité !",
      "before_image_url": "",
      "after_image_url": "https://drive.google.com/file/d/1vKMy7iKAc4yUaNI-kClV9ovGKbe8HiWK/view?usp=sharing",
      "country_flag": "🇸🇳 Sénégal",
      "award_type": "first_withdrawal",
      "is_active": true,
      "sort_order": 3
    }
  ];

  // API Route for local-file-based premium social proofs reading (100% disconnected from the database)
  app.get('/api/premium-proofs', async (req, res) => {
    try {
      let proofs: any[] = DEFAULT_PREMIUM_PROOFS;

      // Read finalized JSON if exists
      if (fs.existsSync(PROOFS_FILE)) {
        try {
          const content = fs.readFileSync(PROOFS_FILE, 'utf-8');
          proofs = JSON.parse(content);
        } catch (e) {
          console.error('[API GET /api/premium-proofs] Erreur lecture fichier json:', e);
        }
      } else {
        try {
          fs.writeFileSync(PROOFS_FILE, JSON.stringify(DEFAULT_PREMIUM_PROOFS, null, 2), 'utf-8');
          proofs = DEFAULT_PREMIUM_PROOFS;
        } catch (e) {
          console.error('[API GET /api/premium-proofs] Impossible d\'écrire les preuves par défaut:', e);
        }
      }

      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      return res.status(200).json({ success: true, count: proofs.length, data: proofs });
    } catch (err: any) {
      console.error('[API GET /api/premium-proofs] Exception:', err);
      return res.status(500).json({ error: err.message || 'Une erreur interne s’est produite.' });
    }
  });

  // API Route for saving / editing premium social proofs
  app.post('/api/admin/premium-proofs', express.json(), async (req, res) => {
    try {
      const { id, name, before_amount, after_amount, time_frame, before_image_url, after_image_url, description, award_type, milestone_title, is_active, sort_order, country_flag } = req.body;
      
      let replicatedBeforeImg = before_image_url;
      if (before_image_url) {
        const gDriveMatch = before_image_url.match(/\/d\/([a-zA-Z0-9_-]{15,120})/);
        const queryIdMatch = before_image_url.match(/[?&]id=([a-zA-Z0-9_-]{15,120})/);
        const rawIdMatch = before_image_url.trim().match(/^[a-zA-Z0-9_-]{19,80}$/);
        const fileId = (gDriveMatch && gDriveMatch[1]) || (queryIdMatch && queryIdMatch[1]) || (rawIdMatch && rawIdMatch[0]);
        if (fileId) {
          try {
            console.log(`[Admin Premium Proofs] Replication du avant_image: ${fileId}...`);
            replicatedBeforeImg = await replicateGDriveFileOnServer(fileId, 'before.png');
          } catch (err: any) {
            console.error(`[Admin Premium Proofs] Échec de la réplication de avant_image :`, err.message);
          }
        }
      }

      let replicatedAfterImg = after_image_url;
      if (after_image_url) {
        const gDriveMatch = after_image_url.match(/\/d\/([a-zA-Z0-9_-]{15,120})/);
        const queryIdMatch = after_image_url.match(/[?&]id=([a-zA-Z0-9_-]{15,120})/);
        const rawIdMatch = after_image_url.trim().match(/^[a-zA-Z0-9_-]{19,80}$/);
        const fileId = (gDriveMatch && gDriveMatch[1]) || (queryIdMatch && queryIdMatch[1]) || (rawIdMatch && rawIdMatch[0]);
        if (fileId) {
          try {
            console.log(`[Admin Premium Proofs] Replication du apres_image: ${fileId}...`);
            replicatedAfterImg = await replicateGDriveFileOnServer(fileId, 'after.png');
          } catch (err: any) {
            console.error(`[Admin Premium Proofs] Échec de la réplication de apres_image :`, err.message);
          }
        }
      }

      let proofs: any[] = DEFAULT_PREMIUM_PROOFS;
      if (fs.existsSync(PROOFS_FILE)) {
        try {
          const content = fs.readFileSync(PROOFS_FILE, 'utf-8');
          proofs = JSON.parse(content);
        } catch (e) {}
      }

      if (id) {
        // Edit existing proof
        const index = proofs.findIndex((p: any) => p.id === id);
        if (index !== -1) {
          proofs[index] = {
            ...proofs[index],
            name: name !== undefined ? name : proofs[index].name,
            before_amount: before_amount !== undefined ? before_amount : proofs[index].before_amount,
            after_amount: after_amount !== undefined ? after_amount : proofs[index].after_amount,
            time_frame: time_frame !== undefined ? time_frame : proofs[index].time_frame,
            before_image_url: before_image_url !== undefined ? replicatedBeforeImg : proofs[index].before_image_url,
            after_image_url: after_image_url !== undefined ? replicatedAfterImg : proofs[index].after_image_url,
            description: description !== undefined ? description : proofs[index].description,
            award_type: award_type !== undefined ? award_type : proofs[index].award_type,
            milestone_title: milestone_title !== undefined ? milestone_title : proofs[index].milestone_title,
            is_active: is_active !== undefined ? is_active : proofs[index].is_active,
            sort_order: sort_order !== undefined ? sort_order : proofs[index].sort_order,
            country_flag: country_flag !== undefined ? country_flag : proofs[index].country_flag
          };
        } else {
          // If not found but ID is passed (custom edit)
          proofs.push({
            id,
            name, before_amount, after_amount, time_frame, before_image_url: replicatedBeforeImg, after_image_url: replicatedAfterImg, description, award_type, milestone_title, is_active: is_active ?? true, sort_order: sort_order ?? 0, country_flag
          });
        }
      } else {
        // Add new proof
        const newId = 'proof-' + Math.random().toString(36).substr(2, 9);
        proofs.push({
          id: newId,
          name: name || '',
          before_amount: before_amount || '',
          after_amount: after_amount || '',
          time_frame: time_frame || '',
          before_image_url: replicatedBeforeImg || '',
          after_image_url: replicatedAfterImg || '',
          description: description || '',
          award_type: award_type || 'first_sale',
          milestone_title: milestone_title || '',
          is_active: is_active !== false,
          sort_order: sort_order ?? 0,
          country_flag: country_flag || "🇨🇮 Côte d'Ivoire"
        });
      }

      fs.writeFileSync(PROOFS_FILE, JSON.stringify(proofs, null, 2), 'utf-8');
      return res.status(200).json({ success: true, message: "Preuve enregistrée avec succès !", data: proofs });
    } catch (err: any) {
      console.error('[API POST /api/admin/premium-proofs] Exception:', err);
      return res.status(500).json({ error: err.message || 'Une erreur interne s’est produite.' });
    }
  });

  // API Route to delete a premium proof by ID
  app.delete('/api/admin/premium-proofs/:id', async (req, res) => {
    try {
      const { id } = req.params;
      let proofs = DEFAULT_PREMIUM_PROOFS;
      if (fs.existsSync(PROOFS_FILE)) {
        try {
          const content = fs.readFileSync(PROOFS_FILE, 'utf-8');
          proofs = JSON.parse(content);
        } catch (e) {}
      }

      const filtered = proofs.filter((p: any) => p.id !== id);
      fs.writeFileSync(PROOFS_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
      return res.status(200).json({ success: true, message: "Preuve supprimée avec succès !" });
    } catch (err: any) {
      console.error('[API DELETE /api/admin/premium-proofs] Exception:', err);
      return res.status(500).json({ error: err.message || 'Une erreur interne s’est produite.' });
    }
  });

  // API Route for highly robust, rate-limit bypassed registration & linking of imported users
  app.post('/api/auth/register', async (req, res) => {
    const { email, password, name, country, referralCode, phone } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    // Initialize administrative Supabase client using the SERVICE ROLE key
    const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
    const supabaseAdmin = createClient(SUPABASE_URL, adminKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    try {
      console.log(`[Admin Auth Backend] =============================================`);
      console.log(`[Admin Auth Backend] START REGISTRATION PROCESS FOR: ${cleanEmail}`);
      console.log(`[Admin Auth Backend] SUPABASE_URL: ${SUPABASE_URL}`);
      console.log(`[Admin Auth Backend] Service Role Key is present: ${!!process.env.SUPABASE_SERVICE_ROLE_KEY}`);
      console.log(`[Admin Auth Backend] =============================================`);

      // STEP 1: Search in public.users to see if this email was imported or exists without auth
      console.log(`[Admin Auth Backend] [STEP 1/5] Searching in public.users for email: ${cleanEmail}`);
      const { data: preExistingUserRaw, error: queryError } = await supabaseAdmin
        .from('users')
        .select('*')
        .ilike('email', cleanEmail)
        .maybeSingle();

      const preExistingUser: any = preExistingUserRaw;

      if (queryError) {
        console.error('[Admin Auth Backend] Error querying prior public.users data:', queryError);
      } else {
        console.log(`[Admin Auth Backend] Checked public.users for pre-existing user: ${preExistingUser ? 'Found' : 'Not Found'}`);
      }

      // STEP 1b: Search in auth.users via admin.listUsers to check if they already exist in auth.users
      console.log(`[Admin Auth Backend] [STEP 1b/5] Inspecting if user already exists in auth.users`);
      let alreadyInAuth = false;
      try {
        const { data: listData, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
        if (listErr) {
          console.warn('[Admin Auth Backend] Warning: could not list users to check duplicate auth', listErr);
        } else {
          const users: any[] = listData?.users || [];
          const matchingAuth = users.find(u => u.email?.toLowerCase() === cleanEmail);
          if (matchingAuth) {
            alreadyInAuth = true;
            console.warn(`[Admin Auth Backend] User already exists in auth.users with ID: ${matchingAuth.id}`);
          } else {
            console.log(`[Admin Auth Backend] User is not present in auth.users yet.`);
          }
        }
      } catch (authListException) {
        console.warn('[Admin Auth Backend] Exception reading auth list:', authListException);
      }

      if (alreadyInAuth) {
        console.log(`[Admin Auth Backend] User already has active auth credentials. Blocking registration.`);
        return res.status(400).json({ error: 'Cet email est déjà lié à un compte MZ+ actif. Veuillez utiliser l\'onglet "Connexion" pour vous connecter directement.' });
      }

      let authUser;

      if (preExistingUser) {
        console.log(`[Admin Auth Backend] [STEP 2/5] Migrating pre-existing imported user with ID: ${preExistingUser.id}`);
        console.log(`[Admin Auth Backend] Creating auth.users row and letting GoTrue generate a clean UUID...`);

        // We DO NOT specify preExistingUser.id directly in admin.createUser,
        // because that fires the database trigger which attempts to insert that same ID,
        // causing primary key / unique constraint conflict error.
        // Instead, we let GoTrue generate a clean, brand new UUID, wait for the trigger
        // to safely insert the profile row, copy over the stats, update ALL references (foreign keys)
        // pointing to the old UUID to point to the new UUID instead, and then safely delete the old UUID.
        const { data: registerResult, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
          email: cleanEmail,
          password: cleanPassword,
          email_confirm: true,
          user_metadata: {
            full_name: name || preExistingUser.full_name || 'Ambassadeur',
            country: country || preExistingUser.country || '',
            phone: phone || preExistingUser.phone || '',
            referral_code_used: referralCode || preExistingUser.referral_code_used || null
          }
        });

        if (signUpError) {
          console.error('[Admin Auth Backend] [STEP 2 - FAIL] admin.createUser failed for imported user migration! Raw Error:', signUpError);
          const msg = signUpError.message?.toLowerCase() || '';
          if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('conflict')) {
            return res.status(400).json({ error: 'Cet email est déjà lié à un compte MZ+. Veuillez vous connecter avec vos accès.' });
          }
          return res.status(400).json({ error: signUpError.message });
        }

        authUser = registerResult.user;
        const newAuthId = authUser?.id;
        console.log(`[Admin Auth Backend] [STEP 2 - SUCCESS] Created auth user successfully. New UUID: ${newAuthId}`);
        console.log(`[Admin Auth Backend] [STEP 3/5] Starting stats merge and reference linking for: ${cleanEmail}`);

        if (newAuthId) {
          // 1. Fetch or create the new profile row
          const { data: newProfile } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('id', newAuthId)
            .maybeSingle();

          const mergedData = {
            full_name: name || preExistingUser.full_name || 'Ambassadeur',
            country: country || preExistingUser.country || null,
            country_code: preExistingUser.country_code || null,
            phone: phone || preExistingUser.phone || null,
            username: preExistingUser.username || null,
            avatar_url: preExistingUser.avatar_url || null,
            is_admin: preExistingUser.is_admin || false,
            admin_role: preExistingUser.admin_role || null,
            user_level: preExistingUser.user_level || 'standard',
            referral_code: preExistingUser.referral_code || ('MZ' + Math.random().toString(36).substring(2, 8).toUpperCase()),
            referral_code_used: referralCode || preExistingUser.referral_code_used || null,
            sponsor_id: preExistingUser.sponsor_id || null,
            xp: preExistingUser.xp || 0,
            weekly_xp: preExistingUser.weekly_xp || 0,
            monthly_xp: preExistingUser.monthly_xp || 0,
            rank_id: preExistingUser.rank_id || 1,
            rank_name: preExistingUser.rank_name || 'DÉBUTANT',
            fcm_token: preExistingUser.fcm_token || null,
            rpa_points: preExistingUser.rpa_points || 0,
            rpa_balance: preExistingUser.rpa_balance || 0,
            store_preferences: preExistingUser.store_preferences || {},
            has_seen_flash_offer: preExistingUser.has_seen_flash_offer || false,
            created_at: preExistingUser.created_at || new Date().toISOString()
          };

          if (!newProfile) {
            console.log('[Admin Auth Backend] [STEP 4/5] Profile row missing in public.users, inserting manually before migration...');
            const { error: insErr } = await supabaseAdmin.from('users').insert({
              id: newAuthId,
              email: cleanEmail,
              ...mergedData
            });
            if (insErr) {
              console.error('[Admin Auth Backend] Failed manual profile row insert:', insErr.message);
            } else {
              console.log('[Admin Auth Backend] Succeeded inserting manual profile row.');
            }
          } else {
            console.log('[Admin Auth Backend] [STEP 4/5] Profile row auto-created by DB trigger, patching with pre-existing data...');
            const { error: updErr } = await supabaseAdmin.from('users').update(mergedData).eq('id', newAuthId);
            if (updErr) {
              console.error('[Admin Auth Backend] Failed patching auto-created profile row:', updErr.message);
            } else {
              console.log('[Admin Auth Backend] Succeeded patching auto-created profile row with pre-existing stats.');
            }
          }

          // 2. Safe unique-constraint table migration (so we don't encounter unique key crashes on update/delete)
          console.log('[Admin Auth Backend] [STEP 4b/5] Migrating child tables with unique user_id constraints...');
          
          // A: Wallets table
          try {
            const { data: oldWallet } = await supabaseAdmin.from('wallets').select('*').eq('user_id', preExistingUser.id).maybeSingle();
            const { data: newWallet } = await supabaseAdmin.from('wallets').select('*').eq('user_id', newAuthId).maybeSingle();
            console.log('[Admin Auth Backend] Wallets transfer scan:', { oldWallet: !!oldWallet, newWallet: !!newWallet });
            if (oldWallet) {
              if (newWallet) {
                const combinedBalance = (parseFloat(oldWallet.balance?.toString() || '0')) + (parseFloat(newWallet.balance?.toString() || '0'));
                console.log(`[Admin Auth Backend] Combining wallet balances: ${oldWallet.balance} + ${newWallet.balance} = ${combinedBalance}`);
                await supabaseAdmin.from('wallets').update({ balance: combinedBalance }).eq('id', newWallet.id);
                await supabaseAdmin.from('wallets').delete().eq('id', oldWallet.id);
              } else {
                console.log(`[Admin Auth Backend] Re-assigning wallet to new user ID: ${newAuthId}`);
                await supabaseAdmin.from('wallets').update({ user_id: newAuthId }).eq('id', oldWallet.id);
              }
            }
          } catch (walletErr) {
            console.warn('[Admin Auth Backend] Wallets transfer warning:', walletErr);
          }

          // B: Challenge 3J State
          try {
            const { data: oldChallenge } = await supabaseAdmin.from('mz_challenge_3j_state').select('*').eq('user_id', preExistingUser.id).maybeSingle();
            const { data: newChallenge } = await supabaseAdmin.from('mz_challenge_3j_state').select('*').eq('user_id', newAuthId).maybeSingle();
            if (oldChallenge) {
              if (newChallenge) {
                await supabaseAdmin.from('mz_challenge_3j_state').delete().eq('user_id', newChallenge.user_id);
              }
              await supabaseAdmin.from('mz_challenge_3j_state').update({ user_id: newAuthId }).eq('user_id', preExistingUser.id);
              console.log('[Admin Auth Backend] Re-assigned challenge 3J state.');
            }
          } catch (challengeErr) {
            console.warn('[Admin Auth Backend] Challenge state transfer warning:', challengeErr);
          }

          // C: Streaks Table
          try {
            const { data: oldStreak } = await supabaseAdmin.from('user_activity_streaks').select('*').eq('user_id', preExistingUser.id).maybeSingle();
            const { data: newStreak } = await supabaseAdmin.from('user_activity_streaks').select('*').eq('user_id', newAuthId).maybeSingle();
            if (oldStreak) {
              if (newStreak) {
                await supabaseAdmin.from('user_activity_streaks').delete().eq('user_id', newStreak.user_id);
              }
              await supabaseAdmin.from('user_activity_streaks').update({ user_id: newAuthId }).eq('user_id', preExistingUser.id);
              console.log('[Admin Auth Backend] Re-assigned user activity streaks.');
            }
          } catch (streakErr) {
            console.warn('[Admin Auth Backend] Streaks transfer warning:', streakErr);
          }

          // D: Welcome Popups
          try {
            const { data: oldWelcome } = await supabaseAdmin.from('premium_welcome_popups').select('*').eq('user_id', preExistingUser.id).maybeSingle();
            const { data: newWelcome } = await supabaseAdmin.from('premium_welcome_popups').select('*').eq('user_id', newAuthId).maybeSingle();
            if (oldWelcome) {
              if (newWelcome) {
                await supabaseAdmin.from('premium_welcome_popups').delete().eq('user_id', newWelcome.user_id);
              }
              await supabaseAdmin.from('premium_welcome_popups').update({ user_id: newAuthId }).eq('user_id', preExistingUser.id);
              console.log('[Admin Auth Backend] Re-assigned welcome popups.');
            }
          } catch (welcomeErr) {
            console.warn('[Admin Auth Backend] Welcome popups transfer warning:', welcomeErr);
          }

          // 3. Migrate all other non-unique tables
          console.log('[Admin Auth Backend] Re-linking remaining records (commissions, trackings, status)...');
          try {
            await Promise.allSettled([
              supabaseAdmin.from('commissions').update({ user_id: newAuthId }).eq('user_id', preExistingUser.id),
              supabaseAdmin.from('mz_rewards_time_tracking').update({ user_id: newAuthId }).eq('user_id', preExistingUser.id),
              supabaseAdmin.from('mz_background_notifications_log').update({ user_id: newAuthId }).eq('user_id', preExistingUser.id),
              supabaseAdmin.from('user_rank_rewards').update({ user_id: newAuthId }).eq('user_id', preExistingUser.id),
              supabaseAdmin.from('mz_offer_page_tracking').update({ user_id: newAuthId }).eq('user_id', preExistingUser.id),
              supabaseAdmin.from('product_stats').update({ user_id: newAuthId }).eq('user_id', preExistingUser.id)
            ]);
            console.log('[Admin Auth Backend] Finished migrating remaining reference records.');
          } catch (relErr) {
            console.warn('[Admin Auth Backend] Relational update warn:', relErr);
          }

          // 4. Safely delete the old imported record from public.users so only the fresh one exists
          console.log(`[Admin Auth Backend] [STEP 5/5] Deleting old CSV-imported profile record: ${preExistingUser.id}`);
          const { error: delErr } = await supabaseAdmin
            .from('users')
            .delete()
            .eq('id', preExistingUser.id);

          if (delErr) {
            console.error('[Admin Auth Backend] Error deleting old stale imported user record:', delErr);
          } else {
            console.log(`[Admin Auth Backend] Cleaned stale imported user record with ID ${preExistingUser.id} successfully.`);
          }
        }
      } else {
        console.log(`[Admin Auth Backend] [STEP 2/5] Creating brand new user: ${cleanEmail}`);

        // Try creating standard brand new user
        const { data: registerResult, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
          email: cleanEmail,
          password: cleanPassword,
          email_confirm: true,
          user_metadata: {
            full_name: name,
            country: country,
            phone: phone || '',
            referral_code_used: referralCode || null
          }
        });

        if (signUpError) {
          console.error('[Admin Auth Backend] [STEP 2 - FAIL] admin.createUser failed for new user! Raw Error:', signUpError);
          if (signUpError.message?.toLowerCase().includes('already registered') || 
              signUpError.message?.toLowerCase().includes('already exists') ||
              signUpError.message?.toLowerCase().includes('conflict')) {
            return res.status(400).json({ error: 'Cet email est déjà lié à un compte MZ+. Veuillez vous connecter.' });
          }
          return res.status(400).json({ error: signUpError.message });
        }

        authUser = registerResult.user;
        console.log(`[Admin Auth Backend] [STEP 2 - SUCCESS] Created brand new auth user successfully with UUID: ${authUser?.id}`);
        console.log(`[Admin Auth Backend] [STEP 3/5] Checking consistency for profile row of: ${cleanEmail}`);

        // Manually insert into public.users to ensure consistency (since there may be no auto trigger)
        if (authUser) {
          const { data: existingProf } = await supabaseAdmin.from('users').select('id').eq('id', authUser.id).maybeSingle();
          if (!existingProf) {
            console.log('[Admin Auth Backend] [STEP 4/5] Profile not auto-created by trigger. Inserting manually...');
            const generatedCode = 'MZ' + Math.random().toString(36).substring(2, 8).toUpperCase();
            const { error: insertErr } = await supabaseAdmin.from('users').insert({
              id: authUser.id,
              email: cleanEmail,
              full_name: name,
              country: country,
              phone: phone || null,
              referral_code: generatedCode,
              referral_code_used: referralCode || null,
              rank_id: 1,
              user_level: 'standard',
              rpa_points: 0,
              rpa_balance: 0
            });

            if (insertErr) {
              console.error('[Admin Auth Backend] Failed to manually create user record in public.users:', insertErr);
            } else {
              console.log(`[Admin Auth Backend] Successfully inserted record into public.users for: ${cleanEmail}`);
            }
          } else {
            console.log(`[Admin Auth Backend] [STEP 4/5] Profile was already auto-created by database trigger for: ${cleanEmail}. Patching with correct registration metadata (phone, full_name, country)...`);
            const { error: patchErr } = await supabaseAdmin.from('users').update({
              full_name: name,
              country: country,
              phone: phone || null,
              referral_code_used: referralCode || null
            }).eq('id', authUser.id);
            
            if (patchErr) {
              console.error('[Admin Auth Backend] Failed to patch auto-created trigger profile with correct registration details:', patchErr.message);
            } else {
              console.log('[Admin Auth Backend] Succeeded in patching auto-created trigger profile with complete registration details (including phone).');
            }
          }
        }
      }

      console.log(`[Admin Auth Backend] [STEP 5/5] FINISHED registration successfully for user: ${cleanEmail}`);
      console.log(`[Admin Auth Backend] =============================================`);

      return res.status(200).json({ 
        success: true, 
        message: 'Compte créé et activé avec succès !',
        userId: authUser?.id
      });

    } catch (err: any) {
      console.error('[Admin Auth Backend] Exceptional crash during registration:', err);
      return res.status(500).json({ error: err.message || 'Une erreur interne inattendue s’est produite.' });
    }
  });

  // API Route for Login Precheck and On-the-fly Migration
  app.post('/api/auth/login-precheck-and-migrate', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    // Initialize administrative Supabase client using the SERVICE ROLE key
    const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
    const supabaseAdmin = createClient(SUPABASE_URL, adminKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    try {
      console.log(`[Migration Login Precheck] =============================================`);
      console.log(`[Migration Login Precheck] Receive login precheck request for email: ${cleanEmail}`);
      console.log(`[Migration Login Precheck] =============================================`);

      // 1. Search in public.users to see if this email exists at all
      console.log(`[Migration Login Precheck] [STEP 1] Searching in public.users for email: ${cleanEmail}`);
      const { data: preExistingUserRaw, error: queryError } = await supabaseAdmin
        .from('users')
        .select('*')
        .ilike('email', cleanEmail)
        .maybeSingle();

      const preExistingUser: any = preExistingUserRaw;

      if (queryError) {
        console.error('[Migration Login Precheck] Error querying public.users:', queryError);
        return res.status(500).json({ error: 'Erreur lors de la vérification de compte (public.users)' });
      }

      // Rule 2: "Si l'email n'existe pas dans public.users : afficher 'Email ou mot de passe incorrect.'"
      if (!preExistingUser) {
        console.log(`[Migration Login Precheck] [RESULT] Email NOT found in public.users: ${cleanEmail}`);
        console.log(`[Migration Login Precheck] =============================================`);
        return res.status(401).json({ 
          success: false, 
          error: 'Email ou mot de passe incorrect.' 
        });
      }

      console.log(`[Migration Login Precheck] [RESULT] Email FOUND in public.users! Account status check...`, {
        id: preExistingUser.id,
        email: preExistingUser.email,
        full_name: preExistingUser.full_name
      });

      // 2. Search in auth.users via admin.listUsers
      console.log(`[Migration Login Precheck] [STEP 2] Searching in auth.users via admin.listUsers()`);
      let authUser: any = null;
      try {
        const { data: listData, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
        if (listErr) {
          console.error('[Migration Login Precheck] Error listing auth users:', listErr);
          return res.status(500).json({ error: 'Erreur lors de la vérification de compte (auth.users)' });
        } else {
          const users: any[] = listData?.users || [];
          authUser = users.find(u => u.email?.toLowerCase().trim() === cleanEmail);
        }
      } catch (authListException: any) {
        console.error('[Migration Login Precheck] Exception reading auth list:', authListException);
        return res.status(500).json({ error: 'Erreur critique lors de la vérification auth' });
      }

      if (authUser) {
        console.log(`[Migration Login Precheck] [RESULT] User FOUND in auth.users. UUID: ${authUser.id}. Skipping migration.`);
        console.log(`[Migration Login Precheck] =============================================`);
        // Already migrated or normally registered, let GoTrue client handle the login verification directly
        return res.status(200).json({
          success: true,
          status: 'ALREADY_MIGRATED',
          message: 'Utilisateur déjà enregistré dans GoTrue. Connexion directe sécurisée.'
        });
      }

      // 3. User exists in public.users but does NOT exist in auth.users: Legacy user needs migration!
      console.log(`[Migration Login Precheck] [STEP 3] User is imported (public.users) but not in auth.users. Fetching legacy password...`);
      
      const { data: legacyData, error: legacyErr } = await supabaseAdmin
        .from('legacy_passwords')
        .select('*')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (legacyErr) {
        console.error('[Migration Login Precheck] Error querying legacy_passwords table:', legacyErr);
        if (legacyErr.code === '42P01') {
          return res.status(500).json({ 
            error: 'La table "legacy_passwords" est manquante dans votre base de données. Veuillez exécuter le script SQL de création.' 
          });
        }
        return res.status(500).json({ error: `Erreur de vérification: ${legacyErr.message}` });
      }

      if (!legacyData) {
        console.log(`[Migration Login Precheck] [RESULT] Email NOT found in legacy_passwords table: ${cleanEmail}`);
        
        // Diagnostic: check if the table is empty or if this specific email is just missing
        try {
          const { count, error: countErr } = await supabaseAdmin
            .from('legacy_passwords')
            .select('*', { count: 'exact', head: true });
          
          if (countErr) {
            console.error('[Migration Login Precheck] Diagnostic count error:', countErr);
          }
          
          const totalRows = count || 0;
          console.log(`[Migration Login Precheck] Diagnostic: Table legacy_passwords has ${totalRows} rows total.`);
          
          if (totalRows === 0) {
            return res.status(401).json({
              error: 'Votre compte est importé, mais la base de données de transition (table "legacy_passwords") est complètement vide ! Veuillez importer votre fichier CSV avec les colonnes "id", "email", et "encrypted_password".'
            });
          } else {
            return res.status(401).json({
              error: `Votre compte existe, mais votre adresse email ("${cleanEmail}") n'a pas été trouvée dans notre table de transition (contenant ${totalRows} comptes). Veuillez vérifier que cette adresse figure bien dans votre fichier CSV d'importation.`
            });
          }
        } catch (diagErr) {
          return res.status(401).json({
            error: `Votre compte existe, mais n'est pas enregistré dans la table de migration des mots de passe. Veuillez contacter un administrateur.`
          });
        }
      }

      if (!legacyData.encrypted_password) {
        console.log(`[Migration Login Precheck] [RESULT] Legacy user has a row but encrypted_password is NULL or empty for: ${cleanEmail}`);
        return res.status(401).json({ 
          error: `Votre compte a bien été trouvé, mais aucun mot de passe n'y est associé (la colonne "encrypted_password" est vide ou NULL dans la ligne pour "${cleanEmail}"). Veuillez vérifier votre importation de fichier CSV.` 
        });
      }

      // 4. Compare the provided password with the stored legacy password
      console.log(`[Migration Login Precheck] Comparing inputs for legacy user ${cleanEmail}...`);
      let isMatch = false;
      const storedHash = legacyData.encrypted_password.trim();

      console.log(`[Migration Login Precheck] Stored character length: ${storedHash.length}`);
      if (storedHash.length > 0) {
        const preview = storedHash.length > 8 ? `${storedHash.substring(0, 8)}...` : '***';
        console.log(`[Migration Login Precheck] Stored hash preview: "${preview}"`);
      }

      if (storedHash.startsWith('$2')) {
        let normalizedHash = storedHash;
        if (storedHash.startsWith('$2y$')) {
          normalizedHash = '$2a$' + storedHash.substring(4);
          console.log(`[Migration Login Precheck] Normalizing Laravel/PHP bcrypt hash prefix from $2y$ to $2a$`);
        }
        try {
          isMatch = bcrypt.compareSync(cleanPassword, normalizedHash);
          console.log(`[Migration Login Precheck] Bcrypt hash comparison match result: ${isMatch}`);
        } catch (bcryptErr: any) {
          console.error('[Migration Login Precheck] Bcrypt compare error:', bcryptErr.message);
          isMatch = false;
        }
      } else {
        // Plaintext or MD5/Other check
        isMatch = (cleanPassword === storedHash);
        console.log(`[Migration Login Precheck] Plaintext exact match result: ${isMatch}`);
      }

      if (!isMatch) {
         console.warn(`[Migration Login Precheck] Password MISMATCH for legacy user ${cleanEmail}!`);
         return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
      }

      console.log(`[Migration Login Precheck] Password MATCHED successfully for legacy user ${cleanEmail}! Starting migration...`);

      // 5. Create user in auth.users with the validated password
      console.log(`[Migration Login Precheck] Creating auth.users credentials securely...`);
      const { data: registerResult, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password: cleanPassword, // Now we create it with their actual password so they can login directly moving forward
        email_confirm: true,
        user_metadata: {
          full_name: preExistingUser.full_name || 'Ambassadeur',
          country: preExistingUser.country || '',
          referral_code_used: preExistingUser.referral_code_used || null
        }
      });

      if (signUpError) {
        console.error('[Migration Login Precheck] admin.createUser failed during on-the-fly migration:', signUpError);
        return res.status(400).json({ error: `Erreur de création de compte auth: ${signUpError.message}` });
      }

      const newAuthId = registerResult.user?.id;
      console.log(`[Migration Login Precheck] Creation in auth.users SUCCESS. New UUID: ${newAuthId}`);

      if (newAuthId) {
        console.log(`[Migration Login Precheck] [STEP 4] Transferring stats and profile link...`);
        
        // Define all inherited fields from the CSV account
        const mergedData = {
          full_name: preExistingUser.full_name || 'Ambassadeur',
          country: preExistingUser.country || null,
          country_code: preExistingUser.country_code || null,
          phone: preExistingUser.phone || null,
          username: preExistingUser.username || null,
          avatar_url: preExistingUser.avatar_url || null,
          is_admin: preExistingUser.is_admin || false,
          admin_role: preExistingUser.admin_role || null,
          user_level: preExistingUser.user_level || 'standard',
          referral_code: preExistingUser.referral_code || ('MZ' + Math.random().toString(36).substring(2, 8).toUpperCase()),
          referral_code_used: preExistingUser.referral_code_used || null,
          sponsor_id: preExistingUser.sponsor_id || null,
          xp: preExistingUser.xp || 0,
          weekly_xp: preExistingUser.weekly_xp || 0,
          monthly_xp: preExistingUser.monthly_xp || 0,
          rank_id: preExistingUser.rank_id || 1,
          rank_name: preExistingUser.rank_name || 'DÉBUTANT',
          fcm_token: preExistingUser.fcm_token || null,
          rpa_points: preExistingUser.rpa_points || 0,
          rpa_balance: preExistingUser.rpa_balance || 0,
          store_preferences: preExistingUser.store_preferences || {},
          has_seen_flash_offer: preExistingUser.has_seen_flash_offer || false,
          created_at: preExistingUser.created_at || new Date().toISOString()
        };

        // Fetch or update the profile row in public.users (which might be created by DB trigger when creating auth user)
        const { data: newProfile } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('id', newAuthId)
          .maybeSingle();

        if (!newProfile) {
          console.log('[Migration Login Precheck] Profile row not yet created, inserting manually...');
          const { error: insErr } = await supabaseAdmin.from('users').insert({
            id: newAuthId,
            email: cleanEmail,
            ...mergedData
          });
          if (insErr) {
            console.error('[Migration Login Precheck] Insert error for profile row:', insErr.message);
          } else {
            console.log('[Migration Login Precheck] Profile row created.');
          }
        } else {
          console.log('[Migration Login Precheck] Profile row detected, updating profile stats...');
          const { error: updErr } = await supabaseAdmin.from('users').update(mergedData).eq('id', newAuthId);
          if (updErr) {
            console.error('[Migration Login Precheck] Update error for profile row:', updErr.message);
          } else {
            console.log('[Migration Login Precheck] Profile row updated successfully.');
          }
        }

        // 6. Migrate wallets
        try {
          const { data: oldWallet } = await supabaseAdmin.from('wallets').select('*').eq('user_id', preExistingUser.id).maybeSingle();
          const { data: newWallet } = await supabaseAdmin.from('wallets').select('*').eq('user_id', newAuthId).maybeSingle();
          if (oldWallet) {
            if (newWallet) {
              const combinedBalance = (parseFloat(oldWallet.balance?.toString() || '0')) + (parseFloat(newWallet.balance?.toString() || '0'));
              await supabaseAdmin.from('wallets').update({ balance: combinedBalance }).eq('id', newWallet.id);
              await supabaseAdmin.from('wallets').delete().eq('id', oldWallet.id);
            } else {
              await supabaseAdmin.from('wallets').update({ user_id: newAuthId }).eq('id', oldWallet.id);
            }
            console.log('[Migration Login Precheck] Wallets stats transferred.');
          }
        } catch (walletErr) {
          console.warn('[Migration Login Precheck] Wallet migration warning:', walletErr);
        }

        // 7. Migrate challenge states
        try {
          const { data: oldChallenge } = await supabaseAdmin.from('mz_challenge_3j_state').select('*').eq('user_id', preExistingUser.id).maybeSingle();
          const { data: newChallenge } = await supabaseAdmin.from('mz_challenge_3j_state').select('*').eq('user_id', newAuthId).maybeSingle();
          if (oldChallenge) {
            if (newChallenge) {
              await supabaseAdmin.from('mz_challenge_3j_state').delete().eq('user_id', newChallenge.user_id);
            }
            await supabaseAdmin.from('mz_challenge_3j_state').update({ user_id: newAuthId }).eq('user_id', preExistingUser.id);
            console.log('[Migration Login Precheck] Challenge 3j state migrated.');
          }
        } catch (challengeErr) {
          console.warn('[Migration Login Precheck] Challenge migration warning:', challengeErr);
        }

        // 8. Migrate streaks
        try {
          const { data: oldStreak } = await supabaseAdmin.from('user_activity_streaks').select('*').eq('user_id', preExistingUser.id).maybeSingle();
          const { data: newStreak } = await supabaseAdmin.from('user_activity_streaks').select('*').eq('user_id', newAuthId).maybeSingle();
          if (oldStreak) {
            if (newStreak) {
              await supabaseAdmin.from('user_activity_streaks').delete().eq('user_id', newStreak.user_id);
            }
            await supabaseAdmin.from('user_activity_streaks').update({ user_id: newAuthId }).eq('user_id', preExistingUser.id);
            console.log('[Migration Login Precheck] Streaks migrated.');
          }
        } catch (streakErr) {
          console.warn('[Migration Login Precheck] Streak migration warning:', streakErr);
        }

        // 9. Migrate welcome popups
        try {
          const { data: oldWelcome } = await supabaseAdmin.from('premium_welcome_popups').select('*').eq('user_id', preExistingUser.id).maybeSingle();
          const { data: newWelcome } = await supabaseAdmin.from('premium_welcome_popups').select('*').eq('user_id', newAuthId).maybeSingle();
          if (oldWelcome) {
            if (newWelcome) {
              await supabaseAdmin.from('premium_welcome_popups').delete().eq('user_id', newWelcome.user_id);
            }
            await supabaseAdmin.from('premium_welcome_popups').update({ user_id: newAuthId }).eq('user_id', preExistingUser.id);
            console.log('[Migration Login Precheck] Welcome popups migrated.');
          }
        } catch (welcomeErr) {
          console.warn('[Migration Login Precheck] Welcome popup migration warning:', welcomeErr);
        }

        // 10. Update other dependencies
        try {
          await Promise.allSettled([
            supabaseAdmin.from('commissions').update({ user_id: newAuthId }).eq('user_id', preExistingUser.id),
            supabaseAdmin.from('mz_rewards_time_tracking').update({ user_id: newAuthId }).eq('user_id', preExistingUser.id),
            supabaseAdmin.from('mz_background_notifications_log').update({ user_id: newAuthId }).eq('user_id', preExistingUser.id),
            supabaseAdmin.from('user_rank_rewards').update({ user_id: newAuthId }).eq('user_id', preExistingUser.id),
            supabaseAdmin.from('mz_offer_page_tracking').update({ user_id: newAuthId }).eq('user_id', preExistingUser.id),
            supabaseAdmin.from('product_stats').update({ user_id: newAuthId }).eq('user_id', preExistingUser.id)
          ]);
          console.log('[Migration Login Precheck] Dependency references re-linked successfully.');
        } catch (relErr) {
          console.warn('[Migration Login Precheck] Dependency mapping warning:', relErr);
        }

        // 11. Delete the old CSV temp profile
        console.log(`[Migration Login Precheck] Deleting old CSV-imported profile record of user ID: ${preExistingUser.id}`);
        const { error: delErr } = await supabaseAdmin.from('users').delete().eq('id', preExistingUser.id);
        if (delErr) {
          console.error('[Migration Login Precheck] Warning: profile record delete error:', delErr);
        } else {
          console.log('[Migration Login Precheck] CSV-imported profile record cleaned up successfully.');
        }

        // 12. Update legacy_passwords record to mark migration done for security!
        console.log(`[Migration Login Precheck] Marking migration done in legacy_passwords table for email: ${cleanEmail}`);
        const { error: legacyUpdErr } = await supabaseAdmin
          .from('legacy_passwords')
          .update({
            migrated: true,
            migrated_at: new Date().toISOString(),
            encrypted_password: 'MIGRATED' // Redact plain-text/hash for optimal security!
          })
          .eq('id', legacyData.id);

        if (legacyUpdErr) {
          console.error('[Migration Login Precheck] Warning: error updating legacy_passwords record:', legacyUpdErr);
        } else {
          console.log('[Migration Login Precheck] Legacy password record updated.');
        }
      }

      console.log(`[Migration Login Precheck] =============================================`);
      console.log(`[Migration Login Precheck] MIGRATION AND LIAISON SUCCESSFUL for: ${cleanEmail}`);
      console.log(`[Migration Login Precheck] =============================================`);
      return res.status(200).json({
        success: true,
        status: 'MIGRATION_COMPLETED',
        message: 'Félicitations ! Votre compte a été configuré avec succès.'
      });

    } catch (err: any) {
      console.error('[Migration Login Precheck] Crash inside automatic precheck-and-migrate endpoint:', err);
      return res.status(500).json({ error: err.message || 'Une erreur interne inattendue s’est produite.' });
    }
  });

  // API Route to broadcast a new product to ALL users
  app.post('/api/broadcast-product', async (req, res) => {
    const { productName, icon } = req.body;

    try {
      if (!productName) {
        return res.status(400).json({ error: 'Nom du produit manquant' });
      }

      // Fetch all users with a valid FCM token
      const { data: users, error: fetchError } = await supabase
        .from('users')
        .select('fcm_token')
        .not('fcm_token', 'is', null);

      if (fetchError) throw fetchError;

      if (!users || users.length === 0) {
        return res.json({ success: true, message: 'Aucun token trouvé, notification ignorée' });
      }

      const tokens = users.map(u => u.fcm_token as string).filter(Boolean);
      
      const title = 'Nouveau Service ! 🚀';
      const body = `Le service "${productName}" est maintenant disponible. Allez voir !`;
      
      const result = await sendMulticast(tokens, title, body, { 
        icon: icon || '/icon.png',
        url: '/catalog' 
      });

      res.json(result);
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error('API Broadcast-Product Error:', error);
      res.status(500).json({ error: err.message });
    }
  });

  initAdmin();

  // Background Dispatcher for Priority Notifications (Run every 30 seconds)
  console.log('[Server] Dispatcher interval set (30s)');
  setInterval(() => {
    console.log('[Server] Starting runPriorityDispatcher...');
    runPriorityDispatcher().catch(err => {
      console.error('[Dispatcher Error]', err);
    });
  }, 30000);

  // API Route to send real FCM Push (using the new service)
  app.post('/api/send-push', async (req, res) => {
    const { token, tokens: initialTokens, title, body, url, icon, target } = req.body;
    let tokens = initialTokens || [];

    // Diagnostic if service account is obviously missing
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
      console.error('[FIREBASE API] FIREBASE_SERVICE_ACCOUNT is missing in environment variables');
      return res.status(500).json({ 
        success: false, 
        error: 'missing_config', 
        details: 'Server environment missing FIREBASE_SERVICE_ACCOUNT. Contact admin.' 
      });
    }

    try {
      if (target === 'all' && tokens.length === 0) {
        const { data: users, error: supabaseErr } = await supabaseAdmin.from('users').select('fcm_token').not('fcm_token', 'is', null);
        if (supabaseErr) {
           console.error('[Supabase Error] Fetching tokens for broadcast:', supabaseErr);
           return res.status(500).json({ success: false, error: 'database_error', details: supabaseErr.message });
        }
        if (users) {
          tokens = users.map(u => u.fcm_token as string).filter(Boolean);
        }
      }

      if (!token && (!tokens || tokens.length === 0)) {
        return res.status(400).json({ error: 'Token ou liste de tokens manquant', details: 'Aucun destinataire valide trouvé' });
      }

      let result;
      if (tokens && Array.isArray(tokens) && tokens.length > 0) {
        // Envoi groupé (Multicast)
        result = await sendMulticast(tokens, title, body, { url, icon });
      } else if (token) {
        // Envoi individuel
        result = await sendPush(token, title, body, { url, icon });
      } else {
        return res.status(400).json({ error: 'Format de requête invalide' });
      }

      if (!result.success) {
        console.error('[FIREBASE API] Push failed:', result);
        return res.status(500).json({ ...result, server_time: new Date().toISOString() });
      }

      res.json(result);
    } catch (error: unknown) {
      const err = error as { message?: string; name?: string; code?: string };
      console.error('API Send-Push Error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'internal_exception', 
        details: err.message || 'Unknown server error',
        code: err.code
      });
    }
  });

  // Chariow API test endpoint with CORS / OPTIONS support
  app.use('/api/chariow/test', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  app.get('/api/chariow/test', async (req, res) => {
    const apiKeys = [
      process.env.CHARIOW_API_KEY,
      process.env.VITE_CHARIOW_API_KEY,
      process.env.CHARIOZ_API_KEY,
      process.env.VITE_CHARIOZ_API_KEY
    ];
    const apiKey = apiKeys.find(key => key && key.trim() !== '');

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: 'missing_api_key',
        message: "La clé API Chariow (CHARIOW_API_KEY) n'a pas été trouvée dans les variables d'environnement."
      });
    }

    try {
      console.log('[Chariow API Test] Testing connection...');
      const response = await fetch('https://api.chariow.com/v1/store', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey.trim()}`,
          'Accept': 'application/json'
        }
      });

      const contentType = response.headers.get('content-type');
      let data = null;
      if (contentType && contentType.includes('application/json')) {
        data = await response.json().catch(() => null);
      } else {
        data = await response.text().catch(() => null);
      }
      
      return res.json({
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        data: data,
        detectedKeyLength: apiKey.length,
        detectedKeyPreview: apiKey.length > 8 ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : '****'
      });
    } catch (error: any) {
      console.error('[Chariow API Test] Error:', error);
      return res.status(500).json({
        success: false,
        error: 'fetch_error',
        message: "Erreur de connexion lors de la communication avec l'API Chariow.",
        details: error.message
      });
    }
  });

  // Chariow API products endpoint with CORS / OPTIONS support
  app.use('/api/chariow/products', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  app.get('/api/chariow/products', async (req, res) => {
    const apiKeys = [
      process.env.CHARIOW_API_KEY,
      process.env.VITE_CHARIOW_API_KEY,
      process.env.CHARIOZ_API_KEY,
      process.env.VITE_CHARIOZ_API_KEY
    ];
    const apiKey = apiKeys.find(key => key && key.trim() !== '');

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: 'missing_api_key',
        message: "La clé API Chariow (CHARIOW_API_KEY) n'a pas été trouvée dans les variables d'environnement."
      });
    }

    try {
      console.log('[Chariow API Products] Fetching products list with pagination and high limits...');
      let allProducts: any[] = [];
      let page = 1;
      let hasMore = true;
      const limit = 100;
      let lastResponseStatus = 200;
      let lastResponseStatusText = 'OK';
      let isSuccess = false;

      while (hasMore && page <= 5) {
        const url = `https://api.chariow.com/v1/products?page=${page}&limit=${limit}&per_page=${limit}&size=${limit}`;
        console.log(`[Chariow API Products] Fetching page ${page}: ${url}`);

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey.trim()}`,
            'Accept': 'application/json'
          }
        });

        lastResponseStatus = response.status;
        lastResponseStatusText = response.statusText;

        if (!response.ok) {
          console.error(`[Chariow API Products] Failed to fetch page ${page}:`, response.status, response.statusText);
          if (page === 1) {
            return res.status(response.status).json({
              success: false,
              status: response.status,
              statusText: response.statusText,
              message: "Chariow API a retourné une erreur lors de la requête de la page 1."
            });
          }
          break;
        }

        isSuccess = true;
        const contentType = response.headers.get('content-type');
        let data: any = null;
        if (contentType && contentType.includes('application/json')) {
          data = await response.json().catch(() => null);
        } else {
          data = await response.text().catch(() => null);
        }

        if (!data) {
          hasMore = false;
          break;
        }

        // Safe extraction of products array for the current page
        let pageProducts: any[] = [];
        if (Array.isArray(data)) {
          pageProducts = data;
        } else if (data && typeof data === 'object') {
          if (data.data?.products && Array.isArray(data.data.products)) {
            pageProducts = data.data.products;
          } else if (data.products && Array.isArray(data.products)) {
            pageProducts = data.products;
          } else if (data.data && Array.isArray(data.data)) {
            pageProducts = data.data;
          }
        }

        if (pageProducts.length === 0) {
          hasMore = false;
          break;
        }

        // Add to our main collection
        allProducts = [...allProducts, ...pageProducts];

        // Determine if there is an explicit next page
        let totalPages = 1;
        let currentPage = page;
        if (data && typeof data === 'object') {
          const meta = data.meta || data.pagination || data.data?.meta || data.data?.pagination;
          if (meta) {
            totalPages = Number(meta.last_page || meta.totalPages || meta.pageCount || 1);
            currentPage = Number(meta.current_page || meta.page || currentPage);
          }
        }

        if (currentPage < totalPages) {
          page++;
        } else if (pageProducts.length >= limit) {
          // If hit limit but no metadata, speculate another page
          page++;
        } else {
          hasMore = false;
        }
      }

      // Deduplicate products based on their unique ID to avoid duplicates if pages overlap
      const seenIds = new Set();
      const uniqueProducts = allProducts.filter((p: any) => {
        const id = p?.id || p?._id;
        if (!id) return true; // Keep any items without ID
        if (seenIds.has(id)) return false;
        seenIds.add(id);
        return true;
      });

      console.log(`[Chariow API Products] Successfully fetched and merged ${uniqueProducts.length} unique products across pages.`);

      // Format response to satisfy any structure the frontend components check
      const finalPayload = {
        products: uniqueProducts,
        data: {
          products: uniqueProducts
        }
      };

      return res.json({
        success: isSuccess,
        status: lastResponseStatus,
        statusText: lastResponseStatusText,
        data: finalPayload,
        detectedKeyLength: apiKey.length,
        detectedKeyPreview: apiKey.length > 8 ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : '****'
      });
    } catch (error: any) {
      console.error('[Chariow API Products] Error:', error);
      return res.status(500).json({
        success: false,
        error: 'fetch_error',
        message: "Erreur de connexion lors du chargement des produits de l'API Chariow.",
        details: error.message
      });
    }
  });

  // Chariow API checkout integration with CORS / OPTIONS support
  app.use('/api/chariow/checkout', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  app.post('/api/chariow/checkout', async (req, res) => {
    const apiKeys = [
      process.env.CHARIOW_API_KEY,
      process.env.VITE_CHARIOW_API_KEY,
      process.env.CHARIOZ_API_KEY,
      process.env.VITE_CHARIOZ_API_KEY
    ];
    const apiKey = apiKeys.find(key => key && key.trim() !== '');

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: 'missing_api_key',
        message: "La clé API Chariow (CHARIOW_API_KEY) n'a pas été trouvée dans les variables d'environnement."
      });
    }

    const { product_id, email, first_name, last_name, phone, redirect_url } = req.body;

    if (!product_id) {
      return res.status(400).json({
        success: false,
        error: 'invalid_parameters',
        message: "Le paramètre 'product_id' est requis au format string."
      });
    }

    try {
      const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
      const host = req.get('host') || 'localhost:3000';
      const origin = `${protocol}://${host}`;
      const webhookUrl = `${origin}/api/chariow/pulse`;

      console.log(`[Chariow API Checkout] Initiating checkout for user ${email || 'unknown'} and product ${product_id}. Origin: ${origin}, Webhook URL: ${webhookUrl}`);
      
      const response = await fetch('https://api.chariow.com/v1/checkout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          product_id,
          email,
          first_name,
          last_name,
          phone,
          redirect_url: redirect_url || undefined,
          callback_url: redirect_url || undefined,
          return_url: redirect_url || undefined,
          webhook_url: webhookUrl,
          ipn_url: webhookUrl
        })
      });

      const contentType = response.headers.get('content-type');
      let data = null;
      if (contentType && contentType.includes('application/json')) {
        data = await response.json().catch(() => null);
      } else {
        data = await response.text().catch(() => null);
      }
      
      return res.json({
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        data: data,
        detectedKeyLength: apiKey.length,
        detectedKeyPreview: apiKey.length > 8 ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : '****'
      });
    } catch (error: any) {
      console.error('[Chariow API Checkout] Error during checkout call:', error);
      return res.status(500).json({
        success: false,
        error: 'fetch_error',
        message: "Erreur de connexion lors de l'appel à la passerelle de paiement Chariow.",
        details: error.message
      });
    }
  });

  // Support CORS / OPTIONS pour le webhook des Pulses Chariow
  app.use(['/api/chariow/pulse', '/api/chariow/webhook'], (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Webhook pour les "Pulses" Chariow (Notifications webhook de vente finalisée)
  app.post(['/api/chariow/pulse', '/api/chariow/webhook'], async (req, res) => {
    const contentType = (req.headers['content-type'] || '').toLowerCase();
    console.log(`[Chariow Webhook] Pulse received. Content-Type: ${contentType}. Headers:`, JSON.stringify(req.headers, null, 2));
    console.log('[Chariow Webhook] Pulse body payload:', JSON.stringify(req.body, null, 2));

    const eventType = req.body?.event || 'successful.sale';

    const logEntry: any = {
      event: eventType,
      body: req.body || {},
      status: 'received',
      details: `[Source: Custom Server] [Content-Type: ${contentType}]`
    };

    try {
      const body = req.body || {};
      const dataPayload = body.data || {};
      
      // Extraction robuste de l'identifiant du produit Chariow
      const chariow_product_id = 
        body.product_id || 
        dataPayload.product_id || 
        (dataPayload.product && dataPayload.product.id) || 
        (body.product && body.product.id) ||
        (dataPayload.checkout && dataPayload.checkout.product_id) ||
        body.chariow_product_id;

      const customerEmail = 
        body.email || 
        dataPayload.email || 
        (dataPayload.customer && dataPayload.customer.email) || 
        (body.customer && body.customer.email);

      logEntry.product_id = chariow_product_id;
      logEntry.email = customerEmail;

      if (!chariow_product_id) {
        logEntry.status = 'ignored';
        logEntry.details = `Événement ${eventType} reçu mais ignoré car aucun product_id n'a été trouvé dans le payload.`;
        logChariowPulseToDisk(logEntry);
        return res.status(200).json({
          success: false,
          message: "Aucun product_id trouvé dans le payload du webhook. Webhook acquitté."
        });
      }

      // Récupération dynamique de la clé de correspondance Chariow de l'offre Premium
      let premiumChariowId = 'prd_iwhpro';
      try {
        const { data: psConf } = await supabaseAdmin
          .from('platform_settings')
          .select('value')
          .eq('id', 'flash_offer_chariow_product_id')
          .maybeSingle();
        if (psConf?.value?.product_id) {
          premiumChariowId = psConf.value.product_id;
        } else {
          const { data: flashConf } = await supabaseAdmin
            .from('mz_flash_offer_v2')
            .select('chariow_product_id')
            .eq('id', 'flash-offer-global')
            .maybeSingle();
          if (flashConf?.chariow_product_id) {
            premiumChariowId = flashConf.chariow_product_id;
          }
        }
      } catch (errConf) {
        console.error('[Chariow Webhook] Erreur lecture config flash offer, fallback prd_iwhpro:', errConf);
      }

      // Trouver le produit correspondant dans notre base de données Supabase
      let product = null;
      let prodErr = null;

      const { data: dbProduct, error: dbProdErr } = await supabaseAdmin
        .from('products')
        .select('id, name, commission_amount')
        .eq('chariow_product_id', chariow_product_id)
        .maybeSingle();

      product = dbProduct;
      prodErr = dbProdErr;

      // Un produit de secours virtuel pour l'offre MZ+ Premium s'il n'est pas encore enregistré dans la table
      if ((!product || prodErr) && chariow_product_id === premiumChariowId) {
        product = {
          id: '00000000-0000-0000-0000-000000000000',
          name: 'MZ+ Premium',
          commission_amount: 5000,
          chariow_product_id: premiumChariowId
        };
        prodErr = null;
      }

      if (prodErr || !product) {
        logEntry.status = 'product_not_found';
        logEntry.details = `Événement ${eventType} reçu mais impossible de trouver un produit correspondant dans Supabase pour l'identifiant Chariow : ${chariow_product_id}`;
        logChariowPulseToDisk(logEntry);
        return res.status(200).json({
          success: false,
          message: `Produit introuvable pour l'ID Chariow ${chariow_product_id}`
        });
      }

      logEntry.matched_product_name = product.name;

      const eventStr = String(eventType || '').toLowerCase();
      const isRejectedEvent = eventStr === 'failed.sale' || 
                              eventStr === 'abandoned.sale' || 
                              eventStr.includes('abandon') || 
                              eventStr.includes('reject') || 
                              eventStr.includes('fail') || 
                              eventStr.includes('cancel') ||
                              eventStr.includes('echec') || 
                              eventStr.includes('échec') || 
                              eventStr.includes('echou') ||
                              eventStr.includes('annul') ||
                              eventStr.includes('refus');

      // Si c'est l'offre flash premium (produit chariow configuré)
      if (chariow_product_id === premiumChariowId && customerEmail && !isRejectedEvent) {
        const { data: updatedUser, error: updateLevelErr } = await supabaseAdmin
          .from('users')
          .update({ user_level: 'niveau_mz_plus' })
          .ilike('email', customerEmail.trim())
          .select();
          
        if (updateLevelErr) {
          console.error("[Chariow Webhook] Erreur de promotion Premium:", updateLevelErr);
          logEntry.details += ` [Erreur promotion: ${updateLevelErr.message}]`;
        } else if (updatedUser && updatedUser.length > 0) {
          console.log(`[Chariow Webhook] Utilisateur ${customerEmail} promu 'niveau_mz_plus'.`);
          logEntry.details += ` [Promu avec succès]`;
        } else {
          console.warn("[Chariow Webhook] Aucun utilisateur trouvé avec l'e-mail:", customerEmail);
          logEntry.details += ` [Utilisateur non trouvé par e-mail: ${customerEmail}]`;
        }
      }

      // --- DEBUT DU TRAITEMENT DU PULSE AVEC SPECIFIC COMMISSION ID SUPPORT ---
      let affiliateUserId = null;
      let associatedCommId = req.body?.commission_id || req.body?.data?.commission_id || null;

      console.log(`[Chariow Webhook DEBUG] RECEPTION - Événement : ${eventType}, Produit Chariow ID : ${chariow_product_id}, Client E-mail : ${customerEmail}, Commission Spécifique ID : ${associatedCommId}`);

      if (associatedCommId) {
        const { data: specificComm, error: specificCommErr } = await supabaseAdmin
          .from('commissions')
          .select('id, user_id, status')
          .eq('id', associatedCommId)
          .maybeSingle();

        if (specificCommErr) {
          console.error(`[Chariow Webhook DEBUG] Erreur lors de la recherche de la commission spécifique ${associatedCommId} :`, specificCommErr);
        } else if (specificComm) {
          affiliateUserId = specificComm.user_id;
          console.log(`[Chariow Webhook DEBUG] TRAITEMENT - Commission spécifique d'id : ${associatedCommId} trouvée pour l'affilié ${affiliateUserId}`);
        } else {
          console.warn(`[Chariow Webhook DEBUG] Commission spécifique d'id : ${associatedCommId} introuvable dans la base.`);
        }
      }

      if (!associatedCommId) {
        // Trouver la commission en attente ('pending') la plus récente pour ce produit physique
        console.log(`[Chariow Webhook DEBUG] TRAITEMENT - Recherche d'une commission en attente pour le produit ${product.id}`);
        const { data: pendingComms, error: commsErr } = await supabaseAdmin
          .from('commissions')
          .select('id, user_id, status')
          .eq('product_id', product.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });

        if (commsErr) {
          logEntry.status = 'error';
          logEntry.details = `Erreur de base de données lors de la recherche des commissions : ${commsErr.message}`;
          console.error(`[Chariow Webhook DEBUG] TRAITEMENT - Erreur de base de données commissions :`, commsErr);
          logChariowPulseToDisk(logEntry);
          return res.status(500).json({
            success: false,
            error: 'db_error',
            message: "Erreur de base de données."
          });
        }

        if (pendingComms && pendingComms.length > 0) {
          affiliateUserId = pendingComms[0].user_id;
          associatedCommId = pendingComms[0].id;
          console.log(`[Chariow Webhook DEBUG] TRAITEMENT - Commission en attente correspondante trouvée : ${associatedCommId} pour l'affilié : ${affiliateUserId}`);
        } else {
          // --- DEBUT DE LA RESOLUTION AUTOMATIQUE (PRODUCTION & SANS SIMULATION) ---
          console.log(`[Chariow Webhook DEBUG] TRAITEMENT - Aucune commission en attente trouvée pour le produit : ${product.name}. Essai de résolution autonome...`);
          
          // 1. Essai de détection directe du code de parrainage dans les métadonnées Chariow
          const directRefCode = body.ref || 
                                body.ref_code || 
                                body.referrer_code || 
                                body.referral_code ||
                                dataPayload.ref || 
                                dataPayload.ref_code || 
                                dataPayload.referrer_code || 
                                dataPayload.referral_code ||
                                (body.metadata && (body.metadata.ref || body.metadata.referrer_code || body.metadata.referral_code)) ||
                                (dataPayload.metadata && (dataPayload.metadata.ref || dataPayload.metadata.referrer_code || dataPayload.metadata.referral_code));

          if (directRefCode) {
            const { data: referrerUser } = await supabaseAdmin
              .from('users')
              .select('id')
              .eq('referral_code', String(directRefCode).trim())
              .maybeSingle();
              
            if (referrerUser) {
              affiliateUserId = referrerUser.id;
              console.log(`[Chariow Webhook DEBUG] TRAITEMENT - Affilié résolu par code direct du webhook : ${affiliateUserId}`);
              logEntry.details += ` [Affilié résolu par code direct: ${directRefCode}]`;
            }
          }

          // 2. Si pas trouvé, essai de résolution par e-mail de l'acheteur
          if (!affiliateUserId && customerEmail) {
            const { data: buyerUser } = await supabaseAdmin
              .from('users')
              .select('id, referral_code_used')
              .ilike('email', customerEmail.trim())
              .maybeSingle();

            if (buyerUser?.referral_code_used) {
              const { data: referrerUser } = await supabaseAdmin
                .from('users')
                .select('id')
                .eq('referral_code', buyerUser.referral_code_used)
                .maybeSingle();

              if (referrerUser) {
                affiliateUserId = referrerUser.id;
                console.log(`[Chariow Webhook DEBUG] TRAITEMENT - Affilié résolu par e-mail acheteur (Parrain) : ${affiliateUserId}`);
                logEntry.details += ` [Affilié résolu via e-mail acheteur parrainé]`;
              }
            }
          }

          // 3. Fallback spécial pour Pulse de test envoyé par Chariow
          if (!affiliateUserId && (String(customerEmail).includes('test') || !customerEmail || String(customerEmail).includes('chariow'))) {
            const { data: fallbackUser } = await supabaseAdmin
              .from('users')
              .select('id')
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (fallbackUser) {
              affiliateUserId = fallbackUser.id;
              console.log(`[Chariow Webhook DEBUG] TRAITEMENT - Fallback test appliqué. Commission attribuée au dernier utilisateur : ${affiliateUserId}`);
              logEntry.details += ` [Attribué par défaut au dernier utilisateur actif car email de test]`;
            }
          }
        }
      }

      // Helper pour synchroniser instantanément le solde du portefeuille (wallets) de l'utilisateur
      const syncWalletBalance = async (userId: string) => {
        if (!userId) return;
        try {
          console.log(`[Chariow Webhook DEBUG] PORTefeuille SYNCHRONISATION - Recalcul pour l'affilié ${userId}`);
          
          // Somme de toutes les commissions approuvées de l'utilisateur
          const { data: userComms, error: comListErr } = await supabaseAdmin
            .from('commissions')
            .select('amount')
            .eq('user_id', userId)
            .in('status', ['approved', 'finalized']);

          if (comListErr) {
            console.error(`[Chariow Webhook DEBUG] PORTefeuille SYNCHRONISATION - Erreure commissions de l'utilisateur :`, comListErr);
            return;
          }

          const runningTotal = userComms?.reduce((sum: number, c: any) => sum + (Number(c.amount) || 0), 0) || 0;
          
          const { error: walletErr } = await supabaseAdmin
            .from('wallets')
            .upsert({ user_id: userId, balance: runningTotal }, { onConflict: 'user_id' });

          if (walletErr) {
            console.error(`[Chariow Webhook DEBUG] PORTefeuille SYNCHRONISATION - Erreure de mise à jour du portefeuille :`, walletErr);
          } else {
            console.log(`[Chariow Webhook DEBUG] PORTefeuille SYNCHRONISATION - Portefeuille de l'affilié ${userId} mis à jour avec succès. Nouveau solde : ${runningTotal} FCFA`);
          }
        } catch (walletSyncError) {
          console.error(`[Chariow Webhook DEBUG] PORTefeuille SYNCHRONISATION - exception critique :`, walletSyncError);
        }
      };

      if (isRejectedEvent) {
        if (associatedCommId) {
          // La vente a échoué ou a été abandonnée, on rejette ('rejected') la commission associée existante
          console.log(`[Chariow Webhook DEBUG] TRAITEMENT - Rejet de la commission existante ${associatedCommId}`);
          const { error: updateErr } = await supabaseAdmin
            .from('commissions')
            .update({ status: 'rejected' })
            .eq('id', associatedCommId);

          if (updateErr) {
            logEntry.status = 'error';
            logEntry.details = `Erreur lors du rejet de la commission ${associatedCommId} : ${updateErr.message}`;
            logChariowPulseToDisk(logEntry);
            return res.status(500).json({
              success: false,
              error: 'update_error',
              message: "Erreur lors du rejet de la commission."
            });
          }

          // Portefeuille synchronisé en temps réel après le rejet pour s'assurer que sa balance est correcte
          if (affiliateUserId) {
            await syncWalletBalance(affiliateUserId);
          }

          logEntry.status = 'rejected';
          logEntry.details = `Vente échouée / abandonnée (${eventType}). Commission existante ${associatedCommId} passée en 'rejected'.`;
          logChariowPulseToDisk(logEntry);

          console.log(`[Chariow Webhook DEBUG] AFFICHAGE - Commission ${associatedCommId} rejetée avec succès.`);

          return res.status(200).json({
            success: true,
            message: `Événement ${eventType} traité. Commission ${associatedCommId} rejetée.`,
            commissionId: associatedCommId,
            status: 'rejected'
          });
        } else {
          // Aucun mouvement car vente échouée et pas de commission pré-existante
          logEntry.status = 'rejected';
          logEntry.details = `Événement d'échec de la vente reçu (${eventType}) : Un client a initié le processus de commande pour le produit "${product.name}" mais n'a pas finalisé son paiement. La transaction a été signalée en échec ou abandonnée par Chariow.`;
          logChariowPulseToDisk(logEntry);
          console.log(`[Chariow Webhook DEBUG] AFFICHAGE - Échec enregistré (statut rejeté).`);
          return res.status(200).json({
            success: true,
            message: `Événement ${eventType} enregistré comme échec de paiement.`
          });
        }

      } else {
        // Événement d'achat réussi
        if (associatedCommId) {
          // On marque la commission en attente existante comme validée : 'approved'
          console.log(`[Chariow Webhook DEBUG] TRAITEMENT - Approbation de la commission existante ${associatedCommId}`);
          const { error: updateErr } = await supabaseAdmin
            .from('commissions')
            .update({ status: 'approved' })
            .eq('id', associatedCommId);

          if (updateErr) {
            logEntry.status = 'error';
            logEntry.details = `Erreur lors de l'approbation de la commission existante ${associatedCommId} : ${updateErr.message}`;
            logChariowPulseToDisk(logEntry);
            return res.status(500).json({
              success: false,
              error: 'update_error',
              message: "Erreur de validation de la commission existante."
            });
          }

          // Portefeuille synchronisé en temps réel
          if (affiliateUserId) {
            await syncWalletBalance(affiliateUserId);
          }

          logEntry.status = 'success';
          logEntry.details += ` Vente réussie (${eventType}). Commission existante ${associatedCommId} de ${product.commission_amount} FCFA validée en 'approved'.`;
          logChariowPulseToDisk(logEntry);

          console.log(`[Chariow Webhook DEBUG] AFFICHAGE - Commission ${associatedCommId} approuvée avec succès.`);

          return res.status(200).json({
            success: true,
            message: `Commission ${associatedCommId} approuvée avec succès (Mise à jour).`,
            commissionId: associatedCommId,
            userId: affiliateUserId,
            status: 'approved'
          });

        } else if (affiliateUserId) {
          // Génial ! On crée à la volée une toute nouvelle commission validée ('approved') pour cet affilié identifié !
          console.log(`[Chariow Webhook DEBUG] TRAITEMENT - Création d'une nouvelle commission approved pour l'affilié ${affiliateUserId}`);
          const { data: newComm, error: insertCommErr } = await supabaseAdmin
            .from('commissions')
            .insert([{
              user_id: affiliateUserId,
              product_id: product.id,
              amount: product.commission_amount,
              status: 'approved'
            }])
            .select();

          if (insertCommErr) {
            logEntry.status = 'error';
            logEntry.details = `Erreur lors de la création automatique de commission à la volée : ${insertCommErr.message}`;
            logChariowPulseToDisk(logEntry);
            return res.status(500).json({
              success: false,
              error: 'insert_error',
              message: "Erreur lors de la création automatique de la commission."
            });
          }

          // Portefeuille synchronisé en temps réel
          await syncWalletBalance(affiliateUserId);

          const createdComm = newComm?.[0];
          logEntry.status = 'success';
          logEntry.details += ` Vente réussie (${eventType}). Nouvelle commission ${createdComm?.id || ''} de ${product.commission_amount} FCFA créée automatiquement en 'approved' pour l'affilié ${affiliateUserId}.`;
          logChariowPulseToDisk(logEntry);

          console.log(`[Chariow Webhook DEBUG] AFFICHAGE - Nouvelle commission de vente créée et approuvée pour l'affilié ${affiliateUserId}.`);

          return res.status(200).json({
            success: true,
            message: `Commission de ${product.commission_amount} FCFA générée et validée automatiquement avec succès !`,
            commissionId: createdComm?.id,
            userId: affiliateUserId,
            status: 'approved'
          });
        } else {
          // Aucun affilié trouvé et aucune commission pending n'existe
          if (chariow_product_id === 'prd_iwhpro') {
            logEntry.status = 'success';
            logEntry.details += ` Vente réussie de l'offre flash Premium (${eventType}) traitée avec succès sans parrainage.`;
            logChariowPulseToDisk(logEntry);
            return res.status(200).json({
              success: true,
              message: "Utilisateur promu membre Premium MZ+ avec succès."
            });
          }

          logEntry.status = 'ignored';
          logEntry.details = `Achat validé reçu pour le produit '${product.name}', mais aucun affilié et aucun code d'affiliation n'a pu être identifié pour attribuer le gain.`;
          logChariowPulseToDisk(logEntry);
          console.log(`[Chariow Webhook DEBUG] AFFICHAGE - Vente ignorée : aucun parrain trouvé.`);
          return res.status(200).json({
            success: true,
            message: "Achat enregistré avec succès au niveau du catalogue mais ignoré pour l'affiliation par manque de parrain."
          });
        }
      }

    } catch (err: any) {
      console.error('[Chariow Webhook] Erreur critique système dans le traitement du pulse:', err);
      logEntry.status = 'failure';
      logEntry.details = `Erreur système critique : ${err.message}`;
      logChariowPulseToDisk(logEntry);
      return res.status(200).json({
        success: false,
        error: 'webhook_internal_error',
        message: err.message
      });
    }
  });

  // Obtenir l'historique de tous les webhooks / pulses Chariow reçus
  app.get('/api/chariow/webhook-logs', async (req, res) => {
    try {
      // Tenter de lire depuis Supabase pour synchronisation universelle
      const { data, error } = await supabaseAdmin
        .from('platform_settings')
        .select('value')
        .eq('id', 'chariow_webhook_logs')
        .maybeSingle();

      if (!error && data && Array.isArray(data.value)) {
        return res.json({ success: true, data: data.value });
      }

      // Repli sur disque local si absent ou erreur Supabase
      if (fs.existsSync(PULSES_FILE)) {
        const content = fs.readFileSync(PULSES_FILE, 'utf-8');
        return res.json({ success: true, data: JSON.parse(content) });
      }
      return res.json({ success: true, data: [] });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Vider les logs
  app.post('/api/chariow/webhook-logs/clear', async (req, res) => {
    try {
      // 1. Vider dans Supabase
      await supabaseAdmin
        .from('platform_settings')
        .upsert({ id: 'chariow_webhook_logs', value: [] });

      // 2. Vider en local
      fs.writeFileSync(PULSES_FILE, JSON.stringify([], null, 2), 'utf-8');
      
      return res.json({ success: true, message: 'L\'historique des pulses a été réinitialisé.' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Endpoints robustes et infaillibles pour platform_settings (store_customization)
  const PLATFORM_SETTINGS_FILE = path.join(process.cwd(), 'platform_settings_backup.json');

  app.get('/api/platform-settings/store_customization', async (req, res) => {
    try {
      // 1. Tenter de lire depuis Supabase
      const { data, error } = await supabaseAdmin
        .from('platform_settings')
        .select('value')
        .eq('id', 'store_customization')
        .maybeSingle();

      if (!error && data && data.value) {
        return res.json({ success: true, enabled: data.value.enabled !== false });
      }

      // 2. Repli vers le fichier local si Supabase a échoué ou n'a pas la valeur
      if (fs.existsSync(PLATFORM_SETTINGS_FILE)) {
        const content = fs.readFileSync(PLATFORM_SETTINGS_FILE, 'utf-8');
        const parsed = JSON.parse(content);
        return res.json({ success: true, enabled: parsed.enabled !== false });
      }

      // 3. Valeur par défaut
      return res.json({ success: true, enabled: true });
    } catch (err: any) {
      // En cas de crash total, toujours retourner la valeur par défaut pour ne pas bloquer l'App
      return res.json({ success: true, enabled: true });
    }
  });

  app.post('/api/platform-settings/store_customization', async (req, res) => {
    try {
      const { enabled } = req.body;
      const val = { enabled: enabled !== false };

      // 1. Écriture immédiate sur disque en local (infaillible, pas d'erreurs RLS possibles)
      fs.writeFileSync(PLATFORM_SETTINGS_FILE, JSON.stringify(val, null, 2), 'utf-8');

      // 2. Tenter de synchroniser sur Supabase silencieusement pour multi-instances
      try {
        await supabaseAdmin
          .from('platform_settings')
          .upsert({ id: 'store_customization', value: val });
      } catch (dbErr) {
        console.warn("[Server] Suppressed database sync error for store_customization:", dbErr);
      }

      return res.json({ success: true, enabled: val.enabled });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Generic platform-settings endpoints (RLS-bypass proxies using Service Role)
  app.get('/api/platform-settings/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const idClean = id.replace(/[^a-z0-9_-]/gi, '');
      const backupFile = path.join(process.cwd(), `platform_settings_${idClean}.json`);

      // STRICT REQUIREMENT: app_images must run 100% locally and never query the database
      if (id === 'app_images') {
        if (fs.existsSync(backupFile)) {
          const content = fs.readFileSync(backupFile, 'utf-8');
          const parsed = JSON.parse(content);
          return res.json({ success: true, value: parsed });
        }
        return res.json({ success: true, value: {} });
      }

      const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
      const supabaseAdmin = createClient(SUPABASE_URL, adminKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });

      const { data, error } = await supabaseAdmin
        .from('platform_settings')
        .select('value')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.warn(`[Server] Supabase load error for ${id}:`, error.message);
        if (fs.existsSync(backupFile)) {
          const content = fs.readFileSync(backupFile, 'utf-8');
          const parsed = JSON.parse(content);
          return res.json({ success: true, value: parsed });
        }
        return res.json({ success: true, value: null });
      }

      return res.json({ success: true, value: data?.value || null });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/platform-settings/:id', express.json(), async (req, res) => {
    try {
      const { id } = req.params;
      const { value } = req.body;

      // Local filesystem backup (guarantees local persistent saving instantaneously)
      const idClean = id.replace(/[^a-z0-9_-]/gi, '');
      const backupFile = path.join(process.cwd(), `platform_settings_${idClean}.json`);
      fs.writeFileSync(backupFile, JSON.stringify(value, null, 2), 'utf-8');

      // STRICT REQUIREMENT: app_images must run 100% locally and never query the database
      if (id === 'app_images') {
        console.log(`[Server] app_images enregistré localement avec succès !`);
        return res.json({ success: true, value });
      }

      // Service Role writing bypasses client RLS restrictions
      const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
      const supabaseAdmin = createClient(SUPABASE_URL, adminKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });

      const { error } = await supabaseAdmin
        .from('platform_settings')
        .upsert({ id, value });

      if (error) {
        console.warn(`[Server] Supabase write error for ${id}, fell back to local file. Error:`, error.message);
      }

      return res.json({ success: true, value });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Efficient and light-weight click tracking endpoint that bypasses RLS using Service Role
  app.post('/api/track-click', async (req, res) => {
    try {
      const { user_id, product_id } = req.body;
      if (!user_id || !product_id) {
        return res.status(400).json({ success: false, error: 'Missing user_id or product_id' });
      }

      const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
      const supabaseAdmin = createClient(SUPABASE_URL, adminKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });

      // We perform a direct SELECT first to find if a record exists
      const { data: existing, error: seekError } = await supabaseAdmin
        .from('product_stats')
        .select('*')
        .eq('user_id', user_id)
        .eq('product_id', product_id)
        .maybeSingle();

      if (seekError) {
        throw seekError;
      }

      if (existing) {
        // Increment existing record clicks count
        const { error: updateError } = await supabaseAdmin
          .from('product_stats')
          .update({ clicks: (existing.clicks || 0) + 1 })
          .eq('user_id', user_id)
          .eq('product_id', product_id);

        if (updateError) throw updateError;
      } else {
        // Insert new record
        const { error: insertError } = await supabaseAdmin
          .from('product_stats')
          .insert({
            user_id,
            product_id,
            clicks: 1
          });

        if (insertError) throw insertError;
      }

      return res.json({ success: true });
    } catch (err: any) {
      console.error("[Server] Error tracking click:", err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Fetch product stats using Service Role to bypass any RLS restriction or caching on client side
  app.get('/api/product-stats', async (req, res) => {
    try {
      const { user_id } = req.query;
      if (!user_id || typeof user_id !== 'string') {
        return res.status(400).json({ success: false, error: 'Missing or invalid user_id' });
      }

      const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
      const supabaseAdmin = createClient(SUPABASE_URL, adminKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });

      const { data, error } = await supabaseAdmin
        .from('product_stats')
        .select('product_id, clicks')
        .eq('user_id', user_id);

      if (error) {
        throw error;
      }

      return res.json({ success: true, data: data || [] });
    } catch (err: any) {
      console.error("[Server] Error fetching product stats:", err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/commissions/summary', async (req, res) => {
    try {
      const { user_id, period } = req.query;
      if (!user_id || typeof user_id !== 'string') {
        return res.status(400).json({ success: false, error: 'Missing or invalid user_id parameter' });
      }

      const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
      const supabaseAdmin = createClient(SUPABASE_URL, adminKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });

      // Check if user is ivan1@gmail.com to inject simulation
      let isIvan = false;
      try {
        const { data: uProf } = await supabaseAdmin
          .from('users')
          .select('email')
          .eq('id', user_id)
          .maybeSingle();
        if (uProf?.email === 'ivan1@gmail.com') {
          isIvan = true;
        }
      } catch (checkErr) {
        console.warn("Error checking user email for injection:", checkErr);
      }

      // Query only status, amount, and created_at to preserve bandwidth and accelerate DB responses
      let query = supabaseAdmin
        .from('commissions')
        .select('status, amount, created_at')
        .eq('user_id', user_id);

      if (period === '7d') {
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - 7);
        query = query.gte('created_at', dateLimit.toISOString());
      } else if (period === '30d') {
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - 30);
        query = query.gte('created_at', dateLimit.toISOString());
      }

      const { data, error } = await query;
      if (error) {
        throw error;
      }

      let totalVolume = 0;
      let totalSales = 0;
      let pendingCount = 0;
      let approvedCount = 0;
      let rejectedCount = 0;
      let finalizedCount = 0;

      if (data && data.length > 0) {
        data.forEach((c: any) => {
          const amt = Number(c.amount) || 0;
          if (c.status === 'approved') {
            totalVolume += amt;
            approvedCount++;
          } else if (c.status === 'pending') {
            pendingCount++;
          } else if (c.status === 'rejected') {
            rejectedCount++;
          } else if (c.status === 'finalized') {
            finalizedCount++;
          }
        });
        totalSales = approvedCount + finalizedCount;
      }

      const totalCount = data ? data.length : 0;
      let validationRate = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;

      if (isIvan) {
        totalSales = 256;
        approvedCount = 256;
        totalVolume = 750000;
        validationRate = 100;
      }

      return res.json({
        success: true,
        summary: {
          totalVolume,
          totalSales,
          approvedCount,
          pendingCount: isIvan ? 0 : pendingCount,
          rejectedCount: isIvan ? 0 : rejectedCount,
          finalizedCount: isIvan ? 0 : finalizedCount,
          totalCount: isIvan ? 256 : totalCount,
          validationRate
        }
      });
    } catch (err: any) {
      console.error("[Server] Error in commissions summary API:", err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // =========================================================================
  // RANK REWARDS AND CLAIM PROXIES (TO BYPASS RLS RESTRICTIONS ON MOBILE/WEB)
  // =========================================================================

  app.get('/api/rank-rewards', async (req, res) => {
    console.log('[API GET /api/rank-rewards] Fetching rewards from Supabase using Service Role...');
    try {
      const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
      const supabaseAdmin = createClient(SUPABASE_URL, adminKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });
      const { data, error } = await supabaseAdmin
        .from('rank_rewards')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[API GET /api/rank-rewards] Supabase returned error:', error);
        return res.status(500).json({ error: error.message });
      }

      console.log(`[API GET /api/rank-rewards] Success! Received ${data?.length || 0} rewards from Supabase`);
      return res.json(data || []);
    } catch (e: any) {
      console.error('[API GET /api/rank-rewards] Caught system error:', e);
      return res.status(500).json({ error: e.message || 'System error' });
    }
  });

  app.post('/api/rank-rewards', async (req, res) => {
    const editForm = req.body;
    console.log('[API POST /api/rank-rewards] Received data for reward creation/update:', JSON.stringify(editForm, null, 2));
    try {
      const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
      const supabaseAdmin = createClient(SUPABASE_URL, adminKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });

      if (editForm.id) {
        // Update operation
        console.log(`[API POST /api/rank-rewards] Update requested for rank_reward ID: ${editForm.id}`);
        const { created_at, ...updateData } = editForm;
        const { data, error } = await supabaseAdmin
          .from('rank_rewards')
          .update(updateData)
          .eq('id', editForm.id)
          .select();

        if (error) {
          console.error('[API POST /api/rank-rewards] Update failed. Supabase error:', error);
          return res.status(400).json({ error: error.message });
        }

        console.log('[API POST /api/rank-rewards] Update success. Result:', JSON.stringify(data, null, 2));
        return res.json(data ? data[0] : null);
      } else {
        // Insert operation
        console.log('[API POST /api/rank-rewards] Insert requested...');
        const { data, error } = await supabaseAdmin
          .from('rank_rewards')
          .insert([editForm])
          .select();

        if (error) {
          console.error('[API POST /api/rank-rewards] Insert failed. Supabase error:', error);
          return res.status(400).json({ error: error.message });
        }

        console.log('[API POST /api/rank-rewards] Insert success. Result:', JSON.stringify(data, null, 2));
        return res.json(data ? data[0] : null);
      }
    } catch (e: any) {
      console.error('[API POST /api/rank-rewards] Caught system error:', e);
      return res.status(500).json({ error: e.message || 'System error' });
    }
  });

  app.delete('/api/rank-rewards/:id', async (req, res) => {
    const { id } = req.params;
    console.log(`[API DELETE /api/rank-rewards/${id}] Deleting reward...`);
    try {
      const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
      const supabaseAdmin = createClient(SUPABASE_URL, adminKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });

      // 1. Delete associated user_rank_rewards
      console.log(`[API DELETE /api/rank-rewards/${id}] Deleting claims in user_rank_rewards first...`);
      await supabaseAdmin.from('user_rank_rewards').delete().eq('reward_id', id);

      // 2. Delete reward
      const { error } = await supabaseAdmin
        .from('rank_rewards')
        .delete()
        .eq('id', id);

      if (error) {
        console.error(`[API DELETE /api/rank-rewards/${id}] Deleting rank_reward failed:`, error);
        return res.status(400).json({ error: error.message });
      }

      console.log(`[API DELETE /api/rank-rewards/${id}] Success! Deleted reward.`);
      return res.json({ success: true });
    } catch (e: any) {
      console.error(`[API DELETE /api/rank-rewards] Caught system error:`, e);
      return res.status(500).json({ error: e.message || 'System error' });
    }
  });

  app.get('/api/user-rank-rewards/:userId', async (req, res) => {
    const { userId } = req.params;
    console.log(`[API GET /api/user-rank-rewards/${userId}] Fetching user rewards claims using Service Role...`);
    try {
      const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
      const supabaseAdmin = createClient(SUPABASE_URL, adminKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });

      const { data, error } = await supabaseAdmin
        .from('user_rank_rewards')
        .select('*, reward:rank_rewards(*)')
        .eq('user_id', userId);

      if (error) {
        console.error(`[API GET /api/user-rank-rewards/${userId}] Selector failed. Supabase error:`, error);
        return res.status(500).json({ error: error.message });
      }

      console.log(`[API GET /api/user-rank-rewards/${userId}] Success! Found ${data?.length || 0} claims.`);
      return res.json(data || []);
    } catch (e: any) {
      console.error(`[API GET /api/user-rank-rewards/${userId}] Caught system error:`, e);
      return res.status(500).json({ error: e.message || 'System error' });
    }
  });

  app.post('/api/user-rank-rewards', async (req, res) => {
    const claimData = req.body;
    console.log('[API POST /api/user-rank-rewards] Claims insert requested:', JSON.stringify(claimData, null, 2));
    try {
      const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
      const supabaseAdmin = createClient(SUPABASE_URL, adminKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });

      const { data, error } = await supabaseAdmin
        .from('user_rank_rewards')
        .insert([claimData])
        .select();

      if (error) {
        console.error('[API POST /api/user-rank-rewards] Claims insert failed. Supabase error:', error);
        return res.status(400).json({ error: error.message });
      }

      console.log('[API POST /api/user-rank-rewards] Claims insert success. Result:', JSON.stringify(data, null, 2));
      return res.json(data ? data[0] : null);
    } catch (e: any) {
      console.error('[API POST /api/user-rank-rewards] Caught system error:', e);
      return res.status(500).json({ error: e.message || 'System error' });
    }
  });

  // Health Check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Dynamic Environment Configuration route for frontend client
  app.get('/env-config.js', (req, res) => {
    res.type('application/javascript');
    res.send(`
      window.__ENV__ = {
        VITE_SUPABASE_URL: ${JSON.stringify(process.env.VITE_SUPABASE_URL || '')},
        VITE_SUPABASE_ANON_KEY: ${JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY || '')},
        VITE_FIREBASE_VAPID_KEY: ${JSON.stringify(process.env.VITE_FIREBASE_VAPID_KEY || '')}
      };
    `);
  });

  // API error handler - guarantees JSON for all /api/* errors
  app.use('/api', (err: any, req: any, res: any, next: any) => {
    console.error('[API Unhandled Error]', err);
    res.status(500).json({
      success: false,
      error: 'internal_server_error',
      message: err.message || 'Une erreur interne est survenue sur le serveur.',
      details: String(err)
    });
  });

  app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    // Servir dynamiquement les dossiers de sons et preuves physiques depuis le stockage local de runtime si existant
    app.use('/sounds', express.static(path.join(process.cwd(), 'public', 'sounds')));
    app.use('/proofs', express.static(path.join(process.cwd(), 'public', 'proofs')));
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('[Startup] Enclenchement de la réplication des fichiers statiques Google Drive en tâche de fond...');
    replicateGDriveFileOnServer('1ufBs7y_MYdOcw9st0BpScHoy_3hV26jW', 'soufa_bakari.png')
      .then(url => console.log('[Startup] Réplication réussie pour soufa bakari:', url))
      .catch(e => console.warn('[Startup] Échec de la réplication de fond pour soufa bakari:', e.message));
    replicateGDriveFileOnServer('1vKMy7iKAc4yUaNI-kClV9ovGKbe8HiWK', 'aladin_mousa.png')
      .then(url => console.log('[Startup] Réplication réussie pour aladin mousa:', url))
      .catch(e => console.warn('[Startup] Échec de la réplication de fond pour aladin mousa:', e.message));
  });
}

startServer();
