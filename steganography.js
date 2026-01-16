document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const tabs = document.querySelectorAll('.nav-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    // Encode Elements
    const encodeUpload = document.getElementById('encode-upload');
    const encodePreview = document.getElementById('encode-preview');
    const encodePlaceholder = encodeUpload.querySelector('.upload-placeholder');
    const secretMessage = document.getElementById('secret-message');
    const encodePassword = document.getElementById('encode-password');
    const btnEncode = document.getElementById('btn-encode');
    const capacityText = document.getElementById('capacity-text');
    const capacityBar = document.getElementById('capacity-bar');

    // Decode Elements
    const decodeUpload = document.getElementById('decode-upload');
    const decodePreview = document.getElementById('decode-preview');
    const decodePlaceholder = decodeUpload.querySelector('.upload-placeholder');
    const decodePassword = document.getElementById('decode-password');
    const btnDecode = document.getElementById('btn-decode');
    const decodeOutputArea = document.getElementById('decode-output-area');
    const decodedText = document.getElementById('decoded-text');
    const btnCopy = document.getElementById('btn-copy');

    // Modal
    const resultModal = document.getElementById('result-modal');
    const resultImage = document.getElementById('result-image');
    const btnDownload = document.getElementById('btn-download');
    const closeModalBtns = document.querySelectorAll('.close-modal');

    // State
    let encodeImageLoaded = false;
    let decodeImageLoaded = false;
    let maxChars = 0;

    // --- Window Controls ---
    const minBtn = document.getElementById('minimizeBtn');
    const maxBtn = document.getElementById('maximizeBtn');
    const closeBtn = document.getElementById('closeBtn');

    // Get Window ID for controls
    let windowId = null;
    if (window.electronAPI && window.electronAPI.getWindowId) {
        window.electronAPI.getWindowId().then(id => {
            windowId = id;
        }).catch(err => console.error("Failed to get window ID:", err));
    }

    if (minBtn) minBtn.addEventListener('click', () => {
        if (window.electronAPI && windowId) window.electronAPI.appWindowMinimize(windowId);
    });
    if (maxBtn) maxBtn.addEventListener('click', () => {
        if (window.electronAPI && windowId) window.electronAPI.appWindowMaximize(windowId);
    });
    if (closeBtn) closeBtn.addEventListener('click', () => {
        if (window.electronAPI && windowId) window.electronAPI.appWindowClose(windowId);
    });

    // --- Tabs ---
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            tab.classList.add('active');
            const tabId = tab.dataset.tab;
            const content = document.getElementById(`${tabId}-tab`);
            if (content) content.classList.add('active');
        });
    });

    // --- File Upload Logic (Secure & Isolated) ---
    async function processAbsolutePath(filePath, preview, placeholder, isEncode) {
        try {
            // Determine mime type
            const ext = filePath.split('.').pop().toLowerCase();
            let mime = 'image/png';
            if (['jpg', 'jpeg'].includes(ext)) mime = 'image/jpeg';
            if (ext === 'webp') mime = 'image/webp';
            if (ext === 'gif') mime = 'image/gif';

            // Read file (Attempts to use isolated storage and will throw if access is denied)
            const base64 = await window.electronAPI.readFile(filePath, 'base64');
            const dataUrl = `data:${mime};base64,${base64}`;

            preview.src = dataUrl;
            preview.classList.remove('preview-hidden');
            placeholder.style.display = 'none';

            const img = new Image();
            img.onload = () => {
                if (isEncode) {
                    encodeImageLoaded = true;
                    // Capacity: 3 bits per pixel (LSB of R, G, B)
                    const totalBytes = Math.floor((img.width * img.height * 3) / 8) - 4;
                    maxChars = totalBytes;
                    console.log("Image loaded from secure storage. Capacity:", totalBytes, "bytes");
                    updateCapacity();
                } else {
                    decodeImageLoaded = true;
                }
            };
            img.onerror = () => {
                console.error("Failed to parse image data.");
                alert("The file content could not be loaded as an image.");
            };
            img.src = dataUrl;

        } catch (err) {
            console.error(err);
            if (err.message && err.message.includes('restricted')) {
                alert("SECURITY ALERT: Access Denied.\n\nFiles must be within the isolated environment.");
            } else {
                alert("Error loading file: " + err.message);
            }
        }
    }

    function setupUpload(area, unusedInput, preview, placeholder, isEncode) {
        // Native Click -> IPC Secure Dialog
        area.addEventListener('click', async () => {
            try {
                // Determine default filter based on mode
                const result = await window.electronAPI.openFileDialog({
                    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg'] }]
                });

                if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
                    processAbsolutePath(result.filePaths[0], preview, placeholder, isEncode);
                }
            } catch (e) {
                alert("Dialog Error: " + e.message);
            }
        });

        // Drag & Drop (Enforced Validation)
        area.addEventListener('drop', (e) => {
            e.preventDefault();
            area.style.borderColor = 'var(--border)';
            area.style.background = '';

            if (e.dataTransfer.files.length) {
                const file = e.dataTransfer.files[0];
                if (file.path) {
                    // Electron exposes .path, which allows us to route through our secure verification
                    processAbsolutePath(file.path, preview, placeholder, isEncode);
                } else {
                    alert("SECURITY WARNING: Cannot verify file origin. Please use the click-to-upload dialog.");
                }
            }
        });

        // Visual feedback for drag
        area.addEventListener('dragover', (e) => {
            e.preventDefault();
            area.style.borderColor = 'var(--primary)';
            area.style.background = 'rgba(0, 255, 157, 0.1)';
        });
        area.addEventListener('dragleave', (e) => {
            e.preventDefault();
            area.style.borderColor = 'var(--border)';
            area.style.background = '';
        });
    }

    // Ignore the native inputs as we are using custom secure dialogs
    setupUpload(encodeUpload, null, encodePreview, encodePlaceholder, true);
    setupUpload(decodeUpload, null, decodePreview, decodePlaceholder, false);

    // --- Capacity Update ---
    secretMessage.addEventListener('input', updateCapacity);

    function updateCapacity() {
        if (!encodeImageLoaded) return;

        const text = secretMessage.value;
        const currentLen = text.length; // Approximate
        let pct = 0;
        if (maxChars > 0) {
            pct = (currentLen / maxChars) * 100;
        }

        if (pct > 0 && pct < 0.1) {
            capacityText.textContent = "< 0.1%";
        } else {
            capacityText.textContent = `${pct.toFixed(1)}%`;
        }

        capacityBar.style.width = `${Math.min(pct, 100)}%`;

        if (pct > 100) {
            capacityBar.style.backgroundColor = 'var(--error)';
            capacityText.style.color = 'var(--error)';
        } else {
            capacityBar.style.backgroundColor = 'var(--primary)';
            capacityText.style.color = 'var(--text-dim)';
        }
    }

    // --- XOR Cipher (Simple Encryption) ---
    function xorCipher(text, pass) {
        if (!pass) return text;
        let result = '';
        for (let i = 0; i < text.length; i++) {
            result += String.fromCharCode(text.charCodeAt(i) ^ pass.charCodeAt(i % pass.length));
        }
        return result;
    }

    // --- Steganography Core ---
    function numToBin32(num) {
        return num.toString(2).padStart(32, '0');
    }
    function bin32ToNum(bin) {
        return parseInt(bin, 2);
    }
    function strToBin(str) {
        let bin = '';
        for (let i = 0; i < str.length; i++) {
            const code = str.charCodeAt(i);
            bin += (code % 256).toString(2).padStart(8, '0');
        }
        return bin;
    }
    function binToStr(bin) {
        let str = '';
        for (let i = 0; i < bin.length; i += 8) {
            str += String.fromCharCode(parseInt(bin.substring(i, i + 8), 2));
        }
        return str;
    }

    // --- ENCODE HANDLER ---
    btnEncode.addEventListener('click', () => {
        if (!encodeImageLoaded) {
            alert('Please select a cover image first.');
            return;
        }

        const originalText = btnEncode.innerHTML;
        btnEncode.innerHTML = '<span class="icon">⌛</span> PROCESSING...';
        btnEncode.disabled = true;

        setTimeout(() => {
            try {
                let message = secretMessage.value;
                if (!message) {
                    alert('Please enter a secret message.');
                    btnEncode.innerHTML = originalText;
                    btnEncode.disabled = false;
                    return;
                }

                const password = encodePassword.value;
                if (password) {
                    message = "ENC:" + xorCipher(message, password);
                } else {
                    message = "TXT:" + message;
                }

                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const img = new Image();

                img.onload = () => {
                    try {
                        canvas.width = img.width;
                        canvas.height = img.height;
                        ctx.drawImage(img, 0, 0);

                        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        const data = imgData.data;

                        const binaryMsg = strToBin(message);
                        const lengthBin = numToBin32(binaryMsg.length);
                        const fullBinary = lengthBin + binaryMsg;

                        if (fullBinary.length > (data.length * 0.75)) {
                            alert('Message is too long for this image!');
                            btnEncode.innerHTML = originalText;
                            btnEncode.disabled = false;
                            return;
                        }

                        let dataIndex = 0;
                        let pixelIndex = 0;
                        const totalPixels = data.length;

                        while (dataIndex < fullBinary.length && pixelIndex < totalPixels) {
                            if ((pixelIndex + 1) % 4 === 0) { // Skip Alpha
                                pixelIndex++;
                                continue;
                            }

                            const bit = fullBinary[dataIndex];
                            let val = data[pixelIndex];
                            val = val & 254; // Clear LSB
                            val = val | parseInt(bit, 10); // Set LSB
                            data[pixelIndex] = val;

                            pixelIndex++;
                            dataIndex++;
                        }

                        ctx.putImageData(imgData, 0, 0);

                        // Show Result
                        resultImage.src = canvas.toDataURL('image/png');
                        resultModal.classList.add('active');
                    } catch (innerError) {
                        console.error("Encoding error:", innerError);
                        alert("Error during encoding: " + innerError.message);
                    } finally {
                        btnEncode.innerHTML = originalText;
                        btnEncode.disabled = false;
                    }
                };

                img.onerror = (err) => {
                    alert("Failed to process image structure.");
                    btnEncode.innerHTML = originalText;
                    btnEncode.disabled = false;
                };

                img.src = encodePreview.src;
            } catch (error) {
                alert("Error setting up encoding: " + error.message);
                btnEncode.innerHTML = originalText;
                btnEncode.disabled = false;
            }
        }, 50);
    });

    // --- DECODE HANDLER ---
    btnDecode.addEventListener('click', () => {
        if (!decodeImageLoaded) {
            alert('Please select a Ghost Image to analyze.');
            return;
        }

        const originalText = btnDecode.innerHTML;
        btnDecode.innerHTML = '<span class="icon">⌛</span> ANALYZING...';
        btnDecode.disabled = true;

        setTimeout(() => {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const img = new Image();

                img.onload = () => {
                    try {
                        canvas.width = img.width;
                        canvas.height = img.height;
                        ctx.drawImage(img, 0, 0);

                        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        const data = imgData.data;

                        let lengthBin = '';
                        let pixelIndex = 0;

                        while (lengthBin.length < 32 && pixelIndex < data.length) {
                            if ((pixelIndex + 1) % 4 === 0) {
                                pixelIndex++;
                                continue;
                            }
                            const val = data[pixelIndex];
                            lengthBin += (val & 1).toString();
                            pixelIndex++;
                        }

                        const msgLength = bin32ToNum(lengthBin);

                        if (msgLength <= 0 || msgLength > (data.length * 10)) {
                            alert('No valid Ghost Data found in this image.');
                            btnDecode.innerHTML = originalText;
                            btnDecode.disabled = false;
                            return;
                        }

                        let msgBin = '';
                        while (msgBin.length < msgLength && pixelIndex < data.length) {
                            if ((pixelIndex + 1) % 4 === 0) {
                                pixelIndex++;
                                continue;
                            }
                            const val = data[pixelIndex];
                            msgBin += (val & 1).toString();
                            pixelIndex++;
                        }

                        let rawMessage = binToStr(msgBin);
                        let finalMessage = '';

                        if (rawMessage.startsWith('TXT:')) {
                            finalMessage = rawMessage.substring(4);
                        } else if (rawMessage.startsWith('ENC:')) {
                            const password = decodePassword.value;
                            if (!password) {
                                alert('This message is encrypted. Please enter a password.');
                                btnDecode.innerHTML = originalText;
                                btnDecode.disabled = false;
                                return;
                            }
                            finalMessage = xorCipher(rawMessage.substring(4), password);
                        } else {
                            finalMessage = rawMessage;
                        }

                        decodedText.textContent = finalMessage;
                        decodeOutputArea.classList.remove('hidden');
                    } catch (e) {
                        alert('Error decoding: ' + e.message);
                    } finally {
                        btnDecode.innerHTML = originalText;
                        btnDecode.disabled = false;
                    }
                };
                img.src = decodePreview.src;
            } catch (e) {
                alert('Setup error: ' + e.message);
                btnDecode.innerHTML = originalText;
                btnDecode.disabled = false;
            }
        }, 50);
    });

    btnCopy.addEventListener('click', () => {
        navigator.clipboard.writeText(decodedText.textContent);
        const originalText = btnCopy.textContent;
        btnCopy.textContent = 'Copied!';
        setTimeout(() => btnCopy.textContent = originalText, 2000);
    });

    btnDownload.addEventListener('click', () => {
        const link = document.createElement('a');
        link.download = 'ghost_image_' + Date.now() + '.png';
        link.href = resultImage.src;
        link.click();
    });

    closeModalBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            resultModal.classList.remove('active');
        });
    });

    resultModal.addEventListener('click', (e) => {
        if (e.target === resultModal) {
            resultModal.classList.remove('active');
        }
    });
});
