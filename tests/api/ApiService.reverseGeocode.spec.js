import { describe, it, expect, vi } from 'vitest';
import { ApiService } from '../../assets/js/modules/ApiService.js';

describe('ApiService.reverseGeocode', () => {
  it('devrait retourner null pour des arguments invalides sans avertir si DEBUG=false', async () => {
    const apiService = new ApiService();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    const result = await apiService.reverseGeocode('bad', 'args');
    
    // Avec DEBUG=false, pas de warn mais null retourné
    expect(warnSpy).not.toHaveBeenCalled();
    expect(result).toBe(null);
    
    warnSpy.mockRestore();
  });
});