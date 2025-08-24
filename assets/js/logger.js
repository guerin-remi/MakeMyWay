/**
 * Logger minimal désactivable
 */

import { CONFIG } from './config.js';

const logger = {
  debug(tag, msg, data) {
    if (!CONFIG.DEBUG) return;
    console.log(`[${tag}] ${msg}`, data || '');
  },

  warn(tag, msg, data) {
    if (!CONFIG.DEBUG) return;
    console.warn(`[${tag}] ${msg}`, data || '');
  },

  error(tag, msg, data) {
    if (!CONFIG.DEBUG) return;
    console.error(`[${tag}] ${msg}`, data || '');
  }
};

export default logger;