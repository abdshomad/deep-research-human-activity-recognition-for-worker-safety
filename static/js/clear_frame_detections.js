/**
 * SAM3 Clear All Frame Bounding Boxes Controller
 */
(function () {
  // Create the confirmation modal dynamically at startup
  function createConfirmationModal() {
    if (document.getElementById('modal-clear-confirm')) return;

    const modal = document.createElement('div');
    modal.id = 'modal-clear-confirm';
    modal.className = 'hud-modal hidden';
    modal.style.cssText = 'z-index: 10008;';

    modal.innerHTML = `
      <div class="hud-modal__content" style="max-width:400px; width:100%; display:flex; flex-direction:column; padding:20px; background:#0f172a; border:1px solid #334155; border-radius:12px; color:#f8fafc; text-align:center; box-sizing:border-box;">
        <div style="font-size:36px; margin-bottom:10px;">🧹</div>
        <h4 style="margin:0 0 8px 0; font-size:16px; color:#ef4444; font-weight:600;">Clear All Bounding Boxes</h4>
        <p id="clear-confirm-message" style="font-size:13px; color:#94a3b8; margin:0 0 20px 0; line-height:1.5;"></p>
        <div style="display:flex; justify-content:center; gap:10px;">
          <button id="btn-clear-confirm-yes" class="hud-btn" style="background:#ef4444; border:1px solid #dc2626; color:white; padding:6px 16px; border-radius:6px; font-weight:600; cursor:pointer;">
            Clear All
          </button>
          <button id="btn-clear-confirm-no" class="hud-btn" style="background:#1e293b; border:1px solid #334155; color:#94a3b8; padding:6px 16px; border-radius:6px; font-weight:600; cursor:pointer;">
            Cancel
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Bind cancel/close buttons
    document.getElementById('btn-clear-confirm-no').onclick = function () {
      modal.classList.add('hidden');
    };
  }

  function bindClearAllButton() {
    const reprocessBtn = document.getElementById('btn-reprocess-frame');
    if (!reprocessBtn) {
      setTimeout(bindClearAllButton, 50);
      return;
    }

    createConfirmationModal();

    if (document.getElementById('btn-clear-frame-detections')) return;

    const clearBtn = document.createElement('button');
    clearBtn.id = 'btn-clear-frame-detections';
    clearBtn.className = 'hud-btn';
    clearBtn.style.cssText = 'width:100%; margin-top:8px; background:rgba(239,68,68,0.15); border:1px solid rgba(239,68,68,0.3); color:#fca5a5; display:flex; align-items:center; justify-content:center; gap:6px; font-weight:600; cursor:pointer; transition:all 0.2s;';
    clearBtn.title = 'Delete all bounding boxes (both drawn and SAM3) on the current frame';
    clearBtn.innerHTML = '🧹 Clear All Boxes';

    clearBtn.onclick = function () {
      if (!window.ViewerApp) return;
      const frame = window.ViewerApp.getCurrentFrame();
      if (!frame) return;

      const localBoxes = (window.BoxDrawer && typeof window.BoxDrawer.getDrawnBoxes === 'function')
        ? window.BoxDrawer.getDrawnBoxes()
        : [];
      const activeDetections = (frame.detections || []).filter(d => !d.deleted);
      const total = localBoxes.length + activeDetections.length;

      if (total === 0) {
        if (window.ViewerUI?.showToast) {
          window.ViewerUI.showToast('ℹ️ No active bounding boxes on this frame to clear.', 'info');
        }
        return;
      }

      // Show the non-blocking modal confirmation dialog
      const modal = document.getElementById('modal-clear-confirm');
      const messageEl = document.getElementById('clear-confirm-message');
      const yesBtn = document.getElementById('btn-clear-confirm-yes');

      if (modal && messageEl && yesBtn) {
        messageEl.textContent = `Are you sure you want to delete all ${total} bounding boxes on this frame? This action cannot be undone.`;
        
        yesBtn.onclick = function () {
          modal.classList.add('hidden');
          executeClearAll(frame, localBoxes, activeDetections, total);
        };

        modal.classList.remove('hidden');
      }
    };

    reprocessBtn.parentNode.insertBefore(clearBtn, reprocessBtn.nextSibling);
  }

  function executeClearAll(frame, localBoxes, activeDetections, total) {
    if (window.ViewerUI?.showToast) {
      window.ViewerUI.showToast(`🧹 Clearing all ${total} boxes...`, 'info');
    }

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
          if (window.ViewerUI?.showToast) {
            window.ViewerUI.showToast('✅ Cleared all bounding boxes on this frame.', 'success');
          }
        } else {
          if (window.ViewerUI?.showToast) {
            window.ViewerUI.showToast('⚠️ Some boxes could not be deleted.', 'warning');
          }
        }
        window.ViewerApp.deselectAll();
        window.ViewerApp.loadFrame(window.ViewerApp.currentIndex);
      });
    } else {
      if (window.ViewerUI?.showToast) {
        window.ViewerUI.showToast('✅ Cleared all local bounding boxes.', 'success');
      }
      window.ViewerApp.deselectAll();
      window.ViewerApp.loadFrame(window.ViewerApp.currentIndex);
    }
  }

  bindClearAllButton();
})();
