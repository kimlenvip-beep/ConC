// src/lib/ui-state.ts
// Centralized UI state with getters/setters and listener management

interface UIState {
    isLocked: boolean;
    activeFavoriteInput: string | null;
    favManagerChangesMade: boolean;
    selectedFavItem: string | null;
    activeHardwareItem: string | null; // new: currently-active hardware item id/code
}

const state: UIState = {
    isLocked: false,
    activeFavoriteInput: null,
    favManagerChangesMade: false,
    selectedFavItem: null,
    activeHardwareItem: null
};

// Getters
export const getIsLocked = (): boolean => state.isLocked;
export const getActiveFavoriteInput = (): string | null => state.activeFavoriteInput;
export const getFavManagerChangesMade = (): boolean => state.favManagerChangesMade;
export const getSelectedFavItem = (): string | null => state.selectedFavItem;
export const getActiveHardwareItem = (): string | null => state.activeHardwareItem; // <- added

// Setters
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

export const setActiveHardwareItem = (value: string | null): void => {
    state.activeHardwareItem = value;
};

// Reset helper
export const resetState = (): void => {
    state.isLocked = false;
    state.activeFavoriteInput = null;
    state.favManagerChangesMade = false;
    state.selectedFavItem = null;
    state.activeHardwareItem = null;
};

/**
 * Listener management for "room defaults" modal (or similar modal)
 * - Allows modules to register event listeners tied to modal or controls,
 *   and later remove them all via clearRoomDefaultsModalListeners().
 *
 * This prevents leaking listeners across modal open/close or across merges.
 */
type RegisteredListener = {
    el: EventTarget;
    type: string;
    handler: EventListenerOrEventListenerObject;
    options?: boolean | AddEventListenerOptions;
};

const roomDefaultsListeners: RegisteredListener[] = [];

/**
 * Register a listener that can later be cleared by clearRoomDefaultsModalListeners()
 */
export const registerRoomDefaultsListener = (
    el: EventTarget,
    type: string,
    handler: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
): void => {
    try {
        // addEventListener may throw if element is invalid — guard
        if ((el as Element)?.addEventListener) {
            (el as Element).addEventListener(type, handler as EventListener, options);
        } else if ((el as Window)?.addEventListener) {
            (el as Window).addEventListener(type, handler as EventListener, options);
        }
    } catch (e) {
        // ignore silently — registration best-effort
    }
    roomDefaultsListeners.push({ el, type, handler, options });
};

/**
 * Remove a previously-registered listener (optional per-item removal)
 */
export const unregisterRoomDefaultsListener = (
    el: EventTarget,
    type: string,
    handler: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions
): void => {
    try {
        if ((el as Element)?.removeEventListener) {
            (el as Element).removeEventListener(type, handler as EventListener, options);
        } else if ((el as Window)?.removeEventListener) {
            (el as Window).removeEventListener(type, handler as EventListener, options);
        }
    } catch (e) {
        // ignore
    }
    // remove matching entries from registry
    for (let i = roomDefaultsListeners.length - 1; i >= 0; i--) {
        const r = roomDefaultsListeners[i];
        if (r.el === el && r.type === type && r.handler === handler) {
            roomDefaultsListeners.splice(i, 1);
        }
    }
};

/**
 * Clear all listeners registered via registerRoomDefaultsListener()
 * Call this when closing/destroying the modal to avoid duplicate listeners.
 */
export const clearRoomDefaultsModalListeners = (): void => {
    for (const { el, type, handler, options } of roomDefaultsListeners) {
        try {
            if ((el as Element)?.removeEventListener) {
                (el as Element).removeEventListener(type, handler as EventListener, options as EventListenerOptions);
            } else if ((el as Window)?.removeEventListener) {
                (el as Window).removeEventListener(type, handler as EventListener, options as EventListenerOptions);
            }
        } catch (e) {
            // ignore per-listener removal errors
        }
    }
    roomDefaultsListeners.length = 0;
};