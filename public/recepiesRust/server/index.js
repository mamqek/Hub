const express = require('express');
const { execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

/**
 * Service execution map:
 * 1) Receive /run-calc request and normalize input payload.
 * 2) Build optimizer problem from the requested item/amount, optional ingredient limits,
 *    and optional selected recipes.
 * 3) Run Python optimizer, parse JSON output plan, and optionally retry with
 *    useIngredientsToMax=true when strict limits are infeasible.
 * 4) Transform optimizer plan into frontend payload:
 *    - recipeNodeArr (graph nodes)
 *    - ingredientsData (input/intermediate/output/byproduct lists)
 *    - recipeOptions (all recipes that can produce target/intermediate items)
 * 5) Return transformed JSON to Laravel/frontend.
 */

const app = express();
const PORT = 8001;

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Static paths to keep the service simple (no .env parsing here).
const REPO_ROOT = path.join(__dirname, '..', '..', '..');
const OPTIMIZER_ROOT = path.join(REPO_ROOT, 'satisfactory-optimizer');
const PYTHON_BIN = 'python3';

const OPTIMIZER_SCRIPT = path.join(OPTIMIZER_ROOT, 'satisfactory-optimizer.py');
const RECIPES_PATH = path.join(OPTIMIZER_ROOT, 'recipes.json');
const ITEMS_PATH = path.join(OPTIMIZER_ROOT, 'items.json');

// Solver baseline. Alternates are opt-in via selectedRecipes.
const BASE_INCLUDED_RECIPE_GROUPS = ['default', 'extraction'];
const MINER_GROUP_BY_LEVEL = {
    1: 'miner_mk1',
    2: 'miner_mk2',
    3: 'miner_mk3',
};
const BELT_CAPACITY_BY_LEVEL = {
    1: 60,
    2: 120,
    3: 270,
    4: 480,
    5: 780,
    6: 1200,
};
const NORMAL_MINER_BASE_RATE_BY_LEVEL = {
    1: 60,
    2: 120,
    3: 240,
};
const DEFAULT_FACTORY_SETTINGS = {
    minerLevel: 1,
    beltLevel: 1,
};
const LARGE_NODE_POOL = 1000000;

/** Strip comments and trailing commas so JSON5-like files parse safely. */
const sanitizeJson = (text) => {
    const withoutComments = text.replace(/^\s*#.*$/gm, '');
    return withoutComments.replace(/,\s*([}\]])/g, '$1');
};

/** Load and parse a JSON dataset from disk. */
const loadJsonDataset = (filePath) => {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(sanitizeJson(raw));
};

/** Parse value into finite number, else return 0. */
const safeNumber = (value) => {
    if (value === null || value === undefined) {
        return 0;
    }
    const num = typeof value === 'number' ? value : parseFloat(value);
    return Number.isFinite(num) ? num : 0;
};

/** Format rates to 2 decimals for frontend consistency. */
const formatRate = (value) => safeNumber(value).toFixed(2);

/** Snap values that are effectively integers to avoid noisy machine counts. */
const snapNearInteger = (value, epsilon = 1e-2) => {
    const num = safeNumber(value);
    const rounded = Math.round(num);
    return Math.abs(num - rounded) <= epsilon ? rounded : num;
};

/** Format machine counts, snapping near-integers to whole numbers. */
const formatCount = (value) => {
    const snapped = snapNearInteger(value);
    return Number.isInteger(snapped) ? `${snapped}` : safeNumber(snapped).toFixed(2);
};

/** Normalize names for case-insensitive lookup. */
const normalizeName = (value) => `${value || ''}`.trim().toLowerCase().replace(/\s+/g, ' ');

/** Parse unknown payload into object map; supports JSON strings. */
const parseObjectPayload = (value) => {
    if (!value) {
        return {};
    }
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
        } catch {
            return {};
        }
    }
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
};

