// src/lib/config.ts
=======
>>>>>>> cb8a02287ec00b14740ece1ee9dc00b3aa13a238
import type { ShopConfig, ItemConfig, PricingConfig } from '../types';

export const APP_VERSION = "vite-ts/7.0.1";
export const WEBHOOK_URL = "https://your-make-webhook-url.com/your-unique-path";
export const STORAGE_KEY = "marnthara.input.v7.0.1";
export const PDF_EXPORT_DELAY_MS = 500;
export const SQM_TO_SQYD = 1.196;

<<<<<<< HEAD
// Add missing PRICING export
=======
>>>>>>> cb8a02287ec00b14740ece1ee9dc00b3aa13a238
export const PRICING = {
    DEFAULT_LABOR_RATE: 100,
    MIN_CHARGE: 500,
    SETUP_FEE: 250,
    TAX_RATE: 0.07,
    VOLUME_DISCOUNTS: [
        { threshold: 50000, rate: 0.05 },
        { threshold: 100000, rate: 0.10 },
        { threshold: 200000, rate: 0.15 }
    ]
} as const;

export const WALLPAPER_SPECS = {
    roll_width_m: 0.53,
    roll_length_m: 10.0,
    roll_sqm: 5.0,
    waste_allowance: 1.15
} as const;

export const SELECTORS = {
<<<<<<< HEAD
    // ... (previous selectors remain unchanged)
} as const;

// Ensure all constants are immutable
=======
    // App Container
    appContainer: '#app-container',
    roomsContainer: '#roomsContainer',
    templates: '#templates',
    
    // Header & Menu
    menuToggleBtn: '#menuToggleBtn',
    mainSidebar: '#mainSidebar',
    menuCloseBtn: '#menuCloseBtn',
    sidebarOverlay: '#sidebarOverlay',
    overviewBtn: '#overviewBtn',
    copySummaryBtn: '#copySummaryBtn',
    imageReportBtn: '#imageReportBtn',
    pdfBtn: '#pdfBtn',
    sendDataBtn: '#sendDataBtn',
    themeToggleBtn: '#themeToggleBtn',
    importBtn: '#importBtn',
    exportBtn: '#exportBtn',
    importFavBtn: '#importFavBtn',
    exportFavBtn: '#exportFavBtn',

    // Room & Items
    room: '.room',
    roomsContainerInner: '#roomsContainer .rooms-inner',
    roomNameInput: '.room-name-input',
    itemCard: '.item-card',
    itemTotal: '.item-total',

    // Favorites
    favManagerModal: '#favManagerModal',
    favAddModal: '#favAddModal',
    favAddCodeInput: '#favAddCodeInput',
    favAddPriceInput: '#favAddPriceInput',

    // Price Inputs
    setPricePerMSelect: '.set-price-per-m-select',

    // Controls
    duplicateRoomBtn: '#duplicateRoomBtn'
} as const;

>>>>>>> cb8a02287ec00b14740ece1ee9dc00b3aa13a238
Object.freeze(PRICING);
Object.freeze(WALLPAPER_SPECS);
Object.freeze(SELECTORS);