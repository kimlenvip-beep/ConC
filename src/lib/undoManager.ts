// src/lib/undoManager.ts
// (ตามข้อ 1 และ 8) แปลงเป็น .ts และใช้ Type
import type { Payload } from '../types';

// (ตามข้อ 6) ใช้ Type Payload ที่เข้มงวด
const undoStack: Payload[] = [];
const MAX_HISTORY = 10; // Maximum number of undo steps

/**
 * Saves the current state (payload) to the undo stack.
 * @param state - The payload object from buildPayload()
 */
export function pushState(state: Payload): void {
    if (!state) {
        console.warn("Attempted to push invalid state to undo stack.");
        return;
    }
    
    // Deep clone the state
    try {
        const clonedState = JSON.parse(JSON.stringify(state));
        undoStack.push(clonedState);
        
        if (undoStack.length > MAX_HISTORY) {
            undoStack.shift(); // Remove the oldest entry
        }
    } catch (e: unknown) {
        console.error("Failed to clone state for undo history:", e);
    }
}

/**
 * Retrieves and removes the most recent state from the undo stack.
 * @returns The last saved state, or undefined if the stack is empty.
 */
export function popState(): Payload | undefined {
    if (undoStack.length === 0) {
        return undefined;
    }
    return undoStack.pop();
}

/**
 * Checks if there are any states available to undo.
 * @returns True if undo is possible, false otherwise.
 */
export function canUndo(): boolean {
    return undoStack.length > 0;
}

/**
 * Clears the entire undo history.
 */
export function clearHistory(): void {
    undoStack.length = 0;
}