/** Parse unknown payload into array; supports JSON strings. */
const parseArrayPayload = (value) => {
    if (!value) {
        return [];
    }
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
    return Array.isArray(value) ? value : [];
};

/** Parse common truthy values into boolean. */
const toBoolean = (value) => {
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'string') {
        return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
    }
    return false;
};

/** Normalize factory-level extraction settings used by backend defaults. */
const normalizeFactorySettings = (value) => {
    const parsed = parseObjectPayload(value);
    const minerCandidate = safeNumber(parsed.minerLevel);
    const beltCandidate = safeNumber(parsed.beltLevel);

    const minerLevel = minerCandidate === 2 || minerCandidate === 3 ? minerCandidate : 1;
    const beltLevel = beltCandidate >= 1 && beltCandidate <= 6 ? Math.floor(beltCandidate) : 1;

    return { minerLevel, beltLevel };
};

const buildFactoryExtractionSettings = (factorySettings) => {
    const normalized = normalizeFactorySettings(factorySettings);
    const minerGroup = MINER_GROUP_BY_LEVEL[normalized.minerLevel] || MINER_GROUP_BY_LEVEL[DEFAULT_FACTORY_SETTINGS.minerLevel];
    const beltCapacity = BELT_CAPACITY_BY_LEVEL[normalized.beltLevel] || BELT_CAPACITY_BY_LEVEL[DEFAULT_FACTORY_SETTINGS.beltLevel];
    const normalNodeBaseRate = NORMAL_MINER_BASE_RATE_BY_LEVEL[normalized.minerLevel] || NORMAL_MINER_BASE_RATE_BY_LEVEL[DEFAULT_FACTORY_SETTINGS.minerLevel];
    const maxClockSpeed = Math.max(0.01, Math.min(2.5, beltCapacity / normalNodeBaseRate));

    return {
        ...normalized,
        minerGroup,
        beltCapacity,
        normalNodeBaseRate,
        maxClockSpeed,
    };
};

const recipeData = loadJsonDataset(RECIPES_PATH);
const allItems = loadJsonDataset(ITEMS_PATH);

const itemIndex = new Map(allItems.map((name) => [normalizeName(name), name]));

/** Resolve user-facing item name into canonical dataset item name. */
const resolveItemName = (name) => {
    if (!name) {
        return name;
    }
    return itemIndex.get(normalizeName(name)) || name;
};

/** Build recipe metadata lookup used for machine names and node expansion. */
const recipeMeta = new Map(Object.entries(recipeData).map(([name, data]) => [
    name,
    {
        machine: data.machine || 'Unknown',
        inputs: data.inputs || {},
        outputs: data.outputs || {},
        tags: data.tags || [],
        nodeType: data.node_type || null,
    },
]));

const NORMAL_EXTRACTION_NODE_LIMITS = (() => {
    const limits = {};
    for (const data of Object.values(recipeData)) {
        const tags = Array.isArray(data.tags) ? data.tags : [];
        const nodeType = typeof data.node_type === 'string' ? data.node_type : '';
        if (!tags.includes('extraction')) {
            continue;
        }
        if (!nodeType.startsWith('Normal ')) {
            continue;
        }
        limits[nodeType] = LARGE_NODE_POOL;
    }
    return limits;
})();

const MINER_NORMAL_OUTPUT_RATE_BY_GROUP = (() => {
    const byGroup = {
        miner_mk1: {},
        miner_mk2: {},
        miner_mk3: {},
    };

    for (const data of Object.values(recipeData)) {
        const tags = Array.isArray(data.tags) ? data.tags : [];
        const nodeType = typeof data.node_type === 'string' ? data.node_type : '';
        if (!nodeType.startsWith('Normal ')) {
            continue;
        }

        const minerTag = tags.find((tag) => tag in byGroup);
        if (!minerTag) {
            continue;
        }

        const outputs = data.outputs || {};
        const outputEntries = Object.entries(outputs);
        if (!outputEntries.length) {
            continue;
        }

        const [outputItem, outputQtyRaw] = outputEntries[0];
        const outputQty = safeNumber(outputQtyRaw);
        const recipeTime = safeNumber(data.time);
        if (outputQty <= 0 || recipeTime <= 0) {
            continue;
        }

        byGroup[minerTag][outputItem] = outputQty * 60 / recipeTime;
    }

    return byGroup;
})();

