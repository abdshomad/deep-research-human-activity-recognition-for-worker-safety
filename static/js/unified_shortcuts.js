/**
 * Unified Keyboard Shortcuts & Modal Controller with Arrow Up/Down & Page Up/Down Support
 */
document.addEventListener('DOMContentLoaded', () => {
  window.addEventListener('keydown', (e) => {
    const targetTag = e.target.tagName.toLowerCase();
    if (targetTag === 'input' || targetTag === 'textarea' || e.target.isContentEditable) {
      if (e.key === 'Escape') e.target.blur();
      return;
    }

    const key = e.key;
    const keyUpper = key.toUpperCase();

    if ((e.ctrlKey || e.metaKey) && key === 'ArrowRight') {
      e.preventDefault();
      if (window.ViewerApp && window.ViewerApp.propagateBBoxes) window.ViewerApp.propagateBBoxes('next');
    } else if ((e.ctrlKey || e.metaKey) && key === 'ArrowLeft') {
      e.preventDefault();
      if (window.ViewerApp && window.ViewerApp.propagateBBoxes) window.ViewerApp.propagateBBoxes('prev');
    } else if (e.shiftKey && (key === 'ArrowRight' || key === 'ArrowDown')) {
      e.preventDefault();
      if (window.ViewerUI && window.ViewerUI.stepGroupPage) window.ViewerUI.stepGroupPage(1);
    } else if (e.shiftKey && (key === 'ArrowLeft' || key === 'ArrowUp')) {
      e.preventDefault();
      if (window.ViewerUI && window.ViewerUI.stepGroupPage) window.ViewerUI.stepGroupPage(-1);
    } else if (key === 'ArrowRight' || key === 'ArrowDown' || keyUpper === 'D') {
      e.preventDefault();
      if (window.ViewerApp && window.ViewerApp.stepFrames) window.ViewerApp.stepFrames(1);
    } else if (key === 'ArrowLeft' || key === 'ArrowUp' || keyUpper === 'A') {
      e.preventDefault();
      if (window.ViewerApp && window.ViewerApp.stepFrames) window.ViewerApp.stepFrames(-1);
    } else if (key === 'PageDown') {
      e.preventDefault();
      if (window.ViewerUI && window.ViewerUI.stepGroupPage) window.ViewerUI.stepGroupPage(1);
      else if (window.ViewerApp && window.ViewerApp.stepFrames) window.ViewerApp.stepFrames(window.ViewerUI && window.ViewerUI.getPageSize ? window.ViewerUI.getPageSize() : 20);
    } else if (key === 'PageUp') {
      e.preventDefault();
      if (window.ViewerUI && window.ViewerUI.stepGroupPage) window.ViewerUI.stepGroupPage(-1);
      else if (window.ViewerApp && window.ViewerApp.stepFrames) window.ViewerApp.stepFrames(-(window.ViewerUI && window.ViewerUI.getPageSize ? window.ViewerUI.getPageSize() : 20));
    } else if (key === ' ') {
      e.preventDefault();
      if (window.ViewerApp && window.ViewerApp.toggleSlideshow) window.ViewerApp.toggleSlideshow();
    } else if (e.shiftKey && keyUpper === 'E') {
      e.preventDefault();
      document.getElementById('btn-render-dataset')?.click();
    } else if (keyUpper === 'E') {
      e.preventDefault();
      if (window.ViewerApp && window.ViewerApp.editDetectionLabel) window.ViewerApp.editDetectionLabel();
    } else if (keyUpper === 'X' || key === 'Delete' || key === 'Backspace') {
      e.preventDefault();
      if (window.ViewerApp && window.ViewerApp.deleteDetection) window.ViewerApp.deleteDetection();
    } else if (keyUpper === 'M') {
      e.preventDefault();
      if (window.ViewerApp && window.ViewerApp.toggleMasks) window.ViewerApp.toggleMasks();
    } else if (keyUpper === 'L') {
      e.preventDefault();
      if (window.ViewerApp && window.ViewerApp.toggleLabels) window.ViewerApp.toggleLabels();
    } else if (keyUpper === 'J') {
      e.preventDefault();
      openJsonModal();
    } else if (key === '?' || keyUpper === 'H') {
      e.preventDefault();
      toggleHelpModal();
    } else if (keyUpper === 'Z') {
      e.preventDefault();
      window.toggleZenMode();
    } else if (keyUpper === 'C') {
      e.preventDefault();
      if (window.ViewerApp && window.ViewerApp.cropSelectedBoxesAndTrain) {
        window.ViewerApp.cropSelectedBoxesAndTrain();
      }
    } else if (keyUpper === 'R') {
      e.preventDefault();
      document.getElementById('btn-run-sam3-topbar')?.click();
    } else if (e.shiftKey && keyUpper === 'W') {
      e.preventDefault();
      if (window.toggleFitWidgetsMode) window.toggleFitWidgetsMode();
    } else if (key === 'Escape') {
      closeHelpModal();
      closeJsonModal();
      const appEl = document.getElementById('workspace-app');
      if (appEl && appEl.classList.contains('workspace-fullscreen--zen')) {
        window.toggleZenMode(false);
      }
      if (window.ViewerApp && window.ViewerApp.deselectAll) window.ViewerApp.deselectAll();
    }
  });
});

window.toggleZenMode = function(forceState) {
  const appEl = document.getElementById('workspace-app');
  if (!appEl) return;
  const isZen = typeof forceState === 'boolean' ? forceState : !appEl.classList.contains('workspace-fullscreen--zen');
  appEl.classList.toggle('workspace-fullscreen--zen', isZen);
  const btnZen = document.getElementById('btn-toggle-zen');
  if (btnZen) btnZen.classList.toggle('hud-btn--active', isZen);
  if (window.ViewerUI && window.ViewerUI.showToast) {
    if (isZen) {
      window.ViewerUI.showToast('✨ Zen Mode: All widgets hidden (Press Z to restore)', 'info');
    } else {
      window.ViewerUI.showToast('👁️ Restored UI Widgets', 'info');
    }
  }
};

window.openJsonModal = function() {
  const modal = document.getElementById('modal-json');
  const body = document.getElementById('json-modal-body');
  if (modal && window.ViewerApp && window.ViewerApp.getCurrentFrame) {
    const frame = window.ViewerApp.getCurrentFrame();
    body.textContent = JSON.stringify(frame, null, 2);
    modal.classList.remove('hidden');
  }
};

window.closeJsonModal = function() {
  const modal = document.getElementById('modal-json');
  if (modal) modal.classList.add('hidden');
};

window.toggleHelpModal = function() {
  const modal = document.getElementById('modal-help');
  if (modal) modal.classList.toggle('hidden');
};

window.closeHelpModal = function() {
  const modal = document.getElementById('modal-help');
  if (modal) modal.classList.add('hidden');
};
