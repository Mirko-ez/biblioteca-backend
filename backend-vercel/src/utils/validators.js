// Validation helpers consistent with Agustín's rules

export function isAllowedSignupDomain(email) {
  // Allowed for sign-up: gmail.com, yahoo.com, hotmail.com
  return /@(?:gmail\.com|yahoo\.com|hotmail\.com)$/i.test(email);
}

export function isGmailOnly(email) {
  // Required for login (local): gmail.com only
  return /@gmail\.com$/i.test(email);
}

export function isValidName(name) {
  // Only letters and spaces, min 4 letters (supports accents)
  return /^[A-Za-zÁÉÍÓÚáéíóúÜüÑñ\s]{4,}$/.test(name.trim());
}

export function isValidPassword(pwd) {
  return typeof pwd === "string" && pwd.length >= 6;
}