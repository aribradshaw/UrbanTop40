/**
 * Main Artist Charts Class
 * 
 * Simple, working chart implementation
 */

(function($) {
    'use strict';
    
    // Check for required dependencies
    if (typeof $ === 'undefined') {
        console.error('ArtistCharts: jQuery is not available');
        return;
    }

class ArtistCharts {
    constructor(container) {
        this.container = container;
        this.artist = container.data('artist');
        this.chartData = null;
        this.chartCore = null;
        this.scrollbar = null;
        
        this.init();
    }
    
    init() {
        this.loadArtistData();
        this.bindEvents();
    }
    
    bindEvents() {
        console.log('Binding events for artist charts');
        
        // Error retry
        this.container.on('click', '.error-retry', () => {
            this.loadArtistData();
        });
        
        // Basic zoom and pan functionality
        this.container.on('wheel', '.chart-area', (e) => {
            e.preventDefault();
            
            if (e.shiftKey) {
                // Shift + wheel = horizontal panning
                this.handlePan(e);
            } else {
                // Regular wheel = zoom
                this.handleZoom(e);
            }
        });
        
        // Handle window resize to prevent Chart.js errors
        $(window).on('resize', () => {
            if (this.chartCore && this.chartCore.chart) {
                this.chartCore.chart.resize();
            }
        });
    }
    
    async loadArtistData() {
        this.showLoading();
        this.hideError();
        this.hideContent();
        
        try {
            // Check if jQuery is available
            if (typeof $ === 'undefined') {
                throw new Error('jQuery is not loaded. Please check your script dependencies.');
            }
            
            // Check if AJAX data is available
            if (typeof artistChartsAjax === 'undefined') {
                throw new Error('AJAX configuration not loaded. Please refresh the page.');
            }
            
            console.log('ArtistCharts: Making AJAX request...');
            const response = await $.ajax({
                url: artistChartsAjax.ajaxurl,
                type: 'POST',
                data: {
                    action: 'get_artist_charts',
                    artist: this.artist,
                    nonce: artistChartsAjax.nonce
                }
            });
            
            console.log('ArtistCharts: AJAX response received:', response);
            
            if (response.success) {
                this.chartData = response.data;
                this.renderChart();
                this.updateStats();
                this.showContent();
            } else {
                throw new Error(response.data);
            }
        } catch (error) {
            console.error('Error loading artist data:', error);
            this.showError(error.message || 'Failed to load artist data');
        } finally {
            this.hideLoading();
        }
    }
    
    renderChart() {
        if (!this.chartData) return;
        
        // Check if required dependencies are available
        if (typeof ChartCore === 'undefined') {
            console.error('ArtistCharts: ChartCore class not available');
            this.showError('Chart dependencies not loaded. Please refresh the page.');
            return;
        }
        
        try {
            // Create chart core with all data (no filtering)
            this.chartCore = new ChartCore(this.container, this.chartData);
            
            // Add scrollbar and week indicator
            this.addScrollbarAndIndicator();
        } catch (error) {
            console.error('Error creating chart:', error);
            this.showError('Failed to create chart: ' + error.message);
        }
    }
    
    handleZoom(e) {
        if (!this.chartCore || !this.chartCore.chart) return;
        
        const delta = e.originalEvent.deltaY > 0 ? 0.9 : 1.1;
        const chart = this.chartCore.chart;
        
        // Simple zoom by adjusting the chart's scale
        if (chart.options.scales.x.min && chart.options.scales.x.max) {
            const range = chart.options.scales.x.max - chart.options.scales.x.min;
            const center = (chart.options.scales.x.min + chart.options.scales.x.max) / 2;
            const newRange = range * delta;
            
            chart.options.scales.x.min = center - newRange / 2;
            chart.options.scales.x.max = center + newRange / 2;
            chart.update('none');
        }
    }
    
    handlePan(e) {
        if (!this.chartCore || !this.chartCore.chart) return;
        
        const delta = e.originalEvent.deltaY > 0 ? 1 : -1;
        const chart = this.chartCore.chart;
        
        // Simple pan by shifting the chart's scale
        if (chart.options.scales.x.max) {
            const range = chart.options.scales.x.max - chart.options.scales.x.min;
            const shift = range * 0.1 * delta;
            
            chart.options.scales.x.min += shift;
            chart.options.scales.x.max += shift;
            chart.update('none');
        }
    }
    
    updateStats() {
        if (!this.chartData) return;
        
        this.container.find('#song-count').text(`${this.chartData.totalSongs} Songs`);
        
        // Calculate number of #1 hits
        let numberOnes = 0;
        this.chartData.songs.forEach(song => {
            const peakPosition = Math.min(...song.chartHistory.map(e => e.position));
            if (peakPosition === 1) {
                numberOnes++;
            }
        });
        
        this.container.find('#week-count').text(`${numberOnes} Number Ones`);
    }
    
    addScrollbarAndIndicator() {
        const chartContainer = this.container.find('#chart-container');
        
        // Add week indicator above chart
        const totalWeeks = this.chartData.songs.reduce((total, song) => {
            return total + song.chartHistory.length;
        }, 0);
        
        const weekIndicator = $(`
            <div class="week-indicator">
                <span class="week-range">Total Chart Weeks: ${totalWeeks}</span>
            </div>
        `);
        chartContainer.before(weekIndicator);
        
        // Initialize scrollbar if available
        if (typeof ChartScrollbar !== 'undefined') {
            this.scrollbar = new ChartScrollbar(this.container, this);
        } else {
            console.warn('ArtistCharts: ChartScrollbar class not available, scrollbar disabled');
        }
        
        // Add simple zoom hint
        const zoomHint = $(`
            <div class="zoom-hint-subtle">
                Scroll to zoom • Shift+Scroll to pan
            </div>
        `);
        chartContainer.after(zoomHint);
    }
    
    showLoading() {
        this.container.find('.artist-charts-loading').show();
    }
    
    hideLoading() {
        this.container.find('.artist-charts-loading').hide();
    }
    
    showContent() {
        this.container.find('.artist-charts-content').show();
    }
    
    hideContent() {
        this.container.find('.artist-charts-content').hide();
    }
    
    showError(message) {
        this.container.find('.error-message').text(message);
        this.container.find('.artist-charts-error').show();
    }
    
    hideError() {
        this.container.find('.artist-charts-error').hide();
    }
    
    // Cleanup method to prevent memory leaks
    destroy() {
        if (this.chartCore) {
            this.chartCore.destroy();
            this.chartCore = null;
        }
        
        if (this.scrollbar) {
            this.scrollbar.destroy();
            this.scrollbar = null;
        }
        
        // Remove event listeners
        this.container.off();
        $(window).off('resize');
    }
}

// Make ArtistCharts available globally
window.ArtistCharts = ArtistCharts;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ArtistCharts;
}

})(jQuery);
