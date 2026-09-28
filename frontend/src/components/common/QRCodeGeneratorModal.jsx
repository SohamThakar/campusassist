import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { QrCode, Download, Printer, Copy, Check, X, ExternalLink, Sparkles, Smartphone, Monitor } from 'lucide-react';

/**
 * Robust Client-Side QR Code Generator Modal
 * Generates high-resolution QR codes entirely in the browser using the 'qrcode' library.
 * Routes through root /?location=... so Render Static Site serves index.html (200 OK)
 * without 404 Not Found, and HomePage smoothly forwards to /student with pre-filled location!
 */
export const QRCodeGeneratorModal = ({ 
  isOpen, 
  onClose, 
  initialLocation = '', 
  availableLocations = [] 
}) => {
  const [locationName, setLocationName] = useState(initialLocation || 'Main Campus Library - 2nd Floor');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [customBaseUrl, setCustomBaseUrl] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Check if testing locally on computer
  const isLocal = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const productionOrigin = 'https://campusassist-frontend.onrender.com';
  
  // Target environment mode: 'live' (for phone cameras scanning screen) or 'local' (for PC browser test)
  const [targetMode, setTargetMode] = useState(isLocal ? 'live' : 'auto');

  // Sync locationName whenever initialLocation changes or modal opens
  useEffect(() => {
    if (initialLocation) {
      setLocationName(initialLocation);
    } else if (!locationName) {
      setLocationName('Main Campus Library - 2nd Floor');
    }
  }, [initialLocation, isOpen]);

  // Determine active base origin
  const localOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  let activeBase = productionOrigin;
  if (customBaseUrl.trim()) {
    activeBase = customBaseUrl.trim().replace(/\/+$/, '');
  } else if (!isLocal || targetMode === 'local') {
    activeBase = localOrigin;
  } else {
    activeBase = productionOrigin;
  }

  // CRITICAL: We route via /?location=... instead of /student?location=...
  // Render Static Sites serve /index.html on root path with 200 OK, avoiding 404 Not Found!
  // HomePage.jsx immediately redirects client-side to /student?location=... with prefilled data!
  const cleanLoc = locationName.trim();
  const qrUrl = cleanLoc
    ? `${activeBase}/?location=${encodeURIComponent(cleanLoc)}`
    : `${activeBase}/?portal=student`;

  // Generate QR Code data URL client-side whenever qrUrl changes
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    QRCode.toDataURL(qrUrl, {
      width: 400,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    })
      .then((url) => {
        if (isMounted) setQrDataUrl(url);
      })
      .catch((err) => {
        console.error('Error generating QR code:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [qrUrl, isOpen]);

  if (!isOpen) return null;

  // Preset location recommendations
  const defaultPresets = [
    'Main Library - 2nd Floor',
    'Science Complex - Lab 102',
    'Academic Block - Lecture Hall A',
    'Hostel Block B - Ground Floor',
    'Cafeteria & Dining Hall',
    'Sports Complex / Gym'
  ];

  // Merge availableLocations from database with defaults (unique list)
  const combinedPresets = Array.from(
    new Set([...availableLocations.filter(Boolean), ...defaultPresets])
  ).slice(0, 8);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(qrUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const safeName = (locationName.trim() || 'campus-location')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `smartcampus-qr-${safeName}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Smart Campus QR Sign - ${locationName || 'Campus Location'}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 20mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              text-align: center;
              padding: 24px;
              color: #0f172a;
              background: #ffffff;
            }
            .card {
              max-width: 520px;
              margin: 0 auto;
              border: 3px solid #0f6fb0;
              border-radius: 28px;
              padding: 40px 32px;
              box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            }
            .header-tag {
              display: inline-block;
              background: #0f6fb0;
              color: #ffffff;
              padding: 6px 16px;
              border-radius: 999px;
              font-size: 13px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              margin-bottom: 12px;
            }
            h1 { font-size: 28px; font-weight: 900; margin: 0 0 6px; color: #0f172a; }
            h2 { font-size: 16px; font-weight: 600; color: #64748b; margin: 0 0 24px; }
            .loc-badge {
              display: inline-block;
              background: #f0f9ff;
              border: 1.5px solid #bae6fd;
              color: #0369a1;
              padding: 10px 20px;
              border-radius: 999px;
              font-weight: 800;
              font-size: 16px;
              margin-bottom: 24px;
              word-break: break-word;
            }
            .qr-wrapper {
              background: #ffffff;
              border: 2px solid #e2e8f0;
              border-radius: 20px;
              padding: 16px;
              display: inline-block;
              margin-bottom: 20px;
            }
            .qr-wrapper img {
              width: 260px;
              height: 260px;
              display: block;
            }
            .instruction {
              font-size: 14px;
              font-weight: 700;
              color: #0f172a;
              margin: 0 0 6px;
            }
            .subtext {
              font-size: 12px;
              color: #64748b;
              margin: 0;
            }
            .footer {
              margin-top: 24px;
              padding-top: 16px;
              border-top: 1px dashed #cbd5e1;
              font-size: 11px;
              color: #94a3b8;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <span class="header-tag">Facility Maintenance</span>
            <h1>Smart Campus</h1>
            <h2>Instant Issue Reporting Portal</h2>
            <div class="loc-badge">📍 ${locationName || 'Campus Facility'}</div>
            <div class="qr-wrapper">
              <img src="${qrDataUrl}" alt="Campus QR Code" />
            </div>
            <p class="instruction">Scan with your phone camera to report an issue here</p>
            <p class="subtext">No login required for students • Fast dispatch to verified technicians</p>
            <div class="footer">
              Smart Campus Management System • Facility Code Verified
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-[#0f6fb0]">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Campus Location QR Generator</h3>
              <p className="text-[11px] text-slate-400">Generate scan-to-report signage for specific campus places</p>
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

        {/* Input for Specific Place */}
        <div className="mt-4">
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Specific Campus Place / Room Name
          </label>
          <input
            type="text"
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            placeholder="e.g. Science Building Lab 201 or Hostel Block A"
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-800 font-medium focus:border-[#0f6fb0] focus:outline-none focus:ring-1 focus:ring-[#0f6fb0]"
          />
        </div>

        {/* Quick Pick Presets */}
        <div className="mt-2.5">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 mb-1.5">
            <Sparkles className="h-3 w-3 text-amber-500" />
            <span>Quick Select Campus Place:</span>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
            {combinedPresets.map((place) => (
              <button
                key={place}
                type="button"
                onClick={() => setLocationName(place)}
                className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold transition-all ${
                  locationName.trim().toLowerCase() === place.trim().toLowerCase()
                    ? 'bg-[#0f6fb0] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                📍 {place}
              </button>
            ))}
          </div>
        </div>

        {/* Localhost vs Mobile Scanning Destination Switcher (if on localhost) */}
        {isLocal && (
          <div className="mt-3 flex items-center justify-between p-2 bg-sky-50/70 border border-sky-200/60 rounded-xl text-xs">
            <span className="text-[11px] font-semibold text-sky-900">QR Target Mode:</span>
            <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-sky-200">
              <button
                type="button"
                onClick={() => setTargetMode('live')}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold transition-all ${
                  targetMode === 'live' ? 'bg-[#0f6fb0] text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-50'
                }`}
                title="Use Live Render deployment so your phone can reach the URL"
              >
                <Smartphone className="h-3 w-3" /> Phone Camera (Live Render)
              </button>
              <button
                type="button"
                onClick={() => setTargetMode('local')}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold transition-all ${
                  targetMode === 'local' ? 'bg-[#0f6fb0] text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-50'
                }`}
                title="Use localhost for testing directly on this PC"
              >
                <Monitor className="h-3 w-3" /> This PC (Localhost)
              </button>
            </div>
          </div>
        )}

        {/* QR Preview Card */}
        <div className="mt-3.5 rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-center">
          <div className="inline-block bg-white p-3 rounded-2xl border border-slate-200 shadow-sm mb-2">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR Code for ${locationName}`}
                className="h-44 w-44 object-contain mx-auto"
              />
            ) : (
              <div className="h-44 w-44 flex items-center justify-center text-xs text-slate-400">
                Generating QR code...
              </div>
            )}
          </div>
          <p className="text-xs font-bold text-slate-900 truncate px-4">
            {cleanLoc || 'Unspecified Location'}
          </p>

          <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
            <span className="truncate max-w-[280px] font-mono text-[10px] bg-slate-200/70 px-2 py-0.5 rounded text-slate-700">
              {qrUrl}
            </span>
            <a
              href={qrUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#0f6fb0] hover:underline flex items-center gap-0.5 shrink-0 font-bold"
              title="Test QR destination link in new tab"
            >
              Test Link <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        {/* Advanced / Host Settings (Collapsible) */}
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-[10px] font-semibold text-slate-400 hover:text-slate-600 transition-colors"
          >
            {showAdvanced ? '− Hide Custom Host Settings' : '+ Advanced: Set Custom Base URL'}
          </button>
          {showAdvanced && (
            <div className="mt-2 p-2.5 bg-slate-100/80 rounded-xl border border-slate-200 text-left">
              <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                Base URL (defaults to: {activeBase})
              </label>
              <input
                type="text"
                value={customBaseUrl}
                onChange={(e) => setCustomBaseUrl(e.target.value)}
                placeholder="e.g. https://campusassist-frontend.onrender.com"
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-800"
              />
            </div>
          )}
        </div>

        {/* Actions Grid */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 py-2.5 text-xs font-bold text-white shadow-xs transition-all"
          >
            <Download className="h-3.5 w-3.5" /> Download
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-[#0f6fb0] hover:bg-[#0c598d] py-2.5 text-xs font-bold text-white shadow-xs transition-all"
          >
            <Printer className="h-3.5 w-3.5" /> Print Sign
          </button>
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 py-2.5 text-xs font-semibold text-slate-700 transition-all"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>

      </div>
    </div>
  );
};
