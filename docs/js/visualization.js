/**
 * Visualization utilities for the Order Book
 * SMM282 Quantitative Trading
 */

class OrderBookVisualizer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
        this.resizeCanvas();
        
        // Listen for window resize
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        if (!this.canvas) return;
        
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth - 40;
        this.canvas.height = 300;
    }

    /**
     * Draw the depth chart
     */
    drawDepthChart(orderBook) {
        if (!this.ctx) return;

        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const padding = { top: 30, right: 60, bottom: 40, left: 60 };

        // Clear canvas
        ctx.fillStyle = '#eaeef2';
        ctx.fillRect(0, 0, width, height);

        // Get depth data
        const bidDepth = orderBook.getDepth(Side.BUY, 20, false);
        const askDepth = orderBook.getDepth(Side.SELL, 20, false);

        if (bidDepth.length === 0 && askDepth.length === 0) {
            ctx.fillStyle = '#656d76';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('No orders in the book', width / 2, height / 2);
            return;
        }

        // Calculate cumulative depth
        const bidCumulative = this.calculateCumulative(bidDepth);
        const askCumulative = this.calculateCumulative(askDepth);

        // Find price range and max quantity
        const allPrices = [...bidDepth.map(d => d.price), ...askDepth.map(d => d.price)];
        const minPrice = Math.min(...allPrices) * 0.995;
        const maxPrice = Math.max(...allPrices) * 1.005;
        
        const maxCumQty = Math.max(
            bidCumulative.length > 0 ? bidCumulative[bidCumulative.length - 1].cumulative : 0,
            askCumulative.length > 0 ? askCumulative[askCumulative.length - 1].cumulative : 0
        );

        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        // Helper functions
        const priceToX = (price) => padding.left + ((price - minPrice) / (maxPrice - minPrice)) * chartWidth;
        const qtyToY = (qty) => padding.top + chartHeight - (qty / maxCumQty) * chartHeight;

        // Draw grid
        ctx.strokeStyle = '#d0d7de';
        ctx.lineWidth = 1;
        
        // Horizontal grid lines
        for (let i = 0; i <= 4; i++) {
            const y = padding.top + (chartHeight / 4) * i;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();
            
            // Y-axis labels
            const qty = maxCumQty * (1 - i / 4);
            ctx.fillStyle = '#656d76';
            ctx.font = '11px monospace';
            ctx.textAlign = 'right';
            ctx.fillText(Math.round(qty).toString(), padding.left - 10, y + 4);
        }

        // Draw midpoint line
        const midpoint = orderBook.getMidpoint(true);
        if (midpoint) {
            const midX = priceToX(midpoint);
            ctx.strokeStyle = '#0969da';
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(midX, padding.top);
            ctx.lineTo(midX, height - padding.bottom);
            ctx.stroke();
            ctx.setLineDash([]);
            
            // Midpoint label
            ctx.fillStyle = '#0969da';
            ctx.font = '11px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`Mid: ${midpoint.toFixed(2)}`, midX, padding.top - 10);
        }

        // Draw bid depth (green area)
        if (bidCumulative.length > 0) {
            ctx.beginPath();
            ctx.moveTo(priceToX(bidCumulative[0].price), qtyToY(0));
            
            for (const point of bidCumulative) {
                ctx.lineTo(priceToX(point.price), qtyToY(point.cumulative));
            }
            
            ctx.lineTo(priceToX(bidCumulative[bidCumulative.length - 1].price), qtyToY(0));
            ctx.closePath();
            
            ctx.fillStyle = 'rgba(26, 127, 55, 0.3)';
            ctx.fill();
            
            ctx.strokeStyle = '#1a7f37';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(priceToX(bidCumulative[0].price), qtyToY(bidCumulative[0].cumulative));
            for (const point of bidCumulative) {
                ctx.lineTo(priceToX(point.price), qtyToY(point.cumulative));
            }
            ctx.stroke();
        }

        // Draw ask depth (red area)
        if (askCumulative.length > 0) {
            ctx.beginPath();
            ctx.moveTo(priceToX(askCumulative[0].price), qtyToY(0));
            
            for (const point of askCumulative) {
                ctx.lineTo(priceToX(point.price), qtyToY(point.cumulative));
            }
            
            ctx.lineTo(priceToX(askCumulative[askCumulative.length - 1].price), qtyToY(0));
            ctx.closePath();
            
            ctx.fillStyle = 'rgba(207, 34, 46, 0.3)';
            ctx.fill();
            
            ctx.strokeStyle = '#cf222e';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(priceToX(askCumulative[0].price), qtyToY(askCumulative[0].cumulative));
            for (const point of askCumulative) {
                ctx.lineTo(priceToX(point.price), qtyToY(point.cumulative));
            }
            ctx.stroke();
        }

        // X-axis labels
        const priceStep = (maxPrice - minPrice) / 5;
        ctx.fillStyle = '#656d76';
        ctx.font = '11px monospace';
        ctx.textAlign = 'center';
        for (let i = 0; i <= 5; i++) {
            const price = minPrice + priceStep * i;
            const x = priceToX(price);
            ctx.fillText(price.toFixed(2), x, height - padding.bottom + 20);
        }

        // Axis titles
        ctx.fillStyle = '#1f2328';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Price', width / 2, height - 5);
        
        ctx.save();
        ctx.translate(15, height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('Cumulative Quantity', 0, 0);
        ctx.restore();

        // Legend
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'left';
        
        ctx.fillStyle = '#1a7f37';
        ctx.fillRect(width - padding.right - 80, padding.top, 12, 12);
        ctx.fillStyle = '#1f2328';
        ctx.fillText('Bids', width - padding.right - 64, padding.top + 10);
        
        ctx.fillStyle = '#cf222e';
        ctx.fillRect(width - padding.right - 80, padding.top + 18, 12, 12);
        ctx.fillStyle = '#1f2328';
        ctx.fillText('Asks', width - padding.right - 64, padding.top + 28);
    }

    /**
     * Calculate cumulative depth from price levels
     */
    calculateCumulative(depth) {
        let cumulative = 0;
        return depth.map(level => {
            cumulative += level.quantity;
            return {
                price: level.price,
                quantity: level.quantity,
                cumulative: cumulative
            };
        });
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { OrderBookVisualizer };
}
