/*
  Auth script shared by:
  - /login/
  - /signup/
  - /forgot-password/
  - /update-password/

  Pages opt into behavior using: <body data-auth-page="...">
*/

const ROUTES = {
  dashboardRelative: "/dashboard/",
  updatePasswordPage: "/update-password/",
  loginPage: "/login/",
  signupPage: "/signup/",
  forgotPasswordPage: "/forgot-password/",
};

const ORIGIN_ROUTES = {
  dashboardAbsolute: "/dashboard/",
  signupFlowAbsolute: "/signup/?flow=signup",
  updatePasswordAbsolute: "/update-password/",
};

const SIGNUP_STORAGE_KEYS = {
  firstName: "temp_fname",
  lastName: "temp_lname",
  role: "temp_role",
};

const AUTH_PAGE = {
  login: "login",
  signup: "signup",
  forgot: "forgot",
  update: "update",
};

const USER_ROLE = {
  client: "client",
  coach: "coach",
};

const BUTTON_LABELS = {
  signIn: "Sign In",
  authenticating: "Authenticating...",
  sendReset: "Send Reset Link",
  sending: "Sending...",
  checkEmail: "Check Email",
  updatePassword: "Update Password",
  updating: "Updating...",
  continue: "Continue",
  checking: "Checking...",
  creatingAccount: "Creating Account...",
  completeSetup: "Complete Setup",
};

const AUTH_TEXT = {
  fillAllFields: "Please fill in all fields.",
  invalidCredentials: "Invalid login credentials",
  genericSignInError: "Unable to sign in.",
  signupSuccess: "Account created! Please check your email to verify.",
  resetEmailRequired: "Please enter your email.",
  resetEmailSent: "Check your email! Link sent.",
  passwordMinLength: "Password must be at least 8 characters.",
  passwordMismatch: "Passwords do not match.",
  passwordUpdated: "Password updated! You can now log in with your email and password.",
  inviteCodeNotFound: "This code doesn't exist. Check with your coach.",
  rateLimitKeyword: "rate limit",
};

/* ---------- Shared Helpers ---------- */
function byId(id) {
  return document.getElementById(id);
}

function showMessage(element, message, type) {
  if (!element) return;
  element.style.display = "block";
  element.style.color = type === "success" ? "var(--success)" : "var(--error)";
  element.innerHTML = message;
}

function hideMessage(element) {
  if (!element) return;
  element.style.display = "none";
  element.style.color = "var(--error)";
}

function setButtonState(button, label, disabled) {
  if (!button) return;
  button.innerText = label;
  button.disabled = disabled;
}

function formatInviteCode(value) {
  let cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (cleaned.length > 3) cleaned = cleaned.substring(0, 3) + "-" + cleaned.substring(3, 6);
  return cleaned;
}

function getAgeFromDate(dateValue) {
  if (!dateValue) return 0;
  return Math.floor((Date.now() - new Date(dateValue)) / 31557600000);
}

function currentAuthPage() {
  return document.body.dataset.authPage || "";
}

/* ---------- Login ---------- */
function hideError() {
  hideMessage(byId("auth-error"));
}

async function signInWithGoogle() {
  const { error } = await _supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin + ORIGIN_ROUTES.dashboardAbsolute },
  });

  if (error) showMessage(byId("auth-error"), error.message, "error");
}

