/**
 * File utilities
 */

/**
 * Converts a File object to a Data URL (Base64).
 */
export function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
        if (!file) return resolve(null);
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
    });
}

/**
 * Utility to download text/html content as a file.
 */
export function downloadTextFile(filename, content, mime = 'text/html;charset=utf-8') {
    if (typeof document === 'undefined') return;
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Validates file type and size for uploads.
 * @param {File} file - File to validate
 * @param {Object} options - { allowedTypes: string[], maxSizeMB: number }
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateFile(file, options = {}) {
    const { allowedTypes = [], maxSizeMB = 10 } = options;

    if (!file) {
        return { valid: false, error: 'Nenhum arquivo selecionado' };
    }

    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
        return { valid: false, error: `Tipo de arquivo não permitido. Permitidos: ${allowedTypes.join(', ')}` };
    }

    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
        return { valid: false, error: `Arquivo muito grande. Máximo: ${maxSizeMB}MB` };
    }

    return { valid: true };
}
