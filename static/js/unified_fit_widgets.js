/**
 * Unified Fit-Between-Widgets Layout Mode Controller
 */
(function () {
  const STORAGE_KEY = 'ezlab_fit_widgets_mode';

  function isFitModeActive() {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  }

  function toggleFitWidgetsMode(forceState) {
    const viewport = document.getElementById('canvas-viewport');
    const btnToggle = document.getElementById('btn-toggle-fit-widgets');
    if (!viewport) return;

    const currentMode = viewport.classList.contains('canvas-viewport--fit-widgets');
    const newMode = typeof forceState === 'boolean' ? forceState : !currentMode;

    viewport.classList.toggle('canvas-viewport--fit-widgets', newMode);

    if (btnToggle) {
      btnToggle.classList.toggle('hud-btn--active', newMode);
      btnToggle.setAttribute('aria-pressed', String(newMode));
    }

    localStorage.setItem(STORAGE_KEY, String(newMode));

    if (window.SvgOverlay && window.SvgOverlay.syncSvgToImage) {
      window.SvgOverlay.syncSvgToImage();
    }

    if (window.ViewerUI && window.ViewerUI.showToast) {
      if (newMode) {
        window.ViewerUI.showToast('🖼️ Fit Between Widgets Mode Enabled', 'info');
      } else {
        window.ViewerUI.showToast('↔️ Edge-to-Edge Canvas Restored', 'info');
      }
    }
  }

  function initFitWidgets() {
    const btnToggle = document.getElementById('btn-toggle-fit-widgets');
    if (btnToggle) {
      btnToggle.onclick = () => toggleFitWidgetsMode();
    }

    if (isFitModeActive()) {
      toggleFitWidgetsMode(true);
    }
  }

  window.toggleFitWidgetsMode = toggleFitWidgetsMode;
  window.UnifiedFitWidgets = {
    init: initFitWidgets,
    toggle: toggleFitWidgetsMode,
    isFitMode: isFitModeActive
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFitWidgets);
  } else {
    initFitWidgets();
  }
})();
