// Script to build game-templates.js with embedded HTML content
const fs = require('fs');
const path = require('path');

const templates = {
    'flappy-bird': { name: 'Flappy Bird', emoji: '🐦', file: 'flappy-template.html' },
    'snake': { name: 'Snake', emoji: '🐍', file: 'snake-template.html' },
    'space-invaders': { name: 'Space Invaders', emoji: '👾', file: 'space-invaders-template.html' },
    'pong': { name: 'Pong', emoji: '🏓', file: 'pong-template.html' },
    'pac-man': { name: 'Pac Man', emoji: '👻', file: 'pacman-template.html' },
    'brick-breaker': { name: 'Brick Breaker', emoji: '🎯', file: 'brick-breaker-template.html' }
};

let output = `// Game Templates - Real working HTML5 games from OmegaNetwork repositories
// These are loaded when user selects "Game" project type

const GAME_TEMPLATES = {
`;

// Generate template object
for (const [key, template] of Object.entries(templates)) {
    output += `    '${key}': {
        name: '${template.name}',
        emoji: '${template.emoji}',
        getTemplate: () => get${key.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')}Template()
    },
`;
}

output += `};

`;

// Generate template functions
for (const [key, template] of Object.entries(templates)) {
    const funcName = key.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
    const filePath = path.join(__dirname, template.file);
    
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        // Escape backticks and template literals
        content = content.replace(/`/g, '\\`').replace(/\${/g, '\\${');
        
        output += `// ${template.name} - from https://github.com/OmegaNetwork-source/${key.replace('-', '')}
function get${funcName}Template() {
    return \`${content}\`;
}

`;
    } else {
        output += `// ${template.name} - Template file not found: ${template.file}
function get${funcName}Template() {
    return \`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${template.name}</title>
</head>
<body>
    <h1>Template file not found: ${template.file}</h1>
    <p>Please ensure the template file is downloaded.</p>
</body>
</html>\`;
}

`;
    }
}

output += `// Export for use in ai-dev.js
if (typeof window !== 'undefined') {
    window.GAME_TEMPLATES = GAME_TEMPLATES;
}
`;

fs.writeFileSync(path.join(__dirname, 'game-templates.js'), output, 'utf8');
console.log('✅ game-templates.js built successfully!');

