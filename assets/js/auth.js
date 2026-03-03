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
  loginAbsolute: "/login/?oauth=google",
  updatePasswordAbsolute: "/update-password/",
};

const SIGNUP_STORAGE_KEYS = {
  firstName: "temp_fname",
  lastName: "temp_lname",
  username: "temp_username",
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
  invalidDateOfBirth: "Please enter a valid date of birth.",
  unrealisticDateOfBirth: "Please enter a realistic date of birth.",
  invalidFirstName: "Please enter a valid first name.",
  invalidLastName: "Please enter a valid last name.",
  weakPassword:
    "Use at least 8 characters with uppercase, lowercase, and a number. Avoid using your name or email in your password.",
  emailNotConfirmedKeyword: "email not confirmed",
  resendVerificationSent: "Verification email sent. Please check your inbox and spam folder.",
  usernameTaken: "That username is not available.",
  usernameChecking: "Checking username...",
  noProfileAfterGoogle: "No Capable account was found for this Google email. Please sign up first.",
};

const VALIDATION_RULES = {
  minimumAge: 13,
  maximumAge: 110,
  minimumNameLength: 2,
  maximumNameLength: 40,
  usernameMinLength: 3,
  usernameMaxLength: 30,
};

/* ---------- Shared Helpers ---------- */
function byId(id) {
  return document.getElementById(id);
}

function showMessage(element, message, type) {
  if (!element) return;
  element.style.display = "block";
  element.style.color = type === "success" ? "var(--success)" : "var(--error)";
  element.textContent = String(message || "");
}

