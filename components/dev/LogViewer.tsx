'use client';

import React, { useState, useEffect } from 'react';
import logger, { LogEntry, LogLevel } from '@/lib/logger';

/**
 * LogViewer component for development testing
 * Displays and allows exporting of application logs
 */
export default function LogViewer() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<LogLevel | 'all'>('all');
  const [isOpen, setIsOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Refresh logs every second
  useEffect(() => {
    const intervalId = setInterval(() => {
      let filteredLogs = logger.getLogs();
      if (filter !== 'all') {
        filteredLogs = logger.getLogsByLevel(filter as LogLevel);
      }
      setLogs(filteredLogs);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [filter]);

  const handleCopyLogs = () => {
    navigator.clipboard.writeText(logger.exportLogs());
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleClearLogs = () => {
    logger.clearLogs();
    setLogs([]);
  };

  const getLogBgColor = (level: LogLevel): string => {
    switch (level) {
      case 'debug': return 'bg-gray-100';
      case 'info': return 'bg-blue-50';
      case 'warn': return 'bg-yellow-50';
      case 'error': return 'bg-red-50';
      default: return 'bg-white';
    }
  };

  const getLogTextColor = (level: LogLevel): string => {
    switch (level) {
      case 'debug': return 'text-gray-700';
      case 'info': return 'text-blue-700';
      case 'warn': return 'text-yellow-700';
      case 'error': return 'text-red-700';
      default: return 'text-gray-900';
    }
  };

  // Add some logs for demonstration (you can remove this in production)
  useEffect(() => {
    if (logs.length === 0) {
      logger.info('LogViewer initialized');
    }
  }, [logs.length]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-blue-600 text-white p-2 rounded-full shadow-lg z-50"
        aria-label="Open logs"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold">Application Logs</h2>
          <div className="flex gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as LogLevel | 'all')}
              className="border rounded p-1 text-sm"
            >
              <option value="all">All Levels</option>
              <option value="debug">Debug</option>
              <option value="info">Info</option>
              <option value="warn">Warning</option>
              <option value="error">Error</option>
            </select>
            <button
              onClick={handleCopyLogs}
              className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
            >
              {copySuccess ? 'Copied!' : 'Copy Logs'}
            </button>
            <button
              onClick={handleClearLogs}
              className="bg-red-500 text-white px-3 py-1 rounded text-sm"
            >
              Clear
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="bg-gray-300 px-3 py-1 rounded text-sm"
            >
              Close
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-2">
          {logs.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No logs to display</p>
          ) : (
            <div className="space-y-2">
              {logs.map((log, index) => (
                <div 
                  key={index} 
                  className={`p-3 rounded-md ${getLogBgColor(log.level)} border ${index === 0 ? 'border-2 border-blue-400' : ''}`}
                >
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span className={`font-mono font-bold ${getLogTextColor(log.level)}`}>
                      [{log.level.toUpperCase()}]
                    </span>
                    <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="font-medium">{log.message}</div>
                  {log.context && (
                    <pre className="mt-1 text-xs bg-gray-800 text-gray-200 p-2 rounded overflow-x-auto">
                      {JSON.stringify(log.context, null, 2)}
                    </pre>
                  )}
                  {log.stack && (
                    <pre className="mt-1 text-xs bg-gray-800 text-red-300 p-2 rounded overflow-x-auto">
                      {log.stack}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="p-2 border-t text-xs text-gray-500 flex justify-between">
          <span>Total logs: {logs.length}</span>
          <span>Press ESC to close</span>
        </div>
      </div>
    </div>
  );
} 