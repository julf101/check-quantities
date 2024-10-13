function stockChecker() {
    return {
        url: '',
        stockInfo: [],
        selectedSize: null,
        quantity: 1,
        availableQuantity: 0,
        error: null,
        selectedItem: null,

        async checkStock() {
            this.error = null;
            this.stockInfo = [];
            this.selectedSize = null;
            this.quantity = 1;
            this.availableQuantity = 0;
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

        async selectSize(size) {
            this.selectedSize = size;
            this.selectedItem = this.stockInfo.find(item => item.characteristicValueForMainSizesOfVariantsId === size);

            try {
                const response = await fetch('/get-quantity', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        materialNumberId: this.selectedItem.materialNumberId,
                        size: size,
                    }),
                });

                if (!response.ok) {
                    throw new Error('Failed to get quantity');
                }

                const data = await response.json();
                this.availableQuantity = data.quantity;
                this.quantity = Math.min(1, this.availableQuantity);
            } catch (error) {
                console.error('Error:', error);
                this.error = 'An error occurred while getting quantity';
            }
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