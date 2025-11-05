import { STORAGE_KEY } from './config';

export const saveToLocal = (obj: any): void => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    } catch (e) {
        console.warn('saveToLocal error', e);
    }
};

export const loadFromLocal = (): any => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        console.warn('loadFromLocal error', e);
        return null;
    }
};

export const clearLocal = (): void => {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
};