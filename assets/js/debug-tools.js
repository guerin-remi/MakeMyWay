// Minimal debug helpers for manual verification without changing UX
// Usage:
//  - Add ?debug in URL or set localStorage.MMW_DEBUG = '1' to auto-enable
//  - In console: window.debugMMW.enable(); window.debugMMW.state();
//  - window.debugMMW.tap(lat, lng); window.debugMMW.setDestination(lat, lng, 'Label')

import { CONFIG } from './config.js';

(() => {
  const params = new URLSearchParams(window.location.search || '');
  const auto = params.has('debug') || localStorage.getItem('MMW_DEBUG') === '1';

  const safeGet = () => {
    const app = window.makeMyWayApp || null;
    const ui = window.uiManager || app?.modules?.uiManager || null;
    const map = app?.modules?.mapManager || null;
    return { app, ui, map };
  };

  const debug = {
    enable() {
      CONFIG.DEBUG = true;
      localStorage.setItem('MMW_DEBUG', '1');
      console.info('[MMW][DEBUG] enabled');
    },
    disable() {
      CONFIG.DEBUG = false;
      localStorage.removeItem('MMW_DEBUG');
      console.info('[MMW][DEBUG] disabled');
    },
    state() {
      const { ui, map } = safeGet();
      const s = ui?.state || {};
      const markers = map?.markers || {};
      const snapshot = {
        destinationText: s.destinationText ?? s.endAddress ?? null,
        destinationCoords: s.destinationCoords ?? s.endPoint ?? null,
        startPoint: s.startPoint ?? null,
        hasEndMarker: !!markers.end,
        hasStartMarker: !!markers.start,
      };
      console.log('[MMW][DEBUG] state', snapshot);
      return snapshot;
    },
    markerInfo() {
      const { map } = safeGet();
      console.log('[MMW][DEBUG] markers', map?.markers);
      return map?.markers;
    },
    tap(lat, lng) {
      const { map } = safeGet();
      if (map?.onMapClick) {
        map.onMapClick({ lat, lng });
        console.log('[MMW][DEBUG] simulated tap at', { lat, lng });
      } else {
        console.warn('[MMW][DEBUG] onMapClick not set');
      }
    },
    tapAtCenter() {
      const { map } = safeGet();
      if (map?.getMapCenter) {
        const c = map.getMapCenter();
        this.tap(c.lat, c.lng);
        return c;
      }
      console.warn('[MMW][DEBUG] map center unavailable');
      return null;
    },
    setDestination(lat, lng, text = null) {
      const { ui } = safeGet();
      if (!ui) return console.warn('[MMW][DEBUG] uiManager not ready');
      if (typeof ui.updateDestination === 'function') {
        ui.updateDestination({ text, coords: { lat, lng }, source: 'debug' });
      } else if (typeof ui.setEndPoint === 'function') {
        ui.setEndPoint({ lat, lng });
      } else {
        console.warn('[MMW][DEBUG] no destination setter available');
      }
      console.log('[MMW][DEBUG] setDestination', { lat, lng, text });
    },
    async waitFor(predicate, { timeout = 15000, interval = 50 } = {}) {
      const start = Date.now();
      return new Promise((resolve, reject) => {
        const tick = () => {
          try {
            if (predicate()) return resolve(true);
            if (Date.now() - start > timeout) return reject(new Error('Timeout'));
            setTimeout(tick, interval);
          } catch (e) {
            reject(e);
          }
        };
        tick();
      });
    },
    overlay: {
      el: null,
      ensure() {
        if (this.el) return this.el;
        const el = document.createElement('div');
        el.id = 'mmw-selftest-overlay';
        el.style.cssText = [
          'position:fixed', 'right:16px', 'bottom:16px', 'z-index:100000',
          'background:#111827', 'color:#e5e7eb', 'border:1px solid #374151',
          'border-radius:12px', 'box-shadow:0 10px 20px rgba(0,0,0,.3)',
          'font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
          'min-width:280px', 'max-width:360px'
        ].join(';');
        el.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid #374151">
            <strong>MakeMyWay Selftest</strong>
            <div>
              <button id="mmw-selftest-rerun" style="margin-right:8px;background:#2563EB;color:white;border:none;border-radius:8px;padding:6px 10px;cursor:pointer">Re-run</button>
              <button id="mmw-selftest-close" style="background:#374151;color:#e5e7eb;border:none;border-radius:8px;padding:6px 10px;cursor:pointer">Close</button>
            </div>
          </div>
          <div id="mmw-selftest-body" style="padding:10px 12px;line-height:1.4"></div>
        `;
        document.body.appendChild(el);
        this.el = el;
        el.querySelector('#mmw-selftest-close')?.addEventListener('click', () => {
          el.remove();
          this.el = null;
        });
        el.querySelector('#mmw-selftest-rerun')?.addEventListener('click', () => debug.selftest());
        return el;
      },
      write(items) {
        const el = this.ensure();
        const body = el.querySelector('#mmw-selftest-body');
        if (!body) return;
        body.innerHTML = items.map(({ label, status, detail }) => {
          const color = status === 'PASS' ? '#10B981' : status === 'WARN' ? '#F59E0B' : '#EF4444';
          return `<div style="display:flex;align-items:flex-start;margin:6px 0">
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${color};margin-right:8px;margin-top:6px"></span>
            <div>
              <div style="font-weight:600">${label} — ${status}</div>
              ${detail ? `<div style="font-size:12px;color:#9CA3AF">${detail}</div>` : ''}
            </div>
          </div>`;
        }).join('');
      }
    },
    async selftest() {
      try {
        this.enable();
        const steps = [];
        const { app } = safeGet();
        // Wait for app initialized
        await this.waitFor(() => (window.makeMyWayApp?.isInitialized) || (app?.isInitialized), { timeout: 20000 });

        // Step 1: simulate tap at center and expect end marker
        let step = { label: 'Tap carte → marqueur fin', status: 'FAIL', detail: '' };
        try {
          this.tapAtCenter();
          await this.waitFor(() => safeGet().map?.markers?.end, { timeout: 5000 });
          const markers = safeGet().map?.markers;
          step.status = markers?.end ? 'PASS' : 'FAIL';
          step.detail = markers?.end ? 'End marker présent' : 'End marker absent';
        } catch (e) {
          step.detail = `Exception: ${e.message}`;
        }
        steps.push(step);

        // Step 2: force destination with label and expect inputs/state update (best-effort)
        step = { label: 'Set destination → synchro inputs', status: 'WARN', detail: '' };
        try {
          const label = 'Selftest Destination';
          const center = safeGet().map?.getMapCenter?.() || { lat: 48.8566, lng: 2.3522 };
          this.setDestination(center.lat + 0.01, center.lng + 0.01, label);
          await new Promise(r => setTimeout(r, 400));
          const pill = document.getElementById('destinationSearch');
          const panel = document.getElementById('destinationAddress');
          const ui = safeGet().ui;
          const pillOk = !!pill && typeof pill.value === 'string' && pill.value.includes('Selftest');
          const panelOk = !!panel && typeof panel.value === 'string' && panel.value.includes('Selftest');
          const stateOk = ui && (
            (ui.state?.destinationText && ui.state.destinationText.includes('Selftest')) ||
            (ui.state?.destinationCoords)
          );
          const ok = pillOk || panelOk || stateOk;
          step.status = ok ? 'PASS' : 'WARN';
          step.detail = ok ? 'Au moins une source synchronisée' : 'Pas de synchro visible (à investiguer)';
        } catch (e) {
          step.status = 'WARN';
          step.detail = `Exception: ${e.message}`;
        }
        steps.push(step);

        // Step 3: simulate marker drag (or endPoint update) → coords change in state
        step = { label: 'Drag marqueur fin → coords maj', status: 'WARN', detail: '' };
        try {
          const { ui, map } = safeGet();
          const base = map?.markers?.end ? map.markers.end.getPosition?.() : null;
          // Compute new target coords
          const baseLat = typeof base?.lat === 'function' ? base.lat() : (ui?.state?.endPoint?.lat ?? ui?.state?.destinationCoords?.lat);
          const baseLng = typeof base?.lng === 'function' ? base.lng() : (ui?.state?.endPoint?.lng ?? ui?.state?.destinationCoords?.lng);
          const newPos = { lat: (baseLat ?? 48.8566) + 0.003, lng: (baseLng ?? 2.3522) + 0.003 };
          // Prefer simulating onMarkerMove, fallback to setEndPoint
          if (map?.onMarkerMove) {
            map.onMarkerMove('end', newPos);
          } else if (typeof ui?.setEndPoint === 'function') {
            ui.setEndPoint(newPos);
          }
          // Wait for state to reflect new coords (with tolerance)
          const near = (a, b) => typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) < 1e-3;
          await this.waitFor(() => {
            const s = safeGet().ui?.state || {};
            const e = s.endPoint || s.destinationCoords || null;
            return e && near(e.lat, newPos.lat) && near(e.lng, newPos.lng);
          }, { timeout: 3000 });
          step.status = 'PASS';
          step.detail = `Coords mises à jour → ${newPos.lat.toFixed(4)}, ${newPos.lng.toFixed(4)}`;
        } catch (e) {
          step.status = 'WARN';
          step.detail = `Impossible de confirmer la MAJ coords: ${e.message}`;
        }
        steps.push(step);

        // Step 4: panel state affects geolocation button visibility (best-effort)
        step = { label: 'Panel ↔ bouton géolocalisation', status: 'WARN', detail: '' };
        try {
          const panel = document.getElementById('mainPanel');
          const geoBtn = document.getElementById('geoLocationBtn');
          if (panel && geoBtn) {
            // Try to use PanelManager hook if available
            if (typeof panel._setBottomSheetState === 'function') {
              panel._setBottomSheetState('peek');
              await new Promise(r => setTimeout(r, 150));
              const openClass = geoBtn.classList.contains('panel-open');
              panel._setBottomSheetState('collapsed');
              await new Promise(r => setTimeout(r, 150));
              const closedClass = geoBtn.classList.contains('panel-closed');
              if (openClass && closedClass) {
                step.status = 'PASS';
                step.detail = 'Classes panel-open/panel-closed détectées';
              } else {
                step.status = 'WARN';
                step.detail = 'Classes non détectées — gestionnaire gestes non initialisé ?';
              }
            } else {
              step.status = 'WARN';
              step.detail = 'Hook _setBottomSheetState indisponible';
            }
          } else {
            step.status = 'WARN';
            step.detail = 'mainPanel ou geoLocationBtn introuvable';
          }
        } catch (e) {
          step.status = 'WARN';
          step.detail = `Exception: ${e.message}`;
        }
        steps.push(step);

        // Render overlay and console summary
        this.overlay.write(steps);
        const summary = steps.map(s => `${s.label}: ${s.status}`).join(' | ');
        console.info('[MMW][SELFTEST]', summary);
        return steps;
      } catch (e) {
        console.error('[MMW][SELFTEST] failed to run', e);
        this.overlay.write([{ label: 'Selftest', status: 'FAIL', detail: e.message }]);
        return null;
      }
    },
  };

  // Expose helpers
  // eslint-disable-next-line no-undef
  window.debugMMW = debug;

  // Optional keyboard shortcut: Ctrl+Shift+D to dump state
  document.addEventListener('keydown', (e) => {
    if (CONFIG.DEBUG && e.ctrlKey && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
      debug.state();
    }
  });

  if (auto) {
    debug.enable();
  }

  // Auto run selftest if requested via URL (?selftest)
  try {
    const q = new URLSearchParams(window.location.search || '');
    if (q.has('selftest')) {
      // Defer to allow app bootstrap script tag to register
      setTimeout(() => debug.selftest(), 100);
    }
  } catch (_) {}

  console.info('[MMW] debug-tools loaded. Use window.debugMMW.*');
})();
