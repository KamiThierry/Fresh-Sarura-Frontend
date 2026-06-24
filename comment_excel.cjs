const fs = require('fs');
const path = require('path');

const files = [
    'qc-officer/pages/Intake.tsx',
    'qc-officer/pages/ColdRoom.tsx',
    'logistics-officer/pages/Shipments.tsx',
    'logistics-officer/pages/PendingPickups.tsx',
    'logistics-officer/components/ServiceHistoryModal.tsx',
    'production-manager/pages/PackagingStock.tsx',
    'production-manager/pages/QCInsights.tsx',
    'production-manager/pages/FarmerManagement.tsx',
    'production-manager/pages/InventoryManagement.tsx',
    'production-manager/pages/AnalyticsReporting.tsx',
    'admin/pages/UserManagement.tsx',
    'admin/pages/Reports.tsx',
    'production-manager/components/PackagingLotDetailModal.tsx',
    'production-manager/components/FarmerProfile.tsx',
    'production-manager/components/CropCycleDetailModal.tsx',
    'admin/pages/EventLogs.tsx'
];

const basePath = 'c:\\\\Users\\\\Thierry\\\\Desktop\\\\Final Year Project\\\\FreshSarura_web\\\\Fresh Sarura_UI_v.1\\\\src\\\\portals';

let totalReplaced = 0;

files.forEach(f => {
    const filePath = path.join(basePath, f);
    if (!fs.existsSync(filePath)) {
        console.log('Not found:', filePath);
        return;
    }
    let content = fs.readFileSync(filePath, 'utf8');

    // The regex to match the button
    const regex = /({\/\*\s*)?(<button(?:(?!<\/button>)[\s\S])*?(?:Export Excel|Export to Excel)(?:(?!<\/button>)[\s\S])*?<\/button>)(\s*\*\/})?/gi;
    
    let replacedCount = 0;
    const newContent = content.replace(regex, (match, p1, p2, p3) => {
        replacedCount++;
        // If it's already commented, leave it as is
        if (p1 && p3) return match;
        // Otherwise wrap it
        return '{/* ' + p2 + ' */}';
    });
    
    if (replacedCount > 0) {
        fs.writeFileSync(filePath, newContent);
        console.log('Updated ' + replacedCount + ' match(es) in:', f);
        totalReplaced += replacedCount;
    } else {
        console.log('No match found in:', f);
    }
});
console.log('Total replaced:', totalReplaced);
