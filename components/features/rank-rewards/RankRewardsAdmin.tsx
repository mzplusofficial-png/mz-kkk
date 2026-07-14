import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, Gift, Image as ImageIcon, Link as LinkIcon, DollarSign, Loader2 } from 'lucide-react';
import { supabase } from '../../../services/supabase';
import { RankReward } from '../../../types';

export const RankRewardsAdmin: React.FC = () => {
  const [rewards, setRewards] = useState<RankReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<RankReward>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  useEffect(() => {
    fetchRewards();
  }, []);

  const fetchRewards = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('[Admin] Fetching rewards from proxy API...');
      const response = await fetch('/api/rank-rewards');
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('[Admin] Received rewards from proxy API:', data);
      setRewards(data || []);
    } catch (e: any) {
      console.error('Error fetching rewards', e);
      setError(e.message || 'Erreur lors du chargement des récompenses.');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    alert("L'upload direct de fichiers média dans la base de données a été désactivé pour réguler l'usage des données et sécuriser le stockage. Veuillez plutôt renseigner l'URL de partage Google Drive dans le champ de texte.");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    alert("L'upload direct de fichiers média dans la base de données a été désactivé pour réguler l'usage des données et sécuriser le stockage. Veuillez plutôt renseigner l'URL de partage Google Drive dans le champ de texte.");
  };

  const handleSave = async () => {
    try {
      console.log('[Admin] Saving reward through proxy API with content:', editForm);
      const isUpdating = isEditing && !isAdding;
      const bodyData = isUpdating ? { ...editForm, id: isEditing } : editForm;

      const response = await fetch('/api/rank-rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('[Admin] Operation success! Saved data:', data);

      setIsAdding(false);
      setIsEditing(null);
      setEditForm({});
      fetchRewards();
    } catch (e: any) {
      console.error('Error saving reward', e);
      alert('Erreur lors de la sauvegarde: ' + e.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Voulez-vous vraiment supprimer cette récompense ? Cela supprimera également cette récompense des profils utilisateurs qui l\'ont déjà obtenue.')) return;
    try {
      console.log(`[Admin] Deleting reward ${id} through proxy API...`);
      const response = await fetch(`/api/rank-rewards/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP error! status: ${response.status}`);
      }

      console.log('[Admin] Deleted successfully.');
      fetchRewards();
    } catch (e: any) {
      console.error('Error deleting reward', e);
      alert('Erreur lors de la suppression: ' + e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Gift className="text-purple-400" />
            Récompenses de Niveau
          </h2>
          <p className="text-sm text-neutral-400 mt-1">Gérer les cadeaux de passage de niveau (Kits, Formations, etc.)</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={async () => {
              if (window.confirm('Voulez-vous vraiment TOUT supprimer ? Cette action est irréversible et supprimera les récompenses des profils.')) {
                try {
                  console.log('[Admin] Bulk delete rewards loop...');
                  for (const reward of rewards) {
                    await fetch(`/api/rank-rewards/${reward.id}`, { method: 'DELETE' });
                  }
                  fetchRewards();
                } catch(e: any) {
                  alert('Erreur lors de la suppression: ' + e.message);
                }
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/40 border border-red-500/50 text-red-500 rounded-xl transition-all font-bold text-sm"
          >
            <Trash2 size={16} /> Tout Supprimer
          </button>
          <button
            onClick={() => {
              setIsAdding(true);
              setIsEditing(null);
              setEditForm({ is_active: true });
            }}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-all font-bold text-sm"
          >
            <Plus size={16} /> Nouvelle Récompense
          </button>
        </div>
      </div>

      {(isAdding || isEditing) && (
        <div className="p-6 bg-[#0a0a09] border border-purple-500/30 rounded-2xl space-y-4 shadow-[0_0_30px_rgba(168,85,247,0.1)]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg text-purple-400">
              {isAdding ? 'Ajouter une Récompense' : 'Modifier la Récompense'}
            </h3>
            <button onClick={() => { setIsAdding(false); setIsEditing(null); }} className="p-2 bg-white/5 rounded-full hover:bg-white/10">
              <X size={16} />
            </button>
          </div>

          {!isAdding && isEditing && (
             <div className="mb-4 p-3 bg-purple-900/20 border border-purple-500/30 rounded-xl flex items-center justify-between">
                <div>
                   <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">ID / Code Produit (à copier)</p>
                   <code className="text-sm text-white font-mono">{isEditing}</code>
                </div>
                <button 
                  onClick={() => navigator.clipboard.writeText(isEditing)}
                  className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/40 text-purple-300 rounded-lg text-xs font-bold transition-colors"
                >
                  Copier
                </button>
             </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Titre</label>
              <input 
                type="text" 
                placeholder="Ex: Kit E-commerce 2024"
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500 transition-colors"
                value={editForm.title || ''}
                onChange={e => setEditForm({ ...editForm, title: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Valeur Perçue</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                <input 
                  type="text" 
                  placeholder="Ex: 97€"
                  className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white outline-none focus:border-purple-500 transition-colors"
                  value={editForm.perceived_value || ''}
                  onChange={e => setEditForm({ ...editForm, perceived_value: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Description</label>
              <textarea 
                placeholder="Description séduisante de la récompense..."
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500 transition-colors min-h-[100px]"
                value={editForm.description || ''}
                onChange={e => setEditForm({ ...editForm, description: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex justify-between">
                <span>Image (Format Vertical type Box)</span>
                <span className="text-[9px] text-purple-400">Important: Belle image 3D ou Mockup</span>
              </label>
              <div className="relative">
                <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                <input 
                  type="text" 
                  placeholder="URL ou utiliser le bouton à droite..."
                  className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-24 py-3 text-white outline-none focus:border-purple-500 transition-colors text-xs"
                  value={editForm.image_url || ''}
                  onChange={e => setEditForm({ ...editForm, image_url: e.target.value })}
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                  disabled={uploadingImage}
                />
                <label 
                  htmlFor="image-upload"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-1.5 px-3 rounded-lg cursor-pointer transition-colors"
                >
                  {uploadingImage ? <Loader2 size={14} className="animate-spin" /> : 'Upload'}
                </label>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex justify-between">
                <span>Contenu du Guide / Formation</span>
                <span className="text-[9px] text-purple-400">Texte Markdown ou lien direct d'un PDF</span>
              </label>
              <div className="relative">
                <textarea 
                  placeholder="Écrivez le contenu de la formation ici (supporte le Markdown) OU collez un lien vers un fichier PDF..."
                  className="w-full h-40 bg-black/50 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-purple-500 transition-colors text-sm font-mono custom-scrollbar"
                  value={editForm.file_url || ''}
                  onChange={e => setEditForm({ ...editForm, file_url: e.target.value })}
                />
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                  disabled={uploadingFile}
                />
                <label 
                  htmlFor="file-upload"
                  className="absolute right-2 bottom-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-1.5 px-3 rounded-lg cursor-pointer transition-colors"
                >
                  {uploadingFile ? <Loader2 size={14} className="animate-spin" /> : 'Upload de Fichier'}
                </label>
              </div>
            </div>
            <div className="flex items-center gap-3 pt-6">
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={editForm.is_active ?? true} onChange={e => setEditForm({ ...editForm, is_active: e.target.checked })} />
                <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                <span className="ml-3 text-sm font-medium text-neutral-300">Actif</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <button onClick={handleSave} className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-all font-bold">
              <Save size={18} /> {isAdding ? 'Créer la Récompense' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="p-6 bg-red-600/10 border border-red-500/20 text-red-400 rounded-2xl text-center space-y-4 shadow-[0_0_20px_rgba(239,68,68,0.05)]">
          <p className="text-xs font-black uppercase tracking-wider text-red-500">Erreur de chargement des récompenses</p>
          <p className="text-sm text-neutral-300 font-mono bg-black/60 p-3 rounded-xl inline-block max-w-full truncate">{error}</p>
          <div>
            <button 
              onClick={() => fetchRewards()} 
              className="px-5 py-2.5 bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-400 transition-all shadow-[0_0_25px_rgba(239,68,68,0.2)]"
            >
              Réessayer le chargement
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-purple-500" size={32} /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rewards.map(reward => (
            <div key={reward.id} className="bg-[#0a0a09] border border-white/10 rounded-2xl overflow-hidden flex flex-col group">
              <div className="h-48 bg-neutral-900 border-b border-white/5 relative flex-shrink-0">
                {reward.image_url ? (
                  <img src={reward.image_url} alt={reward.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                ) : (
                  <div className="flex items-center justify-center w-full h-full text-neutral-600"><Gift size={48} /></div>
                )}
                <div className="absolute top-3 right-3 flex gap-2">
                   {!reward.is_active && <span className="px-2 py-1 bg-red-500/20 text-red-400 text-[10px] font-bold rounded-lg backdrop-blur-md">Inactif</span>}
                   <span className="px-2 py-1 bg-black/60 text-purple-400 border border-purple-500/30 text-[10px] font-bold rounded-lg backdrop-blur-md">
                     {reward.perceived_value || 'Valeur ?'}
                   </span>
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <h4 className="font-bold text-white text-lg line-clamp-1 mb-2">{reward.title}</h4>
                <p className="text-xs text-neutral-400 line-clamp-2 flex-1">{reward.description}</p>
                <div className="mt-4 pt-4 border-t border-white/5 flex gap-2 justify-between items-center">
                  <div className="flex-1 truncate">
                    <div className="flex items-center gap-2">
                      <p className="text-[9px] font-mono text-purple-400 font-bold uppercase tracking-widest truncate max-w-[120px]" title={reward.id}>
                        ID: {reward.id}
                      </p>
                      <button 
                        onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(reward.id); alert('ID Copié !'); }}
                        className="px-2 py-1 bg-purple-500/10 hover:bg-purple-500/30 text-purple-400 rounded-md transition-all border border-purple-500/20 text-[8px] font-black"
                        title="Copier ID Complet"
                      >
                        COPIER ID
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => { setIsEditing(reward.id); setIsAdding(false); setEditForm(reward); }}
                      className="p-2 bg-white/5 hover:bg-purple-600/20 border border-transparent hover:border-purple-500/50 text-neutral-400 hover:text-purple-400 rounded-xl transition-all"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(reward.id)}
                      className="p-2 bg-white/5 hover:bg-red-600/20 border border-transparent hover:border-red-500/50 text-neutral-400 hover:text-red-400 rounded-xl transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {rewards.length === 0 && !isAdding && (
            <div className="col-span-full py-12 text-center text-neutral-500 border border-dashed border-white/10 rounded-2xl">
              <Gift size={48} className="mx-auto mb-4 opacity-20" />
              <p>Aucune récompense configurée.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