/** Map each output item to every recipe that can produce it. */
const outputRecipesMap = (() => {
    const map = new Map();
    for (const [recipeName, data] of Object.entries(recipeData)) {
        const outputs = data.outputs || {};
        for (const outputItem of Object.keys(outputs)) {
            if (!map.has(outputItem)) {
                map.set(outputItem, []);
            }
            map.get(outputItem).push(recipeName);
        }
    }
    for (const [itemName, recipes] of map.entries()) {
        recipes.sort((a, b) => a.localeCompare(b));
        map.set(itemName, recipes);
    }
    return map;
})();

/** Compute base/raw inputs by recipe-group visibility + extraction outputs. */
const computeRawInputs = (includedTags = BASE_INCLUDED_RECIPE_GROUPS) => {
    const outputs = new Set();
    const inputs = new Set();
    const extractionOutputs = new Set();
    const tagList = Array.isArray(includedTags) ? includedTags : [includedTags];

    for (const recipe of Object.values(recipeData)) {
        const tags = recipe.tags || [];
        const outs = recipe.outputs || {};
        const ins = recipe.inputs || {};

        if (tags.includes('extraction')) {
            for (const item of Object.keys(outs)) {
                extractionOutputs.add(item);
            }
        }

        if (!tagList.some((tag) => tags.includes(tag))) {
            continue;
        }

        for (const item of Object.keys(outs)) {
            outputs.add(item);
        }
        for (const item of Object.keys(ins)) {
            inputs.add(item);
        }
    }

    const raw = new Set(extractionOutputs);
    for (const item of inputs) {
        if (!outputs.has(item)) {
            raw.add(item);
        }
    }

    return Array.from(raw.values());
};

const rawInputs = computeRawInputs(BASE_INCLUDED_RECIPE_GROUPS);

/**
 * Build optimizer problem from request data.
 * - Baseline: default + extraction groups.
 * - Selected recipes: explicitly included, alternatives for same output excluded.
 */
