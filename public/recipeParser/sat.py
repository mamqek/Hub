import re
import json
from collections import defaultdict

class Recipe:
    def __init__(self, machine, ingredients, products):
        self.machine = machine
        self.ingredients = ingredients
        self.products = products

    def to_dict(self):
        return {
            "machine": self.machine,
            "ingredients": self.ingredients,
            "products": self.products
        }

class Config:
    def __init__(self, item_native_class_names, machine_native_class_names):
        self.item_native_class_names = item_native_class_names
        self.machine_native_class_names = machine_native_class_names

class LexicalParser:
    def __init__(self, target):
        self.target = target
        self.index = 0
        self.stack = []

    def __iter__(self):
        return self

    def __next__(self):
        delimiter_re = re.compile(r'[()]')
        while self.index < len(self.target):
            match = delimiter_re.search(self.target, self.index)
            if not match:
                raise StopIteration
            self.index = match.end()
            if match.group() == '(':
                self.stack.append(match.start())
            elif match.group() == ')':
                start = self.stack.pop()
                return len(self.stack), self.target[start:self.index]
        raise StopIteration

def parse_item_list(raw_list):
    itemclass_re = re.compile(r'".*/[^/]*\.([^/]*)\'"')
    parser = LexicalParser(raw_list)
    result = []
    for depth, capture in parser:
        print(f"Depth: {depth}, Capture: {capture}")  # Debugging

        if depth == 1:
            print("hello")
            obj = dict(field.split('=') for field in capture[1:-1].split(","))
            full_name = obj["ItemClass"]
            short_name = itemclass_re.search(full_name).group(1)
            result.append((short_name, int(obj["Amount"])))
    return result

def round_to(x, d):
    factor = 10 ** d
    return round(x * factor) / factor

def load_json_file(filepath):
    with open(filepath, 'r') as f:
        return json.load(f)


def main():
    # Load config
    config_file = 'public/recipeParser/config.json'
    docs_file = 'public/recipeParser/Docs.json'
    output_file = 'public/recipeParser/recipes.json'

    config_data = load_json_file(config_file)
    config = Config(**config_data)

    # Load docs file
    print(f"Loading {docs_file}")
    with open(docs_file, 'r', encoding='utf-8') as f:
        contents = f.read()

    docs_classes = json.loads(contents)
    native_class_re = re.compile(r"'.*\.([^/]*)'")

    # Create class map
    class_map = defaultdict(list)
    for doc_class in docs_classes:
        native_class = native_class_re.search(doc_class["NativeClass"]).group(1)
        class_map[native_class].extend(doc_class["Classes"])

    print(class_map.keys())

    def collect_classes(class_names):
        return [cls for native_class_name in class_names for cls in class_map[native_class_name]]

    print("Parsing contents")
    item_info_by_id = {
        cls["ClassName"]: (cls["mDisplayName"], cls.get("mForm") == "RF_LIQUID")
        for cls in collect_classes(config.item_native_class_names)
    }

    print(item_info_by_id.keys())
    machine_name_id_pairs = [
        (cls["ClassName"], cls["mDisplayName"])
        for cls in collect_classes(config.machine_native_class_names)
    ]

    print("Constructing Recipes")
    alternates, defaults = [], []

    for cls in class_map["FGRecipe"]:
        machine = next((m for id, m in machine_name_id_pairs if id in cls["mProducedIn"]), None)
        if not machine:
            continue

        duration = float(cls["mManufactoringDuration"]) / 60.0

        def reformat_item_list(item_list):
            print(item_list)
            parsed_items = parse_item_list(item_list)
            print(parsed_items)
            return [
                (item_info_by_id[id][0], round_to((amount / duration) * (1e-3 if item_info_by_id[id][1] else 1.0), 3))
                for id, amount in parsed_items
            ]

        recipe = Recipe(
            machine,
            reformat_item_list(cls["mIngredients"]),
            reformat_item_list(cls["mProduct"])
        )
        print(recipe.to_dict())
        is_alternate = cls.get("mDisplayName", "").startswith("Alternate")
        if is_alternate:
            alternates.append(recipe)
        else:
            defaults.append(recipe)

    print(defaults[0].to_dict())
    recipes = [r.to_dict() for r in defaults + alternates]

    print(f"Saving to {output_file}")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(recipes, f, indent=4)

import os

if __name__ == "__main__":
    # print(os.getcwd())
    main()
