/**
 * Dataset Label Manager Controller for EZ Lab Lite
 * Manages comma-separated dataset labels, validation, disk persistence, and label picker UI.
 */
(function () {
  let datasetLabels = [];

  function sanitizeCsvLabels(csvText) {
    if (!csvText) return [];
    const items = csvText.split(',');
    const sanitized = [];
    const seen = new Set();
    items.forEach((item) => {
      const clean = item.trim().toLowerCase();
      if (clean && !seen.has(clean)) {
        seen.add(clean);
        sanitized.append ? sanitized.push(clean) : sanitized.push(clean);
      }
    });
    return sanitized;
  }

  function fetchDatasetLabels(playlistName, targetsStr, callback) {
    const pl = playlistName || window.PLAYLIST_NAME || 'dolphin';
    const tg = targetsStr || window.TARGETS_STR || '';
    fetch(`/api/dataset/labels?playlist_name=${encodeURIComponent(pl)}&targets=${encodeURIComponent(tg)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.labels)) {
          datasetLabels = data.labels;
          renderLabelManagementCard();
          if (callback) callback(datasetLabels);
        }
      })
      .catch((err) => console.error('[LabelManager] Failed to fetch labels:', err));
  }

  function updateActiveDrawClassSelect() {
    const selectEl = document.getElementById('active-draw-class-select');
    if (!selectEl) return;
    const currentVal = selectEl.value;
    selectEl.innerHTML = '';
    const labels = datasetLabels.length > 0 ? datasetLabels : ['object'];
    labels.forEach((lbl) => {
      const opt = document.createElement('option');
      opt.value = lbl;
      opt.textContent = lbl;
      selectEl.appendChild(opt);
    });
    if (labels.includes(currentVal)) {
      selectEl.value = currentVal;
    } else if (labels.length > 0) {
      selectEl.value = labels[0];
    }
  }

  function fetchDatasetLabels(callback) {
    const pl = window.PLAYLIST_NAME || 'dolphin';
    fetch(`/api/dataset/labels?playlist_name=${pl}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          datasetLabels = data.labels;
          renderLabelManagementCard();
          updateActiveDrawClassSelect();
          if (callback) callback(datasetLabels);
        }
      })
      .catch((err) => console.error('[LabelManager] Failed to fetch labels:', err));
  }

  function renderLabelManagementCard() {
    const inputEl = document.getElementById('dataset-labels-csv-input');
    const badgeEl = document.getElementById('active-label-count-badge');
    const chipsListEl = document.getElementById('dataset-labels-chips-list');

    if (inputEl && document.activeElement !== inputEl) {
      inputEl.value = datasetLabels.join(', ');
    }
    if (badgeEl) {
      badgeEl.textContent = `${datasetLabels.length} label${datasetLabels.length === 1 ? '' : 's'}`;
    }
    if (chipsListEl) {
      chipsListEl.innerHTML = datasetLabels.length === 0
        ? '<span style="font-size:11px; color:#64748b; italic;">No active labels</span>'
        : '';
      datasetLabels.forEach((lbl, idx) => {
        const chip = document.createElement('span');
        chip.className = 'badge';
        chip.style.cssText = 'background:rgba(56,189,248,0.12); color:#38bdf8; border:1px solid rgba(56,189,248,0.3); font-size:11px; padding:2px 8px; border-radius:12px; font-weight:500; cursor:pointer; display:inline-flex; align-items:center; gap:4px;';
        chip.innerHTML = `<span>${lbl}</span><span style="opacity:0.6; font-size:10px;" title="Click to edit or click Save CSV to modify">×</span>`;
        chip.onclick = () => removeLabel(lbl);
        chipsListEl.appendChild(chip);
      });
    }
  }

  function saveDatasetLabels(csvInputText) {
    const pl = window.PLAYLIST_NAME || 'dolphin';
    const sanitized = sanitizeCsvLabels(csvInputText);
    const formattedCsv = sanitized.join(', ');

    if (window.ViewerUI?.showToast) {
      window.ViewerUI.showToast(`⏳ Saving ${sanitized.length} dataset label(s)...`, 'info');
    }

    const formData = new FormData();
    formData.append('playlist_name', pl);
    formData.append('labels_csv', formattedCsv);

    fetch('/api/dataset/labels', { method: 'POST', body: formData })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          datasetLabels = data.labels;
          renderLabelManagementCard();
          updateActiveDrawClassSelect();
          if (window.ViewerUI?.showToast) {
            window.ViewerUI.showToast(`✅ ${data.message}`, 'success');
          }
        }
      })
      .catch((err) => {
        if (window.ViewerUI?.showToast) {
          window.ViewerUI.showToast(`❌ Error saving labels: ${err}`, 'error');
        }
      });
  }

  function addLabel(newLabel) {
    const clean = (newLabel || '').trim().toLowerCase();
    if (!clean) return;
    if (!datasetLabels.includes(clean)) {
      datasetLabels.push(clean);
      saveDatasetLabels(datasetLabels.join(', '));
    }
  }

  function removeLabel(targetLabel) {
    const updated = datasetLabels.filter((l) => l !== targetLabel);
    saveDatasetLabels(updated.join(', '));
  }

  function openLabelPickerModal(currentLabel, onConfirm) {
    const modal = document.getElementById('modal-label-picker');
    const chipsEl = document.getElementById('label-picker-chips');
    const inputEl = document.getElementById('label-picker-custom-input');
    const confirmBtn = document.getElementById('label-picker-confirm-btn');

    if (!modal || !chipsEl || !inputEl || !confirmBtn) {
      const fallback = prompt('Enter or select target label:', currentLabel);
      if (fallback && onConfirm) onConfirm(fallback.trim().toLowerCase());
      return;
    }

    inputEl.value = currentLabel || '';
    chipsEl.innerHTML = '';

    const labelsToDisplay = datasetLabels.length > 0 ? datasetLabels : ['object'];
    labelsToDisplay.forEach((lbl) => {
      const chip = document.createElement('button');
      chip.className = 'hud-btn';
      chip.style.cssText = `font-size:12px; padding:3px 10px; border-radius:12px; background:${lbl === currentLabel ? 'rgba(56,189,248,0.25)' : 'rgba(255,255,255,0.05)'}; color:${lbl === currentLabel ? '#38bdf8' : '#e2e8f0'}; border:1px solid ${lbl === currentLabel ? '#38bdf8' : 'rgba(255,255,255,0.1)'}; cursor:pointer;`;
      chip.textContent = lbl;
      chip.onclick = () => {
        inputEl.value = lbl;
        modal.classList.add('hidden');
        if (onConfirm) onConfirm(lbl);
      };
      chipsEl.appendChild(chip);
    });

    const submitAction = () => {
      const val = inputEl.value.trim().toLowerCase();
      if (!val) return;
      modal.classList.add('hidden');
      if (onConfirm) onConfirm(val);
    };

    confirmBtn.onclick = submitAction;
    inputEl.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submitAction();
      }
    };

    modal.classList.remove('hidden');
    inputEl.focus();
    inputEl.select();
  }

  function initEvents() {
    const saveBtn = document.getElementById('btn-save-dataset-labels');
    const inputEl = document.getElementById('dataset-labels-csv-input');
    if (saveBtn && inputEl) {
      saveBtn.onclick = () => saveDatasetLabels(inputEl.value);
      inputEl.onkeydown = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          saveDatasetLabels(inputEl.value);
        }
      };
    }
    fetchDatasetLabels();
  }

  document.addEventListener('DOMContentLoaded', initEvents);

  window.LabelManager = {
    getLabels: () => datasetLabels,
    fetchDatasetLabels,
    saveDatasetLabels,
    addLabel,
    removeLabel,
    sanitizeCsvLabels,
    openLabelPickerModal,
  };
})();

