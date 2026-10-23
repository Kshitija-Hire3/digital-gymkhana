import { useEffect, useRef, useState } from 'react';
import { Button, Dialog } from './ui.jsx';

/** Barcode value -> CRN. Uses the first run of 10 digits if present (adjust if the ID-card barcode encodes something else). */
export const extractCrn = (raw) => {
  const s = String(raw || '').trim();
  const m = s.match(/\d{10}/);
  return (m ? m[0] : s).toUpperCase();
};
export const scanSupported = () => typeof window !== 'undefined' && 'BarcodeDetector' in window && !!navigator.mediaDevices?.getUserMedia;

function Scanner({ onResult }) {
  const video = useRef(null); const cb = useRef(onResult); cb.current = onResult;
  const [error, setError] = useState(''); const [ready, setReady] = useState(false);
  useEffect(() => {
    let stream; let timer; let stopped = false;
    (async () => {
      try {
        const formats = await window.BarcodeDetector.getSupportedFormats();
        const detector = new window.BarcodeDetector({ formats });
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        if (stopped) { stream.getTracks().forEach((t) => t.stop()); return; }
        video.current.srcObject = stream; await video.current.play(); setReady(true);
        timer = setInterval(async () => {
          if (!video.current || video.current.readyState < 2) return;
          try { const codes = await detector.detect(video.current); if (codes.length) { clearInterval(timer); cb.current(codes[0].rawValue); } } catch { /* frame not ready */ }
        }, 300);
      } catch (e) {
        setError(e.name === 'NotAllowedError' ? 'Camera permission was denied. Allow camera access in your browser settings, or type the CRN instead.'
          : 'Could not start the camera. Make sure no other app is using it, or type the CRN instead.');
      }
    })();
    return () => { stopped = true; clearInterval(timer); stream?.getTracks().forEach((t) => t.stop()); };
  }, []);
  if (error) return <div className="alert error" role="alert">{error}</div>;
  return (
    <div className="stack" style={{ gap: 8 }}>
      <video ref={video} playsInline muted style={{ width: '100%', borderRadius: 10, background: '#000', minHeight: 200 }} />
      <p className="muted small">{ready ? 'Hold the barcode on the ID card steady inside the frame.' : 'Starting camera…'}</p>
    </div>
  );
}

/** Opens the camera and reads a barcode from the college ID card. Calls onScan(rawValue). */
export default function ScanButton({ onScan, label = 'Scan ID card' }) {
  const [open, setOpen] = useState(false);
  const done = (raw) => { setOpen(false); onScan(raw); };
  return (<>
    <Button variant="secondary" onClick={() => setOpen(true)}>{label}</Button>
    <Dialog open={open} title="Scan ID card barcode" onClose={() => setOpen(false)} footer={<Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>}>
      {scanSupported() ? <Scanner onResult={done} /> : (
        <div className="stack" style={{ gap: 8 }}>
          <div className="alert warn">Camera scanning isn't available in this browser (it needs Chrome or Edge, on HTTPS or localhost).</div>
          <p className="muted">You can still type the CRN. A USB or Bluetooth barcode scanner also works: click the CRN box and scan the card.</p>
        </div>)}
    </Dialog>
  </>);
}
