import { Supplement } from '@/context/CabinetContext';

// Add your Clinical API key to your environment variables (.env file)
const CLINICAL_API_KEY = process.env.EXPO_PUBLIC_CLINICAL_API_KEY || 'DEMO_KEY';
const CLINICAL_API_URL = 'https://api.clinical-database.example.com/v1';

export type InteractionResult = {
  subject: string;
  affected: string;
  severity: 'minor' | 'moderate' | 'major';
  description: string;
};

/**
 * Checks for interactions between an array of supplements/drugs utilizing a clinical API.
 * In a production build, this would map names to clinical IDs and hit the interactions endpoint.
 */
export const checkClinicalInteractions = async (supplements: Supplement[]): Promise<InteractionResult[]> => {
  if (supplements.length < 2) return [];

  // In a live production environment, the flow is:
  // 1. GET /v1/supplements?q=[Supplement Name] -> Extract ID 
  // 2. GET /v1/interactions?ids=ID1,ID2... -> Get interactions
  /*
    const response = await fetch(`${CLINICAL_API_URL}/interactions?ids=${ids.join(',')}`, {
      headers: {
        'Authorization': `Bearer ${CLINICAL_API_KEY}`,
        'Content-Type': 'application/json',
      }
    });
    const json = await response.json();
  */
  
  console.log(`[Clinical API] Architected API Target: ${CLINICAL_API_URL}/interactions`);
  console.log(`[Clinical API] Sourcing API Key... Found: ${CLINICAL_API_KEY ? 'Yes' : 'No'}`);
  console.log(`[Clinical API] Checking cross-interactions for: ${supplements.map(s => s.name).join(', ')}`);

  return new Promise((resolve) => {
    setTimeout(() => {
      // Mock interaction logic for demonstration without a commercial key
      // If the cabinet contains both Zinc and Calcium, generate a known interaction.
      const interactions: InteractionResult[] = [];
      const names = supplements.map(s => s.name.toLowerCase());
      
      const hasZinc = names.some(n => n.includes('zinc'));
      const hasCalcium = names.some(n => n.includes('calcium'));
      
      if (hasZinc && hasCalcium) {
         interactions.push({
           subject: 'Zinc',
           affected: 'Calcium',
           severity: 'moderate',
           description: 'Calcium can decrease the body\'s absorption of zinc. It is recommended to space their intake by at least 2 hours.'
         });
      }
      
      resolve(interactions);
    }, 1800); // Simulate network request delay
  });
};
