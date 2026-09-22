import { supabase, isSupabaseConfigured } from './supabase';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  company?: string;
  role: string;
  tierBadge: string;
  initials: string;
  isPartner: boolean;
}

export const PARTNER_ACCOUNTS: UserProfile[] = [
  {
    id: '635fbaa5-d682-459c-8a53-8563f41d0abe',
    email: 'chadneweragd@gmail.com',
    name: 'Chad',
    company: 'Build Permit Pro',
    role: 'Co-Founder & Product',
    tierBadge: 'Partner / Admin',
    initials: 'CP',
    isPartner: true
  },
  {
    id: '4984332e-8c91-426e-ba90-566221b4ce49',
    email: 'david@buildpermitpro.ca',
    name: 'David',
    company: 'Build Permit Pro',
    role: 'Commercial Strategy',
    tierBadge: 'Partner / Admin',
    initials: 'DP',
    isPartner: true
  },
  {
    id: '68f167fe-4198-45ee-9e0d-f2c90cb6b9b4',
    email: 'cartersmith2013@gmail.com',
    name: 'Carter',
    company: 'Build Permit Pro',
    role: 'Okanagan Operations',
    tierBadge: 'Partner / Admin',
    initials: 'CS',
    isPartner: true
  }
];

export const DEFAULT_PARTNER = PARTNER_ACCOUNTS[0];

const STORAGE_ACTIVE_USER_KEY = 'bpp_active_user_email';

export class AuthService {
  /**
   * Returns the active user profile, checking Supabase Auth first, then local preference.
   */
  public static async getCurrentUser(): Promise<UserProfile> {
    if (typeof window === 'undefined') {
      return DEFAULT_PARTNER;
    }

    // 1. Check live Supabase Auth session
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.email) {
          return this.formatUserProfile(user.id, user.email, user.user_metadata?.full_name);
        }
      } catch (e) {
        console.warn('Supabase auth check failed:', e);
      }
    }

    // 2. Check local partner switch preference
    const savedEmail = localStorage.getItem(STORAGE_ACTIVE_USER_KEY);
    if (savedEmail) {
      const matched = PARTNER_ACCOUNTS.find(
        p => p.email.toLowerCase() === savedEmail.toLowerCase() || p.id === savedEmail
      );
      if (matched) return matched;
      return this.formatUserProfile(savedEmail, savedEmail);
    }

    // Default to flagship partner
    return DEFAULT_PARTNER;
  }

  /**
   * Synchronous getter for quick client renders
   */
  public static getActiveUserSync(): UserProfile {
    if (typeof window === 'undefined') return DEFAULT_PARTNER;

    const savedEmail = localStorage.getItem(STORAGE_ACTIVE_USER_KEY);
    if (savedEmail) {
      const matched = PARTNER_ACCOUNTS.find(
        p => p.email.toLowerCase() === savedEmail.toLowerCase() || p.id === savedEmail
      );
      if (matched) return matched;
      return this.formatUserProfile(savedEmail, savedEmail);
    }

    return DEFAULT_PARTNER;
  }

  /**
   * Switch the active partner profile for testing
   */
  public static setActiveUser(emailOrId: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_ACTIVE_USER_KEY, emailOrId);
      window.dispatchEvent(new Event('bpp_user_changed'));
    }
  }

  /**
   * Formats a UserProfile from email and metadata
   */
  public static formatUserProfile(id: string, email: string, fullName?: string): UserProfile {
    const cleanEmail = email.toLowerCase().trim();
    const partner = PARTNER_ACCOUNTS.find(p => p.email.toLowerCase() === cleanEmail);

    if (partner) {
      return { ...partner, id: id || partner.id };
    }

    const name = fullName || cleanEmail.split('@')[0];
    const initials = name
      .split(' ')
      .map(part => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'BP';

    const isPartnerDomain = cleanEmail.endsWith('@buildpermitpro.ca');

    return {
      id: id || cleanEmail,
      email: cleanEmail,
      name,
      company: isPartnerDomain ? 'Build Permit Pro' : 'Contractor Partner',
      role: isPartnerDomain ? 'Partner / Admin' : 'Estimator Member',
      tierBadge: isPartnerDomain ? 'Partner / Admin' : 'Pro Scout',
      initials,
      isPartner: isPartnerDomain
    };
  }

  /**
   * Returns the scoped user identifier for database records
   */
  public static getActiveUserId(): string {
    return this.getActiveUserSync().id;
  }

  /**
   * Returns the active user's email address
   */
  public static getActiveUserEmail(): string {
    return this.getActiveUserSync().email;
  }
}
