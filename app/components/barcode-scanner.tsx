"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Loader2, CameraOff, RefreshCw } from "lucide-react";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onError?: (error: string) => void;
}

const SCANNER_ID = "barcode-scanner-view";

const SCANNER_CONFIG = {
  fps: 10,
  qrbox: { width: 280, height: 110 },
  aspectRatio: 1.777,
  disableFlip: false,
  // Pakai ZXing decoder agar hasil scan lebih konsisten di berbagai device,
  // daripada native BarcodeDetector yang perilakunya bervariasi.
  useBarCodeDetectorIfSupported: false,
  formatsToSupport: [
    Html5QrcodeSupportedFormats.QR_CODE,
    Html5QrcodeSupportedFormats.CODE_128,
    Html5QrcodeSupportedFormats.CODE_39,
    Html5QrcodeSupportedFormats.CODE_93,
    Html5QrcodeSupportedFormats.EAN_13,
    Html5QrcodeSupportedFormats.EAN_8,
    Html5QrcodeSupportedFormats.UPC_A,
    Html5QrcodeSupportedFormats.UPC_E,
    Html5QrcodeSupportedFormats.DATA_MATRIX,
  ],
};

export function BarcodeScanner({ onScan, onError }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const onScanRef = useRef(onScan);
  const onErrorRef = useRef(onError);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [activeCamera, setActiveCamera] = useState<string | null>(null);

  // Keep latest callbacks without re-initialising the camera every render.
  onScanRef.current = onScan;
  onErrorRef.current = onError;

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const devices = await Html5Qrcode.getCameras();
        if (!mounted) return;

        if (!devices || devices.length === 0) {
          setError("Tidak ada kamera yang tersedia.");
          setLoading(false);
          return;
        }

        setCameras(devices.map((d) => ({ id: d.id, label: d.label || `Kamera ${d.id}` })));
        const backCamera = devices.find((d) => /back|rear|belakang/i.test(d.label)) || devices[0];
        setActiveCamera(backCamera.id);

        const scanner = new Html5Qrcode(SCANNER_ID);
        scannerRef.current = scanner;

        await scanner.start(
          backCamera.id,
          SCANNER_CONFIG,
          (decodedText) => {
            if (decodedText) {
              onScanRef.current(decodedText.trim());
            }
          },
          () => {
            // ignore frame decode errors
          }
        );

        if (mounted) setLoading(false);
      } catch (err) {
        if (!mounted) return;
        const message = err instanceof Error ? err.message : "Gagal mengakses kamera.";
        setError(message);
        setLoading(false);
        onErrorRef.current?.(message);
      }
    };

    init();

    return () => {
      mounted = false;
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const switchCamera = async () => {
    if (!scannerRef.current || cameras.length < 2) return;
    const currentIndex = cameras.findIndex((c) => c.id === activeCamera);
    const next = cameras[(currentIndex + 1) % cameras.length];

    try {
      setLoading(true);
      await scannerRef.current.stop();
      await scannerRef.current.start(
        next.id,
        SCANNER_CONFIG,
        (decodedText) => decodedText && onScanRef.current(decodedText.trim()),
        () => {}
      );
      setActiveCamera(next.id);
    } catch {
      setError("Gagal mengganti kamera.");
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border bg-muted p-8 text-center">
        <CameraOff className="h-12 w-12 text-muted-foreground" />
        <div>
          <p className="font-semibold">Kamera tidak bisa dibuka</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
        <p className="text-xs text-muted-foreground">Pastikan kamu mengizinkan akses kamera di browser.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-2xl border bg-black aspect-square max-w-md mx-auto sm:aspect-video sm:max-w-lg">
        <div id={SCANNER_ID} className="w-full h-full" />
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80 text-white">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">Memuat kamera...</p>
          </div>
        )}
        {!loading && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="w-5/6 h-20 rounded-lg border-2 border-white/70 bg-transparent" />
          </div>
        )}
      </div>

      {cameras.length > 1 && (
        <Button variant="outline" className="w-full h-12 gap-2" onClick={switchCamera} disabled={loading}>
          <RefreshCw className="h-4 w-4" />
          Ganti Kamera
        </Button>
      )}

      <p className="text-center text-xs text-muted-foreground">Arahkan barcode ke dalam kotak</p>
    </div>
  );
}
