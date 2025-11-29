/**
 * StorageService provides persistent storage using localStorage
 * Handles serialization/deserialization of dates and error handling
 */

import { Result } from '../models/types.js';
import { StorageError } from '../models/errors.js';

/**
 * StorageService interface for data persistence
 */
export interface IStorageService {
  save<T>(key: string, data: T): Result<void, StorageError>;
  load<T>(key: string): Result<T, StorageError>;
  delete(key: string): Result<void, StorageError>;
  clear(): Result<void, StorageError>;
}

/**
 * Custom JSON reviver to handle Date deserialization
 * Converts ISO date strings back to Date objects
 */
function dateReviver(_key: string, value: any): any {
  // Check if the value is a string that looks like an ISO date
  if (typeof value === 'string') {
    // ISO 8601 date format: YYYY-MM-DDTHH:mm:ss.sssZ
    const isoDatePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
    if (isoDatePattern.test(value)) {
      const date = new Date(value);
      // Only return as Date if it's valid
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }
  return value;
}

/**
 * StorageService implementation using localStorage
 */
export class StorageService implements IStorageService {
  private storage: Storage;

  constructor(storage: Storage = localStorage) {
    this.storage = storage;
  }

  /**
   * Save data to storage with the given key
   * Handles date serialization and storage quota errors
   */
  save<T>(key: string, data: T): Result<void, StorageError> {
    try {
      // JSON.stringify automatically converts Date objects to ISO strings via toJSON()
      const serialized = JSON.stringify(data);
      this.storage.setItem(key, serialized);
      return { success: true, value: undefined };
    } catch (error) {
      if (error instanceof Error) {
        // Check for quota exceeded error
        if (error.name === 'QuotaExceededError' || 
            error.message.includes('quota') ||
            error.message.includes('storage')) {
          return { 
            success: false, 
            error: new StorageError('Storage quota exceeded. Please free up space.')
          };
        }
        return { 
          success: false, 
          error: new StorageError(`Failed to save data: ${error.message}`)
        };
      }
      return { 
        success: false, 
        error: new StorageError('Failed to save data: Unknown error')
      };
    }
  }

  /**
   * Load data from storage with the given key
   * Handles date deserialization and corrupted data
   */
  load<T>(key: string): Result<T, StorageError> {
    try {
      const serialized = this.storage.getItem(key);
      
      if (serialized === null) {
        return { 
          success: false, 
          error: new StorageError(`No data found for key: ${key}`)
        };
      }

      const data = JSON.parse(serialized, dateReviver);
      return { success: true, value: data as T };
    } catch (error) {
      if (error instanceof SyntaxError) {
        return { 
          success: false, 
          error: new StorageError(`Corrupted data for key: ${key}`)
        };
      }
      if (error instanceof Error) {
        return { 
          success: false, 
          error: new StorageError(`Failed to load data: ${error.message}`)
        };
      }
      return { 
        success: false, 
        error: new StorageError('Failed to load data: Unknown error')
      };
    }
  }

  /**
   * Delete data from storage with the given key
   */
  delete(key: string): Result<void, StorageError> {
    try {
      this.storage.removeItem(key);
      return { success: true, value: undefined };
    } catch (error) {
      if (error instanceof Error) {
        return { 
          success: false, 
          error: new StorageError(`Failed to delete data: ${error.message}`)
        };
      }
      return { 
        success: false, 
        error: new StorageError('Failed to delete data: Unknown error')
      };
    }
  }

  /**
   * Clear all data from storage
   */
  clear(): Result<void, StorageError> {
    try {
      this.storage.clear();
      return { success: true, value: undefined };
    } catch (error) {
      if (error instanceof Error) {
        return { 
          success: false, 
          error: new StorageError(`Failed to clear storage: ${error.message}`)
        };
      }
      return { 
        success: false, 
        error: new StorageError('Failed to clear storage: Unknown error')
      };
    }
  }
}
