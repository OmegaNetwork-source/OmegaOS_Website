// Helper function to apply formatting to HTML string for slides
// This will be inserted into slides.js

function applyFormattingToSlideHTML(html, instructions) {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    
    const allElements = temp.querySelectorAll('*');
    
    allElements.forEach(el => {
        if (instructions.fontSize) {
            el.style.fontSize = instructions.fontSize + 'pt';
        }
        if (instructions.fontFamily) {
            el.style.fontFamily = instructions.fontFamily;
        }
        if (instructions.color) {
            el.style.color = instructions.color;
        }
        if (instructions.align) {
            el.style.textAlign = instructions.align;
        }
        if (instructions.bold) {
            if (!el.style.fontWeight || el.style.fontWeight === 'normal') {
                el.style.fontWeight = 'bold';
            }
        }
        if (instructions.italic) {
            el.style.fontStyle = 'italic';
        }
        if (instructions.underline) {
            el.style.textDecoration = 'underline';
        }
    });
    
    return temp.innerHTML;
}

