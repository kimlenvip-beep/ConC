import type { ShopConfig, ItemConfig, PricingConfig } from '../types';

export const APP_VERSION = "vite-ts/7.0.1";
export const WEBHOOK_URL = "https://your-make-webhook-url.com/your-unique-path";
export const STORAGE_KEY = "marnthara.input.v7.0.1";
export const PDF_EXPORT_DELAY_MS = 500;
export const SQM_TO_SQYD = 1.196;

// SHOP_CONFIG: ข้อมูลร้าน ใช้โดย documentGenerator และที่อื่น ๆ
export const SHOP_CONFIG = {
    name: "Marnthara",
    address: "123/45 Example Rd., Bangkok, Thailand",
    phone: "+66-2-123-4567",
    email: "contact@example.com",
    taxId: "",
    logoUrl: "", // ถ้าไม่มี ให้เป็น empty string
    currency: "THB"
} as const;

// PRICING: การตั้งค่าเริ่มต้นสำหรับการคำนวณราคา
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

// Wallpaper specs
export const WALLPAPER_SPECS = {
    roll_width_m: 0.53,
    roll_length_m: 10.0,
    roll_sqm: 5.0,
    waste_allowance: 1.15
} as const;

// ITEM_CONFIG: ข้อมูลคอนฟิกของชนิดไอเทมที่หลายไฟล์เรียกใช้
export const ITEM_CONFIG = {
    set: { name: 'ชุด', className: 'set-item', icon: 'ph-stack' },
    area: { name: 'พื้นที่', className: 'area-item', icon: 'ph-ruler' },
    wallpaper: { name: 'วอลล์เปเปอร์', className: 'wallpaper-item', icon: 'ph-frame' },
    fabric: { name: 'ผ้า', className: 'fabric-item', icon: 'ph-fabric' },
    sheer: { name: 'ผ้าม่านโปร่ง', className: 'sheer-item', icon: 'ph-sun' },
    default: { name: 'ของตกแต่ง', className: 'default-item', icon: 'ph-ruler' }
} as const;

export const SELECTORS = {
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

Object.freeze(SHOP_CONFIG);
Object.freeze(PRICING);
Object.freeze(WALLPAPER_SPECS);
Object.freeze(ITEM_CONFIG);
Object.freeze(SELECTORS);