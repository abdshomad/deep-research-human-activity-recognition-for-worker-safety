/**
 * Unified Bottom HUD Buttons Controller
 */
document.addEventListener('DOMContentLoaded', () => {
  const bind = (id, fn) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        fn(e);
      });
    }
  };

  // 1. Navigate prev/next
  bind('btn-bottom-nav-prev', () => {
    if (window.ViewerApp && window.ViewerApp.stepFrames) window.ViewerApp.stepFrames(-1);
  });
  bind('btn-bottom-nav-next', () => {
    if (window.ViewerApp && window.ViewerApp.stepFrames) window.ViewerApp.stepFrames(1);
  });

  // 2. Propagate prev/next
  bind('btn-bottom-propagate-prev', () => {
    if (window.UnifiedPropagator && window.UnifiedPropagator.propagateBBoxes) {
      window.UnifiedPropagator.propagateBBoxes('prev');
    }
  });
  bind('btn-bottom-propagate-next', () => {
    if (window.UnifiedPropagator && window.UnifiedPropagator.propagateBBoxes) {
      window.UnifiedPropagator.propagateBBoxes('next');
    }
  });

  // 3. Select Mode
  bind('btn-bottom-select', () => {
    document.getElementById('btn-mode-select')?.click();
  });

  // 4. Draw Box Mode
  bind('btn-bottom-draw', () => {
    document.getElementById('btn-mode-draw')?.click();
  });

  // 5. Crop & Train
  bind('btn-bottom-crop', () => {
    if (window.ViewerApp && window.ViewerApp.cropSelectedBoxesAndTrain) {
      window.ViewerApp.cropSelectedBoxesAndTrain();
    }
  });


  // 9. Run SAM3
  bind('btn-bottom-run-sam3', () => {
    document.getElementById('btn-run-sam3-topbar')?.click();
  });

  // 10. Toggle Masks
  bind('btn-bottom-toggle-masks', () => {
    document.getElementById('btn-toggle-mask')?.click();
  });

  // 11. Zen Mode
  bind('btn-bottom-toggle-zen', () => {
    window.toggleZenMode();
  });

  // 12. Fit Image
  bind('btn-bottom-fit-image', () => {
    if (window.toggleFitWidgetsMode) window.toggleFitWidgetsMode();
  });

  // 13. JSON
  bind('btn-bottom-json', () => {
    window.openJsonModal();
  });

  // 14. Help
  bind('btn-bottom-help', () => {
    window.toggleHelpModal();
  });

  // Proxy Propagation Action to update bottom propagate button text/disabled status
  if (window.UnifiedPropagator && window.UnifiedPropagator.propagateBBoxes) {
    const originalPropagate = window.UnifiedPropagator.propagateBBoxes;
    window.UnifiedPropagator.propagateBBoxes = async function (dir) {
      const bottomBtn = document.getElementById(dir === 'prev' ? 'btn-bottom-propagate-prev' : 'btn-bottom-propagate-next');
      const origHtml = bottomBtn ? bottomBtn.innerHTML : '';
      if (bottomBtn) {
        bottomBtn.disabled = true;
        bottomBtn.innerHTML = '⚡';
      }
      try {
        await originalPropagate(dir);
      } finally {
        if (bottomBtn) {
          bottomBtn.disabled = false;
          bottomBtn.innerHTML = origHtml;
        }
      }
    };
  }

  // MutationObserver to sync states from Topbar HUD buttons to Bottombar buttons
  const syncMap = {
    'btn-mode-select': 'btn-bottom-select',
    'btn-mode-draw': 'btn-bottom-draw',
    'btn-toggle-mask': 'btn-bottom-toggle-masks',
    'btn-toggle-fit-widgets': 'btn-bottom-fit-image',
    'btn-toggle-zen': 'btn-bottom-toggle-zen',
    'btn-run-sam3-topbar': 'btn-bottom-run-sam3'
  };

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        const targetId = mutation.target.id;
        const mappedId = syncMap[targetId];
        if (mappedId) {
          const bottomEl = document.getElementById(mappedId);
          const active = mutation.target.classList.contains('hud-btn--active');
          if (bottomEl) {
            bottomEl.classList.toggle('hud-btn--active', active);
          }
        }
      } else if (mutation.type === 'attributes' && mutation.attributeName === 'disabled') {
        const targetId = mutation.target.id;
        const mappedId = syncMap[targetId];
        if (mappedId) {
          const bottomEl = document.getElementById(mappedId);
          const disabled = mutation.target.disabled;
          if (bottomEl) {
            bottomEl.disabled = disabled;
          }
        }
      }
    });
  });

  Object.keys(syncMap).forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      observer.observe(el, { attributes: true, attributeFilter: ['class', 'disabled'] });
      const mappedId = syncMap[id];
      const bottomEl = document.getElementById(mappedId);
      if (bottomEl) {
        bottomEl.classList.toggle('hud-btn--active', el.classList.contains('hud-btn--active'));
        bottomEl.disabled = el.disabled;
      }
    }
  });
});
