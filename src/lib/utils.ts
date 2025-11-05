// src/lib/utils.ts

export const toNum = (v: any): number => {
    if (v === null || v === undefined) return 0;
    if (typeof v === 'string') {
        v = v.replace(/,/g, '').trim();
        if (v === '') return 0;
    }
    const num = parseFloat(v);
    return Number.isFinite(num) ? num : 0;
};

export const fmt = (v: any): string => {
    return toNum(v).toFixed(2);
};

export const fmtTH = (v: any): string => {
    const num = toNum(v);
    try {
        return num.toLocaleString('th-TH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    } catch (error) {
        return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
};

export const fmtDimension = (v: any): string => {
    const num = toNum(v);
    return num > 0 ? num.toFixed(2) : '';
};

export const debounce = <T extends (...args: any[]) => void>(
    func: T,
    delay: number
): ((...args: Parameters<T>) => void) => {
    let timeoutId: number | undefined;
    return (...args: Parameters<T>): void => {
        if (timeoutId !== undefined) clearTimeout(timeoutId);
        timeoutId = window.setTimeout(() => {
            func(...args);
            timeoutId = undefined;
        }, delay);
    };
};

export const throttle = <T extends (...args: any[]) => void>(
    func: T,
    limit: number
): ((...args: Parameters<T>) => void) => {
    let inThrottle = false;
    let lastArgs: Parameters<T> | null = null;
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

export const sanitizeHTML = (str: string | null | undefined): string => {
    if (!str) return '';
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
};

export const sanitizeForFilename = (str: string): string => {
    if (!str) return 'file';
    return str
        .replace(/[^a-z0-9\u0E00-\u0E7F._-]/gi, '_')
        .substring(0, 100)
        .trim()
        .replace(/^\.+|\.+$/g, '')
        .replace(/_{2,}/g, '_');
};

const TxtNumArr = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
const TxtDigitArr = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน"];

export const bahttext = (v: any): string => {
    let number = toNum(v);
    if (number === 0) return "ศูนย์บาทถ้วน";
    number = parseFloat(number.toFixed(2));
    const integerPart = Math.floor(number);
    const decimalPart = Math.round((number - integerPart) * 100);

    const read = (n: number): string => {
        if (n === 0) return '';
        const s = String(n);
        let str = '';
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