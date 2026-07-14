// Local Performance Audit System for MZ+
// Strictly client-side, zero Supabase database read overhead.

export interface AuditItem {
  id: string;
  timestamp: number;
  method: string;
  url: string;
  table: string | null;
  rpc: string | null;
  component: string;
  rowsCount: number;
  dataSize: number; // bytes
  executionTime: number; // ms
  isDuplicate: boolean;
  warnings: string[];
  wastageScore: number; // 0 to 100%
  filtersUsed: string[];
  userConcerned: string;
}

export interface RealtimeSubscription {
  name: string;
  timestamp: number;
  component: string;
}

// In-memory audit storage (kept small for performance)
let auditLogs: AuditItem[] = [];
let realtimeSubs: RealtimeSubscription[] = [];

// Diagnostics is disabled by default, loaded from localStorage
const STORAGE_KEY = 'mz_perf_diagnostic_enabled';
let isDiagnosticEnabled = false;

// Initialize on load if client-side
if (typeof window !== 'undefined') {
  isDiagnosticEnabled = localStorage.getItem(STORAGE_KEY) === 'true';
}

export const performanceAudit = {
  isEnabled(): boolean {
    return isDiagnosticEnabled;
  },

  setMode(enabled: boolean) {
    isDiagnosticEnabled = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
    }
    // Clear logs upon toggle to have a fresh session if enabling
    if (!enabled) {
      auditLogs = [];
      realtimeSubs = [];
    }
  },

  clearLogs() {
    auditLogs = [];
    realtimeSubs = [];
  },

  getLogs(): AuditItem[] {
    return [...auditLogs];
  },

  getSubscriptions(): RealtimeSubscription[] {
    return [...realtimeSubs];
  },

  recordSubscription(name: string) {
    if (!isDiagnosticEnabled) return;

    const component = this.detectCallingComponent();
    realtimeSubs.push({
      name,
      timestamp: Date.now(),
      component,
    });

    // Limit subscriptions history to last 50
    if (realtimeSubs.length > 50) {
      realtimeSubs.shift();
    }
  },

  detectCallingComponent(): string {
    const err = new Error();
    const stack = err.stack || '';
    const lines = stack.split('\n');
    
    // Find first frame that points to a React component file or other internal source
    // while skipping libraries
    for (let i = 2; i < lines.length; i++) {
      const line = lines[i];
      if (
        line.includes('/components/') || 
        line.includes('/App.tsx') || 
        line.includes('/pages/') ||
        line.includes('/src/')
      ) {
        // Skip common helper paths if they wrap requests
        if (
          line.includes('supabase.ts') || 
          line.includes('performanceAudit.ts') ||
          line.includes('node_modules')
        ) {
          continue;
        }
        
        // Strip out the source-map or browser location details
        // Clean out "http://localhost:3000" or similar origins
        let clean = line.trim()
          .replace(/^at\s+/, '')
          .replace(/https?:\/\/[^\/]+/, '') // Strip origin
          .replace(/\?t=\d+/, '') // Strip Vite's cache-busting timestamp query parameter
          .replace(/\?import/, ''); // Strip Vite's import queries

        // Remove "src/" prefixes to keep it clean
        clean = clean.replace(/^\/?src\//g, '').replace(/\/src\//g, '');
        
        // If it has parentheses, extract function name and clean path
        if (clean.includes('(') && clean.includes(')')) {
          const namePart = clean.split('(')[0].trim();
          const pathPart = clean.slice(clean.indexOf('(') + 1, clean.indexOf(')')).trim();
          return `${namePart} (${pathPart.split(':')[0]})`;
        }

        // Just take the path segment up to any line numbers
        const cleanPath = clean.split(':')[0].trim();
        return cleanPath;
      }
    }
    return 'Composant Inconnu (Direct)';
  },

  // Intercept network queries and record metrics
  async handleQueryIntercept<T>(
    url: string,
    method: string,
    headers: Record<string, string>,
    body: any,
    fetchPromise: Promise<Response>
  ): Promise<Response> {
    if (!isDiagnosticEnabled) {
      return fetchPromise;
    }

    const startTime = Date.now();
    let res: Response;
    try {
      res = await fetchPromise;
    } catch (err) {
      // Just propagate network errors
      throw err;
    }

    const elapsed = Date.now() - startTime;
    const clonedRes = res.clone();

    // Trigger parsing asynchronously to prevent blocking UI main-thread
    setTimeout(async () => {
      try {
        let textContent = '';
        try {
          textContent = await clonedRes.text();
        } catch {
          // Response body empty or unserviceable
        }

        const dataSize = textContent.length + JSON.stringify(headers).length;
        let rowsCount = 0;
        let parsedJson: any = null;

        try {
          if (textContent) {
            parsedJson = JSON.parse(textContent);
            if (Array.isArray(parsedJson)) {
              rowsCount = parsedJson.length;
            } else if (parsedJson && typeof parsedJson === 'object') {
              rowsCount = 1;
            }
          }
        } catch {
          // Non-JSON response
        }

        // Analyze URL for details
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/');
        
        // Find if table or RPC
        let table: string | null = null;
        let rpc: string | null = null;
        if (urlObj.pathname.includes('/rpc/')) {
          rpc = pathParts[pathParts.length - 1] || pathParts[pathParts.length - 2];
        } else if (urlObj.pathname.includes('/rest/v1/')) {
          table = pathParts[pathParts.length - 1] || pathParts[pathParts.length - 2];
        }

        // If table metadata or health routes are hit, skip auditing
        if (table === '' || table === 'rest' || table === 'v1' || urlObj.pathname.includes('/api/health')) {
          return;
        }

        const searchParams = urlObj.search;
        const component = this.detectCallingComponent();

        // 1. Warnings detections
        const warnings: string[] = [];
        const filtersUsed: string[] = [];

        // Check columns being selected
        const selectParam = urlObj.searchParams.get('select');
        if (selectParam === '*' || selectParam === '%2A' || (selectParam && selectParam.includes('*'))) {
          warnings.push("SELECT * détecté - Récupère toutes les colonnes, y compris les données lourdes non utilisées.");
        }

        // Check filters
        const activeFilters = Array.from(urlObj.searchParams.entries()).filter(
          ([key]) => key !== 'select' && key !== 'order' && key !== 'limit' && key !== 'offset'
        );
        
        activeFilters.forEach(([key, val]) => {
          filtersUsed.push(`${key}:${val}`);
        });

        // Warnings based on missing filters (Unfiltered tables loading)
        const heavyTables = ['commissions', 'users', 'withdrawals', 'rpa_submissions', 'user_reactions_evolutions', 'user_streak'];
        const isGet = method.toUpperCase() === 'GET';

        if (isGet && table && heavyTables.includes(table)) {
          const hasUserFilter = activeFilters.some(([key]) => key.includes('user_id') || key.includes('id') || key.includes('userId'));
          if (!hasUserFilter && table !== 'users') {
            warnings.push(`Requête sur '${table}' sans filtre utilisateur - Peut charger les données d'autres membres inutilement.`);
          }
          if (activeFilters.length === 0) {
            warnings.push(`Aucun filtre actif sur la table '${table}' - Charge la table complète en mémoire.`);
          }
        }

        // Check Realtime or startups loop repetitions
        const duplicateIndex = auditLogs.findIndex(
          (log) => 
            log.url === url && 
            log.method === method && 
            log.component === component &&
            (startTime - log.timestamp < 3500)
        );

        const isDuplicate = duplicateIndex !== -1;
        if (isDuplicate) {
          warnings.push("Requête répétitive en boucle - Composant réexécutant la même requête en moins de 3.5s (Risque de boucle infinie ou re-renders inutiles).");
        }

        // Check excessive dataset sizing
        if (rowsCount >= 100) {
          warnings.push(`Données volumineuses (${rowsCount} lignes) - Envisagez de paginer la requête avec limit/offset.`);
        }

        // Check if startup payload before opening interface
        // If query occurs in first 4 seconds for heavy components that are not Home/Dashboard
        const isStartup = startTime - (window as any).__START_TIME__ < 4000;
        if (isStartup && component && !component.includes('Dashboard') && !component.includes('App') && isGet) {
          warnings.push("Requête au démarrage sans nécessité immédiate (Interface non encore visible).");
        }

        // Calculate Wastage score
        let wastageScore = 0;
        if (isGet && rowsCount > 0) {
          if (activeFilters.length === 0) wastageScore += 40;
          if (selectParam === '*' || !selectParam) wastageScore += 25;
          if (rowsCount > 30) wastageScore += 20;
          if (isDuplicate) wastageScore += 15;
          // Normalize score to maximum 99.25% if any issue, capped at 100%
          wastageScore = Math.min(99.25, wastageScore);
          if (warnings.length === 0) wastageScore = 0;
        }

        // Who is concerned
        let userConcerned = 'Utilisateur Anonyme';
        try {
          const storedAuth = localStorage.getItem('sb-token'); // Supabase standard auth prefix token
          if (storedAuth) {
            const parsedToken = JSON.parse(storedAuth);
            if (parsedToken?.user?.email) {
              userConcerned = parsedToken.user.email;
            }
          }
        } catch {
          // ignore
        }

        // Record Item
        const auditItem: AuditItem = {
          id: Math.random().toString(36).substr(2, 9),
          timestamp: startTime,
          method,
          url,
          table,
          rpc,
          component,
          rowsCount,
          dataSize,
          executionTime: elapsed,
          isDuplicate,
          warnings,
          wastageScore: Math.round(wastageScore * 100) / 100,
          filtersUsed,
          userConcerned,
        };

        auditLogs.unshift(auditItem);

        // Keep last 400 logs in memory maximum to prevent memory bloat
        if (auditLogs.length > 400) {
          auditLogs.pop();
        }
      } catch (err) {
        console.warn("[Diagnostic System Exception]", err);
      }
    }, 0);

    return res;
  }
};

// Set window startup time track
if (typeof window !== 'undefined') {
  (window as any).__START_TIME__ = Date.now();
  (window as any).performanceAudit = performanceAudit;
}
