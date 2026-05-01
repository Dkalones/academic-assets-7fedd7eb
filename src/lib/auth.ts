// Autenticação simples no frontend.
// IMPORTANTE: troque ADMIN_PASSWORD pela senha desejada antes de publicar.
// Esta verificação é apenas para esconder a UI — a segurança real vem do token do GitHub,
// que apenas a professora possui.

export const ADMIN_PASSWORD = "professora2026";

const TOKEN_KEY = "gh_pat";
const AUTH_KEY = "admin_auth";

export const authStore = {
  isLoggedIn(): boolean {
    return sessionStorage.getItem(AUTH_KEY) === "1";
  },
  login(password: string): boolean {
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem(AUTH_KEY, "1");
      return true;
    }
    return false;
  },
  logout() {
    sessionStorage.removeItem(AUTH_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  },
  getToken(): string | null {
    return sessionStorage.getItem(TOKEN_KEY);
  },
  setToken(token: string) {
    sessionStorage.setItem(TOKEN_KEY, token);
  },
  clearToken() {
    sessionStorage.removeItem(TOKEN_KEY);
  },
};
