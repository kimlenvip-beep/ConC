import { saveToLocal, loadFromLocal } from './storage';

const FAV_KEY = 'conC.favorites.v1';

export const loadFavorites = (): any[] => {
    try {
        const raw = loadFromLocal();
        return (raw && raw.favorites) || [];
    } catch { return []; }
};

export const saveFavorites = (list: any[]): void => {
    try {
        const store = loadFromLocal() || {};
        store.favorites = list;
        saveToLocal(store);
    } catch {}
};

export const addFavorite = (fav: any): void => {
    const list = loadFavorites();
    list.push(fav);
    saveFavorites(list);
};

export const removeFavorite = (index: number): void => {
    const list = loadFavorites();
    list.splice(index, 1);
    saveFavorites(list);
};