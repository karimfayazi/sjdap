/**
 * Self-Sufficiency Configuration
 * 
 * This file contains constants for self-sufficiency income calculations.
 * The requiredPerCapitaPM can be overridden from a database config table if available.
 */

/**
 * Self-Sufficiency Income Required Per Capita Per Month
 * 
 * This value can be:
 * 1. Read from a database config table (if exists)
 * 2. Determined by area type (Urban/Peri-Urban/Rural)
 * 3. Fallback to this constant
 * 
 * Default values by area type:
 * - Urban: 19200
 * - Peri-Urban: 16100
 * - Rural: 10800
 */
export const DEFAULT_SELF_SUFFICIENCY_INCOME_PER_CAPITA = {
	Urban: 19200,
	"Peri-Urban": 16100,
	Rural: 10800,
};

/**
 * Get self-sufficiency income per capita based on area type
 */
export function getSelfSufficiencyIncomePerCapita(areaType: string | null | undefined): number {
	const area = (areaType || "Rural").trim();
	return DEFAULT_SELF_SUFFICIENCY_INCOME_PER_CAPITA[area as keyof typeof DEFAULT_SELF_SUFFICIENCY_INCOME_PER_CAPITA] || DEFAULT_SELF_SUFFICIENCY_INCOME_PER_CAPITA.Rural;
}

/**
 * Poverty Level mapping based on % of Self-Sufficiency
 * 
 * Thresholds (matching Excel "Planned Income SS Status"):
 * - >= 1.00 (100%): "Level Nil"
 * - >= 0.75 (75%): "Level -1"
 * - >= 0.50 (50%): "Level -2"
 * - < 0.50: "Level -3"
 * 
 * Note: percent parameter is a decimal (e.g., 0.5469 for 54.69%)
 */
export function getPovertyLevelByPercent(percent: number): string {
	if (percent >= 1.00) return "Level Nil";
	if (percent >= 0.75) return "Level -1";
	if (percent >= 0.50) return "Level -2";
	return "Level -3";
}
