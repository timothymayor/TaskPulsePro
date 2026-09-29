import React, { useState, useRef } from 'react';
import { Download, Upload, RefreshCw, X, AlertCircle, CheckCircle2, FileText, Database } from 'lucide-react';
import { TodoItem } from '../types/todo';

interface DataModalProps {
  isOpen: boolean;
  onClose: () => void;
  todos: TodoItem[];
  onExport: () => string;
  onImport: (jsonString: string) => { success: boolean; count?: number; error?: string };
  onReset: () => void;
}

export const DataManagementModal: React.FC<DataModalProps> = ({
  isOpen,
  onClose,
  todos,
  onExport,
  onImport,
  onReset,
}) => {
  const [importStatus, setImportStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [lastChecksum, setLastChecksum] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleExportClick = () => {
    const checksum = onExport();
    setLastChecksum(checksum);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setImportStatus({ success: false, message: 'Only valid .json backup files are supported.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      const res = onImport(content);
      if (res.success) {
        setImportStatus({
          success: true,
          message: `Successfully validated and imported ${res.count} task records!`,
        });
      } else {
        setImportStatus({
          success: false,
          message: res.error || 'Failed to parse and validate backup structure.',
        });
      }
    };
    reader.onerror = () => {
      setImportStatus({ success: false, message: 'Failed to read the uploaded file.' });
    };
    reader.readAsText(file);
  };

  const handleResetClick = () => {
    if (window.confirm('Reset all tasks to sample initial state? Current data will be replaced.')) {
      onReset();
      setImportStatus({ success: true, message: 'Tasks restored to default demo state.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-xl dark:border-neutral-800 dark:bg-neutral-900 transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
              <Database className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
                Data Integrity & Backup
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Cryptographically validated local storage and offline portability
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Status Message */}
        {importStatus && (
          <div
            className={`mt-4 flex items-center gap-2 rounded-lg p-3 text-xs ${
              importStatus.success
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
            }`}
          >
            {importStatus.success ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{importStatus.message}</span>
          </div>
        )}

        <div className="mt-4 space-y-3 text-xs sm:text-sm">
          {/* Export Card */}
          <div className="rounded-lg border border-neutral-200 p-3.5 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-neutral-900 dark:text-white">
                  Export Encrypted Backup
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Downloads all {todos.length} tasks formatted with an SHA-256 integrity checksum.
                </p>
              </div>
              <button
                onClick={handleExportClick}
                className="flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export JSON</span>
              </button>
            </div>
            {lastChecksum && (
              <div className="mt-2 text-[11px] font-mono text-neutral-400">
                Payload Checksum: <span className="text-neutral-700 dark:text-neutral-300">{lastChecksum}</span>
              </div>
            )}
          </div>

          {/* Import Card */}
          <div className="rounded-lg border border-neutral-200 p-3.5 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-neutral-900 dark:text-white">
                  Import Task Archive
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Restores tasks from backup. Validates schema before applying changes.
                </p>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800 transition-colors"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Upload JSON</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Reset Demo Data Card */}
          <div className="rounded-lg border border-neutral-200 p-3.5 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-neutral-900 dark:text-white">
                  Reset to Standard Demo Set
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Restores default professional task workflow templates.
                </p>
              </div>
              <button
                onClick={handleResetClick}
                className="flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800 transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Reset</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 flex justify-end pt-3 border-t border-neutral-100 dark:border-neutral-800">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
