import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, 
  HelpCircle, 
  Upload, 
  CheckCircle2, 
  LogIn, 
  AlertCircle, 
  X,
  Send,
  Video,
  ClipboardList,
  QrCode,
  MapPin,
  Copy,
  Check,
  Camera,
  Loader2
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { complaintsAPI } from '../../api/endpoints';
import { getUploadUrl } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

const CATEGORIES = [
  "Electrical",
  "Plumbing",
  "HVAC",
  "Civil / Structural",
  "Cleaning",
  "IT / Network",
  "Other"
];

export const ReportIssuePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const { user } = useAuth();

  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [locationFromQR, setLocationFromQR] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Evidence states
  const [photoUrl, setPhotoUrl] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [videoFilename, setVideoFilename] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Submission Success State
  const [submissionResult, setSubmissionResult] = useState(null);

  // 1. Identify Location from QR Code query parameters (?location=..., ?loc=..., ?place=..., ?zone=...)
  useEffect(() => {
    const qrLocation = searchParams.get('location') || searchParams.get('loc') || searchParams.get('place') || searchParams.get('zone');
    if (qrLocation && qrLocation.trim()) {
      try {
        const decoded = decodeURIComponent(qrLocation.trim());
        setLocation(decoded);
        setLocationFromQR(true);
      } catch (e) {
        setLocation(qrLocation.trim());
        setLocationFromQR(true);
      }
    }
  }, [searchParams]);

  // Pre-fill user info if logged in
  useEffect(() => {
    if (user) {
      if (user.name && !name) setName(user.name);
      if (user.email && !contact) setContact(user.email);
    }
  }, [user]);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Photo exceeds 5MB limit. Please choose a smaller photo.');
      return;
    }

    setPhotoFile(file);
    setError('');
    setIsUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await complaintsAPI.uploadPhoto(formData);
      setPhotoUrl(res.data.photo_url);
    } catch (err) {
      console.error(err);
      setError('Failed to upload photo. You can still submit without a photo.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleVideoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      setError('Video exceeds 50MB limit. Please choose a shorter clip.');
      return;
    }

    setVideoFile(file);
    setError('');
    setIsUploadingVideo(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await complaintsAPI.uploadVideo(formData);
      setVideoUrl(res.data.video_url);
      setVideoFilename(res.data.filename);
    } catch (err) {
      console.error(err);
      setError('Failed to upload video. You can still submit without a video.');
    } finally {
      setIsUploadingVideo(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!category) {
      setError('Please select an issue category.');
      return;
    }
    if (!description.trim() || !location.trim()) {
      setError('Please provide both a description and campus location.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    const submitterInfo = [name.trim(), contact.trim()].filter(Boolean).join(' • ');

    try {
      const payload = {
        category,
        description: description.trim(),
        location: location.trim(),
        submitted_by_contact: submitterInfo || null,
        photo_url: photoUrl,
        video_url: videoUrl,
        video_filename: videoFilename,
      };

      const res = await complaintsAPI.submit(payload);
      setSubmissionResult(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to submit maintenance request. Please check your network and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCode = () => {
    if (!submissionResult?.complaint_id) return;
    navigator.clipboard.writeText(submissionResult.complaint_id).then(() => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    }).catch(() => {
      // Fallback
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    });
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between items-center sm:py-6">
      {/* Mobile-First Container with responsive constraints */}
      <div className="w-full max-w-md bg-white min-h-screen sm:min-h-0 sm:rounded-2xl sm:shadow-xl sm:border border-slate-200 flex flex-col justify-between overflow-hidden">
        
        {/* Header: Back arrow + "Start a Complaint" title + help icon */}
        <div className="flex items-center justify-between px-4 sm:px-5 pt-4 pb-3 border-b border-slate-100 shrink-0">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 active:bg-slate-200 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="text-center">
            <h1 className="text-sm sm:text-base font-bold text-slate-900">Start a Complaint</h1>
            <span className="text-[10px] text-slate-400 font-medium">Smart Campus Community</span>
          </div>
          <button
            type="button"
            onClick={() => alert("Smart Campus lets students and staff submit facility maintenance requests directly to campus administration via mobile QR codes.")}
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 transition-colors"
            aria-label="Information"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 px-4 sm:px-5 py-4 overflow-y-auto">
          {submissionResult ? (
            /* Confirmation Screen */
            <div className="py-4 text-center animate-in fade-in zoom-in-95 duration-200">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-3 shadow-inner">
                <CheckCircle2 className="h-9 w-9" />
              </div>
              <h2 className="text-xl font-black text-slate-900">Request Submitted!</h2>
              <p className="mt-1 text-xs text-slate-500 max-w-[280px] mx-auto">
                Your maintenance request has been recorded and routed to the campus facility team.
              </p>

              {/* Reference ID Box */}
              <div className="my-5 rounded-2xl border border-sky-200 bg-sky-50/70 p-4 shadow-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-sky-800">Request Reference Code</span>
                <div className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-slate-900 flex items-center justify-center gap-2">
                  <span>{submissionResult.complaint_id}</span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-white/80 active:scale-95 transition-all"
                    title="Copy Reference Code"
                    aria-label="Copy Code"
                  >
                    {copiedCode ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                {copiedCode && (
                  <p className="text-[10px] font-semibold text-emerald-600 mt-1">Copied to clipboard!</p>
                )}
                <div className="mt-2 pt-2 border-t border-sky-100 flex items-center justify-center gap-2 text-[11px] text-slate-600">
                  <span>Category: <strong className="text-slate-800">{submissionResult.category}</strong></span>
                  <span>•</span>
                  <span>Location: <strong className="text-slate-800">{submissionResult.location}</strong></span>
                </div>
              </div>

              <div className="space-y-2.5">
                <Link
                  to={`/track?track=${encodeURIComponent(submissionResult.complaint_id)}`}
                  state={{ openComplaintId: submissionResult.complaint_id }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#0f6fb0] py-3.5 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-[#0c598d] active:scale-[0.99] transition-all"
                >
                  <ClipboardList className="h-4 w-4" /> Track My Complaint
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setSubmissionResult(null);
                    setName('');
                    setContact('');
                    setDescription('');
                    setLocation('');
                    setLocationFromQR(false);
                    setCategory('');
                    setPhotoUrl(null);
                    setPhotoFile(null);
                    setVideoUrl(null);
                    setVideoFilename(null);
                    setVideoFile(null);
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-3 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-100 active:scale-[0.99] transition-all"
                >
                  Submit Another Request
                </button>
                <Link
                  to="/"
                  className="block w-full py-2 text-xs font-medium text-slate-500 hover:text-slate-800"
                >
                  Return to Home
                </Link>
              </div>
            </div>
          ) : (
            /* Main Complaint Submission Form */
            <div>
              {/* QR Detected Pill Banner */}
              {locationFromQR && (
                <div className="mb-4 flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-800 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 min-w-0">
                    <QrCode className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="truncate">
                      Location identified via QR: <strong className="text-emerald-950 font-bold">{location}</strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLocationFromQR(false)}
                    className="ml-2 text-[10px] text-emerald-700 underline font-semibold shrink-0 hover:text-emerald-900"
                  >
                    Edit
                  </button>
                </div>
              )}

              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                Scan QR or enter facility details to notify campus administration immediately.
              </p>

              {error && (
                <div className="mb-4 flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3.5">
                {/* Reporter Name & Contact: Responsive single column on narrow screens (360px), 2 cols on tablet */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Your Name <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Alex Smith"
                      className="w-full min-h-[42px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Contact <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      placeholder="Phone or Email"
                      className="w-full min-h-[42px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                </div>

                {/* 1. Issue Category */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Issue Category<span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={category}
                    required
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  >
                    <option value="">Select Category ▼</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* 2. Campus Location */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      Campus Location<span className="text-rose-500">*</span>
                    </label>
                    {locationFromQR && (
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                        QR Verified
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => {
                      setLocation(e.target.value);
                      if (locationFromQR) setLocationFromQR(false);
                    }}
                    placeholder="e.g. Science Building, Room 402 or Main Library 2F"
                    className={`w-full min-h-[44px] rounded-xl border px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 ${
                      locationFromQR
                        ? 'border-emerald-300 bg-emerald-50/20 focus:border-emerald-500 focus:ring-emerald-500'
                        : 'border-slate-200 bg-white focus:border-brand-500 focus:ring-brand-500'
                    }`}
                  />
                </div>

                {/* 3. Description */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Description<span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-slate-400">Be specific</span>
                  </div>
                  <textarea
                    rows={3}
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the issue in detail (e.g. Water leaking rapidly under sink, broken door latch, AC not cooling...)"
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                {/* 4. Photo Evidence (Optional) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Photo Evidence <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                  />

                  {photoUrl ? (
                    <div className="relative rounded-xl border border-slate-200 bg-slate-50 p-2.5 flex items-center gap-3">
                      <img
                        src={getUploadUrl(photoUrl)}
                        alt="Evidence"
                        className="h-14 w-14 rounded-lg object-cover border border-slate-200 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-800 truncate">Photo attached</p>
                        <p className="text-[10px] text-emerald-600 flex items-center gap-1 font-semibold">
                          <CheckCircle2 className="h-3 w-3" /> Ready to submit
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setPhotoUrl(null); setPhotoFile(null); }}
                        className="p-1.5 rounded-full text-slate-400 hover:text-rose-600 hover:bg-slate-200 active:scale-95 transition-all"
                        aria-label="Remove photo"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => !isUploading && fileInputRef.current?.click()}
                      className="cursor-pointer rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/70 p-3.5 text-center hover:border-brand-400 hover:bg-brand-50/30 active:scale-[0.99] transition-all min-h-[48px] flex flex-col items-center justify-center"
                    >
                      {isUploading ? (
                        <div className="flex items-center gap-2 text-slate-600 py-1">
                          <Loader2 className="h-4 w-4 animate-spin text-[#0f6fb0]" />
                          <span className="text-xs font-medium">Uploading photo...</span>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-1.5 text-slate-600 mb-0.5">
                            <Camera className="h-4 w-4 text-[#0f6fb0]" />
                            <span className="text-xs font-bold text-slate-800">Take Photo or Browse</span>
                          </div>
                          <p className="text-[10px] text-slate-400">
                            Max 5MB (JPG, PNG, WEBP)
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* 5. Video Evidence (Optional) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Video Evidence <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  
                  <input
                    type="file"
                    ref={videoInputRef}
                    onChange={handleVideoChange}
                    accept="video/*"
                    className="hidden"
                  />

                  {videoUrl ? (
                    <div className="relative rounded-xl border border-emerald-200 bg-emerald-50/60 p-2.5 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 shrink-0">
                        <Video className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-800 truncate">{videoFilename || 'Video attached'}</p>
                        <p className="text-[10px] text-emerald-600 flex items-center gap-1 font-semibold">
                          <CheckCircle2 className="h-3 w-3" /> Ready to submit
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setVideoUrl(null); setVideoFilename(null); setVideoFile(null); }}
                        className="p-1.5 rounded-full text-slate-400 hover:text-rose-600 hover:bg-slate-200 active:scale-95 transition-all"
                        aria-label="Remove video"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => !isUploadingVideo && videoInputRef.current?.click()}
                      className="cursor-pointer rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/70 p-3.5 text-center hover:border-brand-400 hover:bg-brand-50/30 active:scale-[0.99] transition-all min-h-[48px] flex flex-col items-center justify-center"
                    >
                      {isUploadingVideo ? (
                        <div className="flex items-center gap-2 text-slate-600 py-1">
                          <Loader2 className="h-4 w-4 animate-spin text-[#0f6fb0]" />
                          <span className="text-xs font-medium">Uploading video (max 50MB)...</span>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-1.5 text-slate-600 mb-0.5">
                            <Video className="h-4 w-4 text-[#0f6fb0]" />
                            <span className="text-xs font-bold text-slate-800">Record or Select Video</span>
                          </div>
                          <p className="text-[10px] text-slate-400">
                            Max 50MB (MP4, MOV, AVI, WEBM)
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Primary Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || isUploading || isUploadingVideo}
                  className="w-full min-h-[48px] flex items-center justify-center gap-2 rounded-xl bg-[#0f172a] hover:bg-slate-800 active:scale-[0.99] text-white py-3 text-xs font-bold uppercase tracking-wider shadow-md transition-all disabled:opacity-50 mt-4"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                      <span>Submitting Complaint...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Send className="h-4 w-4" />
                      <span>Submit Complaint</span>
                    </div>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Bottom Tab Bar (Touch-friendly 48px min height) */}
        <div className="flex items-center justify-around border-t border-slate-200 bg-white py-2 px-2 shrink-0">
          <button
            type="button"
            onClick={() => setSubmissionResult(null)}
            className="flex flex-col items-center justify-center py-1 px-3 text-[#0f6fb0] font-semibold active:opacity-75 transition-opacity min-h-[44px]"
          >
            <Send className="h-4 w-4 mb-0.5" />
            <span className="text-[11px]">Start Complaint</span>
          </button>

          <Link
            to="/track"
            className="flex flex-col items-center justify-center py-1 px-3 text-slate-400 hover:text-slate-700 active:opacity-75 transition-opacity min-h-[44px]"
          >
            <ClipboardList className="h-4 w-4 mb-0.5" />
            <span className="text-[11px]">Track Complaint</span>
          </Link>

          <Link
            to="/login"
            className="flex flex-col items-center justify-center py-1 px-3 text-slate-400 hover:text-slate-700 active:opacity-75 transition-opacity min-h-[44px]"
          >
            <LogIn className="h-4 w-4 mb-0.5" />
            <span className="text-[11px]">Staff Login</span>
          </Link>
        </div>

      </div>
    </div>
  );
};