async function signIn() {
  const email = byId("login-email").value.trim();
  const password = byId("login-pass").value;
  const btn = byId("login-btn");
  const errorEl = byId("auth-error");

  if (!email || !password) {
    showMessage(errorEl, AUTH_TEXT.fillAllFields, "error");
    return;
  }

  setButtonState(btn, BUTTON_LABELS.authenticating, true);
  hideMessage(errorEl);

  try {
    const { data: profile } = await _supabase.from("profiles").select("email").eq("email", email).maybeSingle();

    if (!profile) {
      showMessage(
        errorEl,
        `No account found with this email. <a href="${ROUTES.signupPage}" style="color: var(--link-blue); text-decoration: underline;">Create one?</a>`,
        "error"
      );
      setButtonState(btn, BUTTON_LABELS.signIn, false);
      return;
    }

    const { error: authError } = await _supabase.auth.signInWithPassword({ email, password });
    if (authError) throw authError;

    window.location.href = ROUTES.dashboardRelative;
  } catch (err) {
    setButtonState(btn, BUTTON_LABELS.signIn, false);

    if (err.message && err.message.includes(AUTH_TEXT.invalidCredentials)) {
      const { data: profile } = await _supabase.from("profiles").select("id").eq("email", email).maybeSingle();

      if (profile) {
        showMessage(
          errorEl,
          `Incorrect password. If you usually use Google, <a href="#" class="js-google-signin" style="color: var(--link-blue); font-weight:bold;">Sign in with Google</a> or <a href="${ROUTES.forgotPasswordPage}" style="color: var(--link-blue);">Reset Password</a> to create one.`,
          "error"
        );
      } else {
        showMessage(
          errorEl,
          `No account found. <a href="${ROUTES.signupPage}" style="color: var(--link-blue); font-weight:bold;">Sign up here</a>`,
          "error"
        );
      }
      return;
    }

    showMessage(errorEl, err.message || AUTH_TEXT.genericSignInError, "error");
  }
}

async function initLoginPage() {
  if (window.location.hash.includes("type=recovery")) {
    window.location.href = ROUTES.updatePasswordPage + window.location.hash;
    return;
  }

  const params = new URLSearchParams(window.location.search);
  if (params.get("signup") === "success") {
    showMessage(byId("auth-error"), AUTH_TEXT.signupSuccess, "success");
  }

  const {
    data: { session },
  } = await _supabase.auth.getSession();

  if (session) window.location.href = ROUTES.dashboardRelative;
}

/* ---------- Forgot Password ---------- */
async function sendResetLink() {
  const email = byId("reset-email").value.trim();
  const btn = byId("send-btn");
  const msg = byId("status-msg");

  if (!email) {
    showMessage(msg, AUTH_TEXT.resetEmailRequired, "error");
    return;
  }

  setButtonState(btn, BUTTON_LABELS.sending, true);
  hideMessage(msg);

  const redirectUrl = window.location.origin + ORIGIN_ROUTES.updatePasswordAbsolute;
  const { error } = await _supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl });

  if (error) {
    showMessage(msg, error.message, "error");
    setButtonState(btn, BUTTON_LABELS.sendReset, false);
    return;
  }

  showMessage(msg, AUTH_TEXT.resetEmailSent, "success");
  setButtonState(btn, BUTTON_LABELS.checkEmail, true);
}

/* ---------- Update Password ---------- */
async function updatePassword() {
  const pass = byId("new-pass").value;
  const conf = byId("conf-pass").value;
  const btn = byId("update-btn");
  const error = byId("update-error");

  if (pass.length < 8) {
    showMessage(error, AUTH_TEXT.passwordMinLength, "error");
    return;
  }

  if (pass !== conf) {
    showMessage(error, AUTH_TEXT.passwordMismatch, "error");
    return;
  }

  setButtonState(btn, BUTTON_LABELS.updating, true);
  hideMessage(error);

  const { error: updateErr } = await _supabase.auth.updateUser({ password: pass });
  if (updateErr) {
    showMessage(error, updateErr.message, "error");
    setButtonState(btn, BUTTON_LABELS.updatePassword, false);
    return;
  }

  alert(AUTH_TEXT.passwordUpdated);
  window.location.href = ROUTES.loginPage;
}

/* ---------- Signup ---------- */
let authMethod = "email";
let userRole = USER_ROLE.client;

function setRole(role) {
  userRole = role;
  byId("role-client").classList.toggle("active", role === USER_ROLE.client);
  byId("role-coach").classList.toggle("active", role === USER_ROLE.coach);

  const inviteField = byId("invite-field");
  if (inviteField) inviteField.style.display = role === USER_ROLE.coach ? "none" : "block";
}

function nav(step) {
  document.querySelectorAll(".step").forEach((el) => el.classList.remove("active"));
  const targetStep = byId(`step${step}`);
  if (targetStep) targetStep.classList.add("active");
  byId("progress").style.width = `${(step / 3) * 100}%`;
}