function showRichMessage(element, type, segments) {
  if (!element) return;
  element.style.display = "block";
  element.style.color = type === "success" ? "var(--success)" : "var(--error)";
  element.replaceChildren();

  segments.forEach((segment) => {
    if (typeof segment === "string") {
      element.append(document.createTextNode(segment));
      return;
    }

    const link = document.createElement("a");
    link.textContent = segment.text || "";
    link.href = segment.href || "#";
    if (segment.className) link.className = segment.className;
    if (segment.style) link.style.cssText = segment.style;
    if (segment.dataset) {
      Object.entries(segment.dataset).forEach(([key, value]) => {
        link.dataset[key] = value;
      });
    }
    element.append(link);
  });
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

function normalizeUsername(value) {
  return (value || "").trim().toLowerCase();
}

function looksLikeEmail(value) {
  return /@.+\./.test(value);
}

function validateName(value, label) {
  const cleaned = value.trim();
  const formatRegex = /^[A-Za-z]+(?:[ '-][A-Za-z]+)*$/;

  if (!cleaned) return `Please enter your ${label}.`;
  if (looksLikeEmail(cleaned)) return `${label[0].toUpperCase() + label.slice(1)} cannot be an email address.`;
  if (cleaned.length < VALIDATION_RULES.minimumNameLength) {
    return `${label[0].toUpperCase() + label.slice(1)} must be at least ${VALIDATION_RULES.minimumNameLength} characters.`;
  }
  if (cleaned.length > VALIDATION_RULES.maximumNameLength) {
    return `${label[0].toUpperCase() + label.slice(1)} must be ${VALIDATION_RULES.maximumNameLength} characters or less.`;
  }
  if (!formatRegex.test(cleaned)) {
    return `${label[0].toUpperCase() + label.slice(1)} contains unsupported characters.`;
  }
  return "";
}

function validatePasswordStrength(password, email, firstName, lastName) {
  const lower = password.toLowerCase();
  const emailLocalPart = (email || "").split("@")[0].toLowerCase();
  const first = (firstName || "").trim().toLowerCase();
  const last = (lastName || "").trim().toLowerCase();

  if (password.length < 8) return AUTH_TEXT.weakPassword;
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) return AUTH_TEXT.weakPassword;
  if (emailLocalPart && emailLocalPart.length > 2 && lower.includes(emailLocalPart)) return AUTH_TEXT.weakPassword;
  if (first && first.length > 2 && lower.includes(first)) return AUTH_TEXT.weakPassword;
  if (last && last.length > 2 && lower.includes(last)) return AUTH_TEXT.weakPassword;

  return "";
}

function getDateOfBirthError(dateValue) {
  if (!dateValue) return "Please add your date of birth.";

  const age = getAgeFromDate(dateValue);
  if (Number.isNaN(age) || age < 0) return AUTH_TEXT.invalidDateOfBirth;
  if (age < VALIDATION_RULES.minimumAge) return "You must be at least 13 years old.";
  if (age > VALIDATION_RULES.maximumAge) return AUTH_TEXT.unrealisticDateOfBirth;

  return "";
}

async function fetchProfileByUserId(userId) {
  const { data, error } = await _supabase
    .from("profiles")
    .select("id, email, role, first_name, last_name, birthday, username")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

function isProfileComplete(profile) {
  return Boolean(profile && profile.role && profile.first_name && profile.last_name && profile.birthday);
}

function normalizeInviteCode(value) {
  return (value || "").replace("-", "").toUpperCase();
}

function validateUsername(username) {
  const value = normalizeUsername(username);
  if (!value) return "Please choose a username.";
  if (value.length < VALIDATION_RULES.usernameMinLength || value.length > VALIDATION_RULES.usernameMaxLength) {
    return `Username must be ${VALIDATION_RULES.usernameMinLength}-${VALIDATION_RULES.usernameMaxLength} characters.`;
  }
  if (!/^[a-z0-9._]+$/.test(value)) {
    return "Username can only use lowercase letters, numbers, periods, and underscores.";
  }
  if (/^[._]/.test(value) || /[._]$/.test(value) || /\.\./.test(value)) {
    return "Username cannot start or end with . or _, and cannot contain consecutive periods.";
  }
  return "";
}

function profilePayloadFromAuthUser(user) {
  const metadata = user?.user_metadata || {};
  const role = metadata.role;
  const firstName = (metadata.first_name || "").trim();
  const lastName = (metadata.last_name || "").trim();
  const birthday = metadata.birthday;
  const username = normalizeUsername(metadata.username);

  if (!role || !firstName || !lastName || !birthday || !username) return null;

  const payload = {
    id: user.id,
    email: user.email,
    role,
    first_name: firstName,
    last_name: lastName,
    birthday,
    username,
  };

  if (role === USER_ROLE.coach) payload.coach_code = normalizeInviteCode(metadata.coach_code) || generateCoachCode();
  if (role === USER_ROLE.client) payload.invite_code = normalizeInviteCode(metadata.invite_code) || null;

  return payload;
}

async function ensureProfileExistsForAuthUser(user) {
  const existing = await fetchProfileByUserId(user.id);
  if (existing) return existing;

  const payload = profilePayloadFromAuthUser(user);
  if (!payload) return null;

  const { error } = await _supabase.from("profiles").upsert(payload);
  if (error) throw error;

  return fetchProfileByUserId(user.id);
}

/* ---------- Login ---------- */
function hideError() {
  hideMessage(byId("auth-error"));
}

async function signInWithGoogle() {
  const { error } = await _supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin + ORIGIN_ROUTES.loginAbsolute },
  });

  if (error) showMessage(byId("auth-error"), error.message, "error");
}

