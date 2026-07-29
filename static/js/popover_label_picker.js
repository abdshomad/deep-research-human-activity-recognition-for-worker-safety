/**
 * SAM3 Popover Quick Label Picker Controller with Dynamic Shortcuts
 */
(function () {
  let labelShortcuts = {};
  
  function applyLabelToSelected(newLabel) {
    const frame = window.ViewerApp?.getCurrentFrame();
    const selectedIds = Array.from(window.ViewerApp?.selectedDetIds || []);
    if (!frame || selectedIds.length === 0 || !newLabel) return;
    const cleanLabel = newLabel.trim().toLowerCase();
    
    if (window.LabelManager?.addLabel) window.LabelManager.addLabel(cleanLabel);

    const localBoxIds = selectedIds.filter(id => id.startsWith('user_box_') || id.startsWith('pt_prompt_'));
    const apiBoxIds = selectedIds.filter(id => !localBoxIds.includes(id));

    if (localBoxIds.length > 0 && window.BoxDrawer?.getDrawnBoxes) {
      window.BoxDrawer.getDrawnBoxes().forEach(b => { if (localBoxIds.includes(b.id)) b.label = cleanLabel; });
    }

    if (apiBoxIds.length > 0) {
      if (window.ViewerUI?.showToast) window.ViewerUI.showToast(`⏳ Updating label to '${cleanLabel}'...`, 'info');
      let pending = apiBoxIds.length, hasError = false;
      apiBoxIds.forEach(tid => {
        window.postApi('/api/detection/label', {
          playlist_name: window.PLAYLIST_NAME, video_id: frame.video_id,
          json_filename: frame.json_filename, detection_id: tid, new_label: cleanLabel
        }, (data) => {
          if (data.success && data.detections) {
            frame.detections = data.detections; frame._lastLocalUpdate = Date.now();
          } else { hasError = true; }
          if (--pending === 0) {
            if (window.ViewerUI?.showToast) {
              window.ViewerUI.showToast(hasError ? '⚠️ Some labels could not be updated.' : `✅ Updated label to '${cleanLabel}'`, hasError ? 'warning' : 'success');
            }
            if (typeof window.ViewerApp.fetchDatasetCrops === 'function') {
              window.ViewerApp.fetchDatasetCrops(() => window.ViewerApp.loadFrame(window.ViewerApp.currentIndex));
            } else {
              window.ViewerApp.loadFrame(window.ViewerApp.currentIndex);
            }
          }
        });
      });
    }

    if (apiBoxIds.length === 0) {
      if (window.SvgOverlay) window.SvgOverlay.render(frame, window.ViewerApp.showMasks, window.ViewerApp.minConfidence, window.ViewerApp.showDeleted, window.ViewerApp.showLabels);
      if (window.ViewerUI) window.ViewerUI.updateSidePanel(frame, window.ViewerApp.selectedDetId, window.ViewerApp.minConfidence);
      updatePopoverLabels();
    }
  }

  function updatePopoverLabels() {
    const popover = document.getElementById('popover-action-bar');
    if (!popover) return;

    let chipsContainer = document.getElementById('popover-label-chips');
    let divider = document.getElementById('popover-divider-labels');
    if (!chipsContainer) {
      divider = document.createElement('div');
      divider.id = 'popover-divider-labels';
      divider.style.cssText = 'width: 1px; height: 20px; background: rgba(255, 255, 255, 0.25); margin: 0 4px;';
      chipsContainer = document.createElement('div');
      chipsContainer.id = 'popover-label-chips';
      chipsContainer.style.cssText = 'display: flex; gap: 6px; align-items: center;';
      const closeBtn = popover.querySelector('.hud-popover__close');
      if (closeBtn) {
        popover.insertBefore(divider, closeBtn); popover.insertBefore(chipsContainer, closeBtn);
      } else {
        popover.appendChild(divider); popover.appendChild(chipsContainer);
      }
    }

    const selectedDetIds = window.ViewerApp.selectedDetIds;
    const count = selectedDetIds ? selectedDetIds.size : 0;
    if (count === 0) {
      chipsContainer.innerHTML = ''; divider.style.display = 'none'; return;
    }

    divider.style.display = 'block'; chipsContainer.innerHTML = '';
    const frame = window.ViewerApp.getCurrentFrame();
    let currentLabel = null;
    if (count === 1 && frame) {
      const detId = Array.from(selectedDetIds)[0];
      let det = (frame.detections || []).find((d) => d.id === detId);
      if (!det && window.BoxDrawer?.getDrawnBoxes) det = window.BoxDrawer.getDrawnBoxes().find((b) => b.id === detId);
      if (det) currentLabel = det.label;
    }

    const activeLabels = window.LabelManager ? window.LabelManager.getLabels() : [];
    
    // Assign shortcuts dynamically avoiding conflicts
    const reservedKeys = new Set(['a', 'c', 'd', 'e', 'f', 'h', 'j', 'l', 'm', 'r', 'v', 'w', 'x', 'z', 'escape', 'delete', 'backspace', ' ', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'pagedown', 'pageup']);
    const assignedKeys = new Set(reservedKeys);
    labelShortcuts = {};

    activeLabels.forEach((lbl) => {
      let assigned = false;
      for (let i = 0; i < lbl.length; i++) {
        const char = lbl[i].toLowerCase();
        if (!assignedKeys.has(char) && /[a-z]/.test(char)) {
          labelShortcuts[lbl] = char; assignedKeys.add(char); assigned = true; break;
        }
      }
      if (!assigned) {
        for (let num = 1; num <= 9; num++) {
          const numStr = String(num);
          if (!assignedKeys.has(numStr)) {
            labelShortcuts[lbl] = numStr; assignedKeys.add(numStr); assigned = true; break;
          }
        }
      }
    });

    if (activeLabels.length > 0) {
      activeLabels.forEach((lbl) => {
        const btn = document.createElement('button');
        const isCurrent = currentLabel === lbl;
        const shortcut = labelShortcuts[lbl];
        const shortcutText = shortcut ? ` [${shortcut.toUpperCase()}]` : '';
        
        btn.className = isCurrent 
          ? 'hud-popover__label-btn hud-popover__label-btn--active' 
          : 'hud-popover__label-btn';
        btn.textContent = `${lbl}${shortcutText}`;
        btn.title = `Set label to "${lbl}"${shortcut ? ' (Shortcut: ' + shortcut.toUpperCase() + ')' : ''}`;
        btn.onclick = () => applyLabelToSelected(lbl);
        chipsContainer.appendChild(btn);
      });
    }

    const plusBtn = document.createElement('button');
    plusBtn.className = 'hud-popover__plus-btn';
    plusBtn.textContent = '➕ Add';
    plusBtn.onclick = () => {
      if (window.LabelManager?.openLabelPickerModal) {
        window.LabelManager.openLabelPickerModal(currentLabel || '', applyLabelToSelected);
      } else {
        const fallback = prompt('Enter new target label:', currentLabel || '');
        if (fallback) applyLabelToSelected(fallback.trim().toLowerCase());
      }
    };
    chipsContainer.appendChild(plusBtn);
  }

  function bindPopoverLabelPicker() {
    if (window.ViewerApp && window.LabelManager) {
      if (!window.ViewerApp._hasLabelPickerPatches) {
        window.ViewerApp._hasLabelPickerPatches = true;
        const wrap = (orig, hook) => function () { if (orig) orig.apply(this, arguments); hook(); };
        window.ViewerApp.selectDetection = wrap(window.ViewerApp.selectDetection, updatePopoverLabels);
        window.ViewerApp.setSelectedDetections = wrap(window.ViewerApp.setSelectedDetections, updatePopoverLabels);
        window.ViewerApp.deselectAll = wrap(window.ViewerApp.deselectAll, updatePopoverLabels);
        window.ViewerApp.loadFrame = wrap(window.ViewerApp.loadFrame, updatePopoverLabels);
      }
      updatePopoverLabels();
    } else {
      setTimeout(bindPopoverLabelPicker, 50);
    }
  }

  window.addEventListener('keydown', (e) => {
    if (['input', 'textarea'].includes(e.target.tagName.toLowerCase()) || e.target.isContentEditable) return;
    if (!window.ViewerApp?.selectedDetIds || window.ViewerApp.selectedDetIds.size === 0) return;
    const key = e.key.toLowerCase();
    for (const [lbl, shortcut] of Object.entries(labelShortcuts)) {
      if (key === shortcut) {
        e.preventDefault(); applyLabelToSelected(lbl); break;
      }
    }
  });

  bindPopoverLabelPicker();
})();
