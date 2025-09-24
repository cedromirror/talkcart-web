import { normalizeAuthError, isAuthError } from '@/lib/authErrors';

describe('auth error handling utilities', () => {
    it('normalizeAuthError returns friendly message for auth-like inputs', () => {
        expect(normalizeAuthError('Authentication token invalid')).toBe(
            'Authentication failed. Please try again later.'
        );
        expect(normalizeAuthError(new Error('Session expired'))).toBe(
            'Authentication failed. Please try again later.'
        );
        expect(normalizeAuthError({ message: 'Unauthorized access' })).toBe(
            'Authentication failed. Please try again later.'
        );
    });

    it('normalizeAuthError returns original or default for non-auth errors', () => {
        expect(normalizeAuthError('Network timeout')).toBe('Network timeout');
        expect(normalizeAuthError(new Error('Something went wrong'))).toBe(
            'Something went wrong'
        );
    });

    it('isAuthError detects common auth-related keywords', () => {
        expect(isAuthError('auth')).toBe(true);
        expect(isAuthError('authentication failed')).toBe(true);
        expect(isAuthError('invalid token')).toBe(true);
        expect(isAuthError('login required')).toBe(true);
        expect(isAuthError('session expired')).toBe(true);
        expect(isAuthError('unauthorized')).toBe(true);
        expect(isAuthError('forbidden')).toBe(true);
    });

    it('isAuthError returns false for unrelated errors', () => {
        expect(isAuthError('file not found')).toBe(false);
        expect(isAuthError('network error')).toBe(false);
        expect(isAuthError(new Error('unexpected'))).toBe(false);
    });
});