async function resendVerificationEmail(email) {
  const { error } = await _supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: window.location.origin + ROUTES.loginPage },
  });

  if (error) {
    showMessage(byId("auth-error"), error.message, "error");
    return;
  }

  showMessage(byId("auth-error"), AUTH_TEXT.resendVerificationSent, "success");
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
      showRichMessage(
        errorEl,
        "error",
        [
          "No account found with this email. ",
          { text: "Create one?", href: ROUTES.signupPage, style: "color: var(--link-blue); text-decoration: underline;" },
        ]
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
        showRichMessage(
          errorEl,
          "error",
          [
            "Incorrect password. If you usually use Google, ",
            { text: "Sign in with Google", href: "#", className: "js-google-signin", style: "color: var(--link-blue); font-weight: bold;" },
            " or ",
            { text: "Reset Password", href: ROUTES.forgotPasswordPage, style: "color: var(--link-blue);" },
            " to create one.",
          ]
        );
      } else {
        showRichMessage(
          errorEl,
          "error",
          [
            "No account found. ",
            { text: "Sign up here", href: ROUTES.signupPage, style: "color: var(--link-blue); font-weight: bold;" },
          ]
        );
      }
      return;
    }

    if (err.message && err.message.toLowerCase().includes(AUTH_TEXT.emailNotConfirmedKeyword)) {
      showRichMessage(
        errorEl,
        "error",
        [
          "Email not confirmed. ",
          {
            text: "Resend verification email",
            href: "#",
            className: "js-resend-verification",
            style: "color: var(--link-blue); font-weight: bold;",
            dataset: { email },
          },
          ".",
        ]
      );
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

  if (!session) return;

  const profile = await ensureProfileExistsForAuthUser(session.user);
  if (!profile) {
    await _supabase.auth.signOut();
    showRichMessage(byId("auth-error"), "error", [
      AUTH_TEXT.noProfileAfterGoogle + " ",
      { text: "Sign up first", href: ROUTES.signupPage, style: "color: var(--link-blue); text-decoration: underline;" },
      ".",
    ]);
    return;
  }

  if (isProfileComplete(profile)) {
    window.location.href = ROUTES.dashboardRelative;
    return;
  }

  window.location.href = ORIGIN_ROUTES.signupFlowAbsolute;
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
let inviteValidationToken = 0;
let usernameValidationToken = 0;
let usernameDebounceTimer;

function setRole(role) {
  userRole = role;
  byId("role-client").classList.toggle("active", role === USER_ROLE.client);
  byId("role-coach").classList.toggle("active", role === USER_ROLE.coach);

  const inviteField = byId("invite-field");
  if (inviteField) inviteField.style.display = role === USER_ROLE.coach ? "none" : "block";
  if (role === USER_ROLE.coach) hideMessage(byId("inviteError"));
  v3();
}

function nav(step) {
  document.querySelectorAll(".step").forEach((el) => el.classList.remove("active"));
  const targetStep = byId(`step${step}`);
  if (targetStep) targetStep.classList.add("active");
  byId("progress").style.width = `${(step / 3) * 100}%`;
}

function v1() {
  const firstNameError = validateName(byId("fname").value, "first name");
  const lastNameError = validateName(byId("lname").value, "last name");
  const usernameError = validateUsername(byId("username")?.value || "");
  const usernameTaken = byId("usernameError").dataset.taken === "true";
  const message = firstNameError || lastNameError;

  if (message) showMessage(byId("nameError"), message, "error");
  else hideMessage(byId("nameError"));

  if (usernameError) {
    byId("usernameError").dataset.taken = "false";
    showMessage(byId("usernameError"), usernameError, "error");
  }

  byId("next1").disabled = Boolean(message || usernameError || usernameTaken);
}

function v2() {
  hideMessage(byId("emailError"));
  const email = byId("email").value.trim();
  const pass = byId("pass").value;
  const conf = byId("conf").value;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const passwordError = validatePasswordStrength(pass, email, byId("fname").value, byId("lname").value);

  if (passwordError) showMessage(byId("passwordError"), passwordError, "error");
  else hideMessage(byId("passwordError"));

  byId("next2").disabled = !(emailRegex.test(email) && !passwordError && pass === conf);
}

function v3() {
  const dateOfBirthError = getDateOfBirthError(byId("dob").value);
  const termsAccepted = byId("terms").checked;
  const invite = byId("invite").value;
  const inviteErrorVisible = byId("inviteError").style.display === "block";

  if (dateOfBirthError) showMessage(byId("ageError"), dateOfBirthError, "error");
  else hideMessage(byId("ageError"));

  const inviteValid = userRole === USER_ROLE.coach || (invite.length === 7 && !inviteErrorVisible) || invite.length === 0;
  const dateValid = !dateOfBirthError;

  byId("submit").disabled = !(dateValid && termsAccepted && inviteValid);
}

async function goGoogle() {
  localStorage.setItem(SIGNUP_STORAGE_KEYS.firstName, byId("fname").value);
  localStorage.setItem(SIGNUP_STORAGE_KEYS.lastName, byId("lname").value);
  localStorage.setItem(SIGNUP_STORAGE_KEYS.username, normalizeUsername(byId("username").value));
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
    showRichMessage(
      errorSpan,
      "error",
      ["This email is already taken. ", { text: "Login here", href: ROUTES.loginPage, style: "color: var(--link-blue);" }, "."]
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

function validateUsernameAvailability() {
  const usernameEl = byId("username");
  const usernameErrorEl = byId("usernameError");
  if (!usernameEl || !usernameErrorEl) return;

  const username = normalizeUsername(usernameEl.value);
  usernameEl.value = username;

  const formatError = validateUsername(username);
  if (formatError) {
    usernameErrorEl.dataset.taken = "false";
    showMessage(usernameErrorEl, formatError, "error");
    v1();
    return;
  }

  clearTimeout(usernameDebounceTimer);
  usernameErrorEl.dataset.taken = "false";
  showMessage(usernameErrorEl, AUTH_TEXT.usernameChecking, "success");
  byId("next1").disabled = true;

  usernameDebounceTimer = setTimeout(async () => {
    const currentToken = ++usernameValidationToken;
    const { data, error } = await _supabase.from("profiles").select("id").eq("username", username).maybeSingle();
    if (currentToken !== usernameValidationToken) return;

    if (error) {
      usernameErrorEl.dataset.taken = "false";
      showMessage(usernameErrorEl, "Unable to validate username right now. Try again.", "error");
      v1();
      return;
    }

    if (data) {
      usernameErrorEl.dataset.taken = "true";
      showMessage(usernameErrorEl, AUTH_TEXT.usernameTaken, "error");
      v1();
      return;
    }

    usernameErrorEl.dataset.taken = "false";
    hideMessage(usernameErrorEl);
    v1();
  }, 250);
}

async function finish() {
  const btn = byId("submit");
  const email = byId("email").value.trim();
  const pass = byId("pass").value;
  const inviteInput = byId("invite").value.trim();
  const rateError = byId("ageError");
  const firstName = byId("fname").value.trim();
  const lastName = byId("lname").value.trim();
  const birthday = byId("dob").value;
  const username = normalizeUsername(byId("username").value);

  const firstNameError = validateName(firstName, "first name");
  const lastNameError = validateName(lastName, "last name");
  const dateOfBirthError = getDateOfBirthError(birthday);

  if (firstNameError || lastNameError) {
    showMessage(byId("nameError"), firstNameError || lastNameError, "error");
    return;
  }

  const usernameError = validateUsername(username);
  if (usernameError) {
    showMessage(byId("usernameError"), usernameError, "error");
    return;
  }

  const usernameTaken = byId("usernameError").dataset.taken === "true";
  if (usernameTaken) {
    showMessage(byId("usernameError"), AUTH_TEXT.usernameTaken, "error");
    return;
  }

  const { data: existingUsername } = await _supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (existingUsername) {
    byId("usernameError").dataset.taken = "true";
    showMessage(byId("usernameError"), AUTH_TEXT.usernameTaken, "error");
    return;
  }

  if (dateOfBirthError) {
    showMessage(rateError, dateOfBirthError, "error");
    return;
  }

  setButtonState(btn, BUTTON_LABELS.creatingAccount, true);

  try {
    if (authMethod === "email") {
      const passwordError = validatePasswordStrength(pass, email, firstName, lastName);
      if (passwordError) {
        showMessage(byId("passwordError"), passwordError, "error");
        setButtonState(btn, BUTTON_LABELS.completeSetup, false);
        return;
      }

      const { data: signupData, error } = await _supabase.auth.signUp({
        email,
        password: pass,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            role: userRole,
            username,
            birthday,
            invite_code: userRole === USER_ROLE.client ? inviteInput.replace("-", "").toUpperCase() : null,
            coach_code: userRole === USER_ROLE.coach ? generateCoachCode() : null,
          },
        },
      });

      if (error) throw error;
      if (signupData?.session && signupData?.user) {
        await ensureProfileExistsForAuthUser(signupData.user);
      }
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
      first_name: firstName || localStorage.getItem(SIGNUP_STORAGE_KEYS.firstName),
      last_name: lastName || localStorage.getItem(SIGNUP_STORAGE_KEYS.lastName),
      username: username || localStorage.getItem(SIGNUP_STORAGE_KEYS.username),
      birthday,
    };

    if (userRole === USER_ROLE.coach) profileData.coach_code = generateCoachCode();
    else profileData.invite_code = inviteInput.replace("-", "").toUpperCase();

    const { error: profileError } = await _supabase.from("profiles").upsert(profileData);
    if (profileError) throw profileError;

    window.location.href = ROUTES.dashboardRelative;
  } catch (e) {
    setButtonState(btn, BUTTON_LABELS.completeSetup, false);

    if ((e.message && e.message.includes(AUTH_TEXT.rateLimitKeyword)) || e.status === 429) {
      showRichMessage(
        rateError,
        "error",
        [
          "Too many attempts. ",
          {
            text: "Sign up with Google instead?",
            href: "#",
            className: "js-google-signup",
            style: "color: var(--link-blue); font-weight: bold; text-decoration: underline;",
          },
        ]
      );
      return;
    }

    alert(e.message);
  }
}

async function formatAndValidateCode() {
  const input = byId("invite");
  const error = byId("inviteError");
  const currentToken = ++inviteValidationToken;

  input.value = formatInviteCode(input.value);

  if (userRole === USER_ROLE.coach || input.value.length === 0) {
    hideMessage(error);
    v3();
    return;
  }

  if (input.value.length !== 7) {
    hideMessage(error);
    v3();
    return;
  }

  const cleanCode = input.value.replace("-", "");
  const { data } = await _supabase.from("profiles").select("id").eq("coach_code", cleanCode).maybeSingle();

  if (currentToken !== inviteValidationToken) return;

  if (!data) {
    showMessage(error, AUTH_TEXT.inviteCodeNotFound, "error");
    v3();
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

  const profile = await fetchProfileByUserId(session.user.id);
  if (isProfileComplete(profile)) {
    window.location.href = ROUTES.dashboardRelative;
    return;
  }

  if (params.get("flow") === "signup") {
    history.replaceState(null, "", ORIGIN_ROUTES.signupFlowAbsolute);
  }

  authMethod = "google";
  userRole = localStorage.getItem(SIGNUP_STORAGE_KEYS.role) || USER_ROLE.client;
  setRole(userRole);
  byId("fname").value = localStorage.getItem(SIGNUP_STORAGE_KEYS.firstName) || byId("fname").value;
  byId("lname").value = localStorage.getItem(SIGNUP_STORAGE_KEYS.lastName) || byId("lname").value;
  byId("username").value = localStorage.getItem(SIGNUP_STORAGE_KEYS.username) || byId("username").value;
  byId("back3").style.display = "none";
  nav(3);
  v1();
  v3();
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
  byId("username")?.addEventListener("input", validateUsernameAvailability);
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
      return;
    }

    const resendVerificationLink = event.target.closest(".js-resend-verification");
    if (resendVerificationLink) {
      event.preventDefault();
      const email = resendVerificationLink.dataset.email || byId("login-email")?.value?.trim() || "";
      if (!email) {
        showMessage(byId("auth-error"), "Enter your email to resend verification.", "error");
        return;
      }
      resendVerificationEmail(email);
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