function v1() {
  byId("next1").disabled = !byId("fname").value.trim() || !byId("lname").value.trim();
}

function v2() {
  hideMessage(byId("emailError"));
  const email = byId("email").value.trim();
  const pass = byId("pass").value;
  const conf = byId("conf").value;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  byId("next2").disabled = !(emailRegex.test(email) && pass.length >= 8 && pass === conf);
}

function v3() {
  const age = getAgeFromDate(byId("dob").value);
  const termsAccepted = byId("terms").checked;
  const invite = byId("invite").value;
  const inviteErrorVisible = byId("inviteError").style.display === "block";

  byId("ageError").style.display = byId("dob").value && age < 13 ? "block" : "none";

  const inviteValid =
    userRole === "coach" || (invite.length === 7 && !inviteErrorVisible) || invite.length === 0;

  byId("submit").disabled = !(age >= 13 && termsAccepted && inviteValid);
}

async function goGoogle() {
  localStorage.setItem(SIGNUP_STORAGE_KEYS.firstName, byId("fname").value);
  localStorage.setItem(SIGNUP_STORAGE_KEYS.lastName, byId("lname").value);
  localStorage.setItem(SIGNUP_STORAGE_KEYS.role, userRole);

  const signupUrl = window.location.origin + ORIGIN_ROUTES.signupFlowAbsolute;
  await _supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: signupUrl } });
}

async function checkEmail() {
  const btn = byId("next2");
  const email = byId("email").value.trim();
  const errorSpan = byId("emailError");

  setButtonState(btn, BUTTON_LABELS.checking, true);
  const { data } = await _supabase.from("profiles").select("email").eq("email", email);

  if (data && data.length > 0) {
    showMessage(
      errorSpan,
      `This email is already taken. <a href="${ROUTES.loginPage}" style="color: var(--link-blue);">Login here</a>.`,
      "error"
    );
    setButtonState(btn, BUTTON_LABELS.continue, false);
    return;
  }

  authMethod = "email";
  nav(3);
  setButtonState(btn, BUTTON_LABELS.continue, false);
}

function generateCoachCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 6; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}

async function finish() {
  const btn = byId("submit");
  const email = byId("email").value.trim();
  const pass = byId("pass").value;
  const inviteInput = byId("invite").value.trim();
  const rateError = byId("ageError");

  setButtonState(btn, BUTTON_LABELS.creatingAccount, true);

  try {
    if (authMethod === "email") {
      const { error } = await _supabase.auth.signUp({
        email,
        password: pass,
        options: {
          data: {
            first_name: byId("fname").value,
            last_name: byId("lname").value,
            role: userRole,
            birthday: byId("dob").value,
            invite_code: userRole === USER_ROLE.client ? inviteInput.replace("-", "").toUpperCase() : null,
            coach_code: userRole === USER_ROLE.coach ? generateCoachCode() : null,
          },
        },
      });

      if (error) throw error;
      window.location.href = `${ROUTES.loginPage}?signup=success`;
      return;
    }

    const {
      data: { user },
    } = await _supabase.auth.getUser();

    const profileData = {
      id: user.id,
      email: user.email,
      role: userRole,
      first_name: byId("fname").value || localStorage.getItem(SIGNUP_STORAGE_KEYS.firstName),
      last_name: byId("lname").value || localStorage.getItem(SIGNUP_STORAGE_KEYS.lastName),
      birthday: byId("dob").value,
    };

    if (userRole === USER_ROLE.coach) profileData.coach_code = generateCoachCode();
    else profileData.invite_code = inviteInput.replace("-", "").toUpperCase();

    const { error: profileError } = await _supabase.from("profiles").upsert(profileData);
    if (profileError) throw profileError;

    window.location.href = ROUTES.dashboardRelative;
  } catch (e) {
    setButtonState(btn, BUTTON_LABELS.completeSetup, false);

    if ((e.message && e.message.includes(AUTH_TEXT.rateLimitKeyword)) || e.status === 429) {
      showMessage(
        rateError,
        'Too many attempts. <a href="#" class="js-google-signup" style="color: var(--link-blue); font-weight:bold; text-decoration:underline;">Sign up with Google instead?</a>',
        "error"
      );
      return;
    }

    alert(e.message);
  }
}

