import { FLOOR_MATERIALS, WALL_MATERIALS, FURN } from '../core/constants.js';

export class BudgetPlanner {
  constructor() {}

  calculateBudget(home) {
    if (!home || !home.rooms) return null;

    const rates = home.budgetRates || {};
    const labourPct = rates.labourPct ?? 15;
    const contingencyPct = rates.contingencyPct ?? 8;
    const lightCost = rates.lightingPointCost ?? 2200;
    const paintLabour = rates.paintLabourPerM2 ?? 80;
    const floorLabour = rates.flooringLabourPerM2 ?? 250;

    // 1. Flooring Cost
    let totalFloorAreaM2 = 0;
    let flooringMaterialCost = 0;
    const roomFlooringDetails = [];

    home.rooms.forEach(r => {
      const area = (r.w * r.h) / 10000;
      totalFloorAreaM2 += area;
      const mat = FLOOR_MATERIALS[r.floorMaterial] || FLOOR_MATERIALS.oakWood;
      const rate = r.customFloorRateINR || mat.rateINR;
      const cost = Math.round(area * rate);
      flooringMaterialCost += cost;

      roomFlooringDetails.push({
        roomName: r.name,
        areaM2: area.toFixed(2),
        material: mat.label,
        rateINR: rate,
        totalINR: cost
      });
    });

    const flooringLabourCost = Math.round(totalFloorAreaM2 * floorLabour);
    const totalFlooringCost = flooringMaterialCost + flooringLabourCost;

    // 2. Wall Paint & Finishes Cost
    let totalWallAreaM2 = 0;
    let wallMaterialCost = 0;
    const roomWallDetails = [];

    home.rooms.forEach(r => {
      const perimeterM = (2 * (r.w + r.h)) / 100;
      const wallHM = (r.wallH || 280) / 100;
      // Deduct standard 15% opening allowance for doors & windows
      const wallArea = perimeterM * wallHM * 0.85;
      totalWallAreaM2 += wallArea;

      const mat = WALL_MATERIALS[r.wallMaterial] || WALL_MATERIALS.whitePaint;
      const rate = r.customWallRateINR || mat.rateINR;
      const cost = Math.round(wallArea * rate);
      wallMaterialCost += cost;

      roomWallDetails.push({
        roomName: r.name,
        wallAreaM2: wallArea.toFixed(2),
        material: mat.label,
        rateINR: rate,
        totalINR: cost
      });
    });

    const wallLabourCost = Math.round(totalWallAreaM2 * paintLabour);
    const totalWallCost = wallMaterialCost + wallLabourCost;

    // 3. Furniture Cost
    let totalFurnitureCost = 0;
    const itemizedFurn = [];
    const furnCountMap = new Map();

    home.furn.forEach(f => {
      if (f.type === 'door' || f.type === 'window') return;
      const key = f.type;
      const cat = FURN[f.type] || {};
      const unitPrice = f.price || cat.price || 15000;
      totalFurnitureCost += unitPrice;

      if (!furnCountMap.has(key)) {
        furnCountMap.set(key, { label: f.label || cat.label || key, count: 0, unitPrice, total: 0 });
      }
      const entry = furnCountMap.get(key);
      entry.count += 1;
      entry.total += unitPrice;
    });

    furnCountMap.forEach(entry => itemizedFurn.push(entry));

    // 4. Lighting & Electrical Cost
    // 2 downlights / ambient fixtures per room + accent spots
    const lightPoints = Math.max(4, home.rooms.length * 3);
    const totalLightingCost = lightPoints * lightCost;

    // 5. Decoration & Accents (plants, artwork, styling)
    const decorCost = Math.round(home.rooms.length * 9500);

    // 6. Subtotal before labour & contingency
    const materialsSubtotal = flooringMaterialCost + wallMaterialCost + totalFurnitureCost + totalLightingCost + decorCost;

    // 7. Site Labour & Installation
    const totalLabourCost = flooringLabourCost + wallLabourCost + Math.round((totalFurnitureCost + totalLightingCost) * (labourPct / 100));

    // 8. Contingency & Miscellaneous (8%)
    const grandSubtotal = materialsSubtotal + totalLabourCost;
    const contingencyCost = Math.round(grandSubtotal * (contingencyPct / 100));

    const totalEstimatedBudget = grandSubtotal + contingencyCost;
    const costPerM2 = totalFloorAreaM2 > 0 ? Math.round(totalEstimatedBudget / totalFloorAreaM2) : 0;
    const costPerSqFt = Math.round(costPerM2 / 10.7639);

    // Breakdown percentages
    const categories = [
      { id: 'furn', name: 'Furniture & Fixtures', amount: totalFurnitureCost, color: '#8a6d4b' },
      { id: 'floor', name: 'Flooring & Surfaces', amount: totalFlooringCost, color: '#c5a059' },
      { id: 'wall', name: 'Walls & Architectural Paint', amount: totalWallCost, color: '#4a6e45' },
      { id: 'light', name: 'Lighting & Electrical', amount: totalLightingCost, color: '#e0a35c' },
      { id: 'decor', name: 'Décor & Soft Furnishings', amount: decorCost, color: '#6d4c82' },
      { id: 'labour', name: 'Installation & Master Labour', amount: totalLabourCost, color: '#324b68' },
      { id: 'misc', name: 'Contingency & Miscellaneous', amount: contingencyCost, color: '#7a7670' }
    ];

    categories.forEach(c => {
      c.pct = totalEstimatedBudget > 0 ? Math.round((c.amount / totalEstimatedBudget) * 100) : 0;
    });

    return {
      totalEstimatedBudget,
      totalFloorAreaM2,
      costPerM2,
      costPerSqFt,
      categories,
      itemizedFurn,
      roomFlooringDetails,
      roomWallDetails,
      rates
    };
  }
}
