import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { ConnectedPosition } from '@angular/cdk/overlay';
import { RecipeNode } from '../../services/recipe.service';


import { IngredientsService } from 'app/satisfactory-calculator/services/ingredients.service';
import { FactorySettings } from '../../services/calculator-settings.service';

interface FlowItem {
    itemName: string;
    rateLabel: string;
    rateValue: number;
}

interface MachinePlan {
    machineCountDisplay: string;
    underclockDisplay: string;
    totalShards: number;
    planSummary: string;
    totalMachines: number;
}

interface NodeDistribution {
    impure: number;
    normal: number;
    pure: number;
}

interface ExtractionNodeUsage {
    purity: keyof NodeDistribution;
    rateAt100: number;
    maxRate: number;
    usedRate: number;
    usedClockPercent: number;
}

interface ExtractionPlan {
    usages: ExtractionNodeUsage[];
    remainingRate: number;
}

@Component({
  selector: 'satisfactory-card',
  templateUrl: './satisfactory-card.component.html',
  styleUrl: './satisfactory-card.component.scss',
})
export class SatisfactoryCardComponent implements OnInit, OnChanges {

    @Input() data!: RecipeNode;
    @Input() allNodes: RecipeNode[] = [];
    @Input() factorySettings: FactorySettings = { minerLevel: 1, beltLevel: 1 };
    @Input() isHighlighted = false;
    @Input() suppressHint = false;
    @Output() selectRecipe = new EventEmitter<void>();
    @Output() openFactorySettings = new EventEmitter<void>();
    @Output() statsChange = new EventEmitter<{ nodeId: number; machineCount: number }>();

    machineImageUrl: string = 'images/';
    isExtractorCard = false;
    machineLabelDisplay = '';
    machineCountDisplay = '0';
    selectedNodeCountDisplay = '0';
    selectedNodeCapacityDisplay = '0';
    requiredNodeCountDisplay = '0';
    beltCapDisplay = '0';
    beltLevelDisplay = '1';
    missingInputDisplay = '';
    missingReasonDisplay = '';
    showMissingInput = false;
    underclockDisplay = '';
    shardCountDisplay = '0';
    machinePlanDisplay = '';
    outputRateDisplay = '0';
    inputFlowItems: FlowItem[] = [];
    byproductFlowItems: FlowItem[] = [];
    nodeDistribution: NodeDistribution = { impure: 0, normal: 0, pure: 0 };
    private hasCustomNodeDistribution = false;
    private lastNodeEdit: keyof NodeDistribution | null = null;
    overclockPercent = 100;
    effectiveOverclockPercent = 100;
    effectiveOverclockDisplay = '100';
    machineCountInput = 0;
    machineCountMin = 0;
    machineCountMax = 0;
    optimizeShardUsage = false;
    isHintOpen = false;
    private hideHintTimeout: ReturnType<typeof setTimeout> | null = null;
    hintPositions: ConnectedPosition[] = [
        { originX: 'end', originY: 'top', overlayX: 'start', overlayY: 'top', offsetX: 12 },
        { originX: 'end', originY: 'bottom', overlayX: 'start', overlayY: 'bottom', offsetX: 12 },
        { originX: 'start', originY: 'top', overlayX: 'end', overlayY: 'top', offsetX: -12 },
        { originX: 'start', originY: 'bottom', overlayX: 'end', overlayY: 'bottom', offsetX: -12 },
    ];

    constructor(private ingredientsService: IngredientsService) { }

    ngOnInit(): void {
        this.refreshCardState();
    }

    getItemImageUrl(name: string): string {
        return this.ingredientsService.getItemImageUrl(name);
    }

    showHint() {
        if (this.suppressHint) {
            return;
        }
        if (this.hideHintTimeout) {
            clearTimeout(this.hideHintTimeout);
            this.hideHintTimeout = null;
        }
        this.isHintOpen = true;
    }

    hideHint() {
        if (this.hideHintTimeout) {
            clearTimeout(this.hideHintTimeout);
        }
        // Delay close slightly so moving from node -> hint does not collapse it.
        this.hideHintTimeout = setTimeout(() => {
            this.isHintOpen = false;
            this.hideHintTimeout = null;
        }, 120);
    }

