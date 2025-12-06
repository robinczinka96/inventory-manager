import { productsAPI, transactionsAPI } from './api.js';
import { state, setLoading } from './state.js';
import { showToast } from './ui-components.js';

let receivingProducts = [];

// Initialize receiving view
export async function initReceiving() {
    const form = document.getElementById('receiving-form');
    if (form) {
        form.addEventListener('submit', handleReceiving);
    }

    // Barcode filter handler
    const barcodeInput = document.getElementById('receiving-barcode-filter');
    if (barcodeInput) {
        barcodeInput.addEventListener('input', handleBarcodeInput);
    }

    // Clear barcode button
    const clearBtn = document.getElementById('clear-barcode-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (barcodeInput) {
                barcodeInput.value = '';
                barcodeInput.focus();
                filterProductList('');
            }
        });
    }

    // Product search input handler (for selecting ID)
    const searchInput = document.getElementById('receiving-product-search');
    if (searchInput) {
        searchInput.addEventListener('change', handleProductSelect);
        searchInput.addEventListener('input', (e) => {
            // Clear hidden ID if user clears input
            if (!e.target.value) {
                document.getElementById('receiving-product-id').value = '';
            }
        });
    }

    // Initialize batch import
    initBatchImport();

    window.addEventListener('viewchange', async (e) => {
        if (e.detail.view === 'receiving') {
            await loadReceivingProducts();
        }
    });
}

async function loadReceivingProducts() {
    try {
        const products = await productsAPI.getAll();
        receivingProducts = products;
        populateProductDatalist(products);
    } catch (error) {
        showToast('Hiba a termékek betöltésekor: ' + error.message, 'error');
    }
}

function populateProductDatalist(products) {
    const datalist = document.getElementById('receiving-product-list');
    if (!datalist) return;

    datalist.innerHTML = '';
    products.forEach(product => {
        const option = document.createElement('option');
        const barcodeStr = product.barcode ? ` [${product.barcode}]` : '';
        option.value = `${product.name}${barcodeStr}`; // Value shown in input
        option.dataset.id = product._id; // Store ID in dataset (not directly accessible in input value, handled by logic)
        datalist.appendChild(option);
    });
}

function handleBarcodeInput(e) {
    const barcode = e.target.value.trim().toLowerCase();
    filterProductList(barcode);
}

function filterProductList(barcode) {
    const searchInput = document.getElementById('receiving-product-search');
    const hiddenIdInput = document.getElementById('receiving-product-id');

    if (!barcode) {
        // Reset list if barcode is empty
        populateProductDatalist(receivingProducts);
        return;
    }

    // Find exact match first
    const exactMatch = receivingProducts.find(p => p.barcode && p.barcode.toLowerCase() === barcode);

    if (exactMatch) {
        // Auto-select if exact match found
        const barcodeStr = exactMatch.barcode ? ` [${exactMatch.barcode}]` : '';
        searchInput.value = `${exactMatch.name}${barcodeStr}`;
        hiddenIdInput.value = exactMatch._id;
        showToast(`Termék kiválasztva: ${exactMatch.name}`, 'success');
    } else {
        // Filter list for partial matches
        const filtered = receivingProducts.filter(p => p.barcode && p.barcode.toLowerCase().includes(barcode));
        populateProductDatalist(filtered);
    }
}

function handleProductSelect(e) {
    const inputValue = e.target.value;
    const hiddenIdInput = document.getElementById('receiving-product-id');

    // Find product based on input value string
    // Format: "Name [Barcode]"
    const product = receivingProducts.find(p => {
        const barcodeStr = p.barcode ? ` [${p.barcode}]` : '';
        return `${p.name}${barcodeStr}` === inputValue;
    });

    if (product) {
        hiddenIdInput.value = product._id;
    } else {
        hiddenIdInput.value = ''; // Invalid selection
    }
}

async function handleReceiving(e) {
    e.preventDefault();

    const productId = document.getElementById('receiving-product-id').value;
    const quantity = parseInt(document.getElementById('receiving-quantity').value);
    const price = parseFloat(document.getElementById('receiving-price').value);

    if (!productId) {
        showToast('Válasszon ki egy érvényes terméket a listából!', 'error');
        return;
    }

    try {
        setLoading(true);
        await transactionsAPI.receive({
            productId,
            quantity,
            price
        });

        showToast('Bevételezés sikeresen rögzítve!', 'success');

        // Reset form
        e.target.reset();
        document.getElementById('receiving-product-id').value = '';

        // Reload products
        await loadReceivingProducts();
    } catch (error) {
        showToast('Hiba a bevételezés rögzítésekor: ' + error.message, 'error');
    } finally {
        setLoading(false);
    }
}

// ===== BATCH IMPORT FUNCTIONALITY =====

// Initialize batch import handlers
function initBatchImport() {
    const importBtn = document.getElementById('batch-import-btn');
    const clearBtn = document.getElementById('batch-import-clear');

    if (importBtn) {
        importBtn.addEventListener('click', handleBatchImport);
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            document.getElementById('batch-import-text').value = '';
            document.getElementById('eur-rate').value = '';
            document.getElementById('batch-import-preview').style.display = 'none';
        });
    }
}

