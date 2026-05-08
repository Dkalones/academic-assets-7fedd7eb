// Autenticação simples no frontend.
// A MESMA senha é enviada para /api/blob nas operações de escrita
// (definida em ADMIN_PASSWORD na Vercel).

export const ADMIN_PASSWORD = "TIALUANA";

const AUTH_KEY = "admin_auth";
const PWD_KEY = "admin_pwd";

const storage = typeof window !== "undefined" ? window.localStorage : null;

export const authStore = {
  isLoggedIn(): boolean {
    return storage?.getItem(AUTH_KEY) === "1";
  },
  login(password: string): boolean {
    if (password === ADMIN_PASSWORD) {
      storage?.setItem(AUTH_KEY, "1");
      storage?.setItem(PWD_KEY, password);
      return true;
    }
    return false;
  },
  logout() {
    storage?.removeItem(AUTH_KEY);
    storage?.removeItem(PWD_KEY);
  },
  // Mantido para compatibilidade — agora retorna a própria senha admin,
  // que é o credencial enviado para /api/blob.
  getToken(): string | null {
    return storage?.getItem(PWD_KEY) ?? null;
  },
  setToken(_token: string) {
    // no-op: a senha já é guardada no login.
  },
  clearToken() {
    storage?.removeItem(PWD_KEY);
  },
};
