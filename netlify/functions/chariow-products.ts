import { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      },
      body: ''
    };
  }

  const apiKeys = [
    process.env.CHARIOW_API_KEY,
    process.env.VITE_CHARIOW_API_KEY,
    process.env.CHARIOZ_API_KEY,
    process.env.VITE_CHARIOZ_API_KEY
  ];
  const apiKey = apiKeys.find(key => key && key.trim() !== '');

  if (!apiKey) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      },
      body: JSON.stringify({
        success: false,
        error: 'missing_api_key',
        message: "La clé API Chariow (CHARIOW_API_KEY) n'a pas été trouvée dans les variables d'environnement de Netlify."
      })
    };
  }

  try {
    console.log('[Chariow Netlify Products] Fetching products list with pagination and high limits...');
    let allProducts: any[] = [];
    let page = 1;
    let hasMore = true;
    const limit = 100;
    let lastResponseStatus = 200;
    let lastResponseStatusText = 'OK';
    let isSuccess = false;

    while (hasMore && page <= 5) {
      const url = `https://api.chariow.com/v1/products?page=${page}&limit=${limit}&per_page=${limit}&size=${limit}`;
      console.log(`[Chariow Netlify Products] Fetching page ${page}: ${url}`);

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
        console.error(`[Chariow Netlify Products] Failed to fetch page ${page}:`, response.status, response.statusText);
        if (page === 1) {
          return {
            statusCode: response.status,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization',
              'Access-Control-Allow-Methods': 'GET, OPTIONS'
            },
            body: JSON.stringify({
              success: false,
              status: response.status,
              statusText: response.statusText,
              message: "Chariow API a retourné une erreur lors de la requête de la page 1."
            })
          };
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

      // Add to main collection
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
        // Speculate another page
        page++;
      } else {
        hasMore = false;
      }
    }

    // Deduplicate products based on their unique ID
    const seenIds = new Set();
    const uniqueProducts = allProducts.filter((p: any) => {
      const id = p?.id || p?._id;
      if (!id) return true;
      if (seenIds.has(id)) return false;
      seenIds.add(id);
      return true;
    });

    console.log(`[Chariow Netlify Products] Successfully fetched and merged ${uniqueProducts.length} unique products.`);

    const finalPayload = {
      products: uniqueProducts,
      data: {
        products: uniqueProducts
      }
    };

    return {
      statusCode: isSuccess ? 200 : lastResponseStatus,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      },
      body: JSON.stringify({
        success: isSuccess,
        status: lastResponseStatus,
        statusText: lastResponseStatusText,
        data: finalPayload,
        detectedKeyLength: apiKey.length,
        detectedKeyPreview: apiKey.length > 8 ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : '****'
      })
    };
  } catch (error: any) {
    console.error('[Chariow Netlify Products] Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      },
      body: JSON.stringify({
        success: false,
        error: 'fetch_error',
        message: "Erreur de connexion lors de la communication de Netlify avec l'API Chariow.",
        details: error.message
      })
    };
  }
};
