/**
 * Render a printable self-order QR poster (800x1000) from an existing
 * QR canvas element and trigger a PNG download.
 */
export function downloadQRPoster(tableName: string, restaurantName: string | undefined, canvasId: string): void {
    const qrCanvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!qrCanvas) {
        alert('QR Code sedang disiapkan, silakan coba lagi.');
        return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        return;
    }

    canvas.width = 800;
    canvas.height = 1000;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, 220);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 54px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(restaurantName || 'Karcisqu POS', canvas.width / 2, 110);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '32px "Inter", sans-serif';
    ctx.fillText('Self-Order QR Code', canvas.width / 2, 170);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 80px "Inter", sans-serif';
    ctx.fillText(`Meja: ${tableName}`, canvas.width / 2, 360);

    const qrSize = 480;
    const qrX = (canvas.width - qrSize) / 2;
    const qrY = 420;

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

    ctx.fillStyle = '#64748b';
    ctx.font = '28px "Inter", sans-serif';
    ctx.fillText('Scan dengan kamera HP Anda untuk memesan', canvas.width / 2, 950);

    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `QR-Poster-${tableName}.png`;
    link.href = url;
    link.click();
}
