import React, { useRef, useEffect, useState, useCallback } from 'react';
import { X } from 'lucide-react';

/**
 * Signature pad component for capturing signatures.
 */
export function SignaturePad({ value, onChange }) {
    const canvasRef = useRef(null);
    const [drawing, setDrawing] = useState(false);
    const [hasContent, setHasContent] = useState(false);

    // Load existing signature
    useEffect(() => {
        if (value && canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            const img = new Image();
            img.onload = () => {
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                ctx.drawImage(img, 0, 0);
                setHasContent(true);
            };
            img.src = value;
        }
    }, [value]);

    const getPoint = useCallback((e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: clientX - rect.left,
            y: clientY - rect.top,
        };
    }, []);

    const start = useCallback((e) => {
        e.preventDefault();
        setDrawing(true);
        const ctx = canvasRef.current.getContext('2d');
        const point = getPoint(e);
        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
    }, [getPoint]);

    const move = useCallback((e) => {
        if (!drawing) return;
        e.preventDefault();
        const ctx = canvasRef.current.getContext('2d');
        const point = getPoint(e);
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#000';
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
        setHasContent(true);
    }, [drawing, getPoint]);

    const end = useCallback(() => {
        if (drawing && canvasRef.current) {
            setDrawing(false);
            const dataUrl = canvasRef.current.toDataURL('image/png');
            onChange?.(dataUrl);
        }
    }, [drawing, onChange]);

    const clear = useCallback(() => {
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        setHasContent(false);
        onChange?.(null);
    }, [onChange]);

    return (
        <div className="relative">
            <canvas
                ref={canvasRef}
                width={300}
                height={150}
                className="border-2 border-dashed border-gray-300 rounded-lg bg-white touch-none"
                onMouseDown={start}
                onMouseMove={move}
                onMouseUp={end}
                onMouseLeave={end}
                onTouchStart={start}
                onTouchMove={move}
                onTouchEnd={end}
            />
            {hasContent && (
                <button
                    onClick={clear}
                    className="absolute top-2 right-2 p-1 bg-red-100 text-red-600 rounded-full hover:bg-red-200"
                    title="Limpar assinatura"
                >
                    <X className="w-4 h-4" />
                </button>
            )}
            {!hasContent && (
                <p className="text-xs text-gray-400 text-center mt-1">
                    Toque ou clique para assinar
                </p>
            )}
        </div>
    );
}
