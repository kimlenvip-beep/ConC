// src/lib/utils.ts
// (ตามข้อ 8) แปลงเป็น .ts
// (ตามข้อ 10) เพิ่ม-Type-ที่เข้มงวด

/**
 * Converts any value to a number, handling commas.
 * @param v Value to convert (string, number, etc.)
 * @returns A number (0 if conversion fails).
 */
export const toNum = (v: any): number => {
    if (typeof v === 'string') v = v.replace(/,/g, '');
    const num = parseFloat(v);
    return Number.isFinite(num) ? num : 0;
};

/**
 * Formats a number to a dimension string (x.xx).
 * Returns an empty string if the number is zero.
 * @param v The value to format.
 * @returns The formatted string.
 */
export const fmtDimension = (v: any): string => {
    const num = toNum(v);
    return num > 0 ? num.toFixed(2) : '';
};

/**
 * (QoL) Handles blur event on dimension inputs (CM -> M conversion).
 * @param e The blur event.
 */
export const handleCmToMBlur = (e: Event): void => {
    // (ตามข้อ 10) ใช้-Type-Guard
    const input = e.target;
    if (!(input instanceof HTMLInputElement)) return;

    const value = input.value.trim();
    if (value === '') {
        input.value = ''; // Clear if empty
        return;
    }

    let num = toNum(value);
    if (num <= 0) {
        input.value = '';
        return;
    }
    
    // Convert CM to M if number is large (e.g., > 10)
    if (num > 10) { 
        num = num / 100;
    }
    
    input.value = num.toFixed(2);
};

/**
 * Formats a number to a standard number string (x.xx).
 * Returns '0.00' if the number is zero.
 * @param v The value to format.
 * @returns The formatted string.
 */
export const fmt = (v: any): string => {
    return toNum(v).toFixed(2);
};

/**
 * Formats a number to a Thai currency string (x,xxx.xx).
 * @param v The value to format.
 * @returns The formatted string.
 */
export const fmtTH = (v: any): string => {
    return toNum(v).toLocaleString('th-TH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

/**
 * [HELPER] Creates a debounced function.
 * @param func The function to debounce.
 * @param delay The delay in milliseconds.
 * @returns A debounced function.
 */
export const debounce = (func: (...args: any[]) => void, delay: number): ((...args: any[]) => void) => {
    let timeoutId: number;
    return (...args: any[]) => {
        clearTimeout(timeoutId);
        timeoutId = window.setTimeout(() => {
            func(...args);
        }, delay);
    };
};

/**
 * [HELPER] Creates a throttled function.
 * @param func The function to throttle.
 * @param limit The time limit in milliseconds.
 * @returns A throttled function.
 */
export const throttle = (func: (...args: any[]) => void, limit: number): ((...args: any[]) => void) => {
    let inThrottle: boolean;
    let lastFunc: number;
    let lastRan: number;
    return (...args: any[]) => {
        if (!inThrottle) {
            func(...args);
            lastRan = Date.now();
            inThrottle = true;
            setTimeout(() => {
                inThrottle = false;
                if (lastFunc) {
                    // @ts-ignore
                    lastFunc(...args);
                    lastFunc = 0;
                    lastRan = Date.now();
                }
            }, limit);
        } else {
            // @ts-ignore
            lastFunc = func;
        }
    };
};

/**
 * Sanitizes HTML string to prevent XSS.
 * @param str The string to sanitize.
 * @returns A sanitized string.
 */
export const sanitizeHTML = (str: string | null | undefined): string => {
    if (!str) return '';
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
};

/**
 * Sanitizes a string for use in a filename.
 * @param str The string to sanitize.
 * @returns A sanitized string.
 */
export const sanitizeForFilename = (str: string): string => {
    if (!str) return 'file';
    return str.replace(/[^a-z0-9\u0E00-\u0E7F._-]/gi, '_').substring(0, 100);
};

// --- Baht Text (Thai Currency Text) ---
const TxtNumArr = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
const TxtDigitArr = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน"];

export const bahttext = (v: any): string => {
    let number = toNum(v);
    if (number === 0) return "ศูนย์บาทถ้วน";
    
    number = parseFloat(number.toFixed(2));

    let integerPart = Math.floor(number);
    let decimalPart = Math.round((number - integerPart) * 100);

    const read = (n: number): string => {
        if (n === 0) return '';
        let str = '';
        const s = String(n);
        for (let i = 0; i < s.length; i++) {
            const digit = s[i];
            const position = s.length - i - 1;

            if (digit === '0') continue;

            if (position === 1 && digit === '1') {
                str += TxtDigitArr[position];
            } else if (position === 1 && digit === '2') {
                str += "ยี่" + TxtDigitArr[position];
            } else if (position === 0 && digit === '1' && s.length > 1) {
                str += 'เอ็ด';
            } else {
                str += TxtNumArr[parseInt(digit)] + TxtDigitArr[position];
            }
        }
        return str;
    };

    let bahtStr = '';
    if (integerPart > 0) {
        const millions = Math.floor(integerPart / 1000000);
        const remainder = integerPart % 1000000;
        if (millions > 0) {
            bahtStr += read(millions) + 'ล้าน';
        }
        bahtStr += read(remainder);
        bahtStr += 'บาท';
    }

    let satangStr = '';
    if (decimalPart > 0) {
        satangStr = read(decimalPart) + 'สตางค์';
    } else {
        bahtStr += 'ถ้วน';
    }
    
    return bahtStr + satangStr;
};
