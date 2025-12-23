
export class ImageCache {
    private static cache: Map<string, HTMLImageElement> = new Map();
    private static pending: Set<string> = new Set();

    static getFlag(code: string): HTMLImageElement | null {
        // Normalize code to lowercase for API
        const iso = code.toLowerCase();
        
        if (this.cache.has(iso)) {
            return this.cache.get(iso)!;
        }

        if (!this.pending.has(iso)) {
            this.pending.add(iso);
            const img = new Image();
            // Use FlagCDN for high quality, reliable flag images (w80 size is optimal for game entities)
            img.src = `https://flagcdn.com/w80/${iso}.png`;
            img.crossOrigin = "Anonymous"; // Important for canvas export/security
            img.onload = () => {
                this.cache.set(iso, img);
                this.pending.delete(iso);
            };
            img.onerror = () => {
                this.pending.delete(iso);
                console.warn(`Failed to load flag: ${iso}`);
            };
        }

        return null;
    }
}
