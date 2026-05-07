document.addEventListener("DOMContentLoaded", () => {
  const editModal = document.getElementById("adminEditModal");

  if (!editModal) {
    return;
  }

  const editForm = document.getElementById("adminEditForm");
  const modalTitle = document.getElementById("adminModalTitle");

  const newsSection = editModal.querySelector(
    '[data-admin-section="news"]'
  );

  const eventSection = editModal.querySelector(
    '[data-admin-section="event"]'
  );

  const newsImageFileInput =
    document.getElementById("adminNewsImageFile");

  const newsDateInput =
    document.getElementById("adminNewsDate");

  const newsTitleInput =
    document.getElementById("adminNewsTitle");

  const newsInfoInput =
    document.getElementById("adminNewsInfo");

  const eventTitleInput =
    document.getElementById("adminEventTitle");

  const eventStartDateInput =
    document.getElementById("adminEventStartDate");

  const eventEndDateInput =
    document.getElementById("adminEventEndDate");

  const eventLocationInput =
    document.getElementById("adminEventLocation");

  const eventInfoInput =
    document.getElementById("adminEventInfo");

  const previewCard =
    document.getElementById("adminPreviewCard");

  const saveButton =
    editForm.querySelector(".admin-modal-save");

  const maxImageSize = 50 * 1024 * 1024;
<<<<<<< HEAD

  const allowedTypes = [
    "image/png",
    "image/jpeg"
  ];

  const isAdmin =
    document.body?.dataset?.isAdmin === "true";
=======
  const allowedTypes = ["image/png", "image/jpeg"];
>>>>>>> parent of 4d5fa78 (ok)

  let activeCard = null;
  let activeImageUrl = "";
  let previewObjectUrl = "";

  const socket = io({
    transports: ["websocket", "polling"]
  });

  socket.on("connect", () => {
    console.log("Socket connected:", socket.id);
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected");
  });

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

  const formatDisplayDate = (value) => {
    if (!value) {
      return "";
    }

    const parsed = new Date(`${value}T00:00:00`);

    if (Number.isNaN(parsed.getTime())) {
      return "";
    }

    return parsed.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

<<<<<<< HEAD
  const buildAdminActions = (type) => {
    if (!isAdmin) {
      return null;
    }

    const actions = document.createElement("div");
    actions.className = "news-admin-actions";

    const deleteButton = document.createElement("button");

    deleteButton.className =
      "admin-icon-button admin-delete-button";

    deleteButton.type = "button";

    deleteButton.title =
      type === "news"
        ? "Delete news"
        : "Delete event";

    deleteButton.setAttribute(
      "aria-label",
      deleteButton.title
    );

    deleteButton.innerHTML =
      '<img src="/icons/trash.svg" alt="" aria-hidden="true" />';

    const editButton = document.createElement("button");

    editButton.className =
      "admin-icon-button admin-edit-button";

    editButton.type = "button";

    editButton.title =
      type === "news"
        ? "Edit news"
        : "Edit event";

    editButton.setAttribute(
      "aria-label",
      editButton.title
    );

    editButton.innerHTML =
      '<img src="/icons/pen.svg" alt="" aria-hidden="true" />';

    actions.appendChild(deleteButton);
    actions.appendChild(editButton);

    return actions;
  };

  const buildNewsCard = (item) => {
    const article = document.createElement("article");

    article.className = item.isFeatured
      ? "news-article featured"
      : "news-article";

    article.dataset.itemType = "news";
    article.dataset.id = item.id;
    article.dataset.newsDate = item.date;
    article.dataset.category =
      item.category || "Announcements";

    const adminActions =
      buildAdminActions("news");

    if (adminActions) {
      article.appendChild(adminActions);
    }

    const imageWrap =
      document.createElement("div");

    imageWrap.className = item.isFeatured
      ? "article-image featured-image"
      : "article-image";

    const img = document.createElement("img");

    img.src =
      item.imageUrl ||
      "/icons/placeholder.png";

    img.alt = "News item";

    imageWrap.appendChild(img);

    const content =
      document.createElement("div");

    content.className =
      "article-content";

    const meta =
      document.createElement("div");

    meta.className = "article-meta";

    const date =
      document.createElement("span");

    date.className =
      "article-date news-date";

    date.textContent =
      formatDisplayDate(item.date);

    const category =
      document.createElement("span");

    category.className =
      "article-category";

    category.textContent =
      item.category || "Announcements";

    meta.appendChild(date);
    meta.appendChild(category);

    const title =
      document.createElement("h3");

    title.textContent =
      item.title || "";

    const info =
      document.createElement("p");

    info.className = "news-info";

    info.textContent =
      item.info || "";

    const link =
      document.createElement("a");

    link.className = "read-more";
    link.href = "#";

    link.textContent =
      "Read More →";

    content.appendChild(meta);
    content.appendChild(title);
    content.appendChild(info);
    content.appendChild(link);

    article.appendChild(imageWrap);
    article.appendChild(content);

    return article;
  };

  const buildEventCard = (item) => {
    const card =
      document.createElement("div");

    card.className = "event-card";

    card.dataset.itemType = "event";
    card.dataset.id = item.id;
    card.dataset.startDate =
      item.startDate || "";

    card.dataset.endDate =
      item.endDate || "";

    card.dataset.duration =
      item.duration || "";

    const adminActions =
      buildAdminActions("event");

    if (adminActions) {
      card.appendChild(adminActions);
    }

    const dateBlock =
      document.createElement("div");

    dateBlock.className = "event-date";

    const startDate =
      new Date(`${item.startDate}T00:00:00`);

    const month =
      startDate.toLocaleString("en-US", {
        month: "short"
      });

    const day =
      startDate.getDate();

    dateBlock.innerHTML = `
      <div class="event-month">${month}</div>
      <div class="event-day">${day}</div>
    `;

    const content =
      document.createElement("div");

    content.className =
      "event-content";

    content.innerHTML = `
      <h3>${item.title || ""}</h3>
      <p class="event-location event-location-text">
        ${item.location ? `📍 ${item.location}` : ""}
      </p>
      <p class="event-info">
        ${item.info || ""}
      </p>
      <a href="#" class="event-link">
        Learn More →
      </a>
    `;

    card.appendChild(dateBlock);
    card.appendChild(content);

    return card;
  };

  const animateCard = (card, type) => {
    if (!card) {
      return;
    }

    const className =
      type === "enter"
        ? "live-enter"
        : "live-update";

    card.classList.add(className);

    window.setTimeout(() => {
      card.classList.remove(className);
    }, 600);
  };

  const requestJson = async (
    url,
    options
  ) => {
    const response =
      await fetch(url, options);

=======
  const getIsoDate = (date) => {
    if (!date || Number.isNaN(date.getTime())) {
      return "";
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const parseNewsDateValue = (text) => {
    if (!text) {
      return "";
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      return text;
    }
    const parsed = new Date(text);
    return getIsoDate(parsed);
  };

  const parseEventDatesFromCard = (card) => {
    const startValue = card.dataset.startDate || "";
    const endValue = card.dataset.endDate || "";
    if (startValue) {
      return {
        start: new Date(startValue),
        end: endValue ? new Date(endValue) : null
      };
    }
    const monthText = card.querySelector(".event-month")?.textContent.trim() || "";
    const year = new Date().getFullYear();
    const dayText = card.querySelector(".event-day")?.textContent.trim() || "";
    const rangeText = card.querySelector(".date-display")?.textContent.trim() || "";

    if (dayText) {
      const start = new Date(`${monthText} ${dayText}, ${year}`);
      return { start, end: null };
    }

    if (rangeText.includes("-")) {
      const parts = rangeText.split("-").map((part) => part.trim());
      const startDay = parts[0];
      const endPart = parts[1] || "";
      const endPieces = endPart.split(" ").filter(Boolean);
      const endMonth = endPieces.length > 1 ? endPieces[0] : monthText;
      const endDay = endPieces.length > 1 ? endPieces[1] : endPieces[0];
      const start = new Date(`${monthText} ${startDay}, ${year}`);
      const end = new Date(`${endMonth} ${endDay}, ${year}`);
      return { start, end };
    }

    return { start: null, end: null };
  };

  const requestJson = async (url, options) => {
    const response = await fetch(url, options);
>>>>>>> parent of 4d5fa78 (ok)
    if (!response.ok) {
      const payload =
        await response
          .json()
          .catch(() => ({}));

      throw new Error(
        payload.error ||
        "Request failed."
      );
    }

    return response
      .json()
      .catch(() => ({}));
  };

  const closeModal = () => {
    editModal.classList.remove("is-open");

    editModal.setAttribute(
      "aria-hidden",
      "true"
    );

    activeCard = null;
    activeImageUrl = "";

    if (previewObjectUrl) {
      URL.revokeObjectURL(
        previewObjectUrl
      );

      previewObjectUrl = "";
    }

    if (previewCard) {
      previewCard.innerHTML = "";
    }
  };

  const openModal = (card) => {
    activeCard = card;

    const type =
      card.dataset.itemType;

    newsSection.classList.remove(
      "is-active"
    );

    eventSection.classList.remove(
      "is-active"
    );

    if (type === "news") {
      modalTitle.textContent =
        "Edit news";

      newsSection.classList.add(
        "is-active"
      );

      activeImageUrl =
        card.querySelector("img")
          ?.src || "";

      newsTitleInput.value =
        card.querySelector("h3")
          ?.textContent || "";

      newsInfoInput.value =
        card.querySelector(
          ".news-info"
        )?.textContent || "";

      newsDateInput.value =
        card.dataset.newsDate || "";
    } else {
      modalTitle.textContent =
        "Edit event";

      eventSection.classList.add(
        "is-active"
      );

      eventTitleInput.value =
        card.querySelector("h3")
          ?.textContent || "";

      eventInfoInput.value =
        card.querySelector(
          ".event-info"
        )?.textContent || "";

      eventLocationInput.value =
        card.querySelector(
          ".event-location-text"
        )
          ?.textContent
          .replace(/^📍\s*/, "") || "";

      eventStartDateInput.value =
        card.dataset.startDate || "";

      eventEndDateInput.value =
        card.dataset.endDate || "";
    }

    editModal.classList.add(
      "is-open"
    );

    editModal.setAttribute(
      "aria-hidden",
      "false"
    );
  };

  document.addEventListener(
    "click",
    async (event) => {
      const deleteButton =
        event.target.closest(
          ".admin-delete-button"
        );

      if (deleteButton) {
        const card =
          deleteButton.closest(
            "[data-item-type]"
          );

        if (!card) {
          return;
        }

        const id = Number(
          card.dataset.id
        );

        const endpoint =
          card.dataset.itemType ===
          "news"
            ? "news"
            : "events";

        try {
          await requestJson(
            `/api/${endpoint}/${id}`,
            {
              method: "DELETE"
            }
          );
        } catch (error) {
          alert(error.message);
        }

        return;
      }

      const editButton =
        event.target.closest(
          ".admin-edit-button"
        );

      if (editButton) {
        const card =
          editButton.closest(
            "[data-item-type]"
          );

        if (card) {
          openModal(card);
        }
      }
    }
  );

  editModal
    .querySelectorAll(
      "[data-admin-close]"
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        closeModal
      );
    });

  document.addEventListener(
    "keydown",
    (event) => {
      if (
        event.key === "Escape" &&
        editModal.classList.contains(
          "is-open"
        )
      ) {
        closeModal();
      }
    }
  );

  editForm.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      if (!activeCard) {
        return;
      }

      saveButton.disabled = true;

      try {
        if (
          activeCard.dataset.itemType ===
          "news"
        ) {
          const isNew =
            activeCard.dataset.isNew ===
            "true";

          const file =
            newsImageFileInput.files[0];

          if (file) {
            if (
              !validateImageFile(file)
            ) {
              return;
            }

            const formData =
              new FormData();

            formData.append(
              "image",
              file
            );

            const uploadResult =
              await requestJson(
                "/admin/upload",
                {
                  method: "POST",
                  body: formData
                }
              );

            activeImageUrl =
              uploadResult.url || "";
          }

          const payload = {
            title:
              newsTitleInput.value.trim(),

            info:
              newsInfoInput.value.trim(),

            date:
              newsDateInput.value.trim(),

            imageUrl:
              activeImageUrl,

            category:
              activeCard.dataset
                .category ||
              "Announcements"
          };

          if (isNew) {
            await requestJson(
              "/api/news",
              {
                method: "POST",

                headers: {
                  "Content-Type":
                    "application/json"
                },

                body: JSON.stringify(
                  payload
                )
              }
            );
          } else {
            const id = Number(
              activeCard.dataset.id
            );

            await requestJson(
              `/api/news/${id}`,
              {
                method: "PUT",

                headers: {
                  "Content-Type":
                    "application/json"
                },

                body: JSON.stringify(
                  payload
                )
              }
            );
          }
        } else {
          const isNew =
            activeCard.dataset.isNew ===
            "true";

          const payload = {
            title:
              eventTitleInput.value.trim(),

            info:
              eventInfoInput.value.trim(),

            location:
              eventLocationInput.value.trim(),

            startDate:
              eventStartDateInput.value.trim(),

            endDate:
              eventEndDateInput.value.trim(),

            duration:
              activeCard.dataset
                .duration || ""
          };

          if (isNew) {
            await requestJson(
              "/api/events",
              {
                method: "POST",

                headers: {
                  "Content-Type":
                    "application/json"
                },

                body: JSON.stringify(
                  payload
                )
              }
            );
          } else {
            const id = Number(
              activeCard.dataset.id
            );

            await requestJson(
              `/api/events/${id}`,
              {
                method: "PUT",

                headers: {
                  "Content-Type":
                    "application/json"
                },

                body: JSON.stringify(
                  payload
                )
              }
            );
          }
        }

        closeModal();
      } catch (error) {
        alert(error.message);
      } finally {
        saveButton.disabled = false;
      }
    }
  );

<<<<<<< HEAD
  socket.on(
    "news:updated",
    (payload) => {
      if (
        !payload ||
        !payload.action
      ) {
        return;
      }

      const container =
        document.querySelector(
          ".news-grid"
        );

      if (!container) {
        return;
      }

      if (
        payload.action === "delete"
      ) {
        const existing =
          container.querySelector(
            `[data-item-type="news"][data-id="${payload.id}"]`
          );

        if (existing) {
          existing.remove();
        }

        return;
      }

      if (
        payload.action ===
          "upsert" &&
        payload.item
      ) {
        const existing =
          container.querySelector(
            `[data-item-type="news"][data-id="${payload.item.id}"]`
          );

        const card =
          buildNewsCard(
            payload.item
          );

        if (existing) {
          existing.replaceWith(
            card
          );

          animateCard(
            card,
            "update"
          );
        } else {
          container.prepend(card);

          animateCard(
            card,
            "enter"
          );
        }
      }
    }
  );

  socket.on(
    "events:updated",
    (payload) => {
      if (
        !payload ||
        !payload.action
      ) {
        return;
      }

      const container =
        document.querySelector(
          ".events-grid"
        );

      if (!container) {
        return;
      }

      if (
        payload.action === "delete"
      ) {
        const existing =
          container.querySelector(
            `[data-item-type="event"][data-id="${payload.id}"]`
          );

        if (existing) {
          existing.remove();
        }

        return;
      }

      if (
        payload.action ===
          "upsert" &&
        payload.item
      ) {
        const existing =
          container.querySelector(
            `[data-item-type="event"][data-id="${payload.item.id}"]`
          );

        const card =
          buildEventCard(
            payload.item
          );

        if (existing) {
          existing.replaceWith(
            card
          );

          animateCard(
            card,
            "update"
          );
        } else {
          container.prepend(card);

          animateCard(
            card,
            "enter"
          );
        }
      }
    }
  );
});
=======
    closeModal();
  });

  sortNewsByDate();
  sortEventsByDate();
});
>>>>>>> parent of 4d5fa78 (ok)
