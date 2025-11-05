import { SHOP_CONFIG, ITEM_CONFIG } from './config';
import { fmt, bahttext } from './utils';

/**
 * Minimal document generator helpers.
 * This file provides simple, deterministic exports used by the app.
 */

export const buildDocumentData = (project: any): any => {
    // Build a simplified document data structure
    const items = (project?.rooms || []).flatMap((r: any) => r.items || []);
    const subtotal = items.reduce((s: number, it: any) => s + (Number(it.total) || 0), 0);
    return {
        shop: SHOP_CONFIG,
        items,
        subtotal,
        totalText: bahttext(subtotal)
    };
};

export const generateDocumentHtml = (data: any): string => {
    // Very small HTML string (used by print/pdf export)
    const lines = [
        `<h1>${SHOP_CONFIG.name}</h1>`,
        `<div>Address: ${SHOP_CONFIG.address}</div>`,
        `<div>Subtotal: ${fmt(data.subtotal)}</div>`,
        `<div>In words: ${data.totalText}</div>`
    ];
    return `<html><body>${lines.join('')}</body></html>`;
};

export const generatePdfBlob = async (data: any): Promise<Blob> => {
    const html = generateDocumentHtml(data);
    // Simple fallback: return a blob of the HTML (PDF generation can be done later)
    return new Blob([html], { type: 'text/html' });
};

export default { buildDocumentData, generateDocumentHtml, generatePdfBlob };