const fs = require('fs');

function cleanFile(filePath, isGantt) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');

    // Make the variables truthy and setters no-op
    content = content.replace(
        /const\s+\[selectedTenantId,\s*setSelectedTenantId\]\s*=\s*useState\([^)]*\);?/g, 
        'const selectedTenantId = 1; const setSelectedTenantId = () => {};'
    );
    // Remove the tenant_id from the backend params so the data isn't restricted by the dummy ID 1
    content = content.replace(/tenant_id:\s*isSuperuser\s*\?\s*selectedTenantId\s*:\s*undefined,?\n?/g, 'tenant_id: undefined,\n');
    content = content.replace(/tenant_id:\s*selectedTenantId,?\n?/g, 'tenant_id: undefined,\n');
    content = content.replace(/if\s*\(\s*isSuperuser\s*&&\s*selectedTenantId\s*\)\s*\{\s*params\.tenant_id\s*=\s*selectedTenantId;\s*\}/g, '');
    content = content.replace(/tenant_id:\s*selectedTenantId/g, 'tenant_id: undefined');

    // Remove the custom select element
    if (isGantt) {
        // Gantt chart select
        content = content.replace(
            /<div className="relative group">\s*<BuildingOfficeIcon[\s\S]*?<\/select>\s*<\/div>/g,
            'null'
        );
    } else {
        // Scheduling grid select
        content = content.replace(
            /<div className="relative group flex-shrink-0">\s*<BuildingOfficeIcon[\s\S]*?<\/select>\s*<\/div>/g,
            'null'
        );
    }

    fs.writeFileSync(filePath, content);
}

cleanFile('frontend/src/pages/GanttChartPage.jsx', true);
cleanFile('frontend/src/pages/SchedulingGridPage.jsx', false);

console.log('Safely cleaned Gantt and Scheduling');
