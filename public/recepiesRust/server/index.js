const express = require('express');
const { execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const app = express();
const PORT = 8001;

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

const CALC_ROOT = path.join(__dirname, '..');
const CALC_BIN = path.join(CALC_ROOT, 'satisfactory_factory_planner.exe');
const RECIPES_PATH = path.join(CALC_ROOT, 'recipes.json');

const safeNumber = (value) => {
    if (value === null || value === undefined || value === '') {
        return 0;
    }
    const num = typeof value === 'number' ? value : parseFloat(value);
    return Number.isFinite(num) ? num : 0;
};

const formatRate = (value) => safeNumber(value).toFixed(2);

const toBoolean = (value) => {
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'string') {
        return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
    }
    return false;
};

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

const loadRecipes = () => JSON.parse(fs.readFileSync(RECIPES_PATH, 'utf8'));

const hasIngredientProductOverlap = (recipe) => {
    const inputs = new Set((recipe.ingredients || []).map(([itemName]) => itemName));
    for (const [itemName] of recipe.products || []) {
        if (inputs.has(itemName)) {
            return true;
        }
    }
    return false;
};

const buildSanitizedRecipesJson = () => JSON.stringify(
    loadRecipes().filter((recipe) => !hasIngredientProductOverlap(recipe)),
    null,
    2
);

const getIndentLevel = (line) => {
    const leadingSpaces = line.length - line.trimStart().length;
    if (leadingSpaces <= 1) {
        return 0;
    }
    return Math.max(0, Math.floor((leadingSpaces - 1) / 2));
};

const parseTreeRow = (line, id) => {
    const symbolMatch = line.match(/^\s*([*\-<])/);
    if (!symbolMatch) {
        return null;
    }

    const symbol = symbolMatch[1];
    const indentLevel = getIndentLevel(line);

    const machineMatch = line.match(/^\s*[*\-<]\s*([\d.]+)\s+(.+?):\s+([\d.]+)\s+(.+?)\s*$/);
    if (machineMatch) {
        return {
            id,
            productionRate: formatRate(machineMatch[1]),
            itemName: machineMatch[2].trim(),
            machineCount: formatRate(machineMatch[3]),
            machineName: machineMatch[4].trim(),
            indentLevel,
            ingredients: [],
            isByproduct: symbol === '<',
            isBaseMaterial: symbol === '-',
        };
    }

    const baseMatch = line.match(/^\s*[*\-<]\s*([\d.]+)\s+(.+?)\s*$/);
    if (!baseMatch) {
        return null;
    }

    return {
        id,
        productionRate: formatRate(baseMatch[1]),
        itemName: baseMatch[2].trim(),
        machineCount: formatRate(0),
        machineName: 'Extractor',
        indentLevel,
        ingredients: [],
        isByproduct: symbol === '<',
        isBaseMaterial: symbol === '-',
    };
};

const parseTree = (treeLines) => {
    const stack = [];
    const nodes = [];
    let id = 0;

    for (const line of treeLines) {
        if (!line.trim()) {
            continue;
        }

        const node = parseTreeRow(line, id);
        if (!node) {
            continue;
        }

        const parent = node.indentLevel > 0 ? stack[node.indentLevel - 1] : null;

        if (node.isByproduct) {
            if (parent) {
                parent.byproducts = parent.byproducts || [];
                parent.byproducts.push({
                    id: -1,
                    productionRate: node.productionRate,
                    itemName: node.itemName,
                });
            }
            continue;
        }

        delete node.isByproduct;

        if (parent) {
            parent.ingredients.push(node.id);
            node.parentId = parent.id;
        }

        stack[node.indentLevel] = node;
        stack.length = node.indentLevel + 1;

        nodes.push(node);
        id += 1;
    }

    return nodes;
};

const parseIngredientLine = (line) => {
    const match = line.match(/^\s*[*\-<]\s*([\d.]+)\s+(.+?)\s*$/);
    if (!match) {
        return null;
    }

    return {
        amount: formatRate(match[1]),
        itemName: match[2].trim(),
    };
};

