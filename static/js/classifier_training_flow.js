/**
 * SAM3 Classifier Training Flow Controller
 */
(function () {
  let pollIntervalId = null;

  function pollTrainingStatus(playlistName) {
    if (pollIntervalId) clearInterval(pollIntervalId);
    
    const progressBar = document.getElementById('classification-training-progress-bar');
    const percentText = document.getElementById('classification-training-percent');
    const statusText = document.getElementById('classification-training-status');
    const stepText = document.getElementById('classification-training-step');
    const trainingEl = document.getElementById('classification-training');
    
    pollIntervalId = setInterval(() => {
      fetch(`/api/classifier/train-status?playlist_name=${encodeURIComponent(playlistName)}`)
        .then(res => res.json())
        .then(data => {
          if (!data.success) {
            clearInterval(pollIntervalId);
            if (window.showToast) window.showToast("⚠️ Failed to fetch training status.", "danger");
            return;
          }
          
          const status = data.yolo_training_status;
          const progress = Math.round(data.yolo_training_progress || 0);
          
          if (progressBar) progressBar.style.width = `${progress}%`;
          if (percentText) percentText.textContent = `${progress}%`;
          
          if (statusText) {
            statusText.textContent = status.replace(/_/g, ' ');
          }
          
          if (stepText) {
            if (status === "training_started") {
              stepText.textContent = "Training YOLO classifier model...";
            } else if (status.startsWith("training_progress_")) {
              stepText.textContent = `Training YOLO classifier model: ${progress}%`;
            } else if (status === "training_completed") {
              stepText.textContent = "Training completed!";
            } else if (status === "training_failed") {
              stepText.textContent = "Training failed!";
            }
          }
          
          if (status === "training_completed" || progress >= 100) {
            clearInterval(pollIntervalId);
            
            // Show completed overlay
            const overlay = document.getElementById('classifier-training-complete-overlay');
            if (overlay) {
              overlay.classList.remove('hidden');
              setTimeout(() => {
                overlay.classList.add('hidden');
              }, 3000);
            }
            
            // Wait 1s and re-run classify
            setTimeout(() => {
              if (trainingEl) trainingEl.classList.add('hidden');
              const detId = window.ViewerApp ? window.ViewerApp.currentDetIdToClassify : null;
              if (detId && window.ViewerApp && typeof window.ViewerApp.classifySingleDetection === 'function') {
                window.ViewerApp.classifySingleDetection(detId);
              }
            }, 1000);
          } else if (status === "training_failed") {
            clearInterval(pollIntervalId);
            if (window.showToast) window.showToast("❌ YOLO Classifier training failed.", "danger");
            setTimeout(() => {
              if (trainingEl) trainingEl.classList.add('hidden');
              const untrainedEl = document.getElementById('classification-untrained');
              if (untrainedEl) untrainedEl.classList.remove('hidden');
            }, 1500);
          }

          // Poll training logs
          const consoleEl = document.getElementById('classification-training-logs-console');
          if (consoleEl) {
            fetch(`/api/classifier/train-logs?playlist_name=${encodeURIComponent(playlistName)}`)
              .then(res => res.json())
              .then(logData => {
                if (logData.success && Array.isArray(logData.logs)) {
                  consoleEl.textContent = logData.logs.join('\n');
                  consoleEl.scrollTop = consoleEl.scrollHeight;
                }
              })
              .catch(err => console.error("Logs check failed:", err));
          }
        })
        .catch(err => {
          console.error("Status check failed:", err);
        });
    }, 1000);
  }

  function initiateClassifierTraining() {
    const playlistName = window.PLAYLIST_NAME || 'dolphin';
    const untrainedEl = document.getElementById('classification-untrained');
    const trainingEl = document.getElementById('classification-training');
    const progressBar = document.getElementById('classification-training-progress-bar');
    const percentText = document.getElementById('classification-training-percent');
    const stepText = document.getElementById('classification-training-step');
    const statusText = document.getElementById('classification-training-status');
    const consoleEl = document.getElementById('classification-training-logs-console');
    
    if (untrainedEl) untrainedEl.classList.add('hidden');
    if (trainingEl) trainingEl.classList.remove('hidden');
    if (progressBar) progressBar.style.width = '0%';
    if (percentText) percentText.textContent = '0%';
    if (stepText) stepText.textContent = 'Harvesting annotated crops (90% confidence)...';
    if (statusText) statusText.textContent = 'Cropping...';
    if (consoleEl) consoleEl.textContent = 'Preparing logs...';

    const epochsInput = document.getElementById('classification-untrained-epochs');
    const epochsVal = epochsInput ? parseInt(epochsInput.value, 10) : 10;
    
    // Call harvest API
    const harvestData = new FormData();
    harvestData.append('playlist_name', playlistName);
    harvestData.append('max_samples_per_class', '200');
    
    fetch('/api/classifier/harvest', {
      method: 'POST',
      body: harvestData
    })
      .then(res => res.json())
      .then(harvestRes => {
        if (!harvestRes.success) {
          if (window.showToast) window.showToast("⚠️ Harvesting failed: " + (harvestRes.error || "unknown error"), "danger");
          if (trainingEl) trainingEl.classList.add('hidden');
          if (untrainedEl) untrainedEl.classList.remove('hidden');
          return;
        }
        
        if (progressBar) progressBar.style.width = '15%';
        if (percentText) percentText.textContent = '15%';
        if (stepText) stepText.textContent = 'Initiating async YOLO training...';
        if (statusText) statusText.textContent = 'Starting training thread...';
        
        // Start training API with custom epochs
        const trainData = new FormData();
        trainData.append('playlist_name', playlistName);
        trainData.append('epochs', epochsVal.toString());
        
        return fetch('/api/classifier/train-async', {
          method: 'POST',
          body: trainData
        });
      })
      .then(res => {
        if (!res) return;
        return res.json();
      })
      .then(trainRes => {
        if (!trainRes) return;
        if (!trainRes.success) {
          if (window.showToast) window.showToast("⚠️ Training failed to start: " + (trainRes.error || "unknown error"), "danger");
          if (trainingEl) trainingEl.classList.add('hidden');
          if (untrainedEl) untrainedEl.classList.remove('hidden');
          return;
        }
        
        // Begin status polling
        pollTrainingStatus(playlistName);
      })
      .catch(err => {
        if (window.showToast) window.showToast("Request failed: " + err, "danger");
        if (trainingEl) trainingEl.classList.add('hidden');
        if (untrainedEl) untrainedEl.classList.remove('hidden');
      });
  }

  // Bind to window.ViewerApp once available
  function bindToViewerApp() {
    if (window.ViewerApp) {
      window.ViewerApp.initiateClassifierTraining = initiateClassifierTraining;
      
      // Override editDetectionLabel to support drawn boxes
      const origEditLabel = window.ViewerApp.editDetectionLabel;
      window.ViewerApp.editDetectionLabel = function (detId) {
        const targetId = detId || window.ViewerApp.selectedDetId;
        const frame = window.ViewerApp.getCurrentFrame();
        if (!targetId || !frame) return;

        let det = (frame.detections || []).find((d) => d.id === targetId);
        if (det) {
          if (typeof origEditLabel === 'function') {
            origEditLabel(detId);
          }
          return;
        }

        if (window.BoxDrawer && typeof window.BoxDrawer.getDrawnBoxes === 'function') {
          det = window.BoxDrawer.getDrawnBoxes().find((b) => b.id === targetId);
        }
        if (!det) return;

        const handleApplyLabel = (newLabel) => {
          if (!newLabel || newLabel === det.label) return;
          if (window.LabelManager?.addLabel) window.LabelManager.addLabel(newLabel);
          
          det.label = newLabel;
          if (window.ViewerUI?.showToast) window.ViewerUI.showToast(`✅ Updated temporary label to '${newLabel}'`, 'success');
          window.ViewerApp.loadFrame(window.ViewerApp.currentIndex);
        };

        if (window.LabelManager?.openLabelPickerModal) {
          window.LabelManager.openLabelPickerModal(det.label, handleApplyLabel);
        } else {
          const fallback = prompt('Enter new target label:', det.label);
          if (fallback) handleApplyLabel(fallback.trim().toLowerCase());
        }
      };
    } else {
      setTimeout(bindToViewerApp, 50);
    }
  }
  bindToViewerApp();
})();
