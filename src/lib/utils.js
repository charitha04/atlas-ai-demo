import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Masks a customer name to show only initials.
 * Example: "John Smith" → "J*** S****"
 * @param {string} name - Full name to mask
 * @returns {string} - Masked name with only initials visible
 */
export function maskName(name) {
  if (!name || typeof name !== 'string') return name;
  
  const parts = name.trim().split(/\s+/);
  return parts.map(part => {
    if (part.length === 0) return '';
    if (part.length === 1) return part[0];
    return part[0] + '*'.repeat(part.length - 1);
  }).join(' ');
}

/**
 * Masks the first 10 characters of a VIN with asterisks.
 * Example: "1HGBH41JXMN109186" → "**********MN109186"
 * @param {string} vin - Vehicle Identification Number (17 characters)
 * @returns {string} - VIN with first 10 characters masked
 */
export function maskVin(vin) {
  if (!vin || typeof vin !== 'string') return vin;
  
  const charsToMask = 10;
  if (vin.length <= charsToMask) {
    return '*'.repeat(vin.length);
  }
  return '*'.repeat(charsToMask) + vin.slice(charsToMask);
}
