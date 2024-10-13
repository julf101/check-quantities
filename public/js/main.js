function stockChecker() {
    return {
        url: '',
        stockInfo: [],
        selectedSize: null,
        selectedItem: null,
        error: null,

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
                    this.error = 'No stock found for this product';
                }
            } catch (error) {
                console.error('Error:', error);
                this.error = 'An error occurred while checking stock';
            }
        },

        selectSize(size) {
            this.selectedSize = size;
            this.selectedItem = this.stockInfo.find(item => item.characteristicValueForMainSizesOfVariantsId === size);
        },

        clearUrl() {
            this.url = '';
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