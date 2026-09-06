const fs = require('fs');
let content = fs.readFileSync('src/pages/Settings.jsx', 'utf8');

// Remove dark academia imports
content = content.replace(/import bgGothicLibrary[\s\S]*?};/, '');

// Remove dark academia from zustand hook
content = content.replace(/,\s*darkAcademiaPreset/, '');
content = content.replace(/,\s*setDarkAcademiaPreset/, '');

// Remove dark academia preset card
content = content.replace(/<div\s+className={`bg-preview-card \${background === 'dark_academia' \? 'active' : ''}`}[\s\S]*?<\/AnimatePresence>\s*<\/div>/g, '');

// Remove the dark academia AnimatePresence block that might have been mangled
content = content.replace(/<AnimatePresence>[\s\S]*?background === 'dark_academia'[\s\S]*?<\/AnimatePresence>/g, '');

// If there's any orphaned code from the bad replace_file_content:
content = content.replace(/<img\s+src=\{DARK_ACADEMIA_BACKGROUNDS\[preset\.id\]\}[\s\S]*?<\/button>\s*}\)\)\s*}\s*<\/div>\s*<\/motion\.div>\s*}\s*<\/AnimatePresence>/g, '');
content = content.replace(/<img\s+src=\{DARK_ACADEMIA_BACKGROUNDS\[preset\.id\]\}[\s\S]*?<\/AnimatePresence>/g, '');

fs.writeFileSync('src/pages/Settings.jsx', content);
