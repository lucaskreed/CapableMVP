const ROUTES = {
  marketingIndex: "/",
};

const DASHBOARD_TEXT = {
  coachSubtitle: "Manage your athletes and review their lab uploads.",
  clientSubtitle: "Track your connection and health data.",
  noClients: "No clients connected yet.",
  noCoachLinked: "No Coach Linked",
  uploadPrompt: "Click to upload (PDF/JPG)",
  uploadIntro: "Upload blood work or health stats (Max 5MB).",
  manualEntryTitle: "Manual Entry Fallback",
  uploadStart: "Uploading...",
  uploadSuccess: "Uploaded!",
  uploadReady: "Click to upload another",
  uploadFailed: "Upload failed",
  statsSaved: "Stats saved!",
  confirmDelete: "Are you sure? This will permanently remove the file from storage.",
  deleteSuccess: "Record deleted.",
  deleteFailedPrefix: "Delete failed: ",
  noRecords: "No records found.",
  recordsModalTitle: "Client Records",
  viewLabel: "View",
  deleteLabel: "Delete",
  copySuccess: "Copied!",
  linkCoachError: "Error linking coach.",
  openFileFailedPrefix: "Could not open file: ",
  unsupportedFormat: "Format not supported.",
  fileTooLarge: "File too large.",
};

const FILE_RULES = {
  allowedMimeTypes: ["image/jpeg", "image/png", "application/pdf"],
  maxFileSizeBytes: 5 * 1024 * 1024,
  signedUrlExpirySeconds: 60,
  uploadResetDelayMs: 3000,
};

function byId(id) {
  return document.getElementById(id);
}

function formatCoachCode(value) {
  return value.substring(0, 3) + "-" + value.substring(3, 6);
}

function formatDash(el) {
  let val = el.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (val.length > 3) val = val.substring(0, 3) + "-" + val.substring(3, 6);
  el.value = val;
}

async function init() {
  const {
    data: { user },
  } = await _supabase.auth.getUser();

  if (!user) {
    window.location.href = ROUTES.marketingIndex;
    return;
  }

  const { data: profile } = await _supabase.from("profiles").select("*").eq("id", user.id).single();

  byId("user-name").innerText = `${profile.first_name} ${profile.last_name}`;
  byId("user-role").innerText = profile.role;

  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";
  byId("greeting").innerText = `${greet}, ${profile.first_name}!`;

  const grid = byId("dashboard-grid");
  grid.innerHTML = "";

  if (profile.role === "coach") {
    await renderCoach(profile, grid);
  } else {
    await renderClient(profile, grid);
  }
}

async function renderCoach(profile, grid) {
  byId("view-subtitle").innerText = DASHBOARD_TEXT.coachSubtitle;
  const displayCode = formatCoachCode(profile.coach_code);

  grid.innerHTML += `
    <div class="card">
      <h3>Your Coach Code</h3>
      <h1 class="coach-code-value">${displayCode}</h1>
      <button class="copy-btn" type="button" id="copy-coach-code-btn" data-copy-code="${displayCode}">Copy code</button>
    </div>
  `;

  const { data: clients } = await _supabase
    .from("profiles")
    .select("id, first_name, last_name, email")
    .eq("invite_code", profile.coach_code);

  let listHtml = "";
  if (clients && clients.length > 0) {
    for (const client of clients) {
      const { count } = await _supabase
        .from("health_records")
        .select("*", { count: "exact", head: true })
        .eq("user_id", client.id);

      listHtml += `
        <div class="roster-item">
          <div>
            <strong>${client.first_name} ${client.last_name}</strong><br>
            <small class="roster-meta">${count || 0} Records</small>
          </div>
          <button class="copy-btn review-client-btn" type="button" data-client-id="${client.id}">Review</button>
        </div>
      `;
    }
  } else {
    listHtml = `<p>${DASHBOARD_TEXT.noClients}</p>`;
  }

  grid.innerHTML += `<div class="card"><h3>My Roster</h3>${listHtml}</div>`;
}

