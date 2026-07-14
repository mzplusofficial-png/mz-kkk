import React, { useState, useEffect, useCallback } from 'react';
import { 
  Folder, File, Image as ImageIcon, Video, Music, FileText, Search, 
  ExternalLink, LogIn, LogOut, Check, Copy, RefreshCw, X, Filter 
} from 'lucide-react';
import { googleSignIn, logout, initAuth, getAccessToken, getCurrentUser } from '../../../services/googleAuth';
import { type User } from 'firebase/auth';

interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  webViewLink?: string;
  iconLink?: string;
  size?: string;
}

interface GoogleDriveExplorerProps {
  onSelectFile?: (links: { id: string; directView: string; directDownload: string; name: string }) => void;
  onClose?: () => void;
  isModal?: boolean;
}

export const GoogleDriveExplorer: React.FC<GoogleDriveExplorerProps> = ({ 
  onSelectFile, 
  onClose,
  isModal = false
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [files, setFiles] = useState<GoogleDriveFile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState<'all' | 'image' | 'video' | 'audio' | 'document'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [importingFileId, setImportingFileId] = useState<string | null>(null);

  // Initialize Auth state
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
        setAuthChecking(false);
      },
      () => {
        setUser(null);
        setToken(null);
        setAuthChecking(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setToken(res.accessToken);
      }
    } catch (err: any) {
      console.error("Google sign in failed:", err);
      setErrorMsg("La connexion à Google Drive a échoué. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logout();
      setUser(null);
      setToken(null);
      setFiles([]);
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch files from Google Drive
  const fetchDriveFiles = useCallback(async (isLoadMore: boolean = false) => {
    if (!token) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      // Build search query list
      const queryParts: string[] = ["trashed = false"];
      
      if (searchQuery.trim()) {
        queryParts.push(`name contains '${searchQuery.replace(/'/g, "\\'")}'`);
      }

      if (fileTypeFilter === 'image') {
        queryParts.push("mimeType contains 'image/'");
      } else if (fileTypeFilter === 'video') {
        queryParts.push("mimeType contains 'video/'");
      } else if (fileTypeFilter === 'audio') {
        queryParts.push("mimeType contains 'audio/'");
      } else if (fileTypeFilter === 'document') {
        queryParts.push("(mimeType contains 'application/pdf' or mimeType contains 'application/vnd.google-apps.document' or mimeType contains 'text/plain')");
      }

      const q = encodeURIComponent(queryParts.join(' and '));
      const pageTokenQuery = isLoadMore && nextPageToken ? `&pageToken=${nextPageToken}` : '';
      
      const fields = 'nextPageToken,files(id,name,mimeType,thumbnailLink,webViewLink,iconLink,size)';
      const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&pageSize=24${pageTokenQuery}&orderBy=modifiedTime desc`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired, clear state
          setToken(null);
          setUser(null);
          throw new Error("Votre session de connexion Google a expiré. Veuillez vous reconnecter.");
        }
        const errJson = await response.json();
        throw new Error(errJson?.error?.message || "Impossible de récupérer les fichiers.");
      }

      const data = await response.json();
      const fetchedFiles = data.files || [];

      if (isLoadMore) {
        setFiles(prev => [...prev, ...fetchedFiles]);
      } else {
        setFiles(fetchedFiles);
      }
      setNextPageToken(data.nextPageToken || null);
    } catch (err: any) {
      console.error("Error fetching files from Google Drive API:", err);
      setErrorMsg(err.message || "Erreur lors du chargement des fichiers.");
    } finally {
      setLoading(false);
    }
  }, [token, searchQuery, fileTypeFilter, nextPageToken]);

  // Trigger search on filter or query change
  useEffect(() => {
    if (token) {
      const delayDebounce = setTimeout(() => {
        fetchDriveFiles(false);
      }, searchQuery ? 400 : 0);
      return () => clearTimeout(delayDebounce);
    }
  }, [token, searchQuery, fileTypeFilter]);

  const handleCopyLink = (file: GoogleDriveFile, type: 'view' | 'download', e: React.MouseEvent) => {
    e.stopPropagation();
    const id = file.id;
    const directLink = type === 'view' 
      ? `https://lh3.googleusercontent.com/d/${id}`
      : `https://docs.google.com/uc?export=download&id=${id}`;

    navigator.clipboard.writeText(directLink);
    setCopiedId(`${id}-${type}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSelect = async (file: GoogleDriveFile) => {
    if (!onSelectFile) return;
    if (importingFileId) return;

    setImportingFileId(file.id);
    setErrorMsg(null);

    try {
      console.log(`[GoogleDriveExplorer] Requesting server-side file replication: ${file.name} (${file.id})`);
      const response = await fetch('/api/gdrive/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fileId: file.id,
          accessToken: token,
          fileName: file.name
        })
      });

      if (!response.ok) {
        throw new Error(`Erreur réseau (${response.statusText})`);
      }

      const resJson = await response.json();
      if (!resJson.success) {
        throw new Error(resJson.error || "Échec de réplication");
      }

      console.log(`[GoogleDriveExplorer] File replicated perfectly! Local URL: ${resJson.publicUrl}`);
      onSelectFile({
        id: file.id,
        directView: resJson.publicUrl,
        directDownload: resJson.publicUrl,
        name: file.name
      });
    } catch (err: any) {
      console.warn("[GoogleDriveExplorer] Server replication failed (utilizing standard direct URL fallback):", err);
      setErrorMsg(`La réplication sécurisée vers le serveur a échoué. Utilisation des liens Google Drive en cours... (Erreur: ${err.message})`);
      
      onSelectFile({
        id: file.id,
        directView: `https://lh3.googleusercontent.com/d/${file.id}`,
        directDownload: `https://docs.google.com/uc?export=download&id=${file.id}`,
        name: file.name
      });
    } finally {
      setImportingFileId(null);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('image/')) return <ImageIcon className="text-emerald-400" size={18} />;
    if (mimeType.includes('video/')) return <Video className="text-purple-400" size={18} />;
    if (mimeType.includes('audio/')) return <Music className="text-blue-400" size={18} />;
    if (mimeType.includes('vnd.google-apps.folder')) return <Folder className="text-amber-400 fill-amber-400/10" size={18} />;
    return <FileText className="text-neutral-400" size={18} />;
  };

  // Safe wrapper for thumbnail rendering
  const getThumbnailSrc = (file: GoogleDriveFile) => {
    // google drive returns a dynamic low-res thumbnail link with sizing options
    if (file.thumbnailLink) {
      return file.thumbnailLink;
    }
    // Fallback to optimized directView if it is an image
    if (file.mimeType.includes('image/')) {
      return `https://lh3.googleusercontent.com/d/${file.id}=w120`;
    }
    return null;
  };

  // Premium loader
  if (authChecking) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-neutral-950/20 rounded-[2rem] border border-white/5">
        <RefreshCw size={24} className="text-amber-500 animate-spin mb-3" />
        <p className="text-neutral-400 text-xs font-black uppercase tracking-widest">Initialisation de l'accès Drive...</p>
      </div>
    );
  }

  const RenderContent = () => (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h3 className="text-lg font-black text-white flex items-center gap-2 uppercase tracking-tighter">
            <span className="w-2 h-6 bg-amber-500 rounded-full"></span>
            Navigateur Google Drive
          </h3>
          <p className="text-xs text-neutral-400 mt-1">
            Recherchez et importez directement vos captures d'écran, logos et médias depuis votre compte Drive.
          </p>
        </div>

        {user ? (
          <div className="flex items-center gap-3 bg-neutral-900 border border-white/10 px-4 py-2 rounded-xl">
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || 'Utilisateur'} className="w-7 h-7 rounded-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-amber-600 flex items-center justify-center text-white text-xs font-bold uppercase">
                {user.displayName?.charAt(0) || 'U'}
              </div>
            )}
            <div className="text-left hidden sm:block">
              <p className="text-xs font-bold text-white leading-none">{user.displayName || 'Compte Google'}</p>
              <p className="text-[10px] text-neutral-400 leading-none mt-1 truncate max-w-[150px]">{user.email}</p>
            </div>
            <button 
              onClick={handleLogout} 
              title="Se déconnecter"
              className="p-1.5 hover:bg-red-500/10 text-neutral-400 hover:text-red-400 rounded-lg transition-colors"
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : null}
      </div>

      {!user ? (
        <div className="flex flex-col items-center justify-center py-12 text-center bg-neutral-900/30 border border-neutral-800/40 rounded-[1.5rem] p-6">
          <Folder size={48} className="text-neutral-600 mb-4 animate-pulse-gentle" />
          <h4 className="font-bold text-white tracking-tight uppercase text-sm">Activez l'intégration Google Drive</h4>
          <p className="text-neutral-400 text-xs mt-2 max-w-md">
            Parcourez vos fichiers à tout moment sans avoir besoin de copier manuellement les identifiants ou liens de partage.
          </p>
          <button
            onClick={handleLogin}
            disabled={loading}
            className="mt-6 flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-[#000] rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-xl shadow-amber-500/10 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <LogIn size={14} />
            )}
            Se connecter à Google Drive
          </button>
          {errorMsg && (
            <p className="text-red-400 text-xs mt-3 bg-red-400/10 px-3 py-1.5 rounded-lg border border-red-400/20 font-medium">
              {errorMsg}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
              <input
                type="text"
                placeholder="Rechercher par nom de fichier..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-[#111111] text-xs text-white placeholder-neutral-500 pl-10 pr-4 py-3 rounded-xl border border-white/5 focus:outline-none focus:border-amber-500/40 transition-colors"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex overflow-x-auto gap-1 pb-1 scrollbar-thin">
              {(['all', 'image', 'video', 'audio', 'document'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setFileTypeFilter(type)}
                  className={`px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors whitespace-nowrap cursor-pointer ${
                    fileTypeFilter === type 
                      ? 'bg-amber-500 text-black font-extrabold' 
                      : 'bg-[#111] text-neutral-400 hover:text-white border border-white/5'
                  }`}
                >
                  {type === 'all' && 'Tous'}
                  {type === 'image' && 'Images'}
                  {type === 'video' && 'Vidéos'}
                  {type === 'audio' && 'Audios'}
                  {type === 'document' && 'Docs'}
                </button>
              ))}
            </div>
            
            <button 
              onClick={() => fetchDriveFiles(false)} 
              title="Rafraîchir"
              className="p-3 bg-[#111] hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-xl border border-white/5 transition-colors cursor-pointer"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-400/10 border border-red-400/20 rounded-xl text-xs text-red-300">
              {errorMsg}
            </div>
          )}

          {/* Files Grid */}
          {files.length === 0 && !loading ? (
            <div className="text-center py-16 bg-neutral-900/10 rounded-2xl border border-dashed border-white/5">
              <File size={32} className="text-neutral-700 mx-auto mb-3" />
              <p className="text-xs text-neutral-400">Aucun fichier trouvé dans ce filtre.</p>
              <p className="text-[10px] text-neutral-600 mt-1">Essayez un autre filtre ou une autre recherche.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
              {files.map(file => {
                const isImage = file.mimeType.includes('image/');
                const thumb = getThumbnailSrc(file);
                const isImporting = importingFileId === file.id;
                
                return (
                  <div 
                    key={file.id} 
                    onClick={() => !isImporting && handleSelect(file)}
                    className={`group bg-[#111111]/90 hover:bg-[#161616] border ${isImporting ? 'border-amber-500/40 opacity-70 cursor-not-allowed' : 'border-white/5 hover:border-amber-500/20'} p-2.5 rounded-xl transition-all cursor-pointer flex flex-col justify-between text-left relative overflow-hidden`}
                  >
                    {isImporting && (
                      <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-10 p-2 text-center">
                        <RefreshCw size={18} className="text-amber-500 animate-spin mb-1.5" />
                        <p className="text-[8px] text-amber-500 font-extrabold uppercase tracking-wider animate-pulse">Réplication...</p>
                      </div>
                    )}
                    {/* Thumbnail preview area */}
                    <div className="aspect-[4/3] w-full bg-black/60 rounded-lg flex items-center justify-center overflow-hidden mb-2 relative">
                      {thumb ? (
                        <img 
                          src={thumb} 
                          alt={file.name} 
                          className="w-full h-full object-cover transition-transform group-hover:scale-105" 
                          onError={(e) => {
                            // Suppress generic broken images nicely
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        getFileIcon(file.mimeType)
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-white font-semibold truncate leading-tight group-hover:text-amber-400 transition-colors" title={file.name}>
                        {file.name}
                      </p>
                      <p className="text-[8px] text-neutral-500 mt-0.5 truncate uppercase">
                        {file.mimeType.split('/').pop()?.replace('vnd.google-apps.', '')}
                      </p>
                    </div>

                    {/* Pop-up copy utilities on Hover */}
                    <div className="flex gap-1.5 mt-2 pt-2 border-t border-white/5">
                      <button
                        onClick={(e) => handleCopyLink(file, 'view', e)}
                        title="Copier lien Image/Aperçu"
                        className="flex-1 py-1 px-1 bg-neutral-900 border border-white/5 hover:bg-neutral-800 text-[8px] font-bold text-neutral-300 rounded flex items-center justify-center gap-1 transition-colors"
                      >
                        {copiedId === `${file.id}-view` ? (
                          <Check size={8} className="text-green-400" />
                        ) : (
                          <Copy size={8} />
                        )}
                        URL Image
                      </button>
                      <button
                        onClick={(e) => handleCopyLink(file, 'download', e)}
                        title="Copier lien de Téléchargement direct"
                        className="flex-1 py-1 px-1 bg-neutral-900 border border-white/5 hover:bg-neutral-800 text-[8px] font-bold text-neutral-300 rounded flex items-center justify-center gap-1 transition-colors"
                      >
                        {copiedId === `${file.id}-download` ? (
                          <Check size={8} className="text-green-400" />
                        ) : (
                          <Copy size={8} />
                        )}
                        Téléch.
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Load More Button */}
          {nextPageToken && (
            <div className="flex justify-center pt-2">
              <button
                onClick={() => fetchDriveFiles(true)}
                disabled={loading}
                className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 border border-white/5 text-neutral-300 hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                {loading ? 'Chargement...' : 'Voir plus de fichiers'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-[110] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-[#0c0c0c] border border-neutral-800 w-full max-w-4xl rounded-[2rem] shadow-2xl p-6 sm:p-8 relative max-h-[90vh] overflow-y-auto">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-full transition-all border border-white/5"
          >
            <X size={16} />
          </button>
          <RenderContent />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0c0c0c] border border-neutral-800/60 p-6 sm:p-8 rounded-[2rem] shadow-xl">
      <RenderContent />
    </div>
  );
};
