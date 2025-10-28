// frontend/src/pages/TutorialsPage.jsx
import React from 'react';

function TutorialsPage() {
    return (
        <div className="container mx-auto p-4 md:p-6">
            <h1 className="text-2xl md:text-3xl font-bold mb-6 text-gray-800 dark:text-white">
                Tutorials & Calculators 🧮
            </h1>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md space-y-6">
                {/* Tutorials Section */}
                <section>
                    <h2 className="text-xl font-semibold mb-3">Tutorials & Diagrams</h2>
                    <p>
                        This section will host helpful tutorials, connection guides, and wiring diagrams.
                    </p>
                    <p>
                        {/* Placeholder */}
                        Content coming soon...
                    </p>
                </section>

                <hr className="dark:border-gray-600"/>

                {/* Calculators Section */}
                <section>
                    <h2 className="text-xl font-semibold mb-3">Calculators</h2>
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-lg font-medium">Cable Sizing Calculator</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Feature coming soon. This calculator will help determine the appropriate cable size based on load, distance, and other factors.
                            </p>
                            {/* Placeholder for the calculator component */}
                        </div>
                        <div>
                            <h3 className="text-lg font-medium">Voltage Drop Calculator</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Feature coming soon. This calculator will help estimate the voltage drop over a specific cable run.
                            </p>
                            {/* Placeholder for the calculator component */}
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}

export default TutorialsPage;