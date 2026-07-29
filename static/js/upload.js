// Upload dropzone and target synchronization module

export function initUploadModule() {
  const fileInput = document.getElementById("file-input");
  const chooseBtn = document.getElementById("choose-files-btn");
  const dropzone = document.querySelector(".upload-card__dropzone");
  const uploadTargets = document.getElementById("upload-targets");
  const targetsInput = document.getElementById("targets");

  if (chooseBtn && fileInput) {
    chooseBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      fileInput.click();
    });
  }

  if (dropzone && fileInput) {
    dropzone.addEventListener("click", (e) => {
      if (e.target.closest("button")) return;
      fileInput.click();
    });

    ["dragenter", "dragover"].forEach((evt) => {
      dropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        dropzone.classList.add("drag-over");
      });
    });

    ["dragleave", "drop"].forEach((evt) => {
      dropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        dropzone.classList.remove("drag-over");
      });
    });

    dropzone.addEventListener("drop", (e) => {
      const files = e.dataTransfer?.files;
      if (files?.length) {
        fileInput.files = files;
        syncTargetsAndSubmit();
      }
    });

    fileInput.addEventListener("change", () => {
      if (fileInput.files?.length) {
        syncTargetsAndSubmit();
      }
    });
  }

  function syncTargetsAndSubmit() {
    if (uploadTargets && targetsInput) {
      uploadTargets.value = targetsInput.value;
    }
    const form = document.getElementById("upload-form");
    if (form) {
      htmx.trigger(form, "submit");
    }
  }
}
