/**
 * Album Training Stepper Controller
 * Displays a horizontal step-indicator of percentages (0% -> 100%) during YOLO classifier training on the Album modal.
 */
(function () {
  let activeIntervalId = null;

  function initAlbumStepper() {
    if (!window.DatasetViewer) {
      setTimeout(initAlbumStepper, 50);
      return;
    }

    const origOpen = window.DatasetViewer.open;
    const origClose = window.DatasetViewer.close;

    window.DatasetViewer.open = function () {
      if (typeof origOpen === 'function') origOpen();
      checkAndPollActiveTraining();
    };

    window.DatasetViewer.close = function () {
      if (typeof origClose === 'function') origClose();
      if (activeIntervalId) {
        clearInterval(activeIntervalId);
        activeIntervalId = null;
      }
    };

    window.DatasetViewer.trainDataset = function () {
      const confirmModal = document.getElementById('modal-train-confirm');
      const yesBtn = document.getElementById('btn-train-confirm-yes');
      const noBtn = document.getElementById('btn-train-confirm-no');

      if (!confirmModal || !yesBtn || !noBtn) {
        if (!confirm('Start training YOLO classifier on the current crops dataset? This runs asynchronously.')) {
          return;
        }
        executeTraining(10);
        return;
      }

      confirmModal.classList.remove('hidden');

      yesBtn.onclick = function () {
        confirmModal.classList.add('hidden');
        const epochsInput = document.getElementById('train-confirm-epochs');
        const epochsVal = epochsInput ? parseInt(epochsInput.value, 10) : 10;
        executeTraining(epochsVal);
      };

      noBtn.onclick = function () {
        confirmModal.classList.add('hidden');
      };
    };

    function executeTraining(epochs) {
      if (window.ViewerUI && window.ViewerUI.showToast) {
        window.ViewerUI.showToast('⚡ Initiating YOLO Classifier training...', 'info');
      }

      const consoleEl = document.getElementById('dataset-stepper-logs-console');
      if (consoleEl) consoleEl.textContent = 'Preparing logs...';

      const formData = new FormData();
      formData.append('playlist_name', window.PLAYLIST_NAME);
      formData.append('epochs', epochs.toString());

      fetch('/api/classifier/train-async', {
        method: 'POST',
        body: formData
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            showStepperContainer();
            pollTraining(window.PLAYLIST_NAME || 'dolphin');
          } else {
            if (window.ViewerUI && window.ViewerUI.showToast) {
              window.ViewerUI.showToast(`🔴 Failed to initiate training: ${data.error || 'unknown error'}`, 'error');
            }
          }
        })
        .catch(err => {
          if (window.ViewerUI && window.ViewerUI.showToast) {
            window.ViewerUI.showToast(`🔴 Connection error: ${err.message}`, 'error');
          }
        });
    }
  }

  function checkAndPollActiveTraining() {
    if (activeIntervalId) {
      clearInterval(activeIntervalId);
      activeIntervalId = null;
    }

    const playlist = window.PLAYLIST_NAME || 'dolphin';
    fetch(`/api/classifier/train-status?playlist_name=${encodeURIComponent(playlist)}`)
      .then(res => res.json())
      .then(data => {
        const status = data.yolo_training_status || data.status;
        if (data.success && (status === 'training_started' || status.startsWith('training_progress_'))) {
          showStepperContainer();
          pollTraining(playlist);
        } else {
          hideStepperContainer();
        }
      })
      .catch(err => console.error('[Album Stepper] Initial status check failed:', err));
  }

  function showStepperContainer() {
    const container = document.getElementById('dataset-viewer-stepper-container');
    if (container) container.classList.remove('hidden');

    const trainBtn = document.getElementById('btn-dataset-train');
    if (trainBtn) {
      trainBtn.disabled = true;
      trainBtn.style.opacity = '0.5';
      trainBtn.innerHTML = '⚡ Training...';
    }
  }

  function hideStepperContainer() {
    const container = document.getElementById('dataset-viewer-stepper-container');
    if (container) container.classList.add('hidden');

    const trainBtn = document.getElementById('btn-dataset-train');
    if (trainBtn) {
      trainBtn.disabled = false;
      trainBtn.style.opacity = '1';
      trainBtn.innerHTML = '⚡ Train Classifier';
    }
  }

  function pollTraining(playlistName) {
    if (activeIntervalId) clearInterval(activeIntervalId);

    activeIntervalId = setInterval(() => {
      fetch(`/api/classifier/train-status?playlist_name=${encodeURIComponent(playlistName)}`)
        .then(res => res.json())
        .then(data => {
          if (!data.success) {
            clearInterval(activeIntervalId);
            activeIntervalId = null;
            return;
          }

          const status = data.yolo_training_status || data.status || 'training_started';
          const progress = data.yolo_training_progress || data.progress || 0;
          const totalEpochs = data.yolo_training_epochs || 10;

          let stepText = `Training model...`;
          if (status === 'training_started') {
            stepText = `Initializing training thread...`;
          } else if (status.startsWith('training_progress_')) {
            const epochVal = status.replace('training_progress_', '');
            stepText = `Training Epoch ${epochVal}/${totalEpochs}...`;
          } else if (status === 'training_completed') {
            stepText = `Training completed successfully!`;
          }

          updateStepper(progress, stepText);

          if (status === 'training_completed' || status === 'idle') {
            clearInterval(activeIntervalId);
            activeIntervalId = null;

            if (status === 'training_completed') {
              updateStepper(100, '🎉 Training completed!');
              if (window.ViewerUI && window.ViewerUI.showToast) {
                window.ViewerUI.showToast('🟢 YOLO Classifier training finished successfully!', 'success');
              }
              setTimeout(() => {
                hideStepperContainer();
              }, 3000);
            } else {
              hideStepperContainer();
            }
          }

          // Poll training logs
          const consoleEl = document.getElementById('dataset-stepper-logs-console');
          if (consoleEl) {
            fetch(`/api/classifier/train-logs?playlist_name=${encodeURIComponent(playlistName)}`)
              .then(res => res.json())
              .then(logData => {
                if (logData.success && Array.isArray(logData.logs)) {
                  consoleEl.textContent = logData.logs.join('\n');
                  consoleEl.scrollTop = consoleEl.scrollHeight;
                }
              })
              .catch(err => console.error('[Album Stepper] Logs polling error:', err));
          }
        })
        .catch(err => {
          console.error('[Album Stepper] Polling error:', err);
          clearInterval(activeIntervalId);
          activeIntervalId = null;
        });
    }, 1000);
  }

  function updateStepper(percent, statusText) {
    const container = document.getElementById('dataset-viewer-stepper-container');
    if (!container) return;

    const statusEl = document.getElementById('dataset-stepper-status');
    const percentTextEl = document.getElementById('dataset-stepper-percent-text');
    const progressLineEl = document.getElementById('dataset-stepper-progress-line');

    if (statusEl && statusText) {
      const txtNode = statusEl.querySelector('span:last-child');
      if (txtNode) txtNode.textContent = statusText;
    }
    if (percentTextEl) {
      percentTextEl.textContent = `${percent}%`;
    }
    if (progressLineEl) {
      progressLineEl.style.width = `${percent}%`;
    }

    const steps = container.querySelectorAll('.stepper-step');
    steps.forEach(step => {
      const stepPercent = parseInt(step.getAttribute('data-percent'), 10);
      if (stepPercent <= percent) {
        step.style.borderColor = '#8b5cf6';
        step.style.color = '#a78bfa';
        step.style.background = 'rgba(139, 92, 246, 0.2)';
      } else {
        step.style.borderColor = '#334155';
        step.style.color = '#64748b';
        step.style.background = '#0f172a';
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initAlbumStepper();
      if (window.IS_DATASET_ALBUM_PAGE) {
        checkAndPollActiveTraining();
      }
    });
  } else {
    initAlbumStepper();
    if (window.IS_DATASET_ALBUM_PAGE) {
      checkAndPollActiveTraining();
    }
  }
})();
