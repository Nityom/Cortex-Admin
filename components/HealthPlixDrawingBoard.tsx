'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { PenTool, Eraser, Paperclip, FilePlus, Image as ImageIcon, Maximize2, Minimize2, Trash2, LayoutTemplate } from 'lucide-react';
import { DIAGRAM_SVG_PRESETS } from '@/services/diagramPresets';

interface HealthPlixDrawingBoardProps {
  value?: string; // Data URL of the drawing
  onChange?: (dataUrl: string) => void;
  storageKey?: string; // Optional custom key for localStorage persistence
}

export default function HealthPlixDrawingBoard({
  value,
  onChange,
  storageKey = 'cortex_drawing_local_board',
}: HealthPlixDrawingBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [selectedColor, setSelectedColor] = useState<string>('#000000');
  const [lineWidth, setLineWidth] = useState<number>(3);
  const [hasAttachedImage, setHasAttachedImage] = useState(false);
  const [canvasHeight, setCanvasHeight] = useState<number>(480);
  const [fitMode, setFitMode] = useState<'fill-width' | 'contain'>('fill-width');
  const activeImageSrcRef = useRef<string>('');

  const colors = [
    { label: 'Black', value: '#000000' },
    { label: 'Yellow', value: '#eab308' },
    { label: 'Blue', value: '#2563eb' },
    { label: 'Red', value: '#dc2626' },
    { label: 'Green', value: '#16a34a' },
  ];

  // Helper to load and draw an image or data URL onto the canvas with crisp high-res quality
  const drawImageOnCanvas = useCallback((src: string, mode: 'fill-width' | 'contain' = 'fill-width') => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !src) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    activeImageSrcRef.current = src;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const containerWidth = container?.getBoundingClientRect().width || 1000;
      const targetWidth = Math.max(containerWidth, 800);

      let targetHeight = 480;
      if (mode === 'fill-width') {
        // Dynamically size canvas height to match natural aspect ratio of the image!
        const calculated = Math.round(targetWidth * (img.height / img.width));
        targetHeight = Math.min(Math.max(calculated, 420), 850);
      } else {
        targetHeight = 480;
      }

      setCanvasHeight(targetHeight);
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Clear to crisp white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      if (mode === 'fill-width') {
        // Expand image across full width with high resolution
        const drawH = targetWidth * (img.height / img.width);
        const offsetY = (targetHeight - drawH) / 2;
        ctx.drawImage(img, 0, offsetY, targetWidth, drawH);
      } else {
        // Contain image within canvas
        const hRatio = targetWidth / img.width;
        const vRatio = targetHeight / img.height;
        const ratio = Math.min(hRatio, vRatio);
        const centerShiftX = (targetWidth - img.width * ratio) / 2;
        const centerShiftY = (targetHeight - img.height * ratio) / 2;
        ctx.drawImage(
          img,
          0,
          0,
          img.width,
          img.height,
          centerShiftX,
          centerShiftY,
          img.width * ratio,
          img.height * ratio
        );
      }
    };
    img.src = src;
  }, []);

  // Initialize and resize canvas to match actual container dimensions
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const width = Math.max(rect.width || 800, 600);

    // If an image is currently loaded, redraw it to fit new width
    if (activeImageSrcRef.current) {
      drawImageOnCanvas(activeImageSrcRef.current, fitMode);
      return;
    }

    if (canvas.width !== width || canvas.height !== canvasHeight) {
      const prevData = canvas.toDataURL();
      canvas.width = width;
      canvas.height = canvasHeight;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, canvasHeight);

        let initialSrc = value;
        if (!initialSrc && typeof window !== 'undefined') {
          try {
            initialSrc = localStorage.getItem(storageKey) || '';
          } catch {}
        }
        if (!initialSrc && prevData && prevData !== 'data:,') {
          initialSrc = prevData;
        }

        if (initialSrc) {
          drawImageOnCanvas(initialSrc, fitMode);
        }
      }
    }
  }, [value, storageKey, canvasHeight, fitMode, drawImageOnCanvas]);

  useEffect(() => {
    setupCanvas();
    window.addEventListener('resize', setupCanvas);
    return () => window.removeEventListener('resize', setupCanvas);
  }, [setupCanvas]);

  // Load from localStorage or value prop on initial mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setHasAttachedImage(true);
        activeImageSrcRef.current = saved;
        drawImageOnCanvas(saved, 'fill-width');
        if (onChange && !value) {
          onChange(saved);
        }
      } else if (value) {
        const srcToLoad = DIAGRAM_SVG_PRESETS[value] || value;
        activeImageSrcRef.current = srcToLoad;
        setHasAttachedImage(true);
        drawImageOnCanvas(srcToLoad, 'fill-width');
      }
    } catch {}
  }, [storageKey, drawImageOnCanvas]);

  // Load initial drawing when value prop changes externally
  useEffect(() => {
    if (value && value !== activeImageSrcRef.current) {
      const srcToLoad = DIAGRAM_SVG_PRESETS[value] || value;
      activeImageSrcRef.current = srcToLoad;
      setHasAttachedImage(true);
      drawImageOnCanvas(srcToLoad, fitMode);
    }
  }, [value, fitMode, drawImageOnCanvas]);

  // Handle image upload from file picker (Stored strictly in localStorage only)
  const handleImageUpload = (file: File) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) return;

      activeImageSrcRef.current = dataUrl;
      setHasAttachedImage(true);
      drawImageOnCanvas(dataUrl, 'fill-width');

      // Persist solely in browser localStorage
      try {
        localStorage.setItem(storageKey, dataUrl);
      } catch (err) {
        console.warn('LocalStorage quota or storage error for drawing image:', err);
      }

      if (onChange) {
        onChange(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
    e.target.value = '';
  };

  // Drag and drop image support onto drawing board
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        handleImageUpload(file);
      }
    }
  };

  // Accurate coordinate calculation accounting for canvas display scaling
  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    let clientX: number;
    let clientY: number;

    if ('touches' in e) {
      if (!e.touches || e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // Scale from CSS display coordinates to canvas internal pixel buffer
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const coords = getCoordinates(e);
    if (!coords) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = tool === 'eraser' ? 22 : lineWidth;
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : selectedColor;
    setIsDrawing(true);
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing) return;
    const coords = getCoordinates(e);
    if (!coords) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      activeImageSrcRef.current = dataUrl;
      // Store in localStorage only
      try {
        localStorage.setItem(storageKey, dataUrl);
      } catch (err) {
        console.warn('LocalStorage error while saving drawing:', err);
      }
      if (onChange) {
        onChange(dataUrl);
      }
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    activeImageSrcRef.current = '';
    // Remove from localStorage
    try {
      localStorage.removeItem(storageKey);
    } catch {}

    setHasAttachedImage(false);
    if (onChange) {
      onChange('');
    }
  };

  const handleRemoveImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    activeImageSrcRef.current = '';
    setHasAttachedImage(false);
    setCanvasHeight(480);

    try {
      localStorage.removeItem(storageKey);
    } catch {}

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    if (onChange) {
      onChange('');
    }
  };

  const toggleFitMode = () => {
    const nextMode = fitMode === 'fill-width' ? 'contain' : 'fill-width';
    setFitMode(nextMode);
    if (activeImageSrcRef.current) {
      drawImageOnCanvas(activeImageSrcRef.current, nextMode);
    }
  };

  return (
    <div
      ref={containerRef}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className="w-full bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs relative"
    >
      {/* Hidden File Input for Image Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Top Bar Indicator showing Local Storage Only */}
      <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
        <div className="flex items-center gap-2 font-semibold">
          <ImageIcon className="w-4 h-4 text-blue-600" />
          <span>Image Annotation & Clinical Sketch Board</span>
          {hasAttachedImage && (
            <span className="px-2 py-0.5 text-[11px] bg-emerald-100 text-emerald-800 rounded-full font-bold border border-emerald-200 flex items-center gap-1">
              ✓ Image Loaded
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasAttachedImage && (
            <>
              <button
                type="button"
                onClick={toggleFitMode}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-white border border-slate-200 rounded-md text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                title="Toggle between Fill Width (Large/Crisp) and Fit to Viewport"
              >
                {fitMode === 'fill-width' ? (
                  <>
                    <Minimize2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Fit View</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Fill Width (Large)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleRemoveImage}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-md transition cursor-pointer"
                title="Remove attached background image from local storage"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-600" />
                <span>Delete Image</span>
              </button>
            </>
          )}
          <span className="text-[11px] text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 font-semibold">
            Stored in Local Storage Only • Not uploaded to database
          </span>
        </div>
      </div>

      {/* Dedicated Canvas Drawing Area (No floating toolbar covering the image) */}
      <div className="relative touch-none overflow-x-auto bg-slate-100/60 flex items-center justify-center p-2 min-h-[440px]">
        <canvas
          ref={canvasRef}
          width={1000}
          height={canvasHeight}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          style={{ height: `${canvasHeight}px` }}
          className="w-full bg-white cursor-crosshair block select-none rounded shadow-xs border border-slate-200"
        />
      </div>

      {/* Clean Bottom Toolbar - Docked OUTSIDE the canvas so it never obscures any drawing or image */}
      <div className="bg-slate-50 border-t border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Pen Button */}
          <button
            type="button"
            onClick={() => setTool('pen')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
              tool === 'pen'
                ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
            title="Pen Tool"
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Pen</span>
          </button>

          {/* Eraser Button */}
          <button
            type="button"
            onClick={() => setTool('eraser')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
              tool === 'eraser'
                ? 'bg-blue-100 text-blue-900 border border-blue-300 shadow-2xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
            title="Eraser Tool"
          >
            <Eraser className="w-3.5 h-3.5" />
            <span>Eraser</span>
          </button>

          <div className="h-5 w-px bg-slate-300 mx-1" />

          {/* Color Dots */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-500">Color:</span>
            {colors.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => {
                  setSelectedColor(c.value);
                  setTool('pen');
                }}
                className={`w-5 h-5 rounded-full border transition cursor-pointer ${
                  selectedColor === c.value && tool === 'pen'
                    ? 'ring-2 ring-offset-2 ring-blue-500 scale-110 shadow-xs'
                    : 'border-slate-300 hover:scale-105'
                }`}
                style={{ backgroundColor: c.value }}
                title={c.label}
              />
            ))}
          </div>

          <div className="h-5 w-px bg-slate-300 mx-1" />

          {/* Stroke Width Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500">Thickness:</span>
            {[2, 4, 6].map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setLineWidth(w)}
                className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold transition cursor-pointer ${
                  lineWidth === w
                    ? 'bg-slate-800 text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {w}px
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Anatomical Diagram Template Selector */}
          <div className="flex items-center">
            <select
              onChange={(e) => {
                const key = e.target.value;
                if (key && DIAGRAM_SVG_PRESETS[key]) {
                  const src = DIAGRAM_SVG_PRESETS[key];
                  activeImageSrcRef.current = src;
                  setHasAttachedImage(true);
                  drawImageOnCanvas(src, 'fill-width');
                  try {
                    localStorage.setItem(storageKey, src);
                  } catch {}
                  if (onChange) onChange(src);
                  e.target.value = '';
                }
              }}
              defaultValue=""
              title="Load Anatomical Diagram Template (Knee, Spine, Shoulder, Body)"
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 cursor-pointer shadow-2xs outline-none"
            >
              <option value="" disabled>📋 Diagram Template...</option>
              <option value="knee_joint_preset">🦴 Knee Joint Anatomy</option>
              <option value="spine_column_preset">🩻 Lumbar Spine & Discs</option>
              <option value="shoulder_joint_preset">💪 Shoulder & Rotator Cuff</option>
              <option value="body_silhouette_preset">🧍 Full Body Silhouette (Ant/Post)</option>
            </select>
          </div>

          {/* Upload / Attach Image Button (Stored strictly in local storage) */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 border shadow-2xs ${
              hasAttachedImage
                ? 'bg-blue-600 text-white border-blue-700 hover:bg-blue-700'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
            }`}
            title="Attach image or photo from your computer (stored in Local Storage only)"
          >
            <Paperclip className="w-3.5 h-3.5" />
            <span>{hasAttachedImage ? 'Change Image' : 'Attach Image'}</span>
          </button>

          {/* Delete Image button */}
          {hasAttachedImage && (
            <button
              type="button"
              onClick={handleRemoveImage}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 shadow-2xs"
              title="Delete attached image and reset drawing board"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-600" />
              <span>Delete Image</span>
            </button>
          )}

          {/* New Page / Clear Canvas */}
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-red-700 bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 px-3 py-1.5 rounded-lg transition cursor-pointer shadow-2xs"
            title="Clear all drawings and remove attached image"
          >
            <FilePlus className="w-3.5 h-3.5" />
            <span>New Page</span>
          </button>
        </div>
      </div>
    </div>
  );
}