const buildProblem = ({ item, amount, limits, useMax, selectedRecipes, optimizationGoals, factorySettings }) => {
    const canonicalItem = resolveItemName(item);
    const selectedMap = parseObjectPayload(selectedRecipes);
    const extractionSettings = buildFactoryExtractionSettings(factorySettings);
    const excludedRecipes = new Set();
    const problem = {
        included_recipes: [...BASE_INCLUDED_RECIPE_GROUPS],
        excluded_recipes: [],
        input_items: {},
        output_items: {},
        nodes: { ...NORMAL_EXTRACTION_NODE_LIMITS },
        overclocking: {
            [extractionSettings.minerGroup]: {
                min_clock_speed: 0.01,
                max_clock_speed: extractionSettings.maxClockSpeed,
            },
        },
    };

    for (const minerGroup of Object.values(MINER_GROUP_BY_LEVEL)) {
        if (minerGroup !== extractionSettings.minerGroup) {
            excludedRecipes.add(minerGroup);
        }
    }

    for (const raw of rawInputs) {
        problem.input_items[raw] = 'unlimited';
    }

    for (const limit of parseArrayPayload(limits)) {
        if (!limit || !limit.itemName) {
            continue;
        }
        const limitAmount = safeNumber(limit.amount);
        if (limitAmount <= 0) {
            continue;
        }
        const canonicalLimit = resolveItemName(limit.itemName);
        if (!itemIndex.has(normalizeName(canonicalLimit))) {
            continue;
        }
        problem.input_items[canonicalLimit] = limitAmount;
    }

    for (const name of allItems) {
        problem.output_items[name] = 'unlimited';
    }

    const normalizedGoals = parseArrayPayload(optimizationGoals)
        .filter((goal) => Array.isArray(goal) && typeof goal[0] === 'string' && goal.length >= 2)
        .map(([goalType, goalValue]) => [goalType, goalValue]);

    if (useMax) {
        problem.output_items[canonicalItem] = 'unlimited';
    } else {
        const targetAmount = safeNumber(amount) > 0 ? safeNumber(amount) : 1;
        problem.output_items[canonicalItem] = targetAmount;
    }

    if (normalizedGoals.length > 0) {
        problem.optimization_goals = normalizedGoals;
    } else if (useMax) {
        problem.optimization_goals = [['maximize_item_output', canonicalItem]];
    }

    problem.minimize_machine_count = true;

    for (const [itemName, recipeNameRaw] of Object.entries(selectedMap)) {
        const canonicalItemName = resolveItemName(itemName);
        const recipeName = `${recipeNameRaw || ''}`.trim();
        if (!recipeName) {
            continue;
        }

        const candidates = outputRecipesMap.get(canonicalItemName) || [];
        if (!candidates.includes(recipeName)) {
            continue;
        }

        for (const candidate of candidates) {
            if (candidate !== recipeName) {
                excludedRecipes.add(candidate);
            }
        }

        if (!problem.included_recipes.includes(recipeName)) {
            problem.included_recipes.push(recipeName);
        }
    }

    if (excludedRecipes.size > 0) {
        problem.excluded_recipes = Array.from(excludedRecipes.values());
    }

    return problem;
};

/** Execute optimizer script and return parsed JSON plan. */
const runOptimizer = (problem) => new Promise((resolve, reject) => {
    if (!fs.existsSync(OPTIMIZER_SCRIPT)) {
        reject(new Error(`Optimizer script not found at ${OPTIMIZER_SCRIPT}`));
        return;
    }

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'satisfactory-optimizer-'));
    const problemPath = path.join(tmpDir, 'problem.json');
    fs.writeFileSync(problemPath, JSON.stringify(problem, null, 2));

    execFile(
        PYTHON_BIN,
        [OPTIMIZER_SCRIPT, problemPath],
        { cwd: OPTIMIZER_ROOT, maxBuffer: 1024 * 1024 * 50 },
        (error, stdout, stderr) => {
            fs.rmSync(tmpDir, { recursive: true, force: true });

            if (error) {
                reject(new Error(stderr || error.message));
                return;
            }

            const trimmed = stdout.trim();
            if (!trimmed) {
                reject(new Error(stderr || 'No output from optimizer'));
                return;
            }

            try {
                resolve(JSON.parse(trimmed));
            } catch (parseError) {
                reject(new Error(stderr || parseError.message));
            }
        }
    );
});

/** Build user-facing guidance for solver failures based on context + stderr content. */
const mapCalculationError = (errorMessage, context) => {
    const normalized = `${errorMessage || ''}`.trim();
    const hasInfeasible = /infeasible/i.test(normalized);
    const hasUnbounded = /unbounded/i.test(normalized);
    const hasNoSolution = /no solution found/i.test(normalized);

    if (hasUnbounded) {
        if (context.useIngredientsToMax && context.limits.length > 0) {
            return {
                status: 422,
                error: 'Max mode cannot find a finite solution for the current limits.',
                userMessage: 'Your request is unbounded in "Use ingredients to max" mode. Try disabling "Use ingredients to max", adding more ingredient limits, or adding optimization goals that cap key flows.',
                details: normalized,
            };
        }

        return {
            status: 422,
            error: 'The request is mathematically unbounded.',
            userMessage: 'The calculator cannot find a finite optimum for this request. Add stricter limits, provide a fixed output amount, or adjust optimization goals.',
            details: normalized,
        };
    }

    if (hasInfeasible || hasNoSolution) {
        if (context.limits.length > 0) {
            return {
                status: 422,
                error: 'No feasible plan with current ingredient limits.',
                userMessage: 'The current ingredient limits and recipe selections conflict. Increase one or more limits, switch selected recipes, or reduce target output.',
                details: normalized,
            };
        }

        return {
            status: 422,
            error: 'No feasible plan for this request.',
            userMessage: 'The selected output, recipes, and goals cannot be satisfied together. Try a smaller output or different recipe selections/goals.',
            details: normalized,
        };
    }

    return {
        status: 500,
        error: 'Calculation failed.',
        userMessage: 'The calculator failed unexpectedly. Please retry or adjust your request.',
        details: normalized || 'Unknown calculation error',
    };
};

