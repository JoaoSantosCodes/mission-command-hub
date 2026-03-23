import fs from "fs";
import path from "path";

const DEFAULT_MAX_FOOD = 100;
const DEFAULT_STATE = {
  food: DEFAULT_MAX_FOOD,
  maxFood: DEFAULT_MAX_FOOD,
  updatedAt: new Date().toISOString(),
};

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
}

export function loadFishState(filePath) {
  try {
    if (!fs.existsSync(filePath)) return { ...DEFAULT_STATE };
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    const maxFood =
      typeof parsed?.maxFood === "number" && Number.isFinite(parsed.maxFood)
        ? Math.max(10, Math.min(500, Math.round(parsed.maxFood)))
        : DEFAULT_MAX_FOOD;
    const foodRaw = typeof parsed?.food === "number" && Number.isFinite(parsed.food) ? parsed.food : maxFood;
    const food = Math.max(0, Math.min(maxFood, Math.round(foodRaw)));
    return {
      food,
      maxFood,
      updatedAt: typeof parsed?.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function saveFishState(filePath, nextState) {
  ensureDir(filePath);
  const maxFood =
    typeof nextState?.maxFood === "number" && Number.isFinite(nextState.maxFood)
      ? Math.max(10, Math.min(500, Math.round(nextState.maxFood)))
      : DEFAULT_MAX_FOOD;
  const foodRaw = typeof nextState?.food === "number" && Number.isFinite(nextState.food) ? nextState.food : maxFood;
  const food = Math.max(0, Math.min(maxFood, Math.round(foodRaw)));
  const payload = {
    food,
    maxFood,
    updatedAt: new Date().toISOString(),
  };
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  fs.renameSync(tmp, filePath);
  return payload;
}

export function fishMood(food, maxFood = DEFAULT_MAX_FOOD) {
  const pct = maxFood > 0 ? food / maxFood : 0;
  // Refina para alinhar com o exemplo do HTML:
  // - > 70%: feliz
  // - > 40% e <= 70%: com fome (fome)
  // - <= 40%: faminto (critico)
  if (pct <= 0.4) return "critico";
  if (pct <= 0.7) return "fome";
  return "feliz";
}

