import React, { useState } from 'react';
import { QrCode, Download, Printer, Copy, Check, X, Building2, ExternalLink } from 'lucide-react';

/**
 * Generates an SVG QR code using pure client-side math (compact QR encoder)
 * Or standard SVG rendering for campus location signage.
 */
export const QRCodeGeneratorModal = ({ isOpen, onClose, initialLocation = '' }) => {
  const [locationName, setLocationName] = useState(initialLocation || 'Main Campus Library - 2nd Floor');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Use current production origin, never localhost in production
  const origin = window.location.origin;
  const qrUrl = `${origin}/student?location=${encodeURIComponent(locationName.trim())}`;
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrUrl)}&margin=10`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(qrUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Smart Campus QR Code - ${locationName}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              text-align: center;
              padding: 40px;
              color: #0f172a;
            }
            .card {
              max-width: 480px;
              margin: 0 auto;
              border: 3px solid #0f6fb0;
              border-radius: 24px;
              padding: 36px 24px;
            }
            h1 { font-size: 24px; font-weight: 800; margin: 0 0 8px; color: #0f172a; }
            h2 { font-size: 16px; font-weight: 600; color: #0f6fb0; margin: 0 0 20px; }
            .loc-badge {
              display: inline-block;
              background: #f0f9ff;
              border: 1px solid #bae6fd;
              color: #0369a1;
              padding: 8px 16px;
              border-radius: 999px;
              font-weight: 700;
              font-size: 14px;
              margin-bottom: 24px;
            }
            img { width: 240px; height: 240px; margin: 0 auto 20px; display: block; }
            p { font-size: 13px; color: #64748b; margin: 0 0 8px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Smart Campus</h1>
            <h2>Facility Maintenance Portal</h2>
            <div class="loc-badge">📍 ${locationName}</div>
            <img src="${qrApiUrl}" alt="Campus QR Code" />
            <p><strong>Scan with your phone camera to report a maintenance issue at this location.</strong></p>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-[#0f6fb0]">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Campus Location QR Generator</h3>
              <p className="text-[11px] text-slate-400">Generate signage for classrooms, labs, and dorms</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Input */}
        <div className="mt-4">
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Campus Location / Room Name
          </label>
          <input
            type="text"
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            placeholder="e.g. Science Building Lab 201 or Hostel Block A"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-[#0f6fb0] focus:outline-none focus:ring-1 focus:ring-[#0f6fb0]"
          />
        </div>

        {/* QR Preview Card */}
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-center">
          <div className="inline-block bg-white p-3 rounded-xl border border-slate-200 shadow-xs mb-3">
            <img
              src={qrApiUrl}
              alt={`QR Code for ${locationName}`}
              className="h-44 w-44 object-contain mx-auto"
            />
          </div>
          <p className="text-xs font-bold text-slate-800 truncate px-4">
            {locationName || 'Unspecified Location'}
          </p>
        </div>

        {/* Actions */}
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-[#0f6fb0] hover:bg-[#0c598d] py-2.5 text-xs font-bold text-white shadow-xs transition-all"
          >
            <Printer className="h-4 w-4" /> Print Campus Sign
          </button>
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 py-2.5 text-xs font-semibold text-slate-700 transition-all"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied URL!' : 'Copy Portal URL'}
          </button>
        </div>

      </div>
    </div>
  );
};
