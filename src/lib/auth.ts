// Autenticação simples no frontend.
// IMPORTANTE: troque ADMIN_PASSWORD pela senha desejada antes de publicar.
// Esta verificação é apenas para esconder a UI — a segurança real vem do token do GitHub,
// que apenas a professora possui.

export const ADMIN_PASSWORD = "professora2026";

const TOKEN_KEY = "gh_pat";
const AUTH_KEY = "admin_auth";

// Persistência em localStorage para que o login e o token sobrevivam a recargas / fechamentos do navegador.
const storage = typeof window !== "undefined" ? window.localStorage : null;

export const authStore = {
  isLoggedIn(): boolean {
    return storage?.getItem(AUTH_KEY) === "1";
  },
  login(password: string): boolean {
    if (password === ADMIN_PASSWORD) {
      storage?.setItem(AUTH_KEY, "1");
      return true;
    }
    return false;
  },
  logout() {
    storage?.removeItem(AUTH_KEY);
    storage?.removeItem(TOKEN_KEY);
  },
  getToken(): string | null {
    return storage?.getItem(TOKEN_KEY) ?? null;
  },
  setToken(token: string) {
    storage?.setItem(TOKEN_KEY, token);
  },
  clearToken() {
    storage?.removeItem(TOKEN_KEY);
  },
};
