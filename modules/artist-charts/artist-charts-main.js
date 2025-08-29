/**
 * Main Artist Charts Class
 * 
 * Coordinates all modules and handles user interactions
 */

// Wrap in function to ensure jQuery and other dependencies are available
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
        this.visibleWeeks = 10; // Default to first 10 weeks
        this.startWeek = 0; // Which week to start from (for panning)
        this.allDates = [];
        this.updateTimeout = null; // For debouncing chart updates
        
        this.init();
    }
    
    init() {
        this.loadArtistData();
        this.bindEvents();
    }
    
    bindEvents() {
        console.log('Binding events for artist charts');
        
        // Combined wheel event handler for zoom and horizontal scrolling
        this.container.on('wheel', '.chart-area', (e) => {
            console.log('Wheel event detected');
            e.preventDefault();
            
            if (e.shiftKey) {
                // Shift + wheel = horizontal scrolling/panning
                console.log('Shift+wheel detected - horizontal scroll');
                this.handleHorizontalScroll(e);
            } else {
                // Regular wheel = zoom
                console.log('Regular wheel detected - zoom');
                this.handleZoom(e);
            }
        });
        
        // Handle horizontal trackpad scrolling (deltaX)
        this.container.on('wheel', '.chart-area', (e) => {
            if (Math.abs(e.originalEvent.deltaX) > Math.abs(e.originalEvent.deltaY)) {
                console.log('Horizontal trackpad scroll detected');
                e.preventDefault();
                this.handleTrackpadHorizontalScroll(e);
            }
        });
        
        // Error retry
        this.container.on('click', '.error-retry', () => {
            this.loadArtistData();
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
        
        // Get all unique dates and sort them
        this.allDates = new Set();
        this.chartData.songs.forEach(song => {
            song.chartHistory.forEach(entry => {
                this.allDates.add(entry.date);
            });
        });
        
        this.allDates = Array.from(this.allDates).sort();
        
        try {
            // Create chart core with current options
            this.chartCore = new ChartCore(this.container, this.chartData, {
                startWeek: this.startWeek,
                visibleWeeks: this.visibleWeeks
            });
            
            // Add scrollbar and week indicator
            this.addScrollbarAndIndicator();
        } catch (error) {
            console.error('Error creating chart:', error);
            this.showError('Failed to create chart: ' + error.message);
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
    
    handleZoom(e) {
        console.log('Zoom event:', e.originalEvent.deltaY);
        const delta = e.originalEvent.deltaY > 0 ? 1.1 : 0.9; // Inverted: scroll up = zoom out, scroll down = zoom in
        const newVisibleWeeks = Math.round(this.visibleWeeks * delta);
        
        // Clamp between 5 and total available weeks
        this.visibleWeeks = Math.max(5, Math.min(this.allDates.length, newVisibleWeeks));
        
        // Adjust startWeek if we're zooming out and would go beyond available data
        const maxStartWeek = Math.max(0, this.allDates.length - this.visibleWeeks);
        if (this.startWeek > maxStartWeek) {
            this.startWeek = maxStartWeek;
        }
        
        console.log(`Zoom: ${this.visibleWeeks} -> ${newVisibleWeeks} weeks, startWeek: ${this.startWeek}`);
        
        // Update the chart with new data
        this.updateChartData();
    }
    
    updateChartData() {
        if (!this.chartCore || !this.chartData) return;
        
        // Clear any pending update
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
        }
        
        // Debounce the update to prevent rapid changes
        this.updateTimeout = setTimeout(() => {
            this._performChartUpdate();
        }, 50); // 50ms delay
    }
    
    _performChartUpdate() {
        try {
            // Update the chart core with new options
            this.chartCore.updateChartData({
                startWeek: this.startWeek,
                visibleWeeks: this.visibleWeeks
            });
            
            // Update the week indicator and scrollbar position
            this.updateScrollbarPosition();
            
        } catch (error) {
            console.error('Error updating chart data:', error);
            // Fallback: recreate the chart if update fails
            this.renderChart();
        }
    }
    
    handleHorizontalScroll(e) {
        console.log('Horizontal scroll event:', e.originalEvent.deltaY);
        const delta = e.originalEvent.deltaY > 0 ? 1 : -1;
        const scrollAmount = Math.max(1, Math.floor(this.visibleWeeks / 4)); // Scroll by 1/4 of visible weeks
        
        // Calculate new start week
        let newStartWeek = this.startWeek + (delta * scrollAmount);
        
        // Clamp to valid range
        const maxStartWeek = Math.max(0, this.allDates.length - this.visibleWeeks);
        newStartWeek = Math.max(0, Math.min(maxStartWeek, newStartWeek));
        
        if (newStartWeek !== this.startWeek) {
            console.log(`Horizontal scroll: ${this.startWeek} -> ${newStartWeek}`);
            this.startWeek = newStartWeek;
            this.updateChartData();
            this.updateScrollbarPosition();
        }
    }
    
    handleTrackpadHorizontalScroll(e) {
        console.log('Trackpad horizontal scroll event:', e.originalEvent.deltaX);
        const delta = e.originalEvent.deltaX > 0 ? -1 : 1; // Invert for natural feel
        const scrollAmount = Math.max(1, Math.floor(this.visibleWeeks / 8)); // Smaller increments for trackpad
        
        // Calculate new start week
        let newStartWeek = this.startWeek + (delta * scrollAmount);
        
        // Clamp to valid range
        const maxStartWeek = Math.max(0, this.allDates.length - this.visibleWeeks);
        newStartWeek = Math.max(0, Math.min(maxStartWeek, newStartWeek));
        
        if (newStartWeek !== this.startWeek) {
            console.log(`Trackpad horizontal scroll: ${this.startWeek} -> ${newStartWeek}`);
            this.startWeek = newStartWeek;
            this.updateChartData();
            this.updateScrollbarPosition();
        }
    }
    
    addScrollbarAndIndicator() {
        const chartContainer = this.container.find('#chart-container');
        
        // Add week indicator above chart
        const weekIndicator = $(`
            <div class="week-indicator">
                <span class="week-range">Weeks ${this.startWeek + 1}-${Math.min(this.startWeek + this.visibleWeeks, this.allDates.length)} of ${this.allDates.length}</span>
            </div>
        `);
        chartContainer.before(weekIndicator);
        
        // Initialize scrollbar if available
        if (typeof ChartScrollbar !== 'undefined') {
            this.scrollbar = new ChartScrollbar(this.container, this);
        } else {
            console.warn('ArtistCharts: ChartScrollbar class not available, scrollbar disabled');
        }
    }
    
    updateScrollbarPosition() {
        const weekIndicator = this.container.find('.week-indicator .week-range');
        
        if (weekIndicator.length) {
            weekIndicator.text(`Weeks ${this.startWeek + 1}-${Math.min(this.startWeek + this.visibleWeeks, this.allDates.length)} of ${this.allDates.length}`);
        }
        
        if (this.scrollbar) {
            this.scrollbar.updatePosition();
        }
    }
    
    getScrollbarPosition() {
        if (this.allDates.length <= this.visibleWeeks) return 0;
        const maxStartWeek = this.allDates.length - this.visibleWeeks;
        if (maxStartWeek <= 0) return 0;
        
        // Calculate position as a percentage of the scrollable area
        const position = (this.startWeek / maxStartWeek) * 100;
        
        // Ensure the position is within bounds and accounts for thumb width
        const thumbWidth = 60; // Width of scrollbar thumb in pixels
        const trackWidth = this.container.find('.scrollbar-track').width() || 400; // Fallback width
        const thumbWidthPercent = (thumbWidth / trackWidth) * 100;
        
        // Adjust position so thumb doesn't go beyond track boundaries
        return Math.max(0, Math.min(100 - thumbWidthPercent, position));
    }
    
    setScrollbarPosition(percentage) {
        if (this.allDates.length <= this.visibleWeeks) return;
        
        const maxStartWeek = this.allDates.length - this.visibleWeeks;
        const newStartWeek = Math.round((percentage / 100) * maxStartWeek);
        const clampedStartWeek = Math.max(0, Math.min(maxStartWeek, newStartWeek));
        
        if (clampedStartWeek !== this.startWeek) {
            console.log(`Setting scrollbar position: ${percentage}% -> week ${clampedStartWeek}`);
            this.startWeek = clampedStartWeek;
            
            // Update the chart data
            this.updateChartData();
            
            // Update the week indicator and scrollbar position
            this.updateScrollbarPosition();
        }
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
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
            this.updateTimeout = null;
        }
        
        if (this.chartCore) {
            this.chartCore.destroy();
            this.chartCore = null;
        }
        
        if (this.scrollbar) {
            this.scrollbar = null;
        }
        
        // Remove event listeners
        this.container.off();
        $(document).off('mousemove mousemove touchmove touchend');
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
