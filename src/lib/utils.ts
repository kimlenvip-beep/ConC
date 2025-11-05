// src/lib/utils.ts
<<<<<<< HEAD
// Enhanced utility functions with improved type safety and error handling

/**
 * Converts any value to a number, handling commas and invalid inputs safely
 * @param v Value to convert (string, number, etc.)
 * @returns A number (0 if conversion fails)
 */
export const toNum = (v: any): number => {
    if (v === null || v === undefined) return 0;
    if (typeof v === 'string') {
        // Remove commas and whitespace
=======

export const toNum = (v: any): number => {
    if (v === null || v === undefined) return 0;
    if (typeof v === 'string') {
>>>>>>> cb8a02287ec00b14740ece1ee9dc00b3aa13a238
        v = v.replace(/,/g, '').trim();
        if (v === '') return 0;
    }
    const num = parseFloat(v);
    return Number.isFinite(num) ? num : 0;
};

<<<<<<< HEAD
/**
 * Formats a number to a fixed precision string (x.xx)
 * @param v The value to format
 * @returns The formatted string with 2 decimal places
 */
=======
>>>>>>> cb8a02287ec00b14740ece1ee9dc00b3aa13a238
export const fmt = (v: any): string => {
    return toNum(v).toFixed(2);
};

<<<<<<< HEAD
/**
 * Formats a number to Thai currency string with proper localization
 * @param v The value to format
 * @returns The formatted string (x,xxx.xx)
 */
=======
>>>>>>> cb8a02287ec00b14740ece1ee9dc00b3aa13a238
export const fmtTH = (v: any): string => {
    const num = toNum(v);
    try {
        return num.toLocaleString('th-TH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    } catch (error) {
<<<<<<< HEAD
        // Fallback if localization fails
=======
>>>>>>> cb8a02287ec00b14740ece1ee9dc00b3aa13a238
        return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
};

<<<<<<< HEAD
/**
 * Formats a dimension value, returns empty string if zero
 * @param v The value to format
 * @returns The formatted dimension string
 */
=======
>>>>>>> cb8a02287ec00b14740ece1ee9dc00b3aa13a238
export const fmtDimension = (v: any): string => {
    const num = toNum(v);
    return num > 0 ? num.toFixed(2) : '';
};

<<<<<<< HEAD
/**
 * Creates a debounced function with improved cleanup
 * @param func The function to debounce
 * @param delay The delay in milliseconds
 */
=======
>>>>>>> cb8a02287ec00b14740ece1ee9dc00b3aa13a238
export const debounce = <T extends (...args: any[]) => void>(
    func: T,
    delay: number
): ((...args: Parameters<T>) => void) => {
    let timeoutId: number | undefined;
<<<<<<< HEAD
    
    return (...args: Parameters<T>): void => {
        if (timeoutId !== undefined) {
            clearTimeout(timeoutId);
        }
=======
    return (...args: Parameters<T>): void => {
        if (timeoutId !== undefined) clearTimeout(timeoutId);
>>>>>>> cb8a02287ec00b14740ece1ee9dc00b3aa13a238
        timeoutId = window.setTimeout(() => {
            func(...args);
            timeoutId = undefined;
        }, delay);
    };
};

<<<<<<< HEAD
/**
 * Creates a throttled function with guaranteed execution
 * @param func The function to throttle
 * @param limit The time limit in milliseconds
 */
=======
>>>>>>> cb8a02287ec00b14740ece1ee9dc00b3aa13a238
export const throttle = <T extends (...args: any[]) => void>(
    func: T,
    limit: number
): ((...args: Parameters<T>) => void) => {
    let inThrottle = false;
    let lastArgs: Parameters<T> | null = null;
<<<<<<< HEAD
    
=======
>>>>>>> cb8a02287ec00b14740ece1ee9dc00b3aa13a238
    return (...args: Parameters<T>): void => {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => {
                inThrottle = false;
                if (lastArgs) {
                    func(...lastArgs);
                    lastArgs = null;
                }
            }, limit);
        } else {
            lastArgs = args;
        }
    };
};

<<<<<<< HEAD
/**
 * Sanitizes HTML content to prevent XSS
 * @param str The string to sanitize
 * @returns Sanitized HTML string
 */
=======
>>>>>>> cb8a02287ec00b14740ece1ee9dc00b3aa13a238
export const sanitizeHTML = (str: string | null | undefined): string => {
    if (!str) return '';
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
};

<<<<<<< HEAD
/**
 * Sanitizes a string for use in filenames
 * @param str The string to sanitize
 * @returns Safe filename string
 */
=======
>>>>>>> cb8a02287ec00b14740ece1ee9dc00b3aa13a238
export const sanitizeForFilename = (str: string): string => {
    if (!str) return 'file';
    return str
        .replace(/[^a-z0-9\u0E00-\u0E7F._-]/gi, '_')
        .substring(0, 100)
        .trim()
<<<<<<< HEAD
        .replace(/^\.+|\.+$/g, '') // Remove leading/trailing dots
        .replace(/_{2,}/g, '_'); // Replace multiple underscores with single
};

// Thai currency text conversion
=======
        .replace(/^\.+|\.+$/g, '')
        .replace(/_{2,}/g, '_');
};

>>>>>>> cb8a02287ec00b14740ece1ee9dc00b3aa13a238
const TxtNumArr = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
const TxtDigitArr = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน"];

/**
 * Converts number to Thai baht text representation
 * @param v The number to convert
 * @returns Thai baht text
 */
export const bahttext = (v: any): string => {
    let number = toNum(v);
    if (number === 0) return "ศูนย์บาทถ้วน";
<<<<<<< HEAD
    
    // Ensure proper decimal handling
    number = parseFloat(number.toFixed(2));
    
    const integerPart = Math.floor(number);
    const decimalPart = Math.round((number - integerPart) * 100);
    
=======
    number = parseFloat(number.toFixed(2));
    const integerPart = Math.floor(number);
    const decimalPart = Math.round((number - integerPart) * 100);

>>>>>>> cb8a02287ec00b14740ece1ee9dc00b3aa13a238
    const read = (n: number): string => {
        if (n === 0) return '';
        const s = String(n);
        let str = '';
<<<<<<< HEAD
        
        for (let i = 0; i < s.length; i++) {
            const digit = s[i];
            const position = s.length - i - 1;
            
            if (digit === '0') continue;
            
            // Special cases in Thai pronunciation
=======
        for (let i = 0; i < s.length; i++) {
            const digit = s[i];
            const position = s.length - i - 1;
            if (digit === '0') continue;
>>>>>>> cb8a02287ec00b14740ece1ee9dc00b3aa13a238
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