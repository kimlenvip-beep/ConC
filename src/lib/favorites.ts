// src/lib/favorites.ts
// (ตามข้อ 8) แปลงเป็น .ts
import type { Favorites, FavoriteItem } from '../types';

const FAVORITES_KEY = 'marnthara.favorites.v4';

const defaultFavorites: Favorites = {
    fabric: [],
    sheer: [],
    wallpaper: [],
    wooden_blind: [],
    roller_blind: [],
    vertical_blind: [],
    partition: [],
    pleated_screen: [],
    aluminum_blind: []
};

/**
 * Retrieves the favorites object from localStorage.
 * @returns The favorites object.
 */
export function getFavorites(): Favorites {
    try {
        const stored = localStorage.getItem(FAVORITES_KEY);
        // (TS) ผสาน-default-เพื่อให้แน่ใจว่า-keys-ทั้งหมดมีอยู่
        return stored ? { ...defaultFavorites, ...JSON.parse(stored) } : { ...defaultFavorites };
    } catch (e: unknown) {
        console.error("Failed to parse favorites from localStorage", e);
        return { ...defaultFavorites };
    }
}

/**
 * Saves the entire favorites object to localStorage.
 * @param favorites - The complete favorites object to save.
 */
function saveFavorites(favorites: Favorites): void {
    try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    } catch (e: unknown) {
        console.error("Failed to save favorites to localStorage", e);
    }
}

/**
 * Safely imports and overwrites favorites from a file.
 * @param newFavorites - The favorites object from an imported payload.
 */
export function importFavorites(newFavorites: Favorites): void {
    // (TS) ตรวจสอบ-Type-คร่าวๆ
    if (typeof newFavorites !== 'object' || newFavorites === null) {
        console.error("Import failed: Invalid favorites data provided.");
        return;
    }
    // (TS) สร้าง-object-ใหม่ที่สะอาดโดยยึดตาม-defaultFavorites-keys
    const cleanFavorites: Favorites = { ...defaultFavorites };
    for (const key in cleanFavorites) {
        if (Object.prototype.hasOwnProperty.call(newFavorites, key) && Array.isArray(newFavorites[key])) {
            // (TS) ตรวจสอบ-items-ภายใน-array
            cleanFavorites[key] = newFavorites[key].filter((item: any): item is FavoriteItem => 
                item && typeof item.code === 'string' && typeof item.price === 'number'
            );
        }
    }
    saveFavorites(cleanFavorites);
}

/**
 * Merges imported favorites with existing ones.
 * @param newFavorites - The favorites object from an imported payload.
 */
export function mergeFavorites(newFavorites: Favorites): void {
    const existingFavorites = getFavorites();
    
    if (typeof newFavorites !== 'object' || newFavorites === null) {
        console.error("Merge failed: Invalid favorites data provided.");
        return;
    }

    for (const key in existingFavorites) {
        if (Object.prototype.hasOwnProperty.call(newFavorites, key) && Array.isArray(newFavorites[key])) {
            const existingCodes = new Set(existingFavorites[key].map(fav => fav.code));
            
            newFavorites[key].forEach((item: any) => {
                // (TS) ตรวจสอบ-Type-และ-Duplicate
                if (item && typeof item.code === 'string' && typeof item.price === 'number' && !existingCodes.has(item.code)) {
                    existingFavorites[key].push({ code: item.code, price: item.price });
                }
            });
        }
    }
    saveFavorites(existingFavorites);
}

/**
 * Clears all favorites from localStorage.
 */
export function clearAllFavorites(): void {
    saveFavorites({ ...defaultFavorites });
}

/**
 * Adds or updates a favorite item.
 * @param type - The category (e.g., 'fabric', 'wallpaper').
 * @param code - The item code.
 * @param price - The item price.
 * @returns True if successful, false otherwise.
 */
export function addOrUpdateFavorite(type: string, code: string, price: number): boolean {
    const favorites = getFavorites();
    const cleanCode = code?.trim();
    
    // (TS) ตรวจสอบ-Type
    if (!Object.prototype.hasOwnProperty.call(favorites, type) || !cleanCode || !Number.isFinite(price)) {
        return false;
    }

    const index = favorites[type].findIndex(fav => fav.code === cleanCode);
    
    if (index > -1) {
        favorites[type][index].price = price; // Update
    } else {
        favorites[type].push({ code: cleanCode, price }); // Add
    }
    
    // (QoL) เรียงตามตัวอักษร
    favorites[type].sort((a, b) => a.code.localeCompare(b.code));
    
    saveFavorites(favorites);
    return true;
}

/**
 * Deletes a favorite by its type and code.
 * @param type - The category.
 * @param code - The code to delete.
 * @returns True if successful, false otherwise.
 */
export function deleteFavorite(type: string, code: string): boolean {
    const favorites = getFavorites();
    const cleanCode = code?.trim();
    
    if (!Object.prototype.hasOwnProperty.call(favorites, type) || !cleanCode) return false;

    const index = favorites[type].findIndex(fav => fav.code === cleanCode);
    if (index > -1) {
        favorites[type].splice(index, 1);
        saveFavorites(favorites);
        return true;
    }
    return false;
}

/**
 * Retrieves a single favorite object by its code.
 * @param type - The category of the code.
 * @param code - The code to find.
 * @returns The favorite object {code, price} or undefined if not found.
 */
export function getFavorite(type: string, code: string): FavoriteItem | undefined {
    const cleanCode = code?.trim();
    if (!type || !cleanCode) return undefined;
    
    const favorites = getFavorites();
    if (!Object.prototype.hasOwnProperty.call(favorites, type)) return undefined;

    const targetArray = favorites[type] || [];
    return targetArray.find(fav => fav.code === cleanCode);
}
