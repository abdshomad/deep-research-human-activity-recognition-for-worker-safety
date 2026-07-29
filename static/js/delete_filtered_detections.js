/**
 * SAM3 Delete All Filtered Objects Controller
 */
(function () {
  function initDeleteFiltered() {
    if (window.ViewerUI && typeof window.ViewerUI.updateSidePanel === 'function') {
      const originalUpdateSidePanel = window.ViewerUI.updateSidePanel;
      window.ViewerUI.updateSidePanel = function (frame, selectedDetId, minConfidence, showDeleted) {
        originalUpdateSidePanel.apply(this, arguments);
        addDeleteAllFilteredButton(frame);
      };
    } else {
      setTimeout(initDeleteFiltered, 50);
    }
  }

  function addDeleteAllFilteredButton(frame) {
    const summaryEl = document.querySelector('.filtered-group__summary');
    if (!summaryEl) return;

    if (document.getElementById('btn-delete-all-filtered')) return;

    summaryEl.style.display = 'flex';
    summaryEl.style.alignItems = 'center';
    summaryEl.style.justifyContent = 'space-between';
    summaryEl.style.width = '100%';

    const delBtn = document.createElement('button');
    delBtn.id = 'btn-delete-all-filtered';
    delBtn.style.cssText = 'background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #fca5a5; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; cursor: pointer; transition: all 0.2s ease; display: inline-flex; align-items: center; gap: 4px; text-transform: uppercase; margin-right: 4px; font-family: inherit;';
    delBtn.title = 'Delete all filtered objects on this frame';
    delBtn.innerHTML = '🗑️ Delete All';

    delBtn.onmouseenter = function () {
      delBtn.style.background = 'rgba(239, 68, 68, 0.3)';
      delBtn.style.borderColor = 'rgba(239, 68, 68, 0.5)';
      delBtn.style.color = '#fecaca';
    };
    delBtn.onmouseleave = function () {
      delBtn.style.background = 'rgba(239, 68, 68, 0.15)';
      delBtn.style.borderColor = 'rgba(239, 68, 68, 0.3)';
      delBtn.style.color = '#fca5a5';
    };

    delBtn.onclick = function (e) {
      e.stopPropagation();
      e.preventDefault();
      triggerDeleteAllFiltered(frame);
    };

    summaryEl.appendChild(delBtn);
  }

  function triggerDeleteAllFiltered(frame) {
    if (!frame) return;

    const isShowDel = window.ViewerApp && window.ViewerApp.showDeleted;
    
    let validDets = (frame.detections || []).filter((d) => !d.deleted || isShowDel);
    if (window.BoxDrawer?.getDrawnBoxes) {
      window.BoxDrawer.getDrawnBoxes().forEach((b) => {
        if (!validDets.some((d) => d.id === b.id)) validDets.push(b);
      });
    }

    const activeFiltered = validDets.filter((d) => d.hidden && !d.deleted);

    const localBoxes = activeFiltered.filter((d) => d.is_drawn === true);
    const activeDetections = activeFiltered.filter((d) => !d.is_drawn);
    const total = localBoxes.length + activeDetections.length;

    if (total === 0) {
      if (window.ViewerUI && window.ViewerUI.showToast) {
        window.ViewerUI.showToast('ℹ️ No active filtered objects to delete.', 'info');
      }
      return;
    }

    createConfirmationModal();

    const modal = document.getElementById('modal-delete-filtered-confirm');
    const messageEl = document.getElementById('delete-filtered-confirm-message');
    const yesBtn = document.getElementById('btn-delete-filtered-confirm-yes');

    if (modal && messageEl && yesBtn) {
      messageEl.textContent = `Are you sure you want to delete all ${total} filtered objects on this frame? This action cannot be undone.`;
      
      yesBtn.onclick = function () {
        yesBtn.disabled = true;
        yesBtn.innerHTML = '<span class="spinner-mini" style="border: 2px solid #ffffff; border-top-color: transparent; border-radius: 50%; width: 12px; height: 12px; display: inline-block; animation: spin 1s linear infinite; margin-right: 6px; vertical-align: middle;"></span> Deleting...';
        
        executeDeleteAllFiltered(frame, localBoxes, activeDetections, total, () => {
          modal.classList.add('hidden');
          yesBtn.disabled = false;
          yesBtn.innerHTML = 'Delete All Filtered';
        });
      };

      modal.classList.remove('hidden');
    }
  }

  function executeDeleteAllFiltered(frame, localBoxes, activeDetections, total, onComplete) {
    if (window.ViewerUI && window.ViewerUI.showToast) {
      window.ViewerUI.showToast(`🧹 Deleting ${total} filtered objects...`, 'info');
    }

    const finalize = () => {
      if (onComplete) onComplete();
      if (window.ViewerApp && typeof window.ViewerApp.deselectAll === 'function') {
        window.ViewerApp.deselectAll();
      }
      if (window.ViewerApp && typeof window.ViewerApp.loadFrame === 'function') {
        window.ViewerApp.loadFrame(window.ViewerApp.currentIndex);
      }
    };

    // 1. Clear local drawn boxes
    if (localBoxes.length > 0 && window.BoxDrawer && typeof window.BoxDrawer.removeDrawnBox === 'function') {
      localBoxes.forEach(b => window.BoxDrawer.removeDrawnBox(b.id));
    }

    // 2. Clear API-saved detections in a single batch call
    if (activeDetections.length > 0) {
      const idsCsv = activeDetections.map(d => d.id).join(',');
      window.postApi('/api/detection/delete-batch', {
        playlist_name: window.PLAYLIST_NAME,
        video_id: frame.video_id,
        json_filename: frame.json_filename,
        detection_ids_csv: idsCsv
      }, (data) => {
        if (data && data.success && data.detections) {
          frame.detections = data.detections;
          frame._lastLocalUpdate = Date.now();
          if (window.ViewerUI && window.ViewerUI.showToast) {
            window.ViewerUI.showToast(`✅ Deleted all ${total} filtered objects.`, 'success');
          }
        } else {
          if (window.ViewerUI && window.ViewerUI.showToast) {
            window.ViewerUI.showToast('⚠️ Some objects could not be deleted.', 'warning');
          }
        }
        finalize();
      });
    } else {
      if (window.ViewerUI && window.ViewerUI.showToast) {
        window.ViewerUI.showToast('✅ Deleted all local filtered boxes.', 'success');
      }
      finalize();
    }
  }

  function createConfirmationModal() {
    if (document.getElementById('modal-delete-filtered-confirm')) return;

    const modal = document.createElement('div');
    modal.id = 'modal-delete-filtered-confirm';
    modal.className = 'hud-modal hidden';
    modal.style.cssText = 'z-index: 10009;';

    modal.innerHTML = `
      <div class="hud-modal__content" style="max-width:400px; width:100%; display:flex; flex-direction:column; padding:20px; background:#0f172a; border:1px solid #334155; border-radius:12px; color:#f8fafc; text-align:center; box-sizing:border-box;">
        <div style="font-size:36px; margin-bottom:10px;">🗑️</div>
        <h4 style="margin:0 0 8px 0; font-size:16px; color:#ef4444; font-weight:600;">Delete Filtered Objects</h4>
        <p id="delete-filtered-confirm-message" style="font-size:13px; color:#94a3b8; margin:0 0 20px 0; line-height:1.5;"></p>
        <div style="display:flex; justify-content:center; gap:10px;">
          <button id="btn-delete-filtered-confirm-yes" class="hud-btn" style="background:#ef4444; border:1px solid #dc2626; color:white; padding:6px 16px; border-radius:6px; font-weight:600; cursor:pointer;">
            Delete All Filtered
          </button>
          <button id="btn-delete-filtered-confirm-no" class="hud-btn" style="background:#1e293b; border:1px solid #334155; color:#94a3b8; padding:6px 16px; border-radius:6px; font-weight:600; cursor:pointer;">
            Cancel
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('btn-delete-filtered-confirm-no').onclick = function () {
      modal.classList.add('hidden');
    };
  }

  initDeleteFiltered();
})();
