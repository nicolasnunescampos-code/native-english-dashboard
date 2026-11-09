import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getDriveId = (url: string) => {
    if (!url) return null;
    const regExp = /\/d\/([a-zA-Z0-9_-]+)|\?id=([a-zA-Z0-9_-]+)/;
    const match = url.match(regExp);
    return match ? (match[1] || match[2]) : null;
};

export const getThumbnailSrc = (url: string, fallbackUrl?: string) => {
    if (url) {
        const driveId = getDriveId(url);
        if (driveId) {
            return `https://drive.google.com/uc?export=view&id=${driveId}`;
        }
        return url;
    }
    if (fallbackUrl) {
        const matDriveId = getDriveId(fallbackUrl);
        if (matDriveId) {
            return `https://drive.google.com/thumbnail?id=${matDriveId}&sz=w600-h400`;
        }
    }
    return '';
};

export function getContrastTextColor(color?: string): string {
    if (!color) return '#ffffff';
    const c = color.trim().toLowerCase();

    // Known named colors that are bright/light
    const lightColors = ['yellow', 'lightgreen', 'lime', 'cyan', 'gold', 'orange', 'amber', 'pink', 'lightgray', 'lightgrey'];
    if (lightColors.includes(c)) return '#0f172a';

    // Known named dark colors
    const darkColors = ['blue', 'purple', 'navy', 'darkblue', 'indigo', 'violet', 'black', 'maroon', 'brown', 'darkgreen', 'teal', 'red', 'crimson'];
    if (darkColors.includes(c)) return '#ffffff';

    // Hex colors: #fff, #ffffff
    let hex = c.replace('#', '');
    if (hex.length === 3) {
        hex = hex.split('').map(ch => ch + ch).join('');
    }
    if (hex.length === 6) {
        const r = parseInt(hex.substring(0, 2), 16) || 0;
        const g = parseInt(hex.substring(2, 4), 16) || 0;
        const b = parseInt(hex.substring(4, 6), 16) || 0;
        const yiq = (r * 299 + g * 587 + b * 114) / 1000;
        return yiq >= 140 ? '#0f172a' : '#ffffff';
    }

    // RGB / RGBA format: rgb(255, 255, 0)
    const rgbMatch = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgbMatch) {
        const r = parseInt(rgbMatch[1], 10) || 0;
        const g = parseInt(rgbMatch[2], 10) || 0;
        const b = parseInt(rgbMatch[3], 10) || 0;
        const yiq = (r * 299 + g * 587 + b * 114) / 1000;
        return yiq >= 140 ? '#0f172a' : '#ffffff';
    }

    return '#ffffff';
}

