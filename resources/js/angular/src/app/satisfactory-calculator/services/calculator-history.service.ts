import { Injectable } from '@angular/core';
import { SessionStoreService } from './session-store.service';
import { Ingredient, OptimizationGoal, RecipeResponse } from './recipe.service';

export interface HistoryQueryState {
    item: string;
    amount: number;
    ingredients: Ingredient[];
    useIngredientsToMax: boolean;
    optimizationGoals: OptimizationGoal[];
}

export interface RecipeHistoryEntry {
    id: string;
    createdAt: number;
    query: HistoryQueryState;
    selectedRecipes: Record<string, string>;
    response: RecipeResponse;
}

const HISTORY_STORE_KEY = 'calculator.history';
const MAX_HISTORY_ENTRIES = 20;

@Injectable({ providedIn: 'root' })
export class CalculatorHistoryService {
    constructor(private sessionStore: SessionStoreService) {}

    getHistory(): RecipeHistoryEntry[] {
        const history = this.sessionStore.get<RecipeHistoryEntry[]>(HISTORY_STORE_KEY, []);
        return this.clone(history);
    }

    push(entry: Omit<RecipeHistoryEntry, 'id' | 'createdAt'>): RecipeHistoryEntry[] {
        const nextEntry: RecipeHistoryEntry = {
            id: this.generateId(),
            createdAt: Date.now(),
            query: this.clone(entry.query),
            selectedRecipes: this.clone(entry.selectedRecipes),
            response: this.clone(entry.response),
        };

        const current = this.getHistory();
        const topEntry = current[0];
        if (topEntry && this.isSameRequest(topEntry, nextEntry)) {
            current[0] = {
                ...topEntry,
                createdAt: Date.now(),
                response: nextEntry.response,
            };
            this.sessionStore.set(HISTORY_STORE_KEY, current);
            return this.clone(current);
        }

        const next = [nextEntry, ...current].slice(0, MAX_HISTORY_ENTRIES);
        this.sessionStore.set(HISTORY_STORE_KEY, next);
        return this.clone(next);
    }

    promote(id: string): RecipeHistoryEntry | null {
        const current = this.getHistory();
        const index = current.findIndex((entry) => entry.id === id);
        if (index < 0) {
            return null;
        }

        const [selected] = current.splice(index, 1);
        current.unshift({
            ...selected,
            createdAt: Date.now(),
        });
        this.sessionStore.set(HISTORY_STORE_KEY, current);
        return this.clone(current[0]);
    }

    replaceHistory(entries: RecipeHistoryEntry[]): RecipeHistoryEntry[] {
        const safeEntries = (Array.isArray(entries) ? entries : [])
            .filter((entry) => Boolean(entry?.query?.item) && Array.isArray(entry?.response?.recipeNodeArr))
            .slice(0, MAX_HISTORY_ENTRIES);
        this.sessionStore.set(HISTORY_STORE_KEY, safeEntries);
        return this.clone(safeEntries);
    }

    private generateId(): string {
        return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    }

    private isSameRequest(a: RecipeHistoryEntry, b: RecipeHistoryEntry): boolean {
        const aKey = JSON.stringify({ query: a.query, selectedRecipes: a.selectedRecipes });
        const bKey = JSON.stringify({ query: b.query, selectedRecipes: b.selectedRecipes });
        return aKey === bKey;
    }

    private clone<T>(value: T): T {
        return JSON.parse(JSON.stringify(value));
    }
}
