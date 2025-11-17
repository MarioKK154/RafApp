// frontend/src/pages/TutorialsPage.jsx
import React from 'react';
import CableSizingCalculator from '../components/CableSizingCalculator'; // <-- IMPORT

function TutorialsPage() {
    return (
        <div className="container mx-auto p-4 md:p-6">
            <h1 className="text-2xl md:text-3xl font-bold mb-6 text-gray-800 dark:text-white">
                Tutorials & Calculators 🧮
            </h1>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md space-y-6">
                {/* Calculators Section */}
                <section>
                    <h2 className="text-xl font-semibold mb-3">Calculators</h2>
                    <div className="space-y-6">
                        {/* --- START: CABLE SIZING CALCULATOR --- */}
                        <div>
                            <h3 className="text-lg font-medium mb-2">Cable Sizing Calculator</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                This calculator determines the minimum standards-compliant cable size
                                based on load, distance, installation, and safety factors.
                            </p>
                            {/* --- RENDER THE COMPONENT --- */}
                            <CableSizingCalculator />
                        </div>
                        {/* --- END: CABLE SIZING CALCULATOR --- */}

                        <hr className="dark:border-gray-600"/>

                        <div>
                            <h3 className="text-lg font-medium">Voltage Drop Calculator</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Feature coming soon. This calculator will help estimate the voltage drop over a specific cable run.
                            </p>
                            {/* Placeholder for the calculator component */}
                        </div>
                    </div>
                </section>
                
                <hr className="dark:border-gray-600"/>

                {/* Tutorials Section */}
                <section>
                    <h2 className="text-xl font-semibold mb-3">Tutorials & Diagrams</h2>
                    <p>
                        This section will host helpful tutorials, connection guides, and wiring diagrams.
                    </p>
                    <p>
                        Content coming soon...
                    </p>
                </section>

            </div>
        </div>
    );
}

export default TutorialsPage;