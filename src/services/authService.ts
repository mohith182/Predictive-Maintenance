/**
 * Authentication Service
 * Handles user authentication with FastAPI backend
 */

// API URL - FastAPI backend
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  is_email_verified: boolean;
  mfa_enabled: boolean;
  auth_provider: string;
  created_at: string;
}

interface Tokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

interface AuthResponse {
  user: User;
  tokens: Tokens;
}

interface MFARequiredResponse {
  mfa_required: boolean;
  temp_token: string;
  message: string;
}

interface SignUpData {
  email: string;
  password: string;
  full_name?: string;
}

interface LoginData {
  email: string;
  password: string;
}

interface OTPVerifyData {
  email: string;
  otp_code: string;
  temp_token: string;
}

class AuthService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private user: User | null = null;

  constructor() {
    // Load from localStorage on init
    this.accessToken = localStorage.getItem('access_token');
    this.refreshToken = localStorage.getItem('refresh_token');
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        this.user = JSON.parse(savedUser);
      } catch {
        this.user = null;
      }
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_URL}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    };

    // Add auth header if we have a token
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Include cookies
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  private saveAuth(auth: AuthResponse) {
    this.accessToken = auth.tokens.access_token;
    this.refreshToken = auth.tokens.refresh_token;
    this.user = auth.user;

    localStorage.setItem('access_token', auth.tokens.access_token);
    localStorage.setItem('refresh_token', auth.tokens.refresh_token);
    localStorage.setItem('user', JSON.stringify(auth.user));
    localStorage.setItem('userEmail', auth.user.email);
  }

  private clearAuth() {
    this.accessToken = null;
    this.refreshToken = null;
    this.user = null;

    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('userEmail');
  }

  // ====================
  // Public Methods
  // ====================

  async signUp(data: SignUpData): Promise<{ message: string; success: boolean }> {
    return this.request('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(data: LoginData): Promise<AuthResponse | MFARequiredResponse> {
    const response = await this.request<AuthResponse | MFARequiredResponse>(
      '/api/auth/login',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );

    // Check if MFA is required
    if ('mfa_required' in response && response.mfa_required) {
      return response;
    }

    // Save auth data
    this.saveAuth(response as AuthResponse);
    return response;
  }

  async verifyOTP(data: OTPVerifyData): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>(
      '/api/auth/verify-otp',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );

    this.saveAuth(response);
    return response;
  }

  async googleAuth(credential: string): Promise<AuthResponse | MFARequiredResponse> {
    const response = await this.request<AuthResponse | MFARequiredResponse>(
      '/api/auth/google',
      {
        method: 'POST',
        body: JSON.stringify({ credential }),
      }
    );

    if ('mfa_required' in response && response.mfa_required) {
      return response;
    }

    this.saveAuth(response as AuthResponse);
    return response;
  }

  async logout(): Promise<void> {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore logout errors
    }
    this.clearAuth();
  }

  async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) return false;

    try {
      const response = await this.request<Tokens>(
        '/api/auth/refresh',
        {
          method: 'POST',
          body: JSON.stringify({ refresh_token: this.refreshToken }),
        }
      );

      this.accessToken = response.access_token;
      this.refreshToken = response.refresh_token;
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('refresh_token', response.refresh_token);

      return true;
    } catch {
      this.clearAuth();
      return false;
    }
  }

  async getProfile(): Promise<User> {
    const user = await this.request<User>('/api/auth/me');
    this.user = user;
    localStorage.setItem('user', JSON.stringify(user));
    return user;
  }

  async setupMFA(): Promise<{ secret: string; qr_code: string; backup_codes: string[] }> {
    return this.request('/api/auth/mfa/setup', { method: 'POST' });
  }

  async enableMFA(otp_code: string): Promise<{ message: string; success: boolean }> {
    return this.request('/api/auth/mfa/enable', {
      method: 'POST',
      body: JSON.stringify({ otp_code }),
    });
  }

  async disableMFA(password: string, otp_code: string): Promise<{ message: string; success: boolean }> {
    return this.request('/api/auth/mfa/disable', {
      method: 'POST',
      body: JSON.stringify({ password, otp_code }),
    });
  }

  async verifyEmail(token: string): Promise<{ message: string; success: boolean }> {
    return this.request(`/api/auth/verify-email?token=${token}`);
  }

  async resendVerification(email: string): Promise<{ message: string; success: boolean }> {
    return this.request('/api/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify(email),
    });
  }

  async requestPasswordReset(email: string): Promise<{ message: string; success: boolean }> {
    return this.request('/api/auth/password-reset', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  // ====================
  // Getters
  // ====================

  isAuthenticated(): boolean {
    return !!this.accessToken && !!this.user;
  }

  getUser(): User | null {
    return this.user;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }
}

// Export singleton instance
export const authService = new AuthService();
export type { User, AuthResponse, MFARequiredResponse, SignUpData, LoginData };