/** Find recipe in solved plan by checking which recipe outputs the requested item. */
const findRecipeForItem = (plan, itemName) => {
    const matches = [];
    for (const [recipeName, recipePlan] of Object.entries(plan.recipes || {})) {
        const outputRate = safeNumber(recipePlan?.outputs?.[itemName]);
        if (outputRate > 0) {
            matches.push({ recipeName, outputRate });
        }
    }

    if (!matches.length) {
        return null;
    }
    if (matches.length === 1) {
        return matches[0].recipeName;
    }

    // Rare fallback: if multiple recipes produce the same item in one plan, pick highest contribution.
    matches.sort((a, b) => b.outputRate - a.outputRate);
    return matches[0].recipeName;
};

/** Convert solved plan into graph nodes expected by frontend canvas. */
const buildRecipeNodes = (plan, targetItem, targetRate) => {
    const nodes = [];
    let nextId = 0;
    console.log('Building recipe nodes for plan:', JSON.stringify(plan, null, 2));

    /** Recursively expand each item into node + ingredient children. */
    const buildNode = (itemName, requiredRate, indentLevel, parentId, path) => {
        const id = nextId++;
        const node = {
            id,
            itemName,
            productionRate: formatRate(requiredRate),
            indentLevel,
            ingredients: [],
        };

        if (parentId !== null) {
            node.parentId = parentId;
        }

        const recipeName = findRecipeForItem(plan, itemName);
        if (!recipeName || !plan.recipes?.[recipeName] || path.has(itemName)) {
            node.isBaseMaterial = true;
            node.machineName = 'Extractor';
            node.recipeName = 'Raw resource';
            node.machineCount = formatRate(0);
            nodes.push(node);
            return node;
        }

        const recipePlan = plan.recipes[recipeName];
        const recipeInfo = recipeMeta.get(recipeName);
        node.recipeName = recipeName;
        node.machineName = recipeInfo?.machine || 'Unknown';

        const outputRate = safeNumber(recipePlan.outputs?.[itemName]);
        const machineCountTotal = safeNumber(recipePlan.machine_count);
        let scale = outputRate > 0 ? requiredRate / outputRate : 0;
        if (Math.abs(scale - 1) <= 1e-3) {
            scale = 1;
        }
        const scaledMachineCount = outputRate > 0 ? machineCountTotal * scale : machineCountTotal;
        node.machineCount = formatCount(scaledMachineCount);

        nodes.push(node);

        const nextPath = new Set(path);
        nextPath.add(itemName);

        for (const [inputItem, inputRateRaw] of Object.entries(recipePlan.inputs || {})) {
            const inputRate = safeNumber(inputRateRaw);
            const childRate = outputRate > 0 ? inputRate * scale : inputRate;
            const childNode = buildNode(inputItem, childRate, indentLevel + 1, id, nextPath);
            node.ingredients.push(childNode.id);
        }

        const byproducts = [];
        for (const [outItem, outRateRaw] of Object.entries(recipePlan.outputs || {})) {
            if (outItem === itemName) {
                continue;
            }
            const consumed = safeNumber(plan.items?.[outItem]?.consumed);
            if (consumed > 0) {
                continue;
            }
            const outRate = safeNumber(outRateRaw);
            const byproductRate = outputRate > 0 ? outRate * scale : outRate;
            byproducts.push({
                id: -1,
                productionRate: formatRate(byproductRate),
                itemName: outItem,
            });
        }

        if (byproducts.length) {
            node.byproducts = byproducts;
        }

        return node;
    };

    buildNode(targetItem, targetRate, 0, null, new Set());
    return nodes;
};

