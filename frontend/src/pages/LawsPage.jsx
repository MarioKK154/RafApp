// frontend/src/pages/LawsPage.jsx
import React from 'react';

function LawsPage() {
    return (
        <div className="container mx-auto p-4 md:p-6">
            <h1 className="text-2xl md:text-3xl font-bold mb-6 text-gray-800 dark:text-white">
                Icelandic Electrical Laws & Standards 🇮🇸
            </h1>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md space-y-4">
                <p>
                    This section will contain important information regarding local and international laws, regulations, and standards relevant to electrical work in Iceland.
                </p>
                <p>
                    {/* Placeholder for content - you can add links, text, or embed documents later */}
                    Content coming soon... Check resources like Mannvirkjastofnun (Icelandic Construction Authority).
                </p>

                {/* Example of linking to an external resource */}
                <a
                    href="https://www.hms.is/byggingar/rafmagn/" // Example link, update with correct URL
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                >
                    Visit Mannvirkjastofnun Electrical Safety Section (Example)
                </a>
            </div>
        </div>
    );
}

export default LawsPage;