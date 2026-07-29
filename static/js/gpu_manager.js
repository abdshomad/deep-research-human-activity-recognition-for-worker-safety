// static/js/gpu_manager.js
// Javascript client controller for GPU monitoring and model GPU assignments

(function() {
  class GpuManager {
    constructor() {
      this.panel = null;
      this.toggleBtn = null;
      this.gpuListEl = null;
      this.modelListEl = null;
      this.spinner = null;
      this.refreshBtn = null;
      this.initialized = false;
    }

    init() {
      if (this.initialized) return;

      this.panel = document.getElementById("gpu-management-panel");
      this.toggleBtn = document.getElementById("btn-toggle-gpu");
      this.gpuListEl = document.getElementById("gpu-device-list");
      this.modelListEl = document.getElementById("gpu-model-list");
      this.spinner = document.getElementById("gpu-panel-spinner");
      this.refreshBtn = document.getElementById("gpu-panel-refresh-btn");

      if (!this.panel || !this.gpuListEl || !this.modelListEl) {
        console.warn("[GpuManager] Required DOM elements not found.");
        return;
      }

      this.refreshBtn.addEventListener("click", () => this.fetchStats());
      this.initialized = true;
    }

    togglePanel() {
      this.init();
      if (!this.panel) return;

      const isActive = this.panel.classList.contains("active");
      if (isActive) {
        this.panel.classList.remove("active");
      } else {
        this.panel.classList.add("active");
        this.fetchStats();
      }
    }

    closePanel() {
      if (this.panel) {
        this.panel.classList.remove("active");
      }
    }

    showLoading(show) {
      if (this.spinner) {
        this.spinner.style.display = show ? "block" : "none";
      }
    }

    async fetchStats() {
      this.showLoading(true);
      try {
        const res = await fetch("/api/gpu/stats");
        const data = await res.json();
        if (data && data.success) {
          this.renderStats(data);
        } else {
          showToast(data.error || "Failed to fetch GPU statistics.", "error");
        }
      } catch (err) {
        showToast("Network error getting GPU info.", "error");
      } finally {
        this.showLoading(false);
      }
    }

    renderStats(data) {
      // 1. Render GPUs
      this.gpuListEl.innerHTML = "";
      if (!data.gpus || data.gpus.length === 0) {
        this.gpuListEl.innerHTML = `
          <div style="font-size: 11px; color: #94a3b8; text-align: center; padding: 12px;">
            No CUDA GPUs detected on server. Using CPU mode.
          </div>
        `;
      } else {
        data.gpus.forEach(gpu => {
          const pct = gpu.total_mem_mb > 0 ? ((gpu.occupied_mem_mb / gpu.total_mem_mb) * 100).toFixed(1) : 0;
          
          let modelsHtml = "";
          if (gpu.loaded_models && gpu.loaded_models.length > 0) {
            gpu.loaded_models.forEach(model => {
              modelsHtml += `
                <div class="gpu-loaded-model-item">
                  <span class="gpu-loaded-model-name">${model.name}</span>
                  <span class="gpu-loaded-model-size">~${model.size_gb} GB</span>
                </div>
              `;
            });
          } else {
            modelsHtml = `<div style="font-size: 10px; color: #64748b; font-style: italic;">No active models loaded</div>`;
          }

          const card = document.createElement("div");
          card.className = "gpu-card";
          card.innerHTML = `
            <div class="gpu-card-header">
              <span class="gpu-card-name">${gpu.name}</span>
              <span class="gpu-card-index">GPU ${gpu.index + 1}</span>
            </div>
            <div class="gpu-memory-stats">
              <span>Memory Usage (${pct}%)</span>
              <span>${gpu.occupied_mem_mb} MB / ${gpu.total_mem_mb} MB</span>
            </div>
            <div class="gpu-memory-bar-bg">
              <div class="gpu-memory-bar-fill" style="width: ${pct}%"></div>
            </div>
            <div class="gpu-loaded-models">
              ${modelsHtml}
            </div>
          `;
          this.gpuListEl.appendChild(card);
        });
      }

      // 2. Render CPU fallback details if models run on CPU
      if (data.cpu_models && data.cpu_models.length > 0) {
        const cpuCard = document.createElement("div");
        cpuCard.className = "gpu-card";
        cpuCard.style.borderLeft = "2px solid #94a3b8";
        cpuCard.innerHTML = `
          <div class="gpu-card-header">
            <span class="gpu-card-name" style="color: #94a3b8;">Host CPU</span>
            <span class="gpu-card-index" style="background: rgba(148, 163, 184, 0.1); color: #cbd5e1; border-color: rgba(148, 163, 184, 0.2)">CPU</span>
          </div>
          <div class="gpu-loaded-models">
            ${data.cpu_models.map(m => `
              <div class="gpu-loaded-model-item" style="border-left-color: #94a3b8">
                <span class="gpu-loaded-model-name">${m}</span>
                <span class="gpu-loaded-model-size">RAM Cache</span>
              </div>
            `).join("")}
          </div>
        `;
        this.gpuListEl.appendChild(cpuCard);
      }

      // 3. Render Model Controls
      this.modelListEl.innerHTML = "";
      const models = [
        { key: "sam3", label: "SAM3 Segmenter", est: "~4.5 GB" },
        { key: "resnet", label: "ResNet Crop Classifier", est: "~0.15 GB" },
        { key: "yolo", label: "YOLO Custom Classifier", est: "~0.10 GB" }
      ];

      models.forEach(m => {
        const state = data.model_states[m.key] || { status: "offline", device: null };
        const isActive = state.device !== null;
        
        let statusText = "INACTIVE";
        let statusClass = "model-status-inactive";
        if (state.status === "warming_up") {
          statusText = "WARMING";
          statusClass = "model-status-warming";
        } else if (isActive) {
          statusText = "ACTIVE";
          statusClass = "model-status-active";
        }

        // Build target device selection dropdown
        let deviceSelectOptions = "";
        deviceSelectOptions += `<option value="cpu" ${state.device === "cpu" ? "selected" : ""}>Host CPU</option>`;
        
        if (data.gpus && data.gpus.length > 0) {
          data.gpus.forEach(gpu => {
            const devVal = `cuda:${gpu.index}`;
            deviceSelectOptions += `<option value="${devVal}" ${state.device === devVal ? "selected" : ""}>GPU ${gpu.index + 1} (${gpu.name.substring(0, 10)})</option>`;
          });
        }

        const card = document.createElement("div");
        card.className = "model-control-card";
        card.innerHTML = `
          <div class="model-control-header">
            <span class="model-control-name">${m.label} <span style="font-size: 10px; color: #64748b; font-weight: normal;">(${m.est})</span></span>
            <span class="model-control-status ${statusClass}">${statusText}</span>
          </div>
          <div class="model-control-body">
            <select id="device-select-${m.key}" class="model-device-select">
              ${deviceSelectOptions}
            </select>
            <button class="model-action-btn model-action-btn--load" onclick="window.GpuManager.controlModel('${m.key}', 'load')">Load</button>
            <button class="model-action-btn model-action-btn--unload" onclick="window.GpuManager.controlModel('${m.key}', 'unload')">Unload</button>
          </div>
        `;
        this.modelListEl.appendChild(card);
      });
    }

    async controlModel(modelKey, action) {
      const selectEl = document.getElementById(`device-select-${modelKey}`);
      if (!selectEl) return;
      const targetDevice = selectEl.value;

      this.showLoading(true);
      showToast(`Triggering model ${action} for ${modelKey}...`, "info");
      
      const appEl = document.getElementById("workspace-app");
      const playlistName = appEl ? appEl.getAttribute("data-playlist") : "";
      
      const formData = new FormData();
      formData.append("model_name", modelKey);
      formData.append("action", action);
      formData.append("target_device", targetDevice);
      formData.append("playlist_name", playlistName);

      try {
        const res = await fetch("/api/gpu/control", {
          method: "POST",
          body: formData
        });
        const data = await res.json();
        
        if (data && data.success) {
          showToast(data.message || "Model control completed.", "success");
          // Refresh statistics
          setTimeout(() => this.fetchStats(), 1000);
        } else {
          showToast(data.error || "Model control failed.", "error");
        }
      } catch (err) {
        showToast("Network error executing model control.", "error");
      } finally {
        this.showLoading(false);
      }
    }
  }

  // Bind to window
  window.GpuManager = new GpuManager();
})();
