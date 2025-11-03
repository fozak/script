// to Upper case letters and digits without vowels for better readability

// Helper
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

//new fingerprinting and hash function

// Universal fingerprinting system with normalization
class Fingerprinter {
  static async hash(txt) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt));
    const bytes = new Uint8Array(buf);
    const b32 = '0123456789abcdefghjkmnpqrstvwxyz';
    let bits = 0, val = 0, out = '';
    for (let i = 0; i < bytes.length && out.length < 15; i++) {
      val = (val << 8) | bytes[i];
      bits += 8;
      while (bits >= 5 && out.length < 15) {
        out += b32[(val >> (bits -= 5)) & 31];
      }
    }
    return out.padEnd(15, '0');
  }

  // Universal normalization
  static normalize(value, type = 'string') {
    if (value === null || value === undefined) return '';
    
    switch (type) {
      case 'email':
        return this.normalizeEmail(value);
      case 'phone':
        return this.normalizePhone(value);
      case 'date':
        return this.normalizeDate(value);
      case 'number':
        return String(Number(value));
      case 'string':
      default:
        return this.normalizeString(value);
    }
  }

  static normalizeString(str) {
    return String(str)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^\w\s]/g, '')          // Remove punctuation
      .replace(/\s+/g, ' ')             // Normalize whitespace
      .trim();
  }

  static normalizeEmail(email) {
    const cleaned = String(email).toLowerCase().trim();
    const [local, domain] = cleaned.split('@');
    if (!domain) return cleaned;
    const normalizedLocal = domain.includes('gmail.com') 
      ? local.replace(/\./g, '').split('+')[0]  // Gmail: remove dots & +aliases
      : local.split('+')[0];                     // Others: remove +aliases
    return `${normalizedLocal}@${domain}`;
  }

  static normalizePhone(phone) {
    const digits = String(phone).replace(/\D/g, '');
    // Remove country code if present (assume US +1)
    return digits.length === 11 && digits[0] === '1' ? digits.slice(1) : digits;
  }

  static normalizeDate(date) {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  // Generate fingerprint from object with schema
  static async fingerprint(obj, schema) {
    const parts = [];
    
    for (const [field, config] of Object.entries(schema)) {
      const value = obj[field];
      if (!value) continue;
      
      const normalized = this.normalize(value, config.type);
      if (!normalized) continue;
      
      // Apply weight (repeat for important fields)
      const weight = config.weight || 1;
      for (let i = 0; i < weight; i++) {
        parts.push(normalized);
      }
    }
    
    if (parts.length === 0) return null;
    
    // Combine all parts and hash
    const combined = parts.join('|');
    return await this.hash(combined);
  }
}
