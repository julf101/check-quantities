function stockChecker() {
    return {
        url: '',
        stockInfo: [],
        selectedSize: null,
        selectedItem: null,
        error: null,
        showInfo: true,
        description: `
- Cet outil vous permet de vérifier rapidement la disponibilité des produits The North Face.
- Entrez l'URL du produit dans le champ ci-dessous.
- Cliquez sur "Vérifier la disponibilité" pour obtenir les informations sur les disponibilités hebdomadaires.
- Sélectionnez une taille pour voir les détails spécifiques.
`,
        renderedDescription: '',

        init() {
            this.renderedDescription = marked.parse(this.description);
        },

        async checkStock() {
            this.error = null;
            this.stockInfo = [];
            this.selectedSize = null;
            this.selectedItem = null;

            try {
                const response = await fetch('/check-stock', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ url: this.url }),
                });

                if (!response.ok) {
                    throw new Error('Failed to check stock');
                }

                this.stockInfo = await response.json();

                if (this.stockInfo.length === 0) {
                    this.error = 'Malheureusement ce produit n\'est pas en stock. Prière de choisir un autre produit.';
                }
            } catch (error) {
                console.error('Error:', error);
                this.error = 'Une erreur s\'est produite lors de la vérification du stock.';
            }
        },

        selectSize(size) {
            this.selectedSize = size;
            this.selectedItem = this.stockInfo.find(item => item.characteristicValueForMainSizesOfVariantsId === size);
        },

        clearAll() {
            this.url = '';
            this.stockInfo = [];
            this.selectedSize = null;
            this.selectedItem = null;
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