    onSelectRecipeClick(event: MouseEvent) {
        event.preventDefault();
        event.stopPropagation();
        this.selectRecipe.emit();
    }

    onOpenFactorySettingsClick(event: MouseEvent) {
        event.preventDefault();
        event.stopPropagation();
        this.openFactorySettings.emit();
    }

    onOverclockInput(event: Event) {
        const target = event.target as HTMLInputElement | null;
        const next = Number(target?.value);
        if (!Number.isFinite(next)) {
            return;
        }
        this.overclockPercent = Math.min(250, Math.max(1, Math.round(next)));
        if (!this.isExtractorCard && this.data) {
            const baseMachineCount = Math.max(0, Number(this.data.machineCount || 0));
            const bounds = this.getMachineCountBounds(baseMachineCount);
            const totalPercent = baseMachineCount * 100;
            const raw = this.overclockPercent > 0 ? totalPercent / this.overclockPercent : 0;
            this.machineCountInput = this.clampMachineCount(Math.round(raw), bounds.min, bounds.max);
        }
        if (this.isExtractorCard && !this.hasCustomNodeDistribution) {
            this.applyDefaultNodeDistribution();
        }
        this.updatePrimaryStats();
    }

    onMachineCountInput(event: Event) {
        const target = event.target as HTMLInputElement | null;
        const next = Number(target?.value);
        if (!Number.isFinite(next)) {
            return;
        }
        this.machineCountInput = Math.max(0, Math.floor(next));
        this.updatePrimaryStats();
    }

    onOptimizeShardUsageChange(event: Event) {
        const target = event.target as HTMLInputElement | null;
        this.optimizeShardUsage = Boolean(target?.checked);
        this.updatePrimaryStats();
    }

    onNodeCountInput(kind: keyof NodeDistribution, event: Event) {
        const target = event.target as HTMLInputElement | null;
        const next = Number(target?.value);
        if (!Number.isFinite(next)) {
            return;
        }
        this.hasCustomNodeDistribution = true;
        this.lastNodeEdit = kind;
        this.nodeDistribution[kind] = Math.max(0, Math.floor(next));
        this.updatePrimaryStats();
    }

    trackByItemName(_index: number, item: { itemName: string }): string {
        return item.itemName;
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['data']) {
            this.hasCustomNodeDistribution = false;
            this.machineCountInput = 0;
        }

        if (changes['data'] || changes['allNodes'] || changes['factorySettings']) {
            this.refreshCardState();
        }

