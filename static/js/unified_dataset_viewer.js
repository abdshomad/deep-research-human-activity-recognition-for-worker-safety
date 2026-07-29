(function() {
  let allCrops = [];
  let selectedPaths = new Set();
  let activeTab = 'all';
  let currentPage = 1;
  let totalPages = 1;
  let limit = 40;
  let categories = ['all'];

  function open() {
    const modal = document.getElementById('modal-dataset-viewer');
    if (!modal) return;

    modal.classList.remove('hidden');
    selectedPaths.clear();
    updateDeleteButtonState();
    currentPage = 1;
    activeTab = 'all';
    loadCrops();
  }

  function close() {
    const modal = document.getElementById('modal-dataset-viewer');
    if (modal) modal.classList.add('hidden');
  }

  function loadCrops() {
    const grid = document.getElementById('dataset-viewer-grid');
    grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 40px; color:#94a3b8;">⏳ Loading crop images...</div>';

    const url = `/api/classifier/dataset/crops?playlist_name=${encodeURIComponent(window.PLAYLIST_NAME)}&category=${encodeURIComponent(activeTab)}&page=${currentPage}&limit=${limit}`;
    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          allCrops = data.crops || [];
          totalPages = data.total_pages || 1;
          currentPage = data.current_page || 1;
          categories = data.categories || ['all'];
          
          renderTabs();
          renderGrid();
          updatePaginationControls(data.total_count || 0);
        } else {
          grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 40px; color:#f87171;">❌ Failed to load crops: ${data.error || 'unknown error'}</div>`;
        }
      })
      .catch(err => {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 40px; color:#f87171;">❌ Connection error: ${err.message}</div>`;
      });
  }

  function renderTabs() {
    const container = document.getElementById('dataset-viewer-tabs');
    if (!container) return;

    container.innerHTML = categories.map(label => {
      const displayLabel = label.toUpperCase();
      const isActive = activeTab === label;
      return `<button class="dataset-tab ${isActive ? 'active' : ''}" onclick="window.DatasetViewer.switchTab('${label}')">${displayLabel}</button>`;
    }).join('');
  }

  function switchTab(label) {
    activeTab = label;
    currentPage = 1;
    loadCrops();
  }

  function renderGrid() {
    const grid = document.getElementById('dataset-viewer-grid');
    const emptyEl = document.getElementById('dataset-viewer-empty');
    if (!grid) return;

    grid.innerHTML = '';

    if (allCrops.length === 0) {
      emptyEl.classList.remove('hidden');
      return;
    }

    emptyEl.classList.add('hidden');

    allCrops.forEach(crop => {
      const isSelected = selectedPaths.has(crop.relative_path);
      const card = document.createElement('div');
      card.className = `crop-card ${isSelected ? 'selected' : ''}`;
      card.onclick = () => toggleSelect(crop.relative_path, card);

      card.innerHTML = `
        <div class="crop-card-img-wrapper">
          <img src="${crop.url}" class="crop-card-img" alt="${crop.filename}" loading="lazy" />
          <div class="crop-card-checkbox"></div>
        </div>
        <div class="crop-card-meta" title="${crop.filename}">${crop.filename}</div>
      `;

      grid.appendChild(card);
    });
  }

  function updatePaginationControls(totalCount) {
    const prevBtn = document.getElementById('btn-dataset-prev');
    const nextBtn = document.getElementById('btn-dataset-next');
    const infoSpan = document.getElementById('dataset-page-info');
    
    if (prevBtn) prevBtn.disabled = (currentPage <= 1);
    if (nextBtn) nextBtn.disabled = (currentPage >= totalPages);
    if (infoSpan) {
      infoSpan.textContent = `Page ${currentPage} of ${totalPages} (${totalCount} total crops)`;
    }
  }

  function prevPage() {
    if (currentPage > 1) {
      currentPage--;
      loadCrops();
    }
  }

  function nextPage() {
    if (currentPage < totalPages) {
      currentPage++;
      loadCrops();
    }
  }

  function toggleSelect(relativePath, cardEl) {
    if (selectedPaths.has(relativePath)) {
      selectedPaths.delete(relativePath);
      cardEl.classList.remove('selected');
    } else {
      selectedPaths.add(relativePath);
      cardEl.classList.add('selected');
    }
    updateDeleteButtonState();
  }

  function updateDeleteButtonState() {
    const btn = document.getElementById('btn-dataset-delete-selected');
    const badge = document.getElementById('dataset-selected-count');
    if (!btn || !badge) return;

    const count = selectedPaths.size;
    badge.textContent = count;
    if (count > 0) {
      btn.style.display = 'block';
    } else {
      btn.style.display = 'none';
    }
  }

  function deleteSelected() {
    const count = selectedPaths.size;
    if (count === 0) return;

    if (!confirm(`Are you sure you want to delete the ${count} selected crop sample(s)? This action cannot be undone.`)) {
      return;
    }

    if (window.ViewerUI && window.ViewerUI.showToast) {
      window.ViewerUI.showToast(`🗑 Deleting ${count} crop sample(s)...`, 'info');
    }

    const formData = new FormData();
    formData.append('playlist_name', window.PLAYLIST_NAME);
    formData.append('paths_json', JSON.stringify(Array.from(selectedPaths)));

    fetch('/api/classifier/dataset/delete-crops', {
      method: 'POST',
      body: formData
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          if (window.ViewerUI && window.ViewerUI.showToast) {
            window.ViewerUI.showToast(`🟢 Successfully deleted ${data.deleted_count} crop sample(s).`, 'success');
          }
          selectedPaths.clear();
          updateDeleteButtonState();
          loadCrops();
        } else {
          if (window.ViewerUI && window.ViewerUI.showToast) {
            window.ViewerUI.showToast(`🔴 Failed to delete crops: ${data.error || 'unknown error'}`, 'error');
          }
        }
      })
      .catch(err => {
        if (window.ViewerUI && window.ViewerUI.showToast) {
          window.ViewerUI.showToast(`🔴 Connection error: ${err.message}`, 'error');
        }
      });
  }

  function trainDataset() {
    if (!confirm('Start training YOLO classifier on the current crops dataset? This runs asynchronously.')) {
      return;
    }

    if (window.ViewerUI && window.ViewerUI.showToast) {
      window.ViewerUI.showToast('⚡ Initiating YOLO Classifier training...', 'info');
    }

    const formData = new FormData();
    formData.append('playlist_name', window.PLAYLIST_NAME);

    fetch('/api/classifier/train-async', {
      method: 'POST',
      body: formData
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          close();
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

  window.DatasetViewer = {
    open,
    close,
    switchTab,
    deleteSelected,
    trainDataset,
    prevPage,
    nextPage
  };

  document.addEventListener('DOMContentLoaded', () => {
    if (window.IS_DATASET_ALBUM_PAGE) {
      selectedPaths.clear();
      updateDeleteButtonState();
      currentPage = 1;
      activeTab = 'all';
      loadCrops();
    }
  });
})();
