const express = require('express');
const { execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const app = express();
const PORT = 8001;

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Strip hash comments and trailing commas so commentjson-like files parse as JSON.
const sanitizeJson = (text) => {
    const withoutComments = text.replace(/^\s*#.*$/gm, '');
    return withoutComments.replace(/,\s*([}\]])/g, '$1');
};

const repoRoot = path.join(__dirname, '..', '..', '..');
const optimizerRoot = path.join(repoRoot, 'satisfactory-optimizer');
const pythonBin = 'python3';
const optimizerScript = path.join(optimizerRoot, 'satisfactory-optimizer.py');

const recipesPath = path.join(optimizerRoot, 'recipes.json');
const itemsPath = path.join(optimizerRoot, 'items.json');

// Load recipe metadata from the optimizer repo.
const loadRecipes = () => JSON.parse(sanitizeJson(fs.readFileSync(recipesPath, 'utf8')));
// Load item list from the optimizer repo.
const loadItems = () => JSON.parse(sanitizeJson(fs.readFileSync(itemsPath, 'utf8')));

const recipeData = loadRecipes();
const allItems = loadItems();
const includedRecipesGroup = ['production', 'extraction'];

const normalizeName = (value) => value.trim().toLowerCase().replace(/\s+/g, ' ');
const itemIndex = new Map(allItems.map((name) => [normalizeName(name), name]));

// Normalize numeric inputs to finite numbers.
const safeNumber = (value) => {
    if (value === null || value === undefined) {
        return 0;
    }
    const num = typeof value === 'number' ? value : parseFloat(value);
    return Number.isFinite(num) ? num : 0;
};

// Coerce query/body values into a boolean.
const toBoolean = (value) => {
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'string') {
        return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
    }
    return false;
};

// Determine which items are "raw inputs" for the selected recipe group.
const computeRawInputs = () => {
    const outputs = new Set();
    const inputs = new Set();
    const extractionOutputs = new Set();

    for (const recipe of Object.values(recipeData)) {
        const tags = recipe.tags || [];
        const outs = recipe.outputs || {};
        const ins = recipe.inputs || {};

        if (tags.includes('extraction')) {
            for (const item of Object.keys(outs)) {
                extractionOutputs.add(item);
            }
        }

        if (!tags.includes(includedRecipesGroup)) {
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

const rawInputs = computeRawInputs();

// Build a Satisfactory-Optimizer problem definition.
const buildProblem = ({ item, amount, limits, useMax }) => {
    const problem = {
        included_recipes: includedRecipesGroup,
        // excluded_recipes: ['power'],
        input_items: {},
        output_items: {},
    };

    for (const raw of rawInputs) {
        problem.input_items[raw] = 'unlimited';
    }

    if (Array.isArray(limits)) {
        for (const limit of limits) {
            if (!limit || !limit.itemName) {
                continue;
            }
            const limitAmount = safeNumber(limit.amount);
            if (limitAmount <= 0) {
                continue;
            }
            const canonical = itemIndex.get(normalizeName(limit.itemName));
            if (!canonical) {
                continue;
            }
            problem.input_items[canonical] = limitAmount;
        }
    }

    for (const name of allItems) {
        problem.output_items[name] = 'unlimited';
    }

    if (useMax) {
        problem.output_items[item] = 'unlimited';
        problem.optimization_goals = [['maximize_item_output', item]];
    } else {
        const targetAmount = safeNumber(amount) > 0 ? safeNumber(amount) : 1;
        problem.output_items[item] = targetAmount;
    }

    return problem;
};

// Run the optimizer CLI with a temp problem file and parse its JSON output.
const runOptimizer = (problem) => new Promise((resolve, reject) => {
    if (!fs.existsSync(optimizerScript)) {
        reject(new Error(`Optimizer script not found at ${optimizerScript}`));
        return;
    }

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'satisfactory-optimizer-'));
    const problemPath = path.join(tmpDir, 'problem.json');
    fs.writeFileSync(problemPath, JSON.stringify(problem, null, 2));

    execFile(
        pythonBin,
        [optimizerScript, problemPath],
        { cwd: optimizerRoot, maxBuffer: 1024 * 1024 * 50 },
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
                const plan = JSON.parse(trimmed);
                resolve(plan);
            } catch (parseError) {
                reject(new Error(stderr || parseError.message));
            }
        }
    );
});

// Parse limits payloads from query/body into a consistent array shape.
const normalizeLimits = (limits) => {
    if (!limits) {
        return [];
    }
    if (typeof limits === 'string') {
        try {
            const parsed = JSON.parse(limits);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
    return Array.isArray(limits) ? limits : [];
};

app.all('/run-calc', async (req, res) => {
    try {
        const params = { ...req.query, ...req.body };
        const rawItem = params.item;
        if (!rawItem) {
            return res.status(400).json({ error: 'Missing item parameter.' });
        }

        const item = itemIndex.get(normalizeName(rawItem));
        if (!item) {
            return res.status(400).json({ error: `Unknown item: ${rawItem}` });
        }

        const amount = safeNumber(params.amount);
        const limits = normalizeLimits(params.ingredients);
        const useIngredientsToMax = toBoolean(params.useIngredientsToMax);

        console.log(`Calculating plan for item="${item}", amount=${amount}, useIngredientsToMax=${useIngredientsToMax}`);

        const problem = buildProblem({ item, amount, limits, useMax: useIngredientsToMax });
        const plan = await runOptimizer(problem);

        return res.json({
            item,
            amount,
            plan,
        });
    } catch (error) {
        console.error('Calculation error:', error);
        return res.status(500).json({ error: error?.message || 'Calculation failed.' });
    }
});

app.listen(PORT, () => {
    console.log(`Calculation service running on port ${PORT}`);
});
