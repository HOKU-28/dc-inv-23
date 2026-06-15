"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Loader2, CameraOff, RefreshCw } from "lucide-react";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onError?: (error: string) => void;
}

const SCANNER_ID = "barcode-scanner-view";

export function BarcodeScanner({ onScan, onError }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [activeCamera, setActiveCamera] = useState<string | null>(null);

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
          {
            fps: 10,
            qrbox: { width: 250, height: 150 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            if (decodedText) {
              onScan(decodedText);
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
        onError?.(message);
      }
    };

    init();

    return () => {
      mounted = false;
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [onScan, onError]);

  const switchCamera = async () => {
    if (!scannerRef.current || cameras.length < 2) return;
    const currentIndex = cameras.findIndex((c) => c.id === activeCamera);
    const next = cameras[(currentIndex + 1) % cameras.length];

    try {
      setLoading(true);
      await scannerRef.current.stop();
      await scannerRef.current.start(
        next.id,
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
          aspectRatio: 1.0,
        },
        (decodedText) => decodedText && onScan(decodedText),
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
      <div className="relative overflow-hidden rounded-2xl border bg-black aspect-square">
        <div id={SCANNER_ID} className="w-full h-full" />
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80 text-white">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">Memuat kamera...</p>
          </div>
        )}
        {!loading && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="w-3/4 h-24 rounded-lg border-2 border-white/70 bg-transparent" />
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
