import { BudgetPlanner } from './budget.js';
import { DesignAnalyzer } from './analyzer.js';

export class DesignComparator {
  constructor() {
    this.budgetPlanner = new BudgetPlanner();
    this.analyzer = new DesignAnalyzer();
  }

  // Save current project state as a named design variation
  saveVariation(home, customName) {
    if (!home.variations) home.variations = [];
    const count = home.variations.length + 1;
    const name = customName?.trim() || `Design Concept ${String.fromCharCode(64 + count)}`;

    const variation = {
      id: Math.random().toString(36).slice(2, 9),
      name,
      timestamp: new Date().toLocaleString(),
      roomsCount: home.rooms.length,
      furnCount: home.furn.length,
      // Full deep clone of current project state
      snapshot: JSON.parse(JSON.stringify({
        rooms: home.rooms,
        furn: home.furn,
        floors: home.floors,
        lighting: home.lighting
      }))
    };

    home.variations.push(variation);
    return variation;
  }

  // Compare two project variations or current project vs saved variation
  compare(variationA, variationB) {
    const budgetA = this.budgetPlanner.calculateBudget(variationA);
    const budgetB = this.budgetPlanner.calculateBudget(variationB);

    const analysisA = this.analyzer.analyze(variationA);
    const analysisB = this.analyzer.analyze(variationB);

    return {
      a: {
        name: variationA.name || 'Concept A',
        budget: budgetA,
        analysis: analysisA,
        rooms: variationA.rooms || [],
        furn: variationA.furn || []
      },
      b: {
        name: variationB.name || 'Concept B',
        budget: budgetB,
        analysis: analysisB,
        rooms: variationB.rooms || [],
        furn: variationB.furn || []
      },
      budgetDiff: (budgetB?.totalEstimatedBudget || 0) - (budgetA?.totalEstimatedBudget || 0),
      scoreDiff: (analysisB?.overallScore || 0) - (analysisA?.overallScore || 0)
    };
  }

  // Restore variation into active project
  restoreVariation(home, variationId) {
    const v = home.variations?.find(it => it.id === variationId);
    if (!v || !v.snapshot) return false;

    home.rooms = JSON.parse(JSON.stringify(v.snapshot.rooms || []));
    home.furn = JSON.parse(JSON.stringify(v.snapshot.furn || []));
    if (v.snapshot.floors) home.floors = JSON.parse(JSON.stringify(v.snapshot.floors));
    if (v.snapshot.lighting) home.lighting = JSON.parse(JSON.stringify(v.snapshot.lighting));
    return true;
  }

  deleteVariation(home, variationId) {
    if (!home.variations) return;
    home.variations = home.variations.filter(v => v.id !== variationId);
  }
}
