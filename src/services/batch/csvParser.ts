import type { BatchEntityInput } from './types';

export interface CSVParseResult {
  success: boolean;
  data?: BatchEntityInput[];
  errors?: CSVParseError[];
}

export interface CSVParseError {
  row: number;
  column?: string;
  message: string;
}

export class CSVParser {
  private static readonly REQUIRED_COLUMNS = ['name'];
  private static readonly OPTIONAL_COLUMNS = ['address', 'country', 'type', 'identifier'];
  private static readonly VALID_TYPES = ['company', 'person'];
  
  static parse(csvContent: string): CSVParseResult {
    const errors: CSVParseError[] = [];
    const data: BatchEntityInput[] = [];
    
    try {
      const lines = csvContent.trim().split('\n');
      if (lines.length === 0) {
        return {
          success: false,
          errors: [{ row: 0, message: 'CSV file is empty' }],
        };
      }
      
      // Parse headers
      const headers = this.parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
      const headerIndices = this.validateHeaders(headers, errors);
      
      if (errors.length > 0) {
        return { success: false, errors };
      }
      
      // Parse data rows
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue; // Skip empty lines
        
        const values = this.parseCSVLine(line);
        const entity = this.parseRow(values, headerIndices, i + 1, errors);
        
        if (entity) {
          data.push(entity);
        }
      }
      
      if (data.length === 0 && errors.length === 0) {
        errors.push({ row: 0, message: 'No valid data rows found' });
      }
      
      return {
        success: errors.length === 0,
        data: errors.length === 0 ? data : undefined,
        errors: errors.length > 0 ? errors : undefined,
      };
      
    } catch (error) {
      return {
        success: false,
        errors: [{
          row: 0,
          message: error instanceof Error ? error.message : 'Failed to parse CSV',
        }],
      };
    }
  }
  
  private static validateHeaders(
    headers: string[],
    errors: CSVParseError[]
  ): Map<string, number> {
    const headerIndices = new Map<string, number>();
    
    // Check for required columns
    for (const required of this.REQUIRED_COLUMNS) {
      const index = headers.indexOf(required);
      if (index === -1) {
        errors.push({
          row: 1,
          column: required,
          message: `Missing required column: ${required}`,
        });
      } else {
        headerIndices.set(required, index);
      }
    }
    
    // Map optional columns
    for (const optional of this.OPTIONAL_COLUMNS) {
      const index = headers.indexOf(optional);
      if (index !== -1) {
        headerIndices.set(optional, index);
      }
    }
    
    return headerIndices;
  }
  
  private static parseRow(
    values: string[],
    headerIndices: Map<string, number>,
    rowNumber: number,
    errors: CSVParseError[]
  ): BatchEntityInput | null {
    const entity: BatchEntityInput = {
      name: '',
    };
    
    // Get name (required)
    const nameIndex = headerIndices.get('name');
    if (nameIndex !== undefined && values[nameIndex]) {
      entity.name = values[nameIndex].trim();
    } else {
      errors.push({
        row: rowNumber,
        column: 'name',
        message: 'Name is required',
      });
      return null;
    }
    
    // Get optional fields
    const addressIndex = headerIndices.get('address');
    if (addressIndex !== undefined && values[addressIndex]) {
      entity.address = values[addressIndex].trim();
    }
    
    const countryIndex = headerIndices.get('country');
    if (countryIndex !== undefined && values[countryIndex]) {
      const country = values[countryIndex].trim().toUpperCase();
      // Basic country code validation (2 or 3 letter codes)
      if (country.length === 2 || country.length === 3) {
        entity.country = country;
      } else {
        errors.push({
          row: rowNumber,
          column: 'country',
          message: 'Invalid country code (use 2 or 3 letter ISO codes)',
        });
      }
    }
    
    const typeIndex = headerIndices.get('type');
    if (typeIndex !== undefined && values[typeIndex]) {
      const type = values[typeIndex].trim().toLowerCase();
      if (this.VALID_TYPES.includes(type)) {
        entity.type = type as 'company' | 'person';
      } else {
        errors.push({
          row: rowNumber,
          column: 'type',
          message: `Invalid type. Must be one of: ${this.VALID_TYPES.join(', ')}`,
        });
      }
    }
    
    const identifierIndex = headerIndices.get('identifier');
    if (identifierIndex !== undefined && values[identifierIndex]) {
      entity.identifier = values[identifierIndex].trim();
    }
    
    // Validate for erroneous characters
    const hasInvalidChars = this.validateCharacters(entity, rowNumber, errors);
    if (hasInvalidChars) {
      return null;
    }
    
    return entity;
  }
  
  private static validateCharacters(
    entity: BatchEntityInput,
    rowNumber: number,
    errors: CSVParseError[]
  ): boolean {
    let hasErrors = false;
    
    // Check for common problematic characters
    const invalidCharsPattern = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;
    
    if (invalidCharsPattern.test(entity.name)) {
      errors.push({
        row: rowNumber,
        column: 'name',
        message: 'Contains invalid control characters',
      });
      hasErrors = true;
    }
    
    if (entity.address && invalidCharsPattern.test(entity.address)) {
      errors.push({
        row: rowNumber,
        column: 'address',
        message: 'Contains invalid control characters',
      });
      hasErrors = true;
    }
    
    if (entity.identifier && invalidCharsPattern.test(entity.identifier)) {
      errors.push({
        row: rowNumber,
        column: 'identifier',
        message: 'Contains invalid control characters',
      });
      hasErrors = true;
    }
    
    return hasErrors;
  }
  
  private static parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    // Add last field
    result.push(current);
    
    return result;
  }
  
  static generateTemplate(): string {
    const headers = ['name', 'address', 'country', 'type', 'identifier'];
    const examples = [
      ['Acme Corporation', '123 Main St, New York, NY', 'USA', 'company', 'EIN123456789'],
      ['John Doe', '456 Oak Ave, London', 'GBR', 'person', 'PASSPORT123'],
      ['Global Trading Co', 'Dubai Business Park', 'ARE', 'company', 'LEI1234567890'],
    ];
    
    const rows = [
      headers.join(','),
      ...examples.map(row => row.map(cell => `"${cell}"`).join(',')),
    ];
    
    return rows.join('\n');
  }
}