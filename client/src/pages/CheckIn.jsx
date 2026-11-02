import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { api } from '../services/api';

const READER_ID = 'qr-reader';

// Admin page: scan a student's ticket QR (or type the code) to mark attendance
export default function CheckIn({ onShowToast }) {
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [result, setResult] = useState(null); // { kind: 'ok' | 'warn' | 'bad', text, detail }
  const [checkedInCount, setCheckedInCount] = useState(0);

  const scannerRef = useRef(null);
  const busyRef = useRef(false);
  const lastRef = useRef({ code: '', at: 0 });

  const submitCode = useCallback(async (rawCode) => {
    const code = rawCode.trim();
    if (!code || busyRef.current) return;

    // The camera reads the same QR many times a second; ignore repeats for a few seconds
    const now = Date.now();
    if (lastRef.current.code === code && now - lastRef.current.at < 4000) return;
    lastRef.current = { code, at: now };

    busyRef.current = true;
    try {
      const res = await api.checkInTicket(code);
      setResult({ kind: 'ok', text: res.message, detail: res.collegeId });
      setCheckedInCount((n) => n + 1);
    } catch (err) {
      const data = err.data || {};
      const who = data.studentName ? `${data.studentName} (${data.collegeId || 'no ID'}) · ${data.eventTitle}` : '';
      setResult({ kind: err.status === 409 ? 'warn' : 'bad', text: err.message, detail: who });
    } finally {
      busyRef.current = false;
    }
  }, []);

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (!scanner) return;
    try {
      await scanner.stop();
      scanner.clear();
    } catch (err) {
      console.warn('Scanner stop notice:', err);
    }
  }, []);

  const startScanner = async () => {
    setResult(null);
    try {
      const scanner = new Html5Qrcode(READER_ID);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (text) => submitCode(text),
        () => {}
      );
      setScanning(true);
    } catch (err) {
      scannerRef.current = null;
      onShowToast('Could not open the camera. Allow camera access, or enter the code manually.', 'error');
    }
  };

  const handleStop = async () => {
    await stopScanner();
    setScanning(false);
  };

  // Release the camera when leaving the page
  useEffect(() => () => { stopScanner(); }, [stopScanner]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    lastRef.current = { code: '', at: 0 };
    submitCode(manualCode);
    setManualCode('');
  };

  return (
    <main>
      <section className="page-header">
        <div className="container">
          <h1>Event Check-In</h1>
          <p>Scan a student's ticket QR code to mark them as attended.</p>
        </div>
      </section>

      <div className="container" style={{ maxWidth: '640px', paddingBottom: '48px' }}>
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <h2>Scanner</h2>
            <span className="badge-seats">{checkedInCount} checked in this session</span>
          </div>

          <div id={READER_ID} style={{ width: '100%', display: scanning ? 'block' : 'none' }} />

          {scanning ? (
            <button type="button" className="btn btn-secondary btn-small" onClick={handleStop} style={{ marginTop: '12px' }}>
              Stop Camera
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={startScanner}>
              📷 Start Scanning
            </button>
          )}

          {result && (
            <div className={`scan-result ${result.kind}`} role="status" aria-live="polite">
              <div>
                {result.kind === 'ok' ? '✅ ' : result.kind === 'warn' ? '⚠️ ' : '❌ '}
                {result.text}
              </div>
              {result.detail && <div style={{ fontWeight: 400, marginTop: '4px' }}>{result.detail}</div>}
            </div>
          )}

          <form onSubmit={handleManualSubmit} style={{ marginTop: '24px' }}>
            <div className="form-group">
              <label htmlFor="manual-code">Or enter the ticket code</label>
              <input
                id="manual-code"
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="24-character code under the QR"
                autoComplete="off"
              />
            </div>
            <button type="submit" className="btn btn-secondary btn-small" disabled={!manualCode.trim()}>
              Check In
            </button>
          </form>
        </div>

        <p style={{ marginTop: '16px' }}>
          <Link to="/admin">← Back to Admin Panel</Link>
        </p>
      </div>
    </main>
  );
}
