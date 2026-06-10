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

    // Remove the import
    content = content.replace(/import\s+SuperTenantSelector\s+from\s+['\"].*?SuperTenantSelector['\"];?/g, '');
    
    // Remove the state
    content = content.replace(/const\s+\[selectedTenantId,\s*setSelectedTenantId\]\s*=\s*useState\([^)]*\);?/g, '');
    
    // Remove the SuperTenantSelector JSX block (handles multiple lines safely)
    content = content.replace(/<SuperTenantSelector[\s\S]*?\/>/g, '');
    
    // Remove isSuperuser && !selectedTenantId ? 'opacity-40...' : ''
    content = content.replace(/\$\{isSuperuser\s*&&\s*!selectedTenantId\s*\?\s*['\"]opacity-40[^'\"]*['\"]\s*:\s*['\"]['\"]\}/g, '');
    
    // Remove the warning blocks
    content = content.replace(/\{\s*isSuperuser\s*&&\s*!selectedTenantId\s*&&\s*\([\s\S]*?\)\s*\}/g, '');

    // Remove tenant_id: isSuperuser ? selectedTenantId : undefined
    content = content.replace(/tenant_id:\s*isSuperuser\s*\?\s*selectedTenantId\s*:\s*undefined,?\n?/g, '');
    
    // Remove selectedTenantId from dependency arrays
    content = content.replace(/,\s*selectedTenantId/g, '');
    content = content.replace(/selectedTenantId\s*,/g, '');
    content = content.replace(/\[selectedTenantId\]/g, '[]');
    
    // Remove {isSuperuser && ( )} empty blocks left over
    content = content.replace(/\{\s*isSuperuser\s*&&\s*\(\s*\)\s*\}/g, '');
    
    // Ensure we don't leave syntax errors from `if (isSuperuser && !selectedTenantId) { return ... }`
    content = content.replace(/if\s*\(\s*isSuperuser\s*&&\s*!selectedTenantId\s*\)\s*\{[\s\S]*?\}/g, '');

    fs.writeFileSync(file, content);
}
console.log('Cleaned operational pages');