/** Build side-panel ingredient buckets from solved plan totals. */
const buildIngredientsData = (plan, targetItem) => {
    const data = {
        input: [],
        intermediate: [],
        output: [],
        byproduct: [],
    };

    for (const [itemName, info] of Object.entries(plan.items || {})) {
        const produced = safeNumber(info.produced);
        const consumed = safeNumber(info.consumed);

        if (produced > 0 && consumed > 0) {
            data.intermediate.push({ itemName, amount: formatRate(produced) });
        } else if (produced > 0) {
            if (itemName === targetItem) {
                data.output.push({ itemName, amount: formatRate(produced) });
            } else {
                data.byproduct.push({ itemName, amount: formatRate(produced) });
            }
        } else if (consumed > 0) {
            data.input.push({ itemName, amount: formatRate(consumed) });
        }
    }

    return data;
};

/** Read solved target output rate, fallback to requested amount. */
const getTargetRate = (plan, targetItem, fallback) => {
    const produced = safeNumber(plan.items?.[targetItem]?.produced);
    return produced > 0 ? produced : safeNumber(fallback);
};

/** Build recipe dropdown options for target + intermediate produced items. */
const buildRecipeOptions = (plan, targetItem) => {
    const recipeOptions = {};
    const includedItems = new Set([targetItem]);

    for (const [itemName, info] of Object.entries(plan.items || {})) {
        const produced = safeNumber(info?.produced);
        const consumed = safeNumber(info?.consumed);
        if (produced > 0 && consumed > 0) {
            includedItems.add(itemName);
        }
    }

    for (const itemName of includedItems) {
        const options = outputRecipesMap.get(itemName) || [];
        if (options.length > 0) {
            recipeOptions[itemName] = options;
        }
    }

    return recipeOptions;
};

const buildNormalNodeStatistics = (plan, factorySettings) => {
    const extractionSettings = buildFactoryExtractionSettings(factorySettings);
    const minerRates = MINER_NORMAL_OUTPUT_RATE_BY_GROUP[extractionSettings.minerGroup] || {};
    const nodeCountsByItem = {};
    let totalNodeCount = 0;

    for (const [itemName, itemPlan] of Object.entries(plan.items || {})) {
        const baseRate = safeNumber(minerRates[itemName]);
        if (baseRate <= 0) {
            continue;
        }

        const produced = safeNumber(itemPlan?.produced);
        const consumed = safeNumber(itemPlan?.consumed);
        const netInputRequired = Math.max(consumed - produced, 0);
        if (netInputRequired <= 0) {
            continue;
        }

        const beltLimitedRate = Math.min(baseRate * 2.5, extractionSettings.beltCapacity);
        if (beltLimitedRate <= 0) {
            continue;
        }

        const requiredNodes = netInputRequired / beltLimitedRate;
        nodeCountsByItem[itemName] = (nodeCountsByItem[itemName] || 0) + requiredNodes;
        totalNodeCount += requiredNodes;
    }

    const sortedNodeCounts = Object.entries(nodeCountsByItem)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .reduce((acc, [itemName, count]) => {
            acc[itemName] = formatRate(count);
            return acc;
        }, {});

    return {
        total: formatRate(totalNodeCount),
        byItem: sortedNodeCounts,
    };
};

