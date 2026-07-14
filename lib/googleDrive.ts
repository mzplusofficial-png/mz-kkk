/**
 * Utility to parse, validate and resolve Google Drive share URLs
 * into direct web-viewable URLs (for image/video rendering) 
 * or direct streamable download URLs (for audio/download media).
 */

export interface GDriveResolution {
  id: string | null;
  directView: string;
  directDownload: string;
  isGoogleDrive: boolean;
}

export function parseGoogleDriveLink(url: string | null | undefined): GDriveResolution {
  const result: GDriveResolution = {
    id: null,
    directView: '',
    directDownload: '',
    isGoogleDrive: false
  };

  if (!url) return result;

  const trimmed = url.trim();
  result.directView = trimmed;
  result.directDownload = trimmed;

  // Let's support when they copy-paste just the Google Drive File ID directly
  if (trimmed.match(/^[a-zA-Z0-9_-]{19,80}$/)) {
    result.id = trimmed;
    result.isGoogleDrive = true;
    result.directView = `https://lh3.googleusercontent.com/d/${trimmed}`;
    result.directDownload = `https://docs.google.com/uc?export=download&id=${trimmed}`;
    return result;
  }

  // Check if it's a google domain
  const isGDrivePattern = trimmed.includes('google.com') || trimmed.includes('googleusercontent.com') || trimmed.includes('drive.gmail');
  if (!isGDrivePattern) {
    // Also scan for typical Google ID-looking formats in context
    const fallbackIdMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]{19,80})/);
    if (fallbackIdMatch && fallbackIdMatch[1]) {
      const id = fallbackIdMatch[1];
      result.id = id;
      result.isGoogleDrive = true;
      result.directView = `https://lh3.googleusercontent.com/d/${id}`;
      result.directDownload = `https://docs.google.com/uc?export=download&id=${id}`;
      return result;
    }
    return result;
  }

  result.isGoogleDrive = true;

  // Case 1: View/download link with ID query param
  if (trimmed.includes('docs.google.com/uc') || trimmed.includes('drive.google.com/thumbnail') || trimmed.includes('drive.google.com/open')) {
    try {
      const urlObj = new URL(trimmed);
      const id = urlObj.searchParams.get('id');
      if (id) {
        result.id = id;
        result.directView = `https://lh3.googleusercontent.com/d/${id}`;
        result.directDownload = `https://docs.google.com/uc?export=download&id=${id}`;
        return result;
      }
    } catch (e) {
      // url parsing fallback
    }
  }

  // Case 2: Matching standard folder, file layouts, or sharing links
  // Examples:
  // https://drive.google.com/file/d/1A2b3C4D5e6F7g8H9i0_JkLmNoPqRsTuV/view?usp=sharing
  // https://docs.google.com/file/d/1A2b3C4D5e6F7g8H9i0_JkLmNoPqRsTuV/edit
  const dPathMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]{15,120})/);
  if (dPathMatch && dPathMatch[1]) {
    const id = dPathMatch[1];
    result.id = id;
    result.directView = `https://lh3.googleusercontent.com/d/${id}`;
    result.directDownload = `https://docs.google.com/uc?export=download&id=${id}`;
    return result;
  }

  // Case 3: Matching query-based share links or general query params
  const queryIdMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]{15,120})/);
  if (queryIdMatch && queryIdMatch[1]) {
    const id = queryIdMatch[1];
    result.id = id;
    result.directView = `https://lh3.googleusercontent.com/d/${id}`;
    result.directDownload = `https://docs.google.com/uc?export=download&id=${id}`;
    return result;
  }

  return result;
}

/**
 * Returns a high-performance rendering URL specifically for image previewing.
 * Uses the Google Drive high-resolution thumbnail caching edge nodes.
 */
export function getGDriveThumbnailUrl(url: string | null | undefined, width: number = 800): string {
  if (!url) return '';
  const parsed = parseGoogleDriveLink(url);
  if (parsed.isGoogleDrive && parsed.id) {
    // lh3.googleusercontent.com/d/ID=wSizing is ultra-fast, auto-compresses, bypasses cookie/CORS / iframe blockades
    return `https://lh3.googleusercontent.com/d/${parsed.id}=w${width}`;
  }
  return url;
}
