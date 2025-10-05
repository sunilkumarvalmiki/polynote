import { useState } from 'react';
import { FileDown, FileUp, Package, Lock, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

export function SharePage() {
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [includeAttachments, setIncludeAttachments] = useState(false);
  const [expiryDays, setExpiryDays] = useState(7);
  const [bundleData, setBundleData] = useState<string | null>(null);
  const [bundleSize, setBundleSize] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Import states
  const [importBundle, setImportBundle] = useState('');
  const [importPassword, setImportPassword] = useState('');
  const [importedNotes, setImportedNotes] = useState<any[]>([]);

  const handleCreateBundle = async () => {
    setError(null);
    setSuccess(null);

    // Validation
    if (selectedNotes.length === 0) {
      setError('Please select at least one note');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const expiresAt = expiryDays > 0 ? Date.now() + expiryDays * 24 * 60 * 60 * 1000 : undefined;

      const result = await window.electronAPI?.createShareBundle(selectedNotes, password, {
        includeAttachments,
        expiresAt,
      });

      if (result) {
        setBundleData(result.bundle);
        setBundleSize(result.size);
        setSuccess(`Bundle created successfully! Size: ${(result.size / 1024).toFixed(2)} KB`);
      }
    } catch (err) {
      setError(`Failed to create bundle: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadBundle = () => {
    if (!bundleData) return;

    const blob = new Blob([bundleData], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `polynote-share-${Date.now()}.bundle`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setSuccess('Bundle downloaded successfully!');
  };

  const handleImportBundle = async () => {
    setError(null);
    setSuccess(null);

    if (!importBundle) {
      setError('Please paste a bundle');
      return;
    }
    if (!importPassword) {
      setError('Please enter the bundle password');
      return;
    }

    setLoading(true);
    try {
      const result = await window.electronAPI?.extractShareBundle(importBundle, importPassword);

      if (result) {
        setImportedNotes(result.notes);
        setSuccess(
          `Successfully imported ${result.notes.length} note(s) from bundle created on ${new Date(result.metadata.createdAt).toLocaleDateString()}`
        );
      }
    } catch (err) {
      setError(
        `Failed to import bundle: ${err instanceof Error ? err.message : String(err)}. Check password and bundle integrity.`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
      const content = e.target?.result as string;
      // Remove data URL prefix if present
      const base64 = content.includes(',') ? content.split(',')[1] : content;
      setImportBundle(base64);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Share Bundles</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Create encrypted, shareable bundles of your notes or import bundles shared with you.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Export Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <Package className="h-6 w-6 text-blue-500" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Export Bundle</h2>
          </div>

          {error && !importBundle && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {success && bundleData && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-700 dark:text-green-400">{success}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Notes
              </label>
              <input
                type="text"
                placeholder="Enter note IDs (comma-separated)"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                onChange={e =>
                  setSelectedNotes(e.target.value.split(',').map(id => id.trim()).filter(Boolean))
                }
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Enter note IDs separated by commas
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password (min 8 characters)"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="attachments"
                checked={includeAttachments}
                onChange={e => setIncludeAttachments(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              <label htmlFor="attachments" className="text-sm text-gray-700 dark:text-gray-300">
                Include attachments
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Expiry (days)
              </label>
              <input
                type="number"
                value={expiryDays}
                onChange={e => setExpiryDays(parseInt(e.target.value) || 0)}
                min="0"
                max="365"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Set to 0 for no expiry
              </p>
            </div>

            <button
              onClick={handleCreateBundle}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md flex items-center justify-center gap-2 transition-colors"
            >
              <Package className="h-4 w-4" />
              {loading ? 'Creating...' : 'Create Bundle'}
            </button>

            {bundleData && (
              <button
                onClick={handleDownloadBundle}
                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md flex items-center justify-center gap-2 transition-colors"
              >
                <FileDown className="h-4 w-4" />
                Download Bundle
              </button>
            )}
          </div>
        </div>

        {/* Import Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <FileUp className="h-6 w-6 text-green-500" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Import Bundle</h2>
          </div>

          {error && importBundle && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {success && importedNotes.length > 0 && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-700 dark:text-green-400">{success}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Upload Bundle File
              </label>
              <input
                type="file"
                accept=".bundle"
                onChange={handleFileUpload}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Or Paste Bundle Data
              </label>
              <textarea
                value={importBundle}
                onChange={e => setImportBundle(e.target.value)}
                placeholder="Paste bundle data here..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Bundle Password
              </label>
              <input
                type="password"
                value={importPassword}
                onChange={e => setImportPassword(e.target.value)}
                placeholder="Enter bundle password"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <button
              onClick={handleImportBundle}
              disabled={loading}
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-md flex items-center justify-center gap-2 transition-colors"
            >
              <FileUp className="h-4 w-4" />
              {loading ? 'Importing...' : 'Import Bundle'}
            </button>

            {importedNotes.length > 0 && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Imported Notes ({importedNotes.length})
                </h3>
                <ul className="space-y-1">
                  {importedNotes.slice(0, 5).map(note => (
                    <li key={note.id} className="text-sm text-gray-600 dark:text-gray-400">
                      • {note.title}
                    </li>
                  ))}
                  {importedNotes.length > 5 && (
                    <li className="text-sm text-gray-500 dark:text-gray-500">
                      ... and {importedNotes.length - 5} more
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Security Notice */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
          🔒 Security Notice
        </h3>
        <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
          <li>• Bundles are encrypted using OpenPGP with AES-256</li>
          <li>• Passwords are never stored - keep them safe!</li>
          <li>• Bundles include a SHA-256 checksum for integrity verification</li>
          <li>• Expired bundles cannot be extracted</li>
        </ul>
      </div>
    </div>
  );
}