async function renderClient(profile, grid) {
  byId("view-subtitle").innerText = DASHBOARD_TEXT.clientSubtitle;

  grid.innerHTML += `
    <div class="card">
      <h3>Health & Lab Records</h3>
      <p class="card-intro">${DASHBOARD_TEXT.uploadIntro}</p>
      <div class="drop-zone" id="health-drop-zone" role="button" tabindex="0" aria-label="Upload health file">
        <span id="upload-status">${DASHBOARD_TEXT.uploadPrompt}</span>
        <input type="file" id="health-file" hidden accept=".jpg,.jpeg,.png,.pdf">
      </div>

      <div class="manual-entry">
        <p class="manual-entry-title">${DASHBOARD_TEXT.manualEntryTitle}</p>
        <input type="number" id="m-weight" class="manual-input" placeholder="Weight (kg)">
        <button class="btn-primary" type="button" id="save-weight-btn">Save Weight</button>
      </div>
    </div>
  `;

  const coachInfo = profile.invite_code ? `Connected to ${profile.invite_code}` : DASHBOARD_TEXT.noCoachLinked;
  grid.innerHTML += `
    <div class="card">
      <h3>Connection</h3>
      <p>${coachInfo}</p>
      ${
        !profile.invite_code
          ? '<input type="text" id="join-code" placeholder="Coach Code"><button class="btn-primary" type="button" id="join-coach-btn">Join</button>'
          : ""
      }
    </div>
  `;
}

async function handleFileUpload(input) {
  const file = input.files[0];
  if (!file) return;

  const status = byId("upload-status");
  if (!FILE_RULES.allowedMimeTypes.includes(file.type)) {
    alert(DASHBOARD_TEXT.unsupportedFormat);
    return;
  }

  if (file.size > FILE_RULES.maxFileSizeBytes) {
    alert(DASHBOARD_TEXT.fileTooLarge);
    return;
  }

  try {
    status.innerText = DASHBOARD_TEXT.uploadStart;
    const {
      data: { user },
    } = await _supabase.auth.getUser();
    const path = `${user.id}/${Date.now()}_${file.name}`;

    const { error: uploadError } = await _supabase.storage.from("health-files").upload(path, file);
    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = _supabase.storage.from("health-files").getPublicUrl(path);

    await _supabase.from("health_records").insert({
      user_id: user.id,
      file_url: publicUrl,
      data: { filename: file.name, status: "pending_review" },
    });

    status.innerText = DASHBOARD_TEXT.uploadSuccess;
    setTimeout(() => {
      status.innerText = DASHBOARD_TEXT.uploadReady;
    }, FILE_RULES.uploadResetDelayMs);
  } catch (err) {
    alert(err.message);
    status.innerText = DASHBOARD_TEXT.uploadFailed;
  }
}

async function saveManualHealth() {
  const weight = byId("m-weight")?.value;
  const {
    data: { user },
  } = await _supabase.auth.getUser();

  const { error } = await _supabase.from("health_records").insert({
    user_id: user.id,
    data: { weight, type: "manual" },
  });

  if (error) alert(error.message);
  else alert(DASHBOARD_TEXT.statsSaved);
}

async function deleteRecord(recordId, fileUrl) {
  if (!confirm(DASHBOARD_TEXT.confirmDelete)) return;

  try {
    if (fileUrl) {
      const path = fileUrl.split("/public/health-files/")[1];
      const { error: storageErr } = await _supabase.storage.from("health-files").remove([path]);
      if (storageErr) console.warn("Storage delete failed, continuing.");
    }

    const { error: dbErr } = await _supabase.from("health_records").delete().eq("id", recordId);
    if (dbErr) throw dbErr;

    alert(DASHBOARD_TEXT.deleteSuccess);
    byId("record-overlay")?.remove();
    init();
  } catch (err) {
    alert(DASHBOARD_TEXT.deleteFailedPrefix + err.message);
  }
}

