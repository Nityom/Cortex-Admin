'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { PenTool, Eraser, Paperclip, FilePlus, Image as ImageIcon, Maximize2, Minimize2, Trash2, LayoutTemplate, Undo2, Redo2 } from 'lucide-react';

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
  const originalImageSrcRef = useRef<string>('');

  // Undo / Redo history stacks (using ImageData for instant, lossless, stroke-by-stroke undo)
  const undoStackRef = useRef<ImageData[]>([]);
  const redoStackRef = useRef<ImageData[]>([]);
  const [undoCount, setUndoCount] = useState<number>(0);
  const [redoCount, setRedoCount] = useState<number>(0);
  const currentStrokeSnapshotRef = useRef<ImageData | null>(null);
  const hasDrawnStrokeRef = useRef<boolean>(false);
  const hasInitializedCanvasRef = useRef<boolean>(false);
  const isInternalUpdateRef = useRef<boolean>(false);

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

    const img = new Image();
    if (src.startsWith('http://') || src.startsWith('https://')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      const containerWidth = container?.clientWidth || 1000;
      const targetWidth = containerWidth > 0 ? containerWidth : 1000;

      let targetHeight = 480;
      if (mode === 'fill-width' && img.width > 0) {
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

      if (mode === 'fill-width' && img.width > 0) {
        const drawH = targetWidth * (img.height / img.width);
        const offsetY = (targetHeight - drawH) / 2;
        ctx.drawImage(img, 0, offsetY, targetWidth, drawH);
      } else if (img.width > 0 && img.height > 0) {
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

      const dataUrl = canvas.toDataURL('image/png');
      activeImageSrcRef.current = dataUrl;
      try {
        localStorage.setItem(storageKey, dataUrl);
      } catch { }
      isInternalUpdateRef.current = true;
      if (onChange) {
        onChange(dataUrl);
      }
    };
    img.src = src;
  }, [storageKey, onChange]);

  // Initialize and resize canvas to match actual container dimensions
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const width = container.clientWidth || 800;

    if (!hasInitializedCanvasRef.current) {
      hasInitializedCanvasRef.current = true;
      canvas.width = width;
      canvas.height = canvasHeight;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, canvasHeight);
      }
      return;
    }

    // On resize only if width actually changed significantly
    if (Math.abs(canvas.width - width) > 10) {
      if (originalImageSrcRef.current) {
        drawImageOnCanvas(originalImageSrcRef.current, fitMode);
      } else {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const prevData = canvas.toDataURL();
          canvas.width = width;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, canvasHeight);
          if (prevData && prevData !== 'data:,') {
            const img = new Image();
            img.onload = () => {
              ctx.drawImage(img, 0, 0);
            };
            img.src = prevData;
          }
        }
      }
    }
  }, [canvasHeight, fitMode, drawImageOnCanvas]);

  useEffect(() => {
    setupCanvas();
    const handleResize = () => setupCanvas();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setupCanvas]);

  // Load from localStorage or value prop on initial mount ONLY
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const savedBg = localStorage.getItem(storageKey + '_bg');
      if (savedBg) {
        originalImageSrcRef.current = savedBg;
      }
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setHasAttachedImage(true);
        activeImageSrcRef.current = saved;
        if (!originalImageSrcRef.current) {
          originalImageSrcRef.current = saved;
        }
        drawImageOnCanvas(saved, 'fill-width');
        if (onChange && !value) {
          onChange(saved);
        }
      } else if (value) {
        const srcToLoad = value;
        activeImageSrcRef.current = srcToLoad;
        originalImageSrcRef.current = srcToLoad;
        try {
          localStorage.setItem(storageKey + '_bg', srcToLoad);
        } catch { }
        setHasAttachedImage(true);
        drawImageOnCanvas(srcToLoad, 'fill-width');
      }
    } catch { }
  }, []);

  // Load external value when changed outside (e.g. template preset selected)
  useEffect(() => {
    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false;
      return;
    }
    if (value && value !== activeImageSrcRef.current) {
      const srcToLoad = value;
      activeImageSrcRef.current = srcToLoad;
      originalImageSrcRef.current = srcToLoad;
      try {
        localStorage.setItem(storageKey + '_bg', srcToLoad);
      } catch { }
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

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          try {
            const prior = ctx.getImageData(0, 0, canvas.width, canvas.height);
            undoStackRef.current.push(prior);
            if (undoStackRef.current.length > 50) undoStackRef.current.shift();
            redoStackRef.current = [];
            setUndoCount(undoStackRef.current.length);
            setRedoCount(0);
          } catch { }
        }
      }

      originalImageSrcRef.current = dataUrl;
      activeImageSrcRef.current = dataUrl;
      setHasAttachedImage(true);
      try {
        localStorage.setItem(storageKey + '_bg', dataUrl);
      } catch { }
      drawImageOnCanvas(dataUrl, 'fill-width');

      try {
        localStorage.setItem(storageKey, dataUrl);
      } catch (err) {
        console.warn('LocalStorage quota or storage error for drawing image:', err);
      }

      isInternalUpdateRef.current = true;
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

    // Save snapshot of canvas state BEFORE the new stroke starts
    try {
      currentStrokeSnapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    } catch (err) {
      console.warn('Snapshot error before stroke:', err);
    }

    hasDrawnStrokeRef.current = false;
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

    hasDrawnStrokeRef.current = true;
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      // Record undo state from before the stroke ONLY if an actual stroke was drawn
      if (hasDrawnStrokeRef.current && currentStrokeSnapshotRef.current) {
        undoStackRef.current.push(currentStrokeSnapshotRef.current);
        if (undoStackRef.current.length > 50) undoStackRef.current.shift();
        redoStackRef.current = [];
        setUndoCount(undoStackRef.current.length);
        setRedoCount(0);
      }
      currentStrokeSnapshotRef.current = null;
      hasDrawnStrokeRef.current = false;

      const dataUrl = canvas.toDataURL('image/png');
      activeImageSrcRef.current = dataUrl;
      isInternalUpdateRef.current = true;
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

  // Undo last action (stroke-by-stroke instant restoration)
  const handleUndo = useCallback(() => {
    if (undoStackRef.current.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      const current = ctx.getImageData(0, 0, canvas.width, canvas.height);
      redoStackRef.current.push(current);
      if (redoStackRef.current.length > 50) redoStackRef.current.shift();

      const prev = undoStackRef.current.pop();
      if (prev) {
        ctx.putImageData(prev, 0, 0);
      }

      setUndoCount(undoStackRef.current.length);
      setRedoCount(redoStackRef.current.length);

      const dataUrl = canvas.toDataURL('image/png');
      activeImageSrcRef.current = dataUrl;
      isInternalUpdateRef.current = true;
      try {
        localStorage.setItem(storageKey, dataUrl);
      } catch { }
      if (onChange) onChange(dataUrl);
    } catch (err) {
      console.warn('Undo error:', err);
    }
  }, [storageKey, onChange]);

  // Redo undone action
  const handleRedo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      const current = ctx.getImageData(0, 0, canvas.width, canvas.height);
      undoStackRef.current.push(current);
      if (undoStackRef.current.length > 50) undoStackRef.current.shift();

      const next = redoStackRef.current.pop();
      if (next) {
        ctx.putImageData(next, 0, 0);
      }

      setUndoCount(undoStackRef.current.length);
      setRedoCount(redoStackRef.current.length);

      const dataUrl = canvas.toDataURL('image/png');
      activeImageSrcRef.current = dataUrl;
      isInternalUpdateRef.current = true;
      try {
        localStorage.setItem(storageKey, dataUrl);
      } catch { }
      if (onChange) onChange(dataUrl);
    } catch (err) {
      console.warn('Redo error:', err);
    }
  }, [storageKey, onChange]);

  // Keyboard shortcuts (Cmd/Ctrl + Z, Cmd/Ctrl + Shift + Z, Cmd/Ctrl + Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Save snapshot so clear can be undone stroke-by-stroke
    try {
      const prevData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      undoStackRef.current.push(prevData);
      if (undoStackRef.current.length > 50) undoStackRef.current.shift();
      redoStackRef.current = [];
      setUndoCount(undoStackRef.current.length);
      setRedoCount(0);
    } catch { }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    activeImageSrcRef.current = '';
    originalImageSrcRef.current = '';
    setHasAttachedImage(false);

    try {
      localStorage.removeItem(storageKey);
      localStorage.removeItem(storageKey + '_bg');
    } catch { }

    isInternalUpdateRef.current = true;
    if (onChange) {
      onChange('');
    }
  };

  const handleRemoveImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      const prevData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      undoStackRef.current.push(prevData);
      if (undoStackRef.current.length > 50) undoStackRef.current.shift();
      redoStackRef.current = [];
      setUndoCount(undoStackRef.current.length);
      setRedoCount(0);
    } catch { }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    activeImageSrcRef.current = '';
    originalImageSrcRef.current = '';
    setHasAttachedImage(false);
    setCanvasHeight(480);

    try {
      localStorage.removeItem(storageKey);
      localStorage.removeItem(storageKey + '_bg');
    } catch { }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    isInternalUpdateRef.current = true;
    if (onChange) {
      onChange('');
    }
  };

  const toggleFitMode = () => {
    const nextMode = fitMode === 'fill-width' ? 'contain' : 'fill-width';
    setFitMode(nextMode);
    const srcToDraw = originalImageSrcRef.current || activeImageSrcRef.current;
    if (srcToDraw) {
      drawImageOnCanvas(srcToDraw, nextMode);
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

        </div>
        <div className="flex items-center gap-2">
          {hasAttachedImage && (
            <>
              <button
                type="button"
                onClick={toggleFitMode}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-white border border-slate-200 rounded-md text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                title="Toggle between Fill Width and Fit View"
              >
                {fitMode === 'fill-width' ? (
                  <>
                    <Minimize2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Fit View</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Fill Width</span>
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

        </div>
      </div>

      {/* Dedicated Canvas Drawing Area */}
      <div className="relative touch-none overflow-hidden bg-slate-100/60 flex items-center justify-center p-2 min-h-[440px]">
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
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${tool === 'pen'
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
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${tool === 'eraser'
              ? 'bg-blue-100 text-blue-900 border border-blue-300 shadow-2xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            title="Eraser Tool"
          >
            <Eraser className="w-3.5 h-3.5" />
            <span>Eraser</span>
          </button>

          {/* Undo Button */}
          <button
            type="button"
            onClick={handleUndo}
            disabled={undoCount === 0}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer ${undoCount > 0
              ? 'bg-white text-slate-700 hover:text-slate-900 border border-slate-200 hover:bg-slate-100 shadow-2xs'
              : 'bg-slate-100 text-slate-300 border border-slate-200 cursor-not-allowed opacity-60'
              }`}
            title="Undo stroke (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Undo</span>
            {undoCount > 0 && <span className="text-[10px] text-slate-400 font-semibold">({undoCount})</span>}
          </button>

          {/* Redo Button */}
          <button
            type="button"
            onClick={handleRedo}
            disabled={redoCount === 0}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer ${redoCount > 0
              ? 'bg-white text-slate-700 hover:text-slate-900 border border-slate-200 hover:bg-slate-100 shadow-2xs'
              : 'bg-slate-100 text-slate-300 border border-slate-200 cursor-not-allowed opacity-60'
              }`}
            title="Redo stroke (Ctrl+Y / Ctrl+Shift+Z)"
          >
            <Redo2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Redo</span>
            {redoCount > 0 && <span className="text-[10px] text-slate-400 font-semibold">({redoCount})</span>}
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
                className={`w-5 h-5 rounded-full border transition cursor-pointer ${selectedColor === c.value && tool === 'pen'
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
                className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold transition cursor-pointer ${lineWidth === w
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
          {/* Upload / Attach Image Button (Stored strictly in local storage) */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 border shadow-2xs ${hasAttachedImage
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

