document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("adminStaffModal");
  if (!modal) {
    return;
  }

  const form = document.getElementById("adminStaffForm");
  const modalTitle = document.getElementById("adminStaffModalTitle");
  const nameInput = document.getElementById("adminStaffName");
  const roleInput = document.getElementById("adminStaffRole");
  const sectionInput = document.getElementById("adminStaffSection");
  const bioInput = document.getElementById("adminStaffBio");
  const imageInput = document.getElementById("adminStaffImage");
  const previewCard = document.getElementById("adminStaffPreview");
  const saveButton = form.querySelector(".admin-modal-save");

  const maxImageSize = 50 * 1024 * 1024;
  const allowedTypes = ["image/png", "image/jpeg"];

  let activeId = null;
  let activeImageUrl = "";
  let previewObjectUrl = "";

  const requestJson = async (url, options) => {
    const response = await fetch(url, options);
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || "Request failed.");
    }
    return response.json().catch(() => ({}));
  };

  const validateImageFile = (file) => {
    if (!file) {
      return true;
    }
    if (!allowedTypes.includes(file.type)) {
      alert("Only PNG or JPG images are allowed.");
      return false;
    }
    if (file.size > maxImageSize) {
      alert("Image is too large. Max size is 50 MB.");
      return false;
    }
    return true;
  };

  const closeModal = () => {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    activeId = null;
    activeImageUrl = "";
    if (previewObjectUrl) {
      URL.revokeObjectURL(previewObjectUrl);
      previewObjectUrl = "";
    }
    if (previewCard) {
      previewCard.innerHTML = "";
    }
    saveButton.disabled = false;
  };

  const buildPreview = () => {
    if (!previewCard) {
      return;
    }

    const name = nameInput.value.trim() || "New member";
    const role = roleInput.value.trim() || "Role";
    const bio = bioInput.value.trim() || "";
    let imageUrl = activeImageUrl || "/icons/placeholder.png";

    const file = imageInput.files[0];
    if (file && validateImageFile(file)) {
      if (previewObjectUrl) {
        URL.revokeObjectURL(previewObjectUrl);
      }
      previewObjectUrl = URL.createObjectURL(file);
      imageUrl = previewObjectUrl;
    }

    previewCard.innerHTML = `
      <div class="team-member">
        <div class="member-image">
          <img src="${imageUrl}" alt="${name}" />
        </div>
        <div class="member-info">
          <h3>${name}</h3>
          <p class="member-role">${role}</p>
          <p class="member-bio">${bio}</p>
        </div>
      </div>
    `;
  };

  const openModal = (card, sectionOverride) => {
    if (card) {
      activeId = Number(card.dataset.id || 0) || null;
      nameInput.value = card.dataset.name || "";
      roleInput.value = card.dataset.role || "";
      bioInput.value = card.dataset.bio || "";
      sectionInput.value = card.dataset.section || "Advisors";
      activeImageUrl = card.dataset.imageUrl || "";
      modalTitle.textContent = "Edit staff member";
    } else {
      activeId = null;
      nameInput.value = "";
      roleInput.value = "";
      bioInput.value = "";
      sectionInput.value = sectionOverride || "Advisors";
      activeImageUrl = "";
      modalTitle.textContent = "Add staff member";
    }

    imageInput.value = "";
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    buildPreview();
  };

  document.querySelectorAll('.admin-add-button[data-add-section]').forEach((button) => {
    button.addEventListener("click", () => {
      openModal(null, button.dataset.addSection || "Advisors");
    });
  });

  document.addEventListener("click", (event) => {
    const deleteButton = event.target.closest(".admin-delete-button");
    if (deleteButton) {
      const card = deleteButton.closest(".team-member");
      if (!card) {
        return;
      }
      const id = Number(card.dataset.id || 0);
      if (!id) {
        return;
      }
      if (!window.confirm("Delete this staff member?")) {
        return;
      }
      requestJson(`/api/staff/${id}`, { method: "DELETE" })
        .then(() => window.location.reload())
        .catch((error) => alert(error.message));
      return;
    }

    const editButton = event.target.closest(".admin-edit-button");
    if (editButton) {
      const card = editButton.closest(".team-member");
      if (card) {
        openModal(card);
      }
    }
  });

  modal.querySelectorAll("[data-admin-close]").forEach((button) => {
    button.addEventListener("click", closeModal);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal.classList.contains("is-open")) {
      closeModal();
    }
  });

  form.addEventListener("input", () => buildPreview());

  imageInput.addEventListener("change", () => {
    const file = imageInput.files[0];
    if (!validateImageFile(file)) {
      imageInput.value = "";
      return;
    }
    buildPreview();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (saveButton.disabled) {
      return;
    }
    saveButton.disabled = true;

    const name = nameInput.value.trim();
    const role = roleInput.value.trim();
    const bio = bioInput.value.trim();
    const section = sectionInput.value.trim();

    if (!name || !role || !bio || !section) {
      alert("Please fill out all fields.");
      saveButton.disabled = false;
      return;
    }

    const file = imageInput.files[0];
    if (file) {
      if (!validateImageFile(file)) {
        saveButton.disabled = false;
        return;
      }
      try {
        const formData = new FormData();
        formData.append("image", file);
        const payload = await requestJson("/admin/upload", {
          method: "POST",
          body: formData
        });
        activeImageUrl = payload.url || activeImageUrl;
      } catch (error) {
        alert(error.message);
        saveButton.disabled = false;
        return;
      }
    }

    const payload = {
      name,
      role,
      bio,
      section,
      imageUrl: activeImageUrl || "/icons/placeholder.png"
    };

    try {
      if (activeId) {
        await requestJson(`/api/staff/${activeId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } else {
        await requestJson("/api/staff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }

      window.location.reload();
    } catch (error) {
      alert(error.message);
      saveButton.disabled = false;
    }
  });
});