const parseSections = (outputText) => {
    const sections = {
        tree: [],
        input: [],
        intermediate: [],
        output: [],
        byproduct: [],
    };

    let current = null;
    const lines = `${outputText || ''}`.split(/\r?\n/);
    for (const line of lines) {
        const trimmed = line.trim();

        if (trimmed === 'Tree:') {
            current = 'tree';
            continue;
        }
        if (/^Input Ingredients:/i.test(trimmed)) {
            current = 'input';
            continue;
        }
        if (/^Intermediate Ingredients:/i.test(trimmed)) {
            current = 'intermediate';
            continue;
        }
        if (/^Output (Ingredients|Products):/i.test(trimmed)) {
            current = 'output';
            continue;
        }
        if (/^Byproduct Ingredients:/i.test(trimmed)) {
            current = 'byproduct';
            continue;
        }
        if (/^Machines:/i.test(trimmed)) {
            current = null;
            continue;
        }

        if (!current || !trimmed) {
            continue;
        }

        sections[current].push(line);
    }

    return sections;
};

const parseIngredientsData = (sections) => {
    const data = {
        input: [],
        intermediate: [],
        output: [],
        byproduct: [],
    };

    for (const key of Object.keys(data)) {
        data[key] = sections[key]
            .map(parseIngredientLine)
            .filter((ingredient) => ingredient !== null);
    }

    return data;
};

const buildHaveArg = (limits) => {
    const parts = [];
    for (const limit of limits) {
        if (!limit || !limit.itemName) {
            continue;
        }
        const amount = safeNumber(limit.amount);
        if (amount <= 0) {
            continue;
        }
        parts.push(`${limit.itemName}:${formatRate(amount)}`);
    }
    return parts.join(',');
};

const findOutputAmount = (ingredientsData, itemName) => {
    const normalized = `${itemName || ''}`.trim().toLowerCase();
    const outputItem = (ingredientsData.output || []).find(
        (item) => `${item.itemName || ''}`.trim().toLowerCase() === normalized
    );
    return outputItem ? outputItem.amount : null;
};

const runCalc = ({ item, amount, limits, useIngredientsToMax }) => new Promise((resolve, reject) => {
    if (!fs.existsSync(CALC_BIN)) {
        reject(new Error(`Calculator binary not found at ${CALC_BIN}`));
        return;
    }
    if (!fs.existsSync(RECIPES_PATH)) {
        reject(new Error(`recipes.json not found at ${RECIPES_PATH}`));
        return;
    }

    const targetAmount = safeNumber(amount) > 0 ? safeNumber(amount) : 1;
    const wantArg = useIngredientsToMax ? `${item}` : `${item}:${formatRate(targetAmount)}`;
    const haveArg = buildHaveArg(limits);
    const args = [wantArg];
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'satisfactory-calc-'));

    if (haveArg) {
        args.push(haveArg);
    }

    fs.writeFileSync(path.join(tmpDir, 'recipes.json'), buildSanitizedRecipesJson());

    execFile(CALC_BIN, args, { cwd: tmpDir, maxBuffer: 1024 * 1024 * 20 }, (error, stdout, stderr) => {
        fs.rmSync(tmpDir, { recursive: true, force: true });

        if (error) {
            reject(new Error(stderr || error.message));
            return;
        }

        const sections = parseSections(stdout);
        const ingredientsData = parseIngredientsData(sections);
        const recipeNodeArr = parseTree(sections.tree);
        const resolvedAmount = findOutputAmount(ingredientsData, item) || formatRate(targetAmount);

        resolve({
            item,
            amount: resolvedAmount,
            recipeNodeArr,
            ingredientsData,
            recipeOptions: {},
            statistics: {
                recipeCount: recipeNodeArr.length,
                inputCount: ingredientsData.input.length,
                intermediateCount: ingredientsData.intermediate.length,
                outputCount: ingredientsData.output.length,
                byproductCount: ingredientsData.byproduct.length,
            },
        });
    });
});

app.all('/run-calc', async (req, res) => {
    try {
        const params = { ...req.query, ...req.body };
        const item = `${params.item || ''}`.trim();
        if (!item) {
            return res.status(400).json({ error: 'Missing item parameter.' });
        }

        const amount = safeNumber(params.amount);
        const limits = parseArrayPayload(params.ingredients);
        const useIngredientsToMax = toBoolean(params.useIngredientsToMax);

        const result = await runCalc({
            item,
            amount,
            limits,
            useIngredientsToMax,
        });

        return res.json(result);
    } catch (error) {
        return res.status(500).json({
            error: 'Calculation failed.',
            details: error?.message || String(error),
        });
    }
});

app.listen(PORT, () => {
    console.log(`Calculation service running on port ${PORT}`);
});