async function viewHealthRecords(clientId) {
  const { data: records, error } = await _supabase
    .from("health_records")
    .select("*")
    .eq("user_id", clientId)
    .order("created_at", { ascending: false });

  if (error || !records || records.length === 0) {
    alert(DASHBOARD_TEXT.noRecords);
    return;
  }

  let html = `<div id="record-overlay" class="record-overlay">
    <div class="record-modal">
      <button class="overlay-close-btn" type="button">X</button>
      <h2 class="record-modal-title">${DASHBOARD_TEXT.recordsModalTitle}</h2>`;

  for (const rec of records) {
    const date = new Date(rec.created_at).toLocaleDateString();
    const fileName = rec.data.filename || "Manual Entry";

    html += `
      <div class="record-row">
        <div class="record-main">
          <strong class="record-name">${fileName}</strong>
          <small class="record-meta">${date} ${rec.data.weight ? "- " + rec.data.weight + "kg" : ""}</small>
        </div>
        <div class="record-actions">
          ${rec.file_url ? `<button class="copy-btn record-view-btn" type="button" data-file-url="${rec.file_url}">${DASHBOARD_TEXT.viewLabel}</button>` : ""}
          <button class="copy-btn copy-btn-danger record-delete-btn" type="button" data-record-id="${rec.id}" data-file-url="${rec.file_url || ""}">${DASHBOARD_TEXT.deleteLabel}</button>
        </div>
      </div>`;
  }

  html += "</div></div>";
  document.body.insertAdjacentHTML("beforeend", html);
}

async function openSecureFile(fullUrl) {
  try {
    const path = fullUrl.split("/health-files/")[1];
    const { data, error } = await _supabase.storage
      .from("health-files")
      .createSignedUrl(path, FILE_RULES.signedUrlExpirySeconds);
    if (error) throw error;
    window.open(data.signedUrl, "_blank");
  } catch (err) {
    alert(DASHBOARD_TEXT.openFileFailedPrefix + err.message);
  }
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text);
  alert(DASHBOARD_TEXT.copySuccess);
}

async function linkCoach() {
  const joinInput = byId("join-code");
  if (!joinInput) return;

  const input = joinInput.value.replace("-", "").toUpperCase();
  const {
    data: { user },
  } = await _supabase.auth.getUser();

  const { error } = await _supabase.from("profiles").update({ invite_code: input }).eq("id", user.id);
  if (error) alert(DASHBOARD_TEXT.linkCoachError);
  else location.reload();
}

async function signOut() {
  await _supabase.auth.signOut();
  window.location.href = ROUTES.marketingIndex;
}

function bindDashboardEvents() {
  document.addEventListener("click", (event) => {
    const signOutBtn = event.target.closest("#signout-btn");
    if (signOutBtn) {
      signOut();
      return;
    }

    const copyCoachBtn = event.target.closest("#copy-coach-code-btn");
    if (copyCoachBtn) {
      copyToClipboard(copyCoachBtn.dataset.copyCode || "");
      return;
    }

    const reviewBtn = event.target.closest(".review-client-btn");
    if (reviewBtn) {
      viewHealthRecords(reviewBtn.dataset.clientId);
      return;
    }

    const dropZone = event.target.closest("#health-drop-zone");
    if (dropZone) {
      byId("health-file")?.click();
      return;
    }

    const saveWeightBtn = event.target.closest("#save-weight-btn");
    if (saveWeightBtn) {
      saveManualHealth();
      return;
    }

    const joinCoachBtn = event.target.closest("#join-coach-btn");
    if (joinCoachBtn) {
      linkCoach();
      return;
    }

    const closeOverlayBtn = event.target.closest(".overlay-close-btn");
    if (closeOverlayBtn) {
      byId("record-overlay")?.remove();
      return;
    }

    const viewFileBtn = event.target.closest(".record-view-btn");
    if (viewFileBtn) {
      openSecureFile(viewFileBtn.dataset.fileUrl || "");
      return;
    }

    const deleteRecordBtn = event.target.closest(".record-delete-btn");
    if (deleteRecordBtn) {
      deleteRecord(deleteRecordBtn.dataset.recordId, deleteRecordBtn.dataset.fileUrl || "");
    }
  });

  document.addEventListener("input", (event) => {
    if (event.target.id === "join-code") formatDash(event.target);
  });

  document.addEventListener("change", (event) => {
    if (event.target.id === "health-file") handleFileUpload(event.target);
  });
}

bindDashboardEvents();
init();

