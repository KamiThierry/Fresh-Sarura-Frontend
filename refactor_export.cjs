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

let changedFiles = 0;

files.forEach(f => {
    const filePath = path.join(basePath, f);
    if (!fs.existsSync(filePath)) return;
    
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    // 1. Find the PDF handler name. Look for onClick={...} right near "Export PDF"
    let pdfHandler = 'exportPDF';
    const pdfMatch = content.match(/onClick={([^}]*)}[^>]*>[\s\S]*?Export(?: to)? PDF/i);
    if (pdfMatch && pdfMatch[1].length < 30 && !pdfMatch[1].includes('setIsExportOpen')) {
        pdfHandler = pdfMatch[1];
    } else if (content.includes('handleExportPDF')) {
        pdfHandler = 'handleExportPDF';
    } else if (content.includes('exportToPDF')) {
        pdfHandler = 'exportToPDF';
    } else if (content.includes('handlePDFExport')) {
        pdfHandler = 'handlePDFExport';
    } else if (content.includes('exportPDF')) {
        pdfHandler = 'exportPDF';
    }

    // 2. Replace the main button
    // It looks like: <button onClick={() => setIsExportOpen(!isExportOpen)} ...>...<ChevronDown .../></button>
    // We want to replace the onClick, and remove the ChevronDown.
    const btnRegex = /(<button[^>]*onClick={[^}]*(?:setIsExportOpen|setShowExportMenu|setExportOpen)[^}]*}[^>]*>)([\s\S]*?)<\/button>/g;
    content = content.replace(btnRegex, (match, openingTag, innerContent) => {
        let newInner = innerContent.replace(/<ChevronDown[^>]*>/, '');
        let newOpening = openingTag.replace(/onClick={[^}]+}/, 'onClick={' + pdfHandler + '}');
        return newOpening + newInner + '</button>';
    });

    // 3. Remove the dropdown block completely. 
    // It's usually {isExportOpen && ( ... )} or {showExportMenu && ( ... )}
    // We can match `{isExportOpen && (` up to the matching `)}`
    // Since regex can't count braces, we use a simpler approach.
    // Replace `{isExportOpen && (` or `{showExportMenu && (` up to the end of the div or fragment
    // We will just match from `{isExportOpen && (` to the next `)}` that has no inner `)}`? No, there might be nested parenthesis.
    // Let's use a function to balance parentheses.

    let index = 0;
    while (true) {
        let searchStr = '{isExportOpen && (';
        let startIdx = content.indexOf(searchStr);
        if (startIdx === -1) {
            searchStr = '{showExportMenu && (';
            startIdx = content.indexOf(searchStr);
        }
        if (startIdx === -1) break;

        let parenCount = 0;
        let braceCount = 0;
        let endIdx = -1;
        
        for (let i = startIdx; i < content.length; i++) {
            if (content[i] === '{') braceCount++;
            if (content[i] === '}') braceCount--;
            if (content[i] === '(') parenCount++;
            if (content[i] === ')') parenCount--;

            if (braceCount === 0 && i > startIdx) {
                endIdx = i;
                break;
            }
        }
        if (endIdx !== -1) {
            content = content.substring(0, startIdx) + content.substring(endIdx + 1);
        } else {
            break;
        }
    }

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        console.log('Modified ' + f);
        changedFiles++;
    }
});
console.log('Total files modified: ' + changedFiles);