async function formatAndValidateCode() {
  const input = byId("invite");
  const error = byId("inviteError");
  const submitBtn = byId("submit");

  input.value = formatInviteCode(input.value);
  if (input.value.length !== 7) {
    hideMessage(error);
    return;
  }

  const cleanCode = input.value.replace("-", "");
  const { data } = await _supabase.from("profiles").select("id").eq("coach_code", cleanCode).single();
  if (!data) {
    showMessage(error, AUTH_TEXT.inviteCodeNotFound, "error");
    submitBtn.disabled = true;
    return;
  }

  hideMessage(error);
  v3();
}

async function initSignupPage() {
  const {
    data: { session },
  } = await _supabase.auth.getSession();

  const params = new URLSearchParams(window.location.search);
  if (!session) return;

  const { data: profile } = await _supabase.from("profiles").select("birthday").eq("id", session.user.id).single();
  if (profile && profile.birthday) {
    window.location.href = ROUTES.dashboardRelative;
    return;
  }

  if (params.get("flow") === "signup") {
    authMethod = "google";
    userRole = localStorage.getItem(SIGNUP_STORAGE_KEYS.role) || USER_ROLE.client;
    setRole(userRole);
    byId("back3").style.display = "none";
    nav(3);
    return;
  }

  window.location.href = ROUTES.dashboardRelative;
}

/* ---------- Event Wiring ---------- */
function bindLoginEvents() {
  byId("google-signin-btn")?.addEventListener("click", signInWithGoogle);
  byId("login-btn")?.addEventListener("click", signIn);
  byId("login-email")?.addEventListener("input", hideError);
  byId("login-pass")?.addEventListener("input", hideError);
}

function bindForgotEvents() {
  byId("send-btn")?.addEventListener("click", sendResetLink);
}

function bindUpdateEvents() {
  byId("update-btn")?.addEventListener("click", updatePassword);
}

function bindSignupEvents() {
  byId("role-client")?.addEventListener("click", () => setRole(USER_ROLE.client));
  byId("role-coach")?.addEventListener("click", () => setRole(USER_ROLE.coach));
  byId("next1")?.addEventListener("click", () => nav(2));
  byId("google-signup-btn")?.addEventListener("click", goGoogle);
  byId("back-to-step1")?.addEventListener("click", () => nav(1));
  byId("next2")?.addEventListener("click", checkEmail);
  byId("back3")?.addEventListener("click", () => nav(2));
  byId("submit")?.addEventListener("click", finish);

  byId("fname")?.addEventListener("input", v1);
  byId("lname")?.addEventListener("input", v1);
  byId("email")?.addEventListener("input", v2);
  byId("pass")?.addEventListener("input", v2);
  byId("conf")?.addEventListener("input", v2);
  byId("invite")?.addEventListener("input", formatAndValidateCode);
  byId("dob")?.addEventListener("change", v3);
  byId("terms")?.addEventListener("change", v3);
}

function bindDelegatedAuthLinks() {
  document.addEventListener("click", (event) => {
    const googleSigninLink = event.target.closest(".js-google-signin");
    if (googleSigninLink) {
      event.preventDefault();
      signInWithGoogle();
      return;
    }

    const googleSignupLink = event.target.closest(".js-google-signup");
    if (googleSignupLink) {
      event.preventDefault();
      goGoogle();
    }
  });
}

/* ---------- Page Dispatcher ---------- */
window.addEventListener("load", async () => {
  const page = currentAuthPage();

  bindDelegatedAuthLinks();

  if (page === AUTH_PAGE.login) {
    bindLoginEvents();
    await initLoginPage();
  }

  if (page === AUTH_PAGE.signup) {
    bindSignupEvents();
    await initSignupPage();
  }

  if (page === AUTH_PAGE.forgot) bindForgotEvents();
  if (page === AUTH_PAGE.update) bindUpdateEvents();
});