// Parse TSV text
function parseTSV(text) {
    const lines = text.trim().split('\n');
    if (lines.length < 2) {
        throw new Error('Legalább 2 sor szükséges (fejléc + 1 termék)');
    }

    // Skip first line (header)
    const dataLines = lines.slice(1);

    const products = [];
    for (let i = 0; i < dataLines.length; i++) {
        const line = dataLines[i].trim();
        if (!line) continue; // Skip empty lines

        const columns = line.split('\t');
        if (columns.length < 5) {
            throw new Error(`${i + 2}. sor: Hiányos adatok (min. 5 oszlop szükséges)`);
        }

        const [barcode, description, quantity, pvValue, priceEUR] = columns;

        products.push({
            barcode: barcode.trim(),
            description: description.trim(),
            quantity: parseInt(quantity) || 0,
            priceEUR: parseFloat(priceEUR) || 0,
            lineNumber: i + 2
        });
    }

    return products;
}

// Handle batch import
async function handleBatchImport() {
    const textInput = document.getElementById('batch-import-text');
    const eurRateInput = document.getElementById('eur-rate');
    const previewDiv = document.getElementById('batch-import-preview');
    const previewContent = document.getElementById('batch-preview-content');

    const text = textInput.value.trim();
    const eurRate = parseFloat(eurRateInput.value);

    // Validation
    if (!text) {
        showToast('Illessz be termék adatokat!', 'error');
        return;
    }

    if (!eurRate || eurRate <= 0) {
        showToast('Add meg az EUR árfolyamot!', 'error');
        eurRateInput.focus();
        return;
    }

    try {
        setLoading(true);

        // Parse TSV
        const parsedProducts = parseTSV(text);

        if (parsedProducts.length === 0) {
            showToast('Nincsenek importálható termékek!', 'error');
            return;
        }

        // Match products by barcode
        const importItems = [];
        const errors = [];

        for (const item of parsedProducts) {
            const product = receivingProducts.find(p => p.barcode === item.barcode);

            if (!product) {
                errors.push(`${item.lineNumber}. sor: Termék nem található (${item.barcode})`);
                continue;
            }

            const priceHUF = Math.round(item.priceEUR * eurRate);

            importItems.push({
                productId: product._id,
                productName: product.name,
                barcode: item.barcode,
                quantity: item.quantity,
                priceEUR: item.priceEUR,
                priceHUF: priceHUF
            });
        }

        // Show preview
        let previewHTML = `
            <p><strong>EUR árfolyam:</strong> ${eurRate} HUF</p>
            <p><strong>Importálható termékek:</strong> ${importItems.length} db</p>
        `;

        if (errors.length > 0) {
            previewHTML += `<p style="color: var(--color-warning);"><strong>Hibák:</strong> ${errors.length} db</p>`;
            previewHTML += `<ul style="color: var(--color-text-secondary); font-size: 0.875rem; margin-top: 0.5rem;">`;
            errors.forEach(err => {
                previewHTML += `<li>${err}</li>`;
            });
            previewHTML += `</ul>`;
        }

        if (importItems.length > 0) {
            previewHTML += `<table style="width: 100%; font-size: 0.875rem; margin-top: 1rem;">
                <thead>
                    <tr style="border-bottom: 2px solid var(--color-border);">
                        <th style="padding: 0.5rem; text-align: left;">Termék</th>
                        <th style="padding: 0.5rem; text-align: right;">Db</th>
                        <th style="padding: 0.5rem; text-align: right;">Ár (EUR)</th>
                        <th style="padding: 0.5rem; text-align: right;">Ár (HUF)</th>
                    </tr>
                </thead>
                <tbody>`;

            importItems.forEach(item => {
                previewHTML += `
                    <tr style="border-bottom: 1px solid var(--color-border);">
                        <td style="padding: 0.5rem;">${item.productName}<br><small style="color: var(--color-text-secondary);">${item.barcode}</small></td>
                        <td style="padding: 0.5rem; text-align: right;">${item.quantity}</td>
                        <td style="padding: 0.5rem; text-align: right;">${item.priceEUR.toFixed(2)} €</td>
                        <td style="padding: 0.5rem; text-align: right; font-weight: 600;">${item.priceHUF} Ft</td>
                    </tr>`;
            });

            previewHTML += `</tbody></table>`;
        }

        previewContent.innerHTML = previewHTML;
        previewDiv.style.display = 'block';

        // Ask for confirmation
        if (!confirm(`${importItems.length} termék bevételezése?\n\nFolytassuk az importot?`)) {
            return;
        }

        // Execute batch import
        let successCount = 0;
        for (const item of importItems) {
            try {
                await transactionsAPI.receive({
                    productId: item.productId,
                    quantity: item.quantity,
                    price: item.priceHUF,
                    source: 'batch-import'
                });
                successCount++;
            } catch (error) {
                errors.push(`${item.productName}: ${error.message}`);
            }
        }

        // Show result
        let message = `Import befejezve!\nSikeres: ${successCount}/${importItems.length}`;
        if (errors.length > 0) {
            message += `\nHibák: ${errors.length}`;
            console.error('Import errors:', errors);
        }

        showToast(message, errors.length > 0 ? 'warning' : 'success');

        // Clear form
        textInput.value = '';
        eurRateInput.value = '';
        previewDiv.style.display = 'none';

        // Reload products
        await loadReceivingProducts();

    } catch (error) {
        console.error('Batch import error:', error);
        showToast('Hiba az import során: ' + error.message, 'error');
    } finally {
        setLoading(false);
    }
}
