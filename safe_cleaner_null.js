const fs = require('fs');

const files = [
    'frontend/src/pages/ProjectsPage.jsx',
    'frontend/src/pages/TasksListPage.jsx',
    'frontend/src/pages/CarFleetPage.jsx',
    'frontend/src/pages/CustomerListPage.jsx',
    'frontend/src/pages/ShopListPage.jsx',
    'frontend/src/pages/ToolInventoryPage.jsx'
];

for (const file of files) {
    if (!fs.existsSync(file)) continue;
    let content = fs.readFileSync(file, 'utf8');

    // Make the variable truthy and the setter a no-op so no hooks crash
    content = content.replace(
        /const\s+\[selectedTenantId,\s*setSelectedTenantId\]\s*=\s*useState\([^)]*\);?/g, 
        'const selectedTenantId = 1; const setSelectedTenantId = () => {};'
    );
    
    // Replace the SuperTenantSelector component with `null` so we get valid JSX {isSuperuser && ( null )}
    content = content.replace(/<SuperTenantSelector[\s\S]*?\/>/g, 'null');
    
    // Remove the tenant_id from the backend params so the data isn't restricted by the dummy ID 1
    content = content.replace(/tenant_id:\s*isSuperuser\s*\?\s*selectedTenantId\s*:\s*undefined,?\n?/g, 'tenant_id: undefined,\n');

    fs.writeFileSync(file, content);
}
console.log('Safely cleaned operational pages with null padding');
