import { Pool } from 'pg';

export async function seedMethodologies(pool: Pool) {
    console.log('Seeding methodologies...');
    const client = await pool.connect();

    try {
        // 1. Get Methodology Node Type ID
        const typeResult = await client.query('SELECT id FROM public.node_types WHERE name = $1', ['Methodology']);
        if (typeResult.rows.length === 0) {
            console.warn('⚠️ Methodology node type not found. Skipping methodology seeding.');
            return;
        }
        const typeId = typeResult.rows[0].id;

        // 2. Define standard methodologies
        const methodologies = [
            {
                name: 'Scientific Method',
                description: 'A systematic observation, measurement, and experiment, and the formulation, testing, and modification of hypotheses.',
                steps: [
                    { order: 1, title: 'Observation', description: 'Make an observation about the world', isRequired: true },
                    { order: 2, title: 'Hypothesis', description: 'Propose a tentative explanation', isRequired: true },
                    { order: 3, title: 'Prediction', description: 'Make a prediction based on the hypothesis', isRequired: true },
                    { order: 4, title: 'Test', description: 'Test the prediction with an experiment', isRequired: true },
                    { order: 5, title: 'Analysis', description: 'Analyze the data', isRequired: true }
                ]
            },
            {
                name: 'Socratic Method',
                description: 'A form of cooperative argumentative dialogue between individuals, based on asking and answering questions to stimulate critical thinking.',
                steps: [
                    { order: 1, title: 'Statement', description: 'State a belief or premise', isRequired: true },
                    { order: 2, title: 'Questioning', description: 'Ask questions to test the logic', isRequired: true },
                    { order: 3, title: 'Definition', description: 'Refine definitions and concepts', isRequired: true },
                    { order: 4, title: 'Conclusion', description: 'Reach a logical conclusion or aporia', isRequired: true }
                ]
            }
        ];

        // 3. Insert if not exists
        for (const m of methodologies) {
            // Check if exists by name (simplified check)
            const existing = await client.query(
                `SELECT id FROM public.nodes WHERE node_type_id = $1 AND props->>'name' = $2`,
                [typeId, m.name]
            );

            if (existing.rows.length > 0) {
                console.log(`  ✓ Methodology '${m.name}' already exists.`);
                continue;
            }

            await client.query(
                `INSERT INTO public.nodes (node_type_id, props, created_at, updated_at)
         VALUES ($1, $2, NOW(), NOW())`,
                [typeId, JSON.stringify(m)]
            );
            console.log(`  ✓ Created methodology: ${m.name}`);
        }

    } catch (error) {
        console.error('Error seeding methodologies:', error);
        throw error;
    } finally {
        client.release();
    }
}
