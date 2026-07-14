import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, CheckCircle2, Trash2, Plus, Link2, Folder } from 'lucide-react';
import { getGDriveThumbnailUrl } from '../../../lib/googleDrive';
import { GoogleDriveExplorer } from '../google-drive/GoogleDriveExplorer';

interface ImageConfig {
  id: string; // name
  name: string;
  logo_url: string | null;
}

const DEFAULT_IMAGES = [
  'Orange Money',
  'Wave',
  'MTN Mobile Money',
  'Moov Money',
  'M-Pesa',
  'Airtel Money',
  'Flooz',
  'Virement Bancaire'
];

export const AdminImages: React.FC = () => {
  const [methods, setMethods] = useState<ImageConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [newImageName, setNewImageName] = useState('');
  const [selectingForMethodId, setSelectingForMethodId] = useState<string | null>(null);
  const [showFullDrive, setShowFullDrive] = useState(false);

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/platform-settings/app_images');
      const resData = await response.json();
      
      const storedImages: Record<string, string> = (resData?.success && resData?.value) || {};
      
      const combined: ImageConfig[] = [];
      const seen = new Set<string>();
      
      // Load predefined
      DEFAULT_IMAGES.forEach(name => {
         combined.push({ id: name, name, logo_url: storedImages[name] || null });
         seen.add(name);
      });
      
      // Load any others
      Object.keys(storedImages).forEach(name => {
         if (!seen.has(name)) {
             combined.push({ id: name, name, logo_url: storedImages[name] });
         }
      });
      
      setMethods(combined);

    } catch (err: any) {
      console.error("Error managing methods:", err);
    } finally {
      setLoading(false);
    }
  };

  const saveToPlatformSettings = async (newMethods: ImageConfig[]) => {
      const valueToStore: Record<string, string> = {};
      newMethods.forEach(m => {
         if (m.logo_url) {
            valueToStore[m.name] = m.logo_url;
         }
      });
      
      try {
         const response = await fetch('/api/platform-settings/app_images', {
            method: 'POST',
            headers: {
               'Content-Type': 'application/json'
            },
            body: JSON.stringify({ value: valueToStore })
         });
         
         if (!response.ok) {
            throw new Error(`Code : ${response.status}`);
         }
      } catch (err) {
         console.error(err);
         alert("Erreur lors de la sauvegarde.");
      }
  };
  
  const handleAddNew = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!newImageName.trim()) return;
     const newId = newImageName.trim();
     if (methods.find(m => m.id === newId)) return;
     
     const newMethods = [...methods, { id: newId, name: newId, logo_url: null }];
     setMethods(newMethods);
     setNewImageName('');
     await saveToPlatformSettings(newMethods);
  };
  
  const handleDelete = async (id: string, e: React.MouseEvent) => {
     e.stopPropagation();
     if (!window.confirm("Supprimer cette image ?")) return;
     const newMethods = methods.filter(m => m.id !== id);
     setMethods(newMethods);
     await saveToPlatformSettings(newMethods);
  };

  const handleSelectFromDrive = async (links: { directView: string }) => {
    if (!selectingForMethodId) return;
    const newMethods = methods.map(m => m.id === selectingForMethodId ? { ...m, logo_url: links.directView } : m);
    setMethods(newMethods);
    setSelectingForMethodId(null);
    await saveToPlatformSettings(newMethods);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-purple-900/40 to-indigo-800/20 p-6 rounded-[2rem] border border-purple-500/20">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2 uppercase tracking-tighter">
            <ImageIcon className="text-purple-400" /> Gestion des Images
          </h2>
          <p className="text-purple-200/60 text-sm mt-1">Configurez les liens Google Drive pour tous vos logos de paiement plateforme sans surcharger la base de données.</p>
        </div>
        
        <button
          onClick={() => setShowFullDrive(!showFullDrive)}
          className="px-5 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 rounded-xl border border-amber-500/20 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-500/5 active:scale-95"
        >
          <Folder size={16} />
          {showFullDrive ? "Fermer Drive" : "Google Drive Explorer"}
        </button>
      </div>

      {showFullDrive && (
        <div className="bg-neutral-950/30 p-1.5 rounded-[2rem] border border-amber-500/10">
          <GoogleDriveExplorer />
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><div className="w-8 h-8 rounded-full border-t-2 border-purple-500 animate-spin" /></div>
      ) : (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold text-white uppercase tracking-tight flex items-center gap-2">
                      <div className="w-2 h-6 bg-purple-500 rounded-full"></div> Logos des services
                    </h3>
                    <p className="text-xs text-neutral-400 pb-1">Collez directement l'URL de partage Google Drive de chaque logo pour un rendu optimisé ou parcourez votre Drive.</p>
                </div>
                
                <form onSubmit={handleAddNew} className="flex gap-2">
                    <input type="text" value={newImageName} onChange={e => setNewImageName(e.target.value)} placeholder="Nouveau nom..." className="px-3 py-2 bg-[#1a1a1a] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500" />
                    <button type="submit" disabled={!newImageName.trim()} className="p-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl disabled:opacity-50 lg:cursor-pointer"><Plus size={20} /></button>
                </form>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {methods.map(method => (
                <div key={method.id} className="relative bg-[#111] p-5 rounded-2xl border border-white/10 group flex flex-col justify-between hover:border-purple-500/30 transition-all">
                   <div className="flex items-start justify-between mb-3">
                     <div className="w-16 h-12 bg-white rounded-lg flex items-center justify-center overflow-hidden p-1 shadow-inner relative">
                       {method.logo_url ? (
                         <img src={getGDriveThumbnailUrl(method.logo_url)} alt={method.name} className="w-full h-full object-contain pointer-events-none" referrerPolicy="no-referrer" />
                       ) : (
                         <ImageIcon className="text-neutral-400" size={18} />
                       )}
                     </div>
                     <div className="flex items-center gap-2">
                          {method.logo_url && (
                              <CheckCircle2 size={16} className="text-green-500" />
                          )}
                          <button onClick={(e) => handleDelete(method.id, e)} className="p-1.5 bg-black/20 hover:bg-red-500/20 text-neutral-500 hover:text-red-400 rounded-lg opacity-0 group-hover:opacity-100 transition-all lg:cursor-pointer">
                              <Trash2 size={14} />
                          </button>
                     </div>
                   </div>
                   
                   <div className="space-y-3">
                     <div>
                       <h4 className="font-bold text-white text-sm">{method.name}</h4>
                       <p className="text-[10px] text-neutral-500 mt-0.5">{method.logo_url ? 'Google Drive connecté' : 'Aucun lien fourni'}</p>
                     </div>

                     <div className="space-y-1">
                        <label className="text-[8px] font-black uppercase text-neutral-400 tracking-wider flex items-center gap-1">
                           <Link2 size={10} className="text-purple-400" /> Lien Google Drive
                        </label>
                        <div className="flex gap-1.5 items-center">
                          <input 
                            type="text" 
                            placeholder="https://drive.google.com/..." 
                            value={method.logo_url || ''} 
                            onChange={async (e) => {
                               const newUrl = e.target.value;
                               const newMethods = methods.map(m => m.id === method.id ? { ...m, logo_url: newUrl } : m);
                               setMethods(newMethods);
                               await saveToPlatformSettings(newMethods);
                            }} 
                            className="flex-1 bg-[#1a1a1a] border border-white/10 rounded-lg p-2 text-white text-xs outline-none focus:border-purple-500 font-mono text-[9px]"
                          />
                          <button 
                            type="button"
                            onClick={() => setSelectingForMethodId(method.id)}
                            className="px-2.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/25 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
                            title="Sélectionner depuis Google Drive"
                          >
                            <Folder size={11} className="text-amber-500" />
                            Drive
                          </button>
                        </div>
                     </div>
                   </div>
                </div>
              ))}
            </div>
        </div>
      )}

      {selectingForMethodId && (
        <GoogleDriveExplorer 
          isModal 
          onClose={() => setSelectingForMethodId(null)}
          onSelectFile={handleSelectFromDrive}
        />
      )}
    </div>
  );
};
