import { Handler } from '@netlify/functions';

const RUNTIME_DEFAULT_SOUNDS = [
  { category: 'reward_appear', url: 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3', description: "Apparition de la récompense (Ouverture du coffre/Pop-up)" },
  { category: 'reward_claim', url: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3', description: "Réclamation des points XP (Bouton 'Récupérer')" },
  { category: 'surprise', url: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3', description: "Effet de surprise (Présentation d'un défi par Axis)" },
  { category: 'level_up', url: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3', description: "Célébration du passage de niveau / de rang" }
];

export const handler: Handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, count: RUNTIME_DEFAULT_SOUNDS.length, data: RUNTIME_DEFAULT_SOUNDS })
    };
  }

  if (event.httpMethod === 'POST') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Effets sonores statiques (Base de données désactivée).'
      })
    };
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: 'Méthode non autorisée.' })
  };
};