        if (changes['suppressHint']?.currentValue) {
            this.isHintOpen = false;
        }
    }

    private updateMachineImageUrl(): void {
        if (!this.data) {
            this.machineImageUrl = 'images/';
            return;
        }

        this.machineImageUrl = this.ingredientsService.getMachineImageUrl(
            this.data.machineName,
            this.data.itemName,
            this.data.isBaseMaterial
        );
    }

    private refreshCardState(): void {
        this.updateMachineImageUrl();
        this.updateCardType();
        this.machineLabelDisplay = this.getMachineLabel();
        if (this.isExtractorCard && !this.hasCustomNodeDistribution) {
            this.applyDefaultNodeDistribution();
        }
        this.updatePrimaryStats();
        this.updateFlowItems();
    }

    private updatePrimaryStats(): void {
        if (!this.data) {
            this.machineCountDisplay = '0';
            this.selectedNodeCountDisplay = '0';
            this.selectedNodeCapacityDisplay = '0';
            this.requiredNodeCountDisplay = '0';
            this.underclockDisplay = '';
            this.shardCountDisplay = '0';
            this.machinePlanDisplay = '';
            this.outputRateDisplay = '0';
            this.effectiveOverclockPercent = this.overclockPercent;
            this.effectiveOverclockDisplay = this.formatPercent(this.effectiveOverclockPercent);
            this.emitMachineCount(0);
            return;
        }

        const outputRate = this.parseRate(this.data.productionRate);
        this.outputRateDisplay = this.formatRate(outputRate);

        if (this.isExtractorCard) {
            this.effectiveOverclockPercent = this.overclockPercent;
            this.effectiveOverclockDisplay = this.formatPercent(this.effectiveOverclockPercent);
            const requiredNormalNodes = this.calculateRequiredNormalNodes(outputRate);
            if (!this.hasCustomNodeDistribution) {
                this.nodeDistribution = { impure: 0, normal: Math.ceil(requiredNormalNodes), pure: 0 };
                this.lastNodeEdit = null;
            } else {
                this.adjustNormalNodes(requiredNormalNodes);
            }

            const selectedNodes = this.getSelectedNodeCount();
            const selectedCapacity = this.calculateSelectedNodeCapacity();
            const selectedCapacityNoBelt = this.calculateSelectedNodeCapacityWithoutBelt();
            const extractionPlan = this.calculateExtractionPlan(outputRate);
            const shardPlan = this.calculateShardPlanForExtraction(extractionPlan);
            const activeMachineCount = extractionPlan.usages.length;
            const partialUsages = extractionPlan.usages.filter((usage) => usage.usedClockPercent < 99.99);

            this.selectedNodeCountDisplay = this.formatNodeCount(selectedNodes);
            this.selectedNodeCapacityDisplay = this.formatRate(selectedCapacity);
            this.requiredNodeCountDisplay = this.formatNodeCount(requiredNormalNodes);
            this.beltCapDisplay = this.formatRate(this.getBeltCapacityLimit());
            this.beltLevelDisplay = `${this.factorySettings?.beltLevel || 1}`;

            this.machineCountDisplay = `${activeMachineCount}`;
            this.underclockDisplay = partialUsages.length > 0
                ? partialUsages.map((usage) => `1 ${usage.purity} at ${this.formatPercent(usage.usedClockPercent)}%`).join(' + ')
                : '';
            this.shardCountDisplay = `${shardPlan.totalShards}`;
            if (extractionPlan.remainingRate > 0.0001) {
                const beltLimit = this.getBeltCapacityLimit();
                const beltIsLimiting = selectedNodes > 0
                    && selectedCapacityNoBelt + 0.01 >= outputRate
                    && selectedCapacity + 0.01 < outputRate;
                this.missingInputDisplay = `Missing ${this.formatRate(extractionPlan.remainingRate)} / min input`;
                this.missingReasonDisplay = selectedNodes <= 0
                    ? 'No nodes selected for this output.'
                    : beltIsLimiting
                        ? `Belt Mk.${this.beltLevelDisplay} caps each node to ${this.beltCapDisplay} / min. Increase belt or add nodes.`
                        : 'Not enough nodes selected for this output.';
                this.showMissingInput = true;
                this.machinePlanDisplay = shardPlan.planSummary;
            } else {
                this.missingInputDisplay = '';
                this.missingReasonDisplay = '';
                this.showMissingInput = false;
                this.machinePlanDisplay = shardPlan.planSummary;
            }
            this.emitMachineCount(activeMachineCount);
            return;
        }

        const baseMachineCount = Math.max(0, Number(this.data.machineCount || 0));
        const bounds = this.getMachineCountBounds(baseMachineCount);
        const totalPercent = baseMachineCount * 100;
        if (this.machineCountInput <= 0) {
            this.machineCountInput = bounds.max;
        }
        this.machineCountInput = this.clampMachineCount(this.machineCountInput, bounds.min, bounds.max);
        const distribution = this.buildOverclockDistribution(totalPercent, this.machineCountInput);
        const averageClock = this.machineCountInput > 0 ? totalPercent / this.machineCountInput : 0;
        this.overclockPercent = Math.min(250, Math.max(1, averageClock));
        this.effectiveOverclockPercent = this.overclockPercent;
        this.effectiveOverclockDisplay = this.formatPercent(this.overclockPercent);
        this.machineCountDisplay = `${this.machineCountInput}`;
        this.underclockDisplay = distribution.underclockSummary;
        this.shardCountDisplay = `${distribution.totalShards}`;
        this.machinePlanDisplay = distribution.summary;
        this.selectedNodeCountDisplay = '0';
        this.selectedNodeCapacityDisplay = '0';
        this.requiredNodeCountDisplay = '0';
        this.emitMachineCount(this.machineCountInput);
    }

    private emitMachineCount(machineCount: number): void {
        if (!this.data) {
            return;
        }
        const normalized = Number.isFinite(machineCount) ? machineCount : 0;
        this.statsChange.emit({ nodeId: this.data.id, machineCount: normalized });
    }

    private updateFlowItems(): void {
        if (!this.data || this.isExtractorCard) {
            this.inputFlowItems = [];
            this.byproductFlowItems = [];
            return;
        }

        const nodeById = new Map<number, RecipeNode>();
        for (const node of this.allNodes || []) {
            nodeById.set(node.id, node);
        }

        const aggregatedInputs = new Map<string, number>();
        for (const ingredientId of this.data.ingredients || []) {
            const ingredientNode = nodeById.get(ingredientId);
            if (!ingredientNode) {
                continue;
            }

            const ingredientRate = this.parseRate(ingredientNode.productionRate);
            aggregatedInputs.set(
                ingredientNode.itemName,
                (aggregatedInputs.get(ingredientNode.itemName) || 0) + ingredientRate
            );
        }

        this.inputFlowItems = Array.from(aggregatedInputs.entries())
            .map(([itemName, rate]) => ({
                itemName,
                rateValue: rate,
                rateLabel: `${this.formatRate(rate)} / min`,
            }))
            .sort((a, b) => b.rateValue - a.rateValue);

        this.byproductFlowItems = (this.data.byproducts || [])
            .map((item) => {
                const rate = this.parseRate(item.productionRate);
                return {
                    itemName: item.itemName,
                    rateValue: rate,
                    rateLabel: `${this.formatRate(rate)} / min`,
                };
            })
            .sort((a, b) => b.rateValue - a.rateValue);
    }

    private parseRate(value: string | number | undefined): number {
        if (typeof value === 'number') {
            return Number.isFinite(value) ? value : 0;
        }

        const parsed = Number.parseFloat(`${value ?? 0}`);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    private formatRate(value: number): string {
        if (!Number.isFinite(value)) {
            return '0';
        }

        const abs = Math.abs(value);
        const precision = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
        return Number(value.toFixed(precision)).toString();
    }

    private updateCardType(): void {
        if (!this.data) {
            this.isExtractorCard = false;
            return;
        }
        const machineName = `${this.data.machineName || ''}`.toLowerCase();
        const recipeName = `${this.data.recipeName || ''}`.toLowerCase();
        this.isExtractorCard = Boolean(this.data.isBaseMaterial)
            || recipeName === 'raw resource'
            || machineName.includes('extractor')
            || machineName.includes('miner');
    }

    private applyDefaultNodeDistribution(): void {
        if (!this.data || !this.isExtractorCard) {
            return;
        }

        const outputRate = this.parseRate(this.data.productionRate);
        const requiredNormalNodes = this.calculateRequiredNormalNodes(outputRate);
        this.nodeDistribution = {
            impure: 0,
            normal: Math.ceil(requiredNormalNodes),
            pure: 0,
        };
        this.lastNodeEdit = null;
    }

    private adjustNormalNodes(requiredNormalNodes: number): void {
        if (this.lastNodeEdit === 'normal') {
            return;
        }

        const normalEquivalentFromOthers = this.nodeDistribution.impure * 0.5 + this.nodeDistribution.pure * 2;
        const remaining = Math.max(0, requiredNormalNodes - normalEquivalentFromOthers);
        this.nodeDistribution.normal = Math.ceil(remaining);
    }

    private calculateRequiredNormalNodes(outputRate: number): number {
        const normalRate = this.getNormalNodeRateAtCurrentClock();
        if (normalRate <= 0) {
            return 0;
        }
        return outputRate / normalRate;
    }

    private calculateSelectedNodeCapacity(): number {
        const rates = this.getNodeRates();
        return this.nodeDistribution.impure * rates.impure.maxRate
            + this.nodeDistribution.normal * rates.normal.maxRate
            + this.nodeDistribution.pure * rates.pure.maxRate;
    }

    private calculateSelectedNodeCapacityWithoutBelt(): number {
        const normalRateAt100 = this.getNormalNodeRateAt100();
        const overclockFactor = this.overclockPercent / 100;
        const impureRateAt100 = normalRateAt100 * 0.5;
        const normalRateAt100Effective = normalRateAt100;
        const pureRateAt100 = normalRateAt100 * 2;

        return this.nodeDistribution.impure * impureRateAt100 * overclockFactor
            + this.nodeDistribution.normal * normalRateAt100Effective * overclockFactor
            + this.nodeDistribution.pure * pureRateAt100 * overclockFactor;
    }

    private getSelectedNodeCount(): number {
        return this.nodeDistribution.impure + this.nodeDistribution.normal + this.nodeDistribution.pure;
    }

    private getNormalNodeRateAtCurrentClock(): number {
        const normalBaseRate = this.getNormalNodeRateAt100();
        const beltLimit = this.getBeltCapacityLimit();
        const overclockRate = normalBaseRate * (this.overclockPercent / 100);
        return Math.min(overclockRate, beltLimit);
    }

    private getNormalNodeRateAt100(): number {
        const minerLevel = Number(this.factorySettings?.minerLevel || 1);
        if (minerLevel === 2) {
            return 120;
        }
        if (minerLevel === 3) {
            return 240;
        }
        return 60;
    }

    private getBeltCapacityLimit(): number {
        const beltLevel = Number(this.factorySettings?.beltLevel || 1);
        if (beltLevel === 2) {
            return 120;
        }
        if (beltLevel === 3) {
            return 270;
        }
        if (beltLevel === 4) {
            return 480;
        }
        if (beltLevel === 5) {
            return 780;
        }
        if (beltLevel === 6) {
            return 1200;
        }
        return 60;
    }

    private computeOptimizedOverclockPercent(baseMachineCount: number): number {
        const epsilon = 0.0001;
        if (!Number.isFinite(baseMachineCount) || baseMachineCount <= epsilon) {
            return this.overclockPercent;
        }

        const overclockMultiplier = this.overclockPercent / 100;
        if (overclockMultiplier <= 0) {
            return this.overclockPercent;
        }

        const machineCountRaw = baseMachineCount / overclockMultiplier;
        if (machineCountRaw <= 1 + epsilon) {
            const singleClock = baseMachineCount * 100;
            return Math.min(250, Math.max(1, singleClock));
        }

        const targetMachines = Math.max(1, Math.floor(machineCountRaw + epsilon));
        const requiredClock = this.overclockPercent * (machineCountRaw / targetMachines);
        if (!Number.isFinite(requiredClock) || requiredClock > 250) {
            return this.overclockPercent;
        }

        return Math.max(1, requiredClock);
    }

    private calculateMachinePlan(baseMachineCount: number, clockPercent: number): MachinePlan {
        const epsilon = 0.0001;
        const overclockMultiplier = clockPercent / 100;
        const machineCountRaw = overclockMultiplier > 0 ? baseMachineCount / overclockMultiplier : 0;

        if (!this.optimizeShardUsage) {
            const fullMachinesAtTarget = Math.floor(machineCountRaw + epsilon);
            let remainder = machineCountRaw - fullMachinesAtTarget;
            if (remainder < epsilon) {
                remainder = 0;
            }

            const partialClock = remainder > 0 ? clockPercent * remainder : 0;
            const totalMachines = fullMachinesAtTarget + (partialClock > 0 ? 1 : 0);
            const fullShardCost = this.shardsForClock(clockPercent);
            const partialShardCost = partialClock > 0 ? this.shardsForClock(partialClock) : 0;
            const totalShards = fullMachinesAtTarget * fullShardCost + partialShardCost;

            const planParts: string[] = [];
            if (fullMachinesAtTarget > 0) {
                planParts.push(`${fullMachinesAtTarget} at ${this.formatPercent(clockPercent)}%`);
            }
            if (partialClock > 0) {
                planParts.push(`1 at ${this.formatPercent(partialClock)}%`);
            }

            return {
                machineCountDisplay: `${totalMachines}`,
                underclockDisplay: partialClock > 0 ? `1 at ${this.formatPercent(partialClock)}%` : '',
                totalShards,
                planSummary: planParts.length ? planParts.join(' + ') : 'No machines needed',
                totalMachines,
            };
        }

        const machineCountRounded = Math.ceil(machineCountRaw - epsilon);
        const totalShards = machineCountRounded * this.shardsForClock(clockPercent);

        return {
            machineCountDisplay: `${Math.max(0, machineCountRounded)}`,
            underclockDisplay: machineCountRounded > 0 && clockPercent !== 100
                ? `${machineCountRounded} at ${this.formatPercent(clockPercent)}%`
                : '',
            totalShards,
            planSummary: machineCountRounded > 0
                ? `${machineCountRounded} at ${this.formatPercent(clockPercent)}%`
                : 'No machines needed',
            totalMachines: Math.max(0, machineCountRounded),
        };
    }

    private getMachineCountBounds(baseMachineCount: number): { min: number; max: number } {
        const totalPercent = baseMachineCount * 100;
        if (totalPercent <= 0) {
            this.machineCountMin = 0;
            this.machineCountMax = 0;
            return { min: 0, max: 0 };
        }
        const min = Math.max(1, Math.ceil(totalPercent / 250));
        const max = Math.max(min, Math.ceil(totalPercent / 100));
        this.machineCountMin = min;
        this.machineCountMax = max;
        return { min, max };
    }

    private clampMachineCount(value: number, min: number, max: number): number {
        if (!Number.isFinite(value)) {
            return max;
        }
        return Math.min(Math.max(Math.floor(value), min), max);
    }

    private buildOverclockDistribution(totalPercent: number, machineCount: number): { summary: string; underclockSummary: string; totalShards: number } {
        if (totalPercent <= 0 || machineCount <= 0) {
            return { summary: 'No machines needed', underclockSummary: '', totalShards: 0 };
        }

        const clocks: number[] = Array.from({ length: machineCount }, () => 100);
        const baseTotal = 100 * machineCount;

        if (totalPercent <= baseTotal) {
            const remainder = totalPercent - 100 * (machineCount - 1);
            clocks[machineCount - 1] = Math.max(1, Math.min(100, remainder));
        } else {
            let extra = totalPercent - baseTotal;
            for (let i = 0; i < machineCount && extra > 0.0001; i += 1) {
                const add = Math.min(150, extra);
                clocks[i] = 100 + add;
                extra -= add;
            }
        }

        let totalShards = 0;
        for (const clock of clocks) {
            totalShards += this.shardsForClock(clock);
        }

        const summary = this.formatClockSummary(clocks);
        const underclockSummary = this.formatClockSummary(clocks.filter((clock) => Math.abs(clock - 100) > 0.05));

        return { summary, underclockSummary, totalShards };
    }

    private formatClockSummary(clocks: number[]): string {
        if (!clocks.length) {
            return '';
        }
        const buckets = new Map<string, { count: number; value: number }>();
        for (const clock of clocks) {
            const value = Number(this.formatPercent(clock));
            const key = value.toString();
            const entry = buckets.get(key);
            if (entry) {
                entry.count += 1;
            } else {
                buckets.set(key, { count: 1, value });
            }
        }
        const entries = Array.from(buckets.values()).sort((a, b) => a.value - b.value);
        return entries.map((entry) => `${entry.count} at ${this.formatPercent(entry.value)}%`).join(' + ');
    }

    private calculateExtractionPlan(requiredRate: number): ExtractionPlan {
        const epsilon = 0.0001;
        const nodeRates = this.getNodeRates();
        const selectedNodes: ExtractionNodeUsage[] = [];

        const appendNodes = (purity: keyof NodeDistribution, count: number) => {
            const integerCount = Math.max(0, Math.floor(count));
            for (let i = 0; i < integerCount; i += 1) {
                selectedNodes.push({
                    purity,
                    rateAt100: nodeRates[purity].rateAt100,
                    maxRate: nodeRates[purity].maxRate,
                    usedRate: 0,
                    usedClockPercent: 0,
                });
            }
        };

        appendNodes('pure', this.nodeDistribution.pure);
        appendNodes('normal', this.nodeDistribution.normal);
        appendNodes('impure', this.nodeDistribution.impure);

        let remainingRate = Math.max(0, requiredRate);
        const usages: ExtractionNodeUsage[] = [];

        for (const node of selectedNodes) {
            if (remainingRate <= epsilon) {
                break;
            }

            const usedRate = Math.min(node.maxRate, remainingRate);
            const usedClockPercent = node.rateAt100 > 0
                ? (usedRate / node.rateAt100) * 100
                : 0;

            usages.push({
                ...node,
                usedRate,
                usedClockPercent: Math.min(this.overclockPercent, usedClockPercent),
            });

            remainingRate -= usedRate;
        }

        return {
            usages,
            remainingRate: Math.max(0, remainingRate),
        };
    }

    private calculateShardPlanForExtraction(plan: ExtractionPlan): MachinePlan {
        if (plan.usages.length === 0) {
            return {
                machineCountDisplay: '0',
                underclockDisplay: '',
                totalShards: 0,
                planSummary: 'No machines needed',
                totalMachines: 0,
            };
        }

        if (!this.optimizeShardUsage) {
            const activeMachines = plan.usages.length;
            const totalShards = activeMachines * this.shardsForClock(this.overclockPercent);
            return {
                machineCountDisplay: `${activeMachines}`,
                underclockDisplay: '',
                totalShards,
                planSummary: `${activeMachines} at ${this.formatPercent(this.overclockPercent)}%`,
                totalMachines: activeMachines,
            };
        }

        const summaryParts: string[] = [];
        let totalShards = 0;
        for (const usage of plan.usages) {
            const clock = Math.max(1, usage.usedClockPercent);
            totalShards += this.shardsForClock(clock);
            summaryParts.push(`1 ${usage.purity} at ${this.formatPercent(clock)}%`);
        }

        return {
            machineCountDisplay: `${plan.usages.length}`,
            underclockDisplay: '',
            totalShards,
            planSummary: summaryParts.join(' + '),
            totalMachines: plan.usages.length,
        };
    }

    private getNodeRates(): Record<keyof NodeDistribution, { rateAt100: number; maxRate: number }> {
        const normalRateAt100 = this.getNormalNodeRateAt100();
        const beltLimit = this.getBeltCapacityLimit();
        const overclockFactor = this.overclockPercent / 100;

        const impureRateAt100 = Math.min(normalRateAt100 * 0.5, beltLimit);
        const normalAt100 = Math.min(normalRateAt100, beltLimit);
        const pureRateAt100 = Math.min(normalRateAt100 * 2, beltLimit);

        return {
            impure: {
                rateAt100: impureRateAt100,
                maxRate: Math.min(impureRateAt100 * overclockFactor, beltLimit),
            },
            normal: {
                rateAt100: normalAt100,
                maxRate: Math.min(normalAt100 * overclockFactor, beltLimit),
            },
            pure: {
                rateAt100: pureRateAt100,
                maxRate: Math.min(pureRateAt100 * overclockFactor, beltLimit),
            },
        };
    }

    private shardsForClock(clockPercent: number): number {
        if (clockPercent <= 100) {
            return 0;
        }
        if (clockPercent <= 150) {
            return 1;
        }
        if (clockPercent <= 200) {
            return 2;
        }
        return 3;
    }

    private formatPercent(value: number): string {
        return Number(value.toFixed(1)).toString();
    }

    get overclockMarkers(): Array<{ label: string; offsetPercent: number }> {
        return [1, 100, 150, 200, 250].map((value) => ({
            label: `${value}%`,
            offsetPercent: ((value - 1) / (250 - 1)) * 100,
        }));
    }

    private getMachineLabel(): string {
        if (!this.data) {
            return '';
        }

        if (this.isExtractorCard) {
            return `Miner Mk.${this.factorySettings?.minerLevel || 1}`;
        }

        return this.data.machineName || 'Unknown';
    }

    private formatNodeCount(value: number): string {
        if (!Number.isFinite(value)) {
            return '0';
        }
        return Number(value.toFixed(2)).toString();
    }
}