/** Build compact top-level statistics summary from optimizer output. */
const buildStatistics = (plan, factorySettings) => {
    const nodeStats = buildNormalNodeStatistics(plan, factorySettings);
    const stats = {
        recipeCount: Object.keys(plan.recipes || {}).length,
        itemCount: Object.keys(plan.items || {}).length,
        totalMachineCount: formatRate(plan.total_machine_count),
        normalNodeCount: nodeStats.total,
        normalNodes: nodeStats.byItem,
        powerConsumption: formatRate(plan.power_consumption),
    };

    if (plan.net_power_consumption !== undefined) {
        stats.netPowerConsumption = formatRate(plan.net_power_consumption);
    }
    if (plan.power_production !== undefined) {
        stats.powerProduction = formatRate(plan.power_production);
    }
    if (plan.augmented_power_production !== undefined) {
        stats.augmentedPowerProduction = formatRate(plan.augmented_power_production);
    }

    return stats;
};

/** Main calculation endpoint consumed by Laravel controller. */
app.all('/run-calc', async (req, res) => {
    try {
        const params = { ...req.query, ...req.body };
        const rawItem = params.item;
        const item = itemIndex.get(normalizeName(rawItem));

        if (!rawItem) {
            return res.status(400).json({ error: 'Missing item parameter.' });
        }
        if (!item) {
            return res.status(400).json({ error: `Unknown item: ${rawItem}` });
        }

        const amount = safeNumber(params.amount);
        const limits = parseArrayPayload(params.ingredients);
        const useIngredientsToMax = toBoolean(params.useIngredientsToMax);
        const selectedRecipes = parseObjectPayload(params.selectedRecipes);
        const optimizationGoals = parseArrayPayload(params.optimizationGoals);
        const factorySettings = normalizeFactorySettings(params.factorySettings);

        console.log(
            `Calculating plan for item="${item}", amount=${amount}, useIngredientsToMax=${useIngredientsToMax}, minerMk=${factorySettings.minerLevel}, beltMk=${factorySettings.beltLevel}`
        );

        const solve = async (useMax) => {
            const problem = buildProblem({ item, amount, limits, useMax, selectedRecipes, optimizationGoals, factorySettings });
            return runOptimizer(problem);
        };

        let plan;
        try {
            plan = await solve(useIngredientsToMax);
        } catch (error) {
            if (!useIngredientsToMax && limits.length > 0) {
                plan = await solve(true);
            } else {
                throw mapCalculationError(error?.message || String(error), {
                    item,
                    amount,
                    limits,
                    useIngredientsToMax,
                    selectedRecipes,
                    optimizationGoals,
                    factorySettings,
                });
            }
        }

        const targetRate = getTargetRate(plan, item, amount || 0);

        return res.json({
            item,
            amount: formatRate(targetRate),
            recipeNodeArr: buildRecipeNodes(plan, item, targetRate),
            ingredientsData: buildIngredientsData(plan, item),
            recipeOptions: buildRecipeOptions(plan, item),
            statistics: buildStatistics(plan, factorySettings),
        });
    } catch (error) {
        console.error('Calculation error:', error);
        const mapped = error?.userMessage
            ? error
            : mapCalculationError(error?.message || String(error), {
                item: req.body?.item || req.query?.item || '',
                amount: safeNumber(req.body?.amount ?? req.query?.amount),
                limits: parseArrayPayload(req.body?.ingredients ?? req.query?.ingredients),
                useIngredientsToMax: toBoolean(req.body?.useIngredientsToMax ?? req.query?.useIngredientsToMax),
                selectedRecipes: parseObjectPayload(req.body?.selectedRecipes ?? req.query?.selectedRecipes),
                optimizationGoals: parseArrayPayload(req.body?.optimizationGoals ?? req.query?.optimizationGoals),
                factorySettings: normalizeFactorySettings(req.body?.factorySettings ?? req.query?.factorySettings),
            });
        return res.status(mapped.status || 500).json(mapped);
    }
});

/** Start HTTP service for calculator calls. */
app.listen(PORT, () => {
    console.log(`Calculation service running on port ${PORT}`);
});
