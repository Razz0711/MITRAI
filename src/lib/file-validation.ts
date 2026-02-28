// ============================================
// MitrAI - File Validation Utility
// Validates file types for uploads — blocks executables & dangerous files
// ============================================

// Allowed file extensions for study materials
const ALLOWED_EXTENSIONS = new Set([
  // Documents
  'pdf', 'doc', 'docx', 'txt', 'rtf', 'odt',
  // Spreadsheets
  'xls', 'xlsx', 'csv', 'ods',
  // Presentations
  'ppt', 'pptx', 'odp',
  // Images
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp',
  // Archives (common for bundled notes)
  'zip', 'rar', '7z', 'tar', 'gz',
  // Code/text (for programming courses)
  'py', 'js', 'ts', 'c', 'cpp', 'java', 'html', 'css', 'json', 'xml', 'md',
  // Jupyter notebooks
  'ipynb',
]);

// Blocked file extensions — executables and dangerous files
const BLOCKED_EXTENSIONS = new Set([
  // Windows executables
  'exe', 'msi', 'bat', 'cmd', 'com', 'scr', 'pif',
  // Script files that can auto-execute
  'vbs', 'vbe', 'wsf', 'wsh', 'ps1', 'psm1',
  // macOS/Linux executables
  'app', 'dmg', 'sh', 'bin', 'run',
  // DLLs and system files
  'dll', 'sys', 'drv', 'cpl',
  // Shortcut/link files (can redirect to malware)
  'lnk', 'url', 'desktop',
  // Java archives (can contain executables)
  'jar',
  // Disk images
  'iso', 'img',
  // Registry files
  'reg',
]);

// Blocked MIME types
const BLOCKED_MIME_TYPES = new Set([
  'application/x-msdownload',
  'application/x-executable',
  'application/x-dosexec',
  'application/x-msdos-program',
  'application/x-sh',
  'application/x-shellscript',
  'application/x-bat',
  'application/x-msi',
]);

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate a file for upload safety.
 * Blocks executables, system files, and other dangerous file types.
 */
export function validateFileType(fileName: string, mimeType?: string): FileValidationResult {
  if (!fileName) {
    return { valid: false, error: 'File name is required' };
  }

  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  // Check blocked extensions first
  if (BLOCKED_EXTENSIONS.has(ext)) {
    return { valid: false, error: `File type ".${ext}" is not allowed. Executable and system files are blocked for security.` };
  }

  // Check MIME type if provided
  if (mimeType && BLOCKED_MIME_TYPES.has(mimeType.toLowerCase())) {
    return { valid: false, error: 'This file type is not allowed for security reasons.' };
  }

  // Check against allowed extensions
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return { valid: false, error: `File type ".${ext}" is not supported. Allowed: PDF, DOC, PPT, images, and common document formats.` };
  }

  return { valid: true };
}

/**
 * Max file size in bytes (10MB)
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Validate file size
 */
export function validateFileSize(size: number): FileValidationResult {
  if (size <= 0) {
    return { valid: false, error: 'File is empty' };
  }
  if (size > MAX_FILE_SIZE) {
    return { valid: false, error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.` };
  }
  return { valid: true };
}
