function stockChecker() {
    return {
        url: '',
        stockInfo: null,
        selectedColor: null,
        selectedSize: null,
        selectedSizeInfo: null,
        error: null,
        showInfo: true,
        description: `
- Cet outil vous permet de vérifier rapidement la disponibilité des produits The North Face.
- Entrez l'URL du produit dans le champ ci-dessous (exemple: https://www.thenorthface.ch/fr-ch/p/homme-211701/veste-summit-verbier-gore-tex-pour-homme-NF0A87ZK?color=5NO)
- Sélectionnez la couleur désirée
- Choisissez votre taille pour voir la disponibilité
`,
        renderedDescription: '',

        init() {
            this.renderedDescription = marked.parse(this.description);
        },

        async checkStock() {
            this.resetState();

            try {
                const response = await fetch('/check-stock', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: this.url }),
                });

                if (!response.ok) {
                    throw new Error('Failed to check stock');
                }

                const data = await response.json();
                
                if (data.error === 'NO_STOCK') {
                    this.error = 'Malheureusement ce produit n\'est pas en stock. Prière de choisir un autre produit.';
                    return;
                }
                
                if (data.error === 'INVALID_URL_FORMAT') {
                    this.error = 'L\'URL ne semble pas être au bon format. Veuillez utiliser une URL de produit The North Face, par exemple: https://www.thenorthface.ch/fr-ch/p/homme-211701/veste-summit-verbier-gore-tex-pour-homme-NF0A87ZK?color=5NO';
                    return;
                }

                this.stockInfo = data;
            } catch (error) {
                console.error('Error:', error);
                this.error = 'L\'URL ne semble pas être au bon format. Veuillez utiliser une URL de produit The North Face, par exemple: https://www.thenorthface.ch/fr-ch/p/homme-211701/veste-summit-verbier-gore-tex-pour-homme-NF0A87ZK?color=5NO';
            }
        },

        selectColor(colorCode) {
            this.selectedColor = colorCode;
            this.selectedSize = null;
            this.selectedSizeInfo = null;
        },

        selectSize(sizeInfo) {
            this.selectedSize = sizeInfo.size;
            this.selectedSizeInfo = sizeInfo;
            const colorData = this.stockInfo.colors.find(c => c.colorCode === this.selectedColor);
            if (colorData) {
                this.selectedSizeInfo = {
                    ...sizeInfo,
                    materialNumberId: colorData.materialNumberIds[sizeInfo.size],
                    materialNumberText: colorData.materialNumberTexts[sizeInfo.size]
                };
            }
        },

        formatSize(size) {
            const numSize = parseInt(size);
            if (!isNaN(numSize) && numSize >= 50 && numSize <= 140) {
                return `US ${(numSize/10).toFixed(1)} (${size})`;
            }
            return size;
        },

        getAvailableSizes() {
            if (!this.selectedColor || !this.stockInfo) return [];
            const colorData = this.stockInfo.colors.find(c => c.colorCode === this.selectedColor);
            return colorData ? Object.entries(colorData.sizes)
                .filter(([_, quantity]) => quantity > 0)
                .map(([size, quantity]) => ({ 
                    size,
                    displaySize: this.formatSize(size),
                    quantity 
                }))
                .sort((a, b) => {
                    const aNum = parseInt(a.size);
                    const bNum = parseInt(b.size);
                    if (!isNaN(aNum) && !isNaN(bNum) && 
                        aNum >= 50 && aNum <= 140 && 
                        bNum >= 50 && bNum <= 140) {
                        return aNum - bNum;
                    }
                    const sizeOrder = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL'];
                    return sizeOrder.indexOf(a.size) - sizeOrder.indexOf(b.size);
                }) : [];
        },

        clearAll() {
            this.url = '';
            this.resetState();
        },

        resetState() {
            this.stockInfo = null;
            this.selectedColor = null;
            this.selectedSize = null;
            this.selectedSizeInfo = null;
            this.error = null;
        },

        copyToClipboard(text, button) {
            navigator.clipboard.writeText(text).then(() => {
                const originalInnerHTML = button.innerHTML;
                button.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                    </svg>
                `;
                setTimeout(() => {
                    button.innerHTML = originalInnerHTML;
                }, 2000);
            }).catch((err) => {
                console.error('Failed to copy text: ', err);
            });
        },
    };
}

window.stockChecker = stockChecker;
