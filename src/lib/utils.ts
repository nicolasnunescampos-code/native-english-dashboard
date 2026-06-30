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
