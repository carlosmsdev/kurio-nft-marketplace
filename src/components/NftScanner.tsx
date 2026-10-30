import { useEffect, useRef, useState } from 'react';
import { ScanLine, X, Camera, Search } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';

type Detection = { rawValue: string };
type Detector = { detect: (source: HTMLVideoElement | ImageBitmap) => Promise<Detection[]> };
type DetectorConstructor = new (options: { formats: string[] }) => Detector;

export function NftScanner({ onClose }: { onClose: () => void }) {
    const navigate = useNavigate();
    const video = useRef<HTMLVideoElement>(null);
    const camera = useRef<MediaStream | null>(null);
    const close = useRef<HTMLButtonElement>(null);
    const [input, setInput] = useState('');
    const [error, setError] = useState('');
    const [active, setActive] = useState(false);
    const [available, setAvailable] = useState(true);
    const [busy, setBusy] = useState(false);

    const stop = () => {
        camera.current?.getTracks().forEach(track => track.stop());
        camera.current = null;
        setActive(false);
    };
    const openNft = (value: string) => {
        let id = value.trim();
        try {
            const url = new URL(id, window.location.origin);
            if (url.origin !== window.location.origin) throw new Error('Este QR não é do marketplace Kurio.');
            const match = url.pathname.match(/^\/nft\/(\d+)\/?$/);
            if (match) id = match[1];
        } catch (cause) {
            if (cause instanceof Error && cause.message.includes('Kurio')) {
                setError(cause.message);
                return;
            }
        }
        if (!/^\d{1,7}$/.test(id)) {
            setError('Informe um ID numérico ou um link de NFT do Kurio.');
            return;
        }
        stop();
        onClose();
        void navigate({ to: '/nft/$id', params: { id } });
    };
    useEffect(() => {
        close.current?.focus();
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
            if (event.key === 'Tab') {
                const controls = document.querySelectorAll<HTMLElement>('.scanner-dialog button, .scanner-dialog input');
                const first = controls.item(0);
                const last = controls.item(controls.length - 1);
                if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault(); last?.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault(); first?.focus();
                }
            }
        };
        document.addEventListener('keydown', onKey);
        return () => { document.removeEventListener('keydown', onKey); camera.current?.getTracks().forEach(track => track.stop()); };
    }, [onClose]);
    useEffect(() => {
        if (!active) return;
        let cancelled = false;
        let working = false;
        const BarcodeDetector = (window as unknown as { BarcodeDetector?: DetectorConstructor }).BarcodeDetector;
        if (!BarcodeDetector) { setAvailable(false); return; }
        const detector = new BarcodeDetector({ formats: ['qr_code'] });
        const interval = window.setInterval(async () => {
            if (working || !video.current || video.current.readyState < 2) return;
            working = true;
            try {
                const results = await detector.detect(video.current);
                if (!cancelled && results[0]) openNft(results[0].rawValue);
            } catch { if (!cancelled) setError('Não foi possível ler este código QR.'); }
            working = false;
        }, 420);
        return () => { cancelled = true; window.clearInterval(interval); };
    }, [active]);
    const startCamera = async () => {
        setError('');
        setBusy(true);
        const supported = 'BarcodeDetector' in window;
        if (!supported) { setAvailable(false); setBusy(false); return; }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: 'environment' } });
            camera.current = stream;
            if (video.current) {
                video.current.srcObject = stream;
                await video.current.play();
            }
            setActive(true);
        } catch { setError('Não foi possível acessar a câmera. Confira a permissão do navegador.'); }
        setBusy(false);
    };
    const readFile = async (file?: File) => {
        if (!file) return;
        const BarcodeDetector = (window as unknown as { BarcodeDetector?: DetectorConstructor }).BarcodeDetector;
        if (!BarcodeDetector) { setError('A leitura de imagem não é compatível com este navegador. Informe o link abaixo.'); return; }
        try {
            const image = await createImageBitmap(file);
            const items = await new BarcodeDetector({ formats: ['qr_code'] }).detect(image);
            image.close();
            if (!items.length) setError('Não foi encontrado um QR Code nessa imagem.');
            else openNft(items[0].rawValue);
        } catch { setError('Não foi possível ler o arquivo.'); }
    };
    return <div className="scanner-overlay" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
        <section className="scanner-dialog" role="dialog" aria-modal="true" aria-label="Escanear NFT">
            <header><div><ScanLine size={23}/><h2>Escanear NFT</h2></div><button ref={close} type="button" aria-label="Fechar leitor" onClick={onClose}><X size={21}/></button></header>
            <p>Escaneie o QR Code de uma obra ou informe seu link para abrir os detalhes.</p>
            <div className="scanner-viewport">{active ? <video playsInline muted ref={video} aria-label="Câmera para leitura de QR Code"/> : <ScanLine size={68} aria-hidden="true"/>}<span aria-hidden="true" className="scanner-frame"/></div>
            <button type="button" className="scanner-camera" disabled={busy} onClick={active ? stop : () => void startCamera()}><Camera size={18}/>{active ? 'Desligar câmera' : busy ? 'Abrindo câmera...' : 'Abrir câmera'}</button>
            {!available && <p role="status">Seu navegador não oferece leitura automática. Você pode informar o ID ou link da obra.</p>}
            <label className="scanner-file">Ler QR de uma imagem<input type="file" accept="image/png,image/jpeg,image/webp" onChange={event => void readFile(event.target.files?.[0])}/></label>
            <form onSubmit={event => { event.preventDefault(); openNft(input); }}><label htmlFor="nft-scan-code">Link do NFT ou ID da obra</label><div><input id="nft-scan-code" value={input} onChange={event => {setInput(event.target.value);setError('');}} placeholder="/nft/1" required/><button type="submit" aria-label="Abrir obra"><Search size={20}/></button></div></form>
            {error && <p role="alert" className="scanner-error">{error}</p>}
        </section>
    </div>;
}
