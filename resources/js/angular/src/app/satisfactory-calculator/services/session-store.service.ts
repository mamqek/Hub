import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SessionStoreService {
    private readonly prefix = 'satisfactory.';

    get<T>(key: string, fallback: T): T {
        try {
            const raw = sessionStorage.getItem(this.prefix + key);
            if (!raw) {
                return fallback;
            }
            return JSON.parse(raw) as T;
        } catch {
            return fallback;
        }
    }

    set<T>(key: string, value: T): void {
        try {
            sessionStorage.setItem(this.prefix + key, JSON.stringify(value));
        } catch {
            // Ignore storage errors.
        }
    }

    remove(key: string): void {
        try {
            sessionStorage.removeItem(this.prefix + key);
        } catch {
            // Ignore storage errors.
        }
    }
}
