// Main Frontend Script Entry Point

import { initUploadModule } from "./upload.js";
import { initPlayerModule } from "./player.js";
import { initGalleryModule } from "./gallery.js";

document.addEventListener("DOMContentLoaded", () => {
  initUploadModule();
  initPlayerModule();
  initGalleryModule();
});
