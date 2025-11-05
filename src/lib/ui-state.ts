// src/lib/ui-state.ts
// Centralized state management with proper type safety

interface UIState {
    isLocked: boolean;
    activeFavoriteInput: string | null;
    favManagerChangesMade: boolean;
    selectedFavItem: string | null;
}

const state: UIState = {
    isLocked: false,
    activeFavoriteInput: null,
    favManagerChangesMade: false,
    selectedFavItem: null
};

// Getters
export const getIsLocked = (): boolean => state.isLocked;
export const getActiveFavoriteInput = (): string | null => state.activeFavoriteInput;
export const getFavManagerChangesMade = (): boolean => state.favManagerChangesMade;
export const getSelectedFavItem = (): string | null => state.selectedFavItem;

// Setters with validation
export const setIsLocked = (value: boolean): void => {
    state.isLocked = Boolean(value);
};

export const setActiveFavoriteInput = (value: string | null): void => {
    state.activeFavoriteInput = value;
};

export const setFavManagerChangesMade = (value: boolean): void => {
    state.favManagerChangesMade = Boolean(value);
};

export const setSelectedFavItem = (value: string | null): void => {
    state.selectedFavItem = value;
};

// Reset state
=======
interface UIState {
    isLocked: boolean;
    activeFavoriteInput: string | null;
    favManagerChangesMade: boolean;
    selectedFavItem: string | null;
}

const state: UIState = {
    isLocked: false,
    activeFavoriteInput: null,
    favManagerChangesMade: false,
    selectedFavItem: null
};

export const getIsLocked = (): boolean => state.isLocked;
export const getActiveFavoriteInput = (): string | null => state.activeFavoriteInput;
export const getFavManagerChangesMade = (): boolean => state.favManagerChangesMade;
export const getSelectedFavItem = (): string | null => state.selectedFavItem;

export const setIsLocked = (value: boolean): void => {
    state.isLocked = Boolean(value);
};

export const setActiveFavoriteInput = (value: string | null): void => {
    state.activeFavoriteInput = value;
};

export const setFavManagerChangesMade = (value: boolean): void => {
    state.favManagerChangesMade = Boolean(value);
};

export const setSelectedFavItem = (value: string | null): void => {
    state.selectedFavItem = value;
};

>>>>>>> cb8a02287ec00b14740ece1ee9dc00b3aa13a238
export const resetState = (): void => {
    state.isLocked = false;
    state.activeFavoriteInput = null;
    state.favManagerChangesMade = false;
    state.selectedFavItem = null;
};