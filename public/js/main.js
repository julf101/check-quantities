function stockChecker() {
    return {
        url: '',
        stockInfo: [],
        selectedSize: null,
        selectedItem: null,
        error: null,
        showInfo: true,  // New property to control info box visibility
        description: `
- Cet outil vous permet de vérifier rapidement la disponibilité des produits The North Face.
- Entrez l'URL du produit dans le champ ci-dessous.
- Cliquez sur "Vérifier la disponibilité" pour obtenir les informations sur les disponibilités hebdomadaires.
- Sélectionnez une taille pour voir les détails spécifiques.
- Veuilez ensuite copier les détails des articles désirer dans le shop Nendaz Freeride.
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
                    this.error = 'Aucun stock trouvé pour ce produit.';  // Updated French error message
                }
            } catch (error) {
                console.error('Error:', error);
                this.error = 'Une erreur s\'est produite lors de la vérification du stock.';  // French error message
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

        copyToClipboard(text) {
            navigator.clipboard.writeText(text).then(() => {
                alert('Copied to clipboard');
            }).catch((err) => {
                console.error('Failed to copy text: ', err);
            });
        },
    };
}
