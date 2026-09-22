import { useEffect, useRef, useState } from 'react';

interface Props {
  onResult: (value: string) => void;
  onClose: () => void;
}

interface DetectedBarcode {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect: (source: CanvasImageSource) => Promise<DetectedBarcode[]>;
}
type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => BarcodeDetectorLike;

/**
 * Lokale QR/barcodescanner op basis van de ingebouwde BarcodeDetector-API en
 * de camera. Werkt zonder internet. Waar de API ontbreekt, wordt handmatige
 * invoer geadviseerd.
 */
export function QrScanner({ onResult, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let cancelled = false;
    let rafId = 0;

    const Ctor = (globalThis as unknown as { BarcodeDetector?: BarcodeDetectorCtor })
      .BarcodeDetector;
    if (!Ctor) {
      setError(
        'Deze browser ondersteunt geen lokale scanner. Typ de Sample ID handmatig in.',
      );
      return;
    }
    const detector = new Ctor({ formats: ['qr_code', 'code_128', 'ean_13'] });

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        scan(detector);
      } catch {
        setError('Kan de camera niet openen. Typ de Sample ID handmatig in.');
      }
    }

    function scan(det: BarcodeDetectorLike) {
      const video = videoRef.current;
      if (!video || cancelled) return;
      det
        .detect(video)
        .then((codes) => {
          if (cancelled) return;
          if (codes.length > 0 && codes[0].rawValue) {
            onResult(codes[0].rawValue.trim());
            return;
          }
          rafId = requestAnimationFrame(() => scan(det));
        })
        .catch(() => {
          if (!cancelled) rafId = requestAnimationFrame(() => scan(det));
        });
    }

    start();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [onResult]);

  return (
    <div className="scanner-overlay">
      <div className="scanner-box">
        {error ? (
          <p className="scanner-error">{error}</p>
        ) : (
          <video ref={videoRef} className="scanner-video" muted playsInline />
        )}
        <button type="button" className="btn btn-block" onClick={onClose}>
          Sluiten
        </button>
      </div>
    </div>
  );
}
