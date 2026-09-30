'use client';

import { useState, useEffect, useCallback } from 'react';
import { Permit } from '@/types';
import { AuthService, UserProfile, isCityAllowed } from '@/lib/auth-service';
import { PermitsRepository } from '@/lib/permits-repo';

export interface UsePermitsOptions {
  cityId?: string;
  dateRange?: string;
  limit?: number;
  initialPermits?: Permit[];
}

export interface UsePermitsResult {
  permits: Permit[];
  total: number;
  isLoading: boolean;
  isAuthorized: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * usePermits - Hook to query permits with strict multi-region entitlement checks.
 * Enforces that user is authorized for the requested city market before issuing queries.
 */
export function usePermits(options: UsePermitsOptions = {}): UsePermitsResult {
  const { cityId = 'kelowna', dateRange = '2026', limit, initialPermits } = options;

  const [permits, setPermits] = useState<Permit[]>(initialPermits || []);
  const [total, setTotal] = useState<number>(initialPermits ? initialPermits.length : 0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPermits = useCallback(async () => {
    // 1. Authorize user against requested city
    const user: UserProfile = await AuthService.getCurrentUser();
    const authorized = isCityAllowed(cityId, user);

    if (!authorized) {
      setIsAuthorized(false);
      setError(`Access Denied: Your current plan does not include the ${cityId.toUpperCase()} territory. Upgrade your subscription to unlock.`);
      setPermits([]);
      setTotal(0);
      setIsLoading(false);
      return;
    }

    setIsAuthorized(true);
    setError(null);
    setIsLoading(true);

    try {
      const url = new URL('/api/permits', window.location.origin);
      if (cityId) url.searchParams.set('city', cityId);
      if (dateRange) url.searchParams.set('dateRange', dateRange);
      if (limit) url.searchParams.set('limit', limit.toString());

      const res = await fetch(url.toString());
      if (!res.ok) {
        throw new Error(`Failed to fetch permits: ${res.statusText}`);
      }

      const data = await res.json();
      const fetchedPermits: Permit[] = data.permits || [];
      const totalCount: number = typeof data.total === 'number' ? data.total : fetchedPermits.length;

      // Update in-memory repository cache
      if (fetchedPermits.length > 0) {
        PermitsRepository.appendPermits(fetchedPermits);
      }

      setPermits(fetchedPermits);
      setTotal(totalCount);
    } catch (err: any) {
      console.error('[usePermits] Error loading permits:', err);
      setError(err?.message || 'Failed to load permits');
      // Fallback to local repository if available
      const local = PermitsRepository.getPermitsByCity(cityId);
      if (local && local.length > 0) {
        setPermits(local);
        setTotal(local.length);
      }
    } finally {
      setIsLoading(false);
    }
  }, [cityId, dateRange, limit]);

  useEffect(() => {
    fetchPermits();

    const handleUserChange = () => {
      fetchPermits();
    };

    window.addEventListener('bpp_user_changed', handleUserChange);
    return () => {
      window.removeEventListener('bpp_user_changed', handleUserChange);
    };
  }, [fetchPermits]);

  return {
    permits,
    total,
    isLoading,
    isAuthorized,
    error,
    refetch: fetchPermits
  };
}
