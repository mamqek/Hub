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
    label?: string;
    boardId: string;
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
        return this.readHistory();
    }

    push(entry: Omit<RecipeHistoryEntry, 'id' | 'createdAt'>): RecipeHistoryEntry[] {
        const nextEntry = this.normalizeEntry({
            id: this.generateId(),
            createdAt: Date.now(),
            label: entry.label,
            boardId: entry.boardId,
            query: entry.query,
            selectedRecipes: entry.selectedRecipes,
            response: entry.response,
        });

        const current = this.readHistory();
        const topEntry = current[0];
        if (topEntry && this.isSameRequest(topEntry, nextEntry)) {
            current[0] = {
                ...topEntry,
                createdAt: Date.now(),
                label: nextEntry.label ?? topEntry.label,
                boardId: nextEntry.boardId,
                response: this.clone(nextEntry.response),
            };
            this.writeHistory(current);
            return this.clone(current);
        }

        const next = [nextEntry, ...current].slice(0, MAX_HISTORY_ENTRIES);
        this.writeHistory(next);
        return this.clone(next);
    }

    promote(id: string): RecipeHistoryEntry | null {
        const current = this.readHistory();
        const index = current.findIndex((entry) => entry.id === id);
        if (index < 0) {
            return null;
        }

        const [selected] = current.splice(index, 1);
        current.unshift({
            ...selected,
            createdAt: Date.now(),
        });
        this.writeHistory(current);
        return this.clone(current[0]);
    }

    updateBoardId(id: string, boardId: string): RecipeHistoryEntry | null {
        const current = this.readHistory();
        const index = current.findIndex((entry) => entry.id === id);
        if (index < 0) {
            return null;
        }

        current[index] = {
            ...current[index],
            boardId: `${boardId || ''}`.trim(),
        };
        this.writeHistory(current);
        return this.clone(current[index]);
    }

    updateResponse(id: string, response: RecipeResponse): RecipeHistoryEntry | null {
        const current = this.readHistory();
        const index = current.findIndex((entry) => entry.id === id);
        if (index < 0) {
            return null;
        }

        current[index] = {
            ...current[index],
            response: this.clone(response),
        };
        this.writeHistory(current);
        return this.clone(current[index]);
    }

    replaceHistory(entries: RecipeHistoryEntry[]): RecipeHistoryEntry[] {
        const safeEntries = (Array.isArray(entries) ? entries : [])
            .map((entry) => this.normalizeEntry(entry))
            .filter((entry) => Boolean(entry.query.item) && Array.isArray(entry.response?.recipeNodeArr))
            .slice(0, MAX_HISTORY_ENTRIES);
        this.writeHistory(safeEntries);
        return this.clone(safeEntries);
    }

    private readHistory(): RecipeHistoryEntry[] {
        const history = this.sessionStore.get<any[]>(HISTORY_STORE_KEY, []);
        return (Array.isArray(history) ? history : [])
            .map((entry) => this.normalizeEntry(entry))
            .filter((entry) => Boolean(entry.query.item) && Array.isArray(entry.response?.recipeNodeArr))
            .slice(0, MAX_HISTORY_ENTRIES);
    }

    private writeHistory(entries: RecipeHistoryEntry[]): void {
        this.sessionStore.set(HISTORY_STORE_KEY, this.clone(entries));
    }

    private normalizeEntry(entry: any): RecipeHistoryEntry {
        return {
            id: typeof entry?.id === 'string' && entry.id.trim()
                ? entry.id
                : this.generateId(),
            createdAt: Number.isFinite(Number(entry?.createdAt))
                ? Number(entry.createdAt)
                : Date.now(),
            label: typeof entry?.label === 'string' && entry.label.trim()
                ? entry.label.trim()
                : undefined,
            boardId: typeof entry?.boardId === 'string'
                ? entry.boardId.trim()
                : '',
            query: {
                item: `${entry?.query?.item || ''}`,
                amount: Number.isFinite(Number(entry?.query?.amount))
                    ? Number(entry.query.amount)
                    : 0,
                ingredients: Array.isArray(entry?.query?.ingredients)
                    ? this.clone(entry.query.ingredients)
                    : [],
                useIngredientsToMax: Boolean(entry?.query?.useIngredientsToMax),
                optimizationGoals: Array.isArray(entry?.query?.optimizationGoals)
                    ? this.clone(entry.query.optimizationGoals)
                    : [],
            },
            selectedRecipes: entry?.selectedRecipes && typeof entry.selectedRecipes === 'object'
                ? this.clone(entry.selectedRecipes)
                : {},
            response: this.clone(entry?.response ?? {
                recipeNodeArr: [],
                ingredientsData: { input: [], intermediate: [], output: [], byproduct: [] },
            }),
        };
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
