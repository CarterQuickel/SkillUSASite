document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("adminAlbumModal");
  if (!modal) {
    return;
  }

  const form = document.getElementById("adminAlbumForm");
  const modalTitle = document.getElementById("adminAlbumModalTitle");
  const titleInput = document.getElementById("adminAlbumTitle");
  const folderInput = document.getElementById("adminAlbumFolder");
  const descriptionInput = document.getElementById("adminAlbumDescription");
  const imagesInput = document.getElementById("adminAlbumImages");
  const imagesList = document.getElementById("adminAlbumImagesList");
  const saveButton = form.querySelector(".admin-modal-save");
  const addButton = document.querySelector('.admin-add-button[data-add-type="album"]');
  const grid = document.getElementById("albums-grid");

  let activeAlbumId = null;
  let activeFolder = "";
  let isNewAlbum = false;

  const requestJson = async (url, options) => {
    const response = await fetch(url, options);
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || "Request failed.");
    }
    return response.json().catch(() => ({}));
  };

  const closeModal = () => {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    saveButton.disabled = false;
  };

  const renderImages = (urls) => {
    if (!imagesList) {
      return;
    }
    imagesList.innerHTML = "";
    if (!urls || urls.length === 0) {
      const empty = document.createElement("p");
      empty.textContent = "No images yet.";
      imagesList.appendChild(empty);
      return;
    }

    urls.forEach((url) => {
      const filename = url.split("/").pop() || "";
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.filename = filename;
      button.innerHTML = `
        <img src="${url}" alt="Album image" />
        <span class="remove-chip">Remove</span>
      `;
      imagesList.appendChild(button);
    });
  };

  const loadImages = async (folder) => {
    if (!folder) {
      renderImages([]);
      return;
    }
    try {
      const response = await fetch(`/api/images?folder=albums/${folder}`);
      const urls = await response.json();
      renderImages(urls);
    } catch (error) {
      renderImages([]);
    }
  };

  const openModal = (albumShell) => {
    if (albumShell) {
      isNewAlbum = false;
      activeAlbumId = Number(albumShell.dataset.albumId || 0) || null;
      activeFolder = albumShell.dataset.folder || "";
      titleInput.value = albumShell.dataset.title || "";
      descriptionInput.value = albumShell.dataset.description || "";
      folderInput.value = activeFolder;
      folderInput.readOnly = true;
      modalTitle.textContent = "Edit album";
      loadImages(activeFolder);
    } else {
      isNewAlbum = true;
      activeAlbumId = null;
      activeFolder = "";
      titleInput.value = "";
      descriptionInput.value = "";
      folderInput.value = "";
      folderInput.readOnly = false;
      modalTitle.textContent = "Add album";
      renderImages([]);
    }

    imagesInput.value = "";
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
  };

  if (addButton) {
    addButton.addEventListener("click", () => openModal(null));
  }

  if (grid) {
    grid.addEventListener("click", (event) => {
      const deleteButton = event.target.closest(".admin-delete-button");
      if (deleteButton) {
        event.preventDefault();
        event.stopPropagation();
        const shell = deleteButton.closest(".album-shell");
        if (!shell) {
          return;
        }
        const id = Number(shell.dataset.albumId || 0);
        if (!id) {
          return;
        }
        if (!window.confirm("Delete this album and all of its images?")) {
          return;
        }
        requestJson(`/api/albums/${id}`, { method: "DELETE" })
          .then(() => window.location.reload())
          .catch((error) => alert(error.message));
        return;
      }

      const editButton = event.target.closest(".admin-edit-button");
      if (editButton) {
        event.preventDefault();
        event.stopPropagation();
        const shell = editButton.closest(".album-shell");
        if (shell) {
          openModal(shell);
        }
      }
    });
  }

  if (imagesList) {
    imagesList.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-filename]");
      if (!button || !activeAlbumId) {
        return;
      }
      const filename = button.dataset.filename || "";
      if (!filename) {
        return;
      }
      requestJson(`/api/albums/${activeAlbumId}/images`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename })
      })
        .then(() => loadImages(activeFolder))
        .catch((error) => alert(error.message));
    });
  }

  modal.querySelectorAll("[data-admin-close]").forEach((button) => {
    button.addEventListener("click", closeModal);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal.classList.contains("is-open")) {
      closeModal();
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (saveButton.disabled) {
      return;
    }
    saveButton.disabled = true;

    const title = titleInput.value.trim();
    const description = descriptionInput.value.trim();
    const folder = folderInput.value.trim();

    if (!title || !description) {
      alert("Please enter a title and description.");
      saveButton.disabled = false;
      return;
    }

    if (isNewAlbum && !folder) {
      alert("Please enter a folder name.");
      saveButton.disabled = false;
      return;
    }

    try {
      if (isNewAlbum) {
        const result = await requestJson("/api/albums", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, description, folder })
        });
        activeAlbumId = result.id;
        activeFolder = folder;
      } else if (activeAlbumId) {
        await requestJson(`/api/albums/${activeAlbumId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, description })
        });
      }

      if (imagesInput.files && imagesInput.files.length > 0 && activeAlbumId) {
        const formData = new FormData();
        Array.from(imagesInput.files).forEach((file) => {
          formData.append("images", file);
        });
        await fetch(`/api/albums/${activeAlbumId}/images`, {
          method: "POST",
          body: formData
        });
      }

      window.location.reload();
    } catch (error) {
      alert(error.message);
      saveButton.disabled = false;
    }
  });
});
