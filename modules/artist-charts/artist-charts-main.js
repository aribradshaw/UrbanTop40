/**
 * ArtistCharts - Clean Rebuild
 * Main controller for the artist charts module
 */

(function($) {
    'use strict';

class ArtistCharts {
    constructor(container, artist) {
        this.container = container;
        this.artist = artist;
        this.chartData = null;
        this.chartCore = null;
        this.scrollbar = null;
        this.weekIndicator = null;
        
        this.init();
    }
    
    init() {
        this.showLoading();
        this.loadArtistData();
    }
    
    async loadArtistData() {
        try {
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
        
        if (typeof ChartCore === 'undefined') {
            console.error('ArtistCharts: ChartCore class not available');
            this.showError('Chart dependencies not loaded. Please refresh the page.');
            return;
        }
        
        try {
            this.chartCore = new ChartCore(this.container, this.chartData);
            this.addScrollbarAndIndicator();
            this.bindEvents();
            
            // Update week indicator with initial values
            setTimeout(() => this.updateWeekIndicator(), 200);
        } catch (error) {
            console.error('Error creating chart:', error);
            this.showError('Failed to create chart: ' + error.message);
        }
    }
    
    bindEvents() {
        // Basic zoom and pan functionality
        this.container.on('wheel', '.chart-area', (e) => {
            e.preventDefault();
            if (e.shiftKey) {
                this.handlePan(e);
            } else if (Math.abs(e.originalEvent.deltaX) > Math.abs(e.originalEvent.deltaY)) {
                this.handleHorizontalScroll(e);
            } else {
                this.handleZoom(e);
            }
        });
    }
    
    handleZoom(e) {
        if (!this.chartCore || !this.chartCore.chart) return;
        
        const delta = e.originalEvent.deltaY > 0 ? 0.9 : 1.1;
        const chart = this.chartCore.chart;
        const currentMin = chart.options.scales.x.min;
        const currentMax = chart.options.scales.x.max;
        
        if (currentMin && currentMax) {
            const range = currentMax - currentMin;
            const center = new Date((currentMin.getTime() + currentMax.getTime()) / 2);
            const newRange = range * delta;
            
            let newMin = new Date(center.getTime() - (newRange / 2));
            let newMax = new Date(center.getTime() + (newRange / 2));
            
            const constrained = this.chartCore.constrainZoom(newMin, newMax);
            
            chart.options.scales.x.min = constrained.min;
            chart.options.scales.x.max = constrained.max;
            chart.update('none');
            
            this.updateWeekIndicator();
        }
    }
    
    handlePan(e) {
        if (!this.chartCore || !this.chartCore.chart) return;
        
        const delta = e.originalEvent.deltaY > 0 ? 1 : -1;
        const chart = this.chartCore.chart;
        const currentMin = chart.options.scales.x.min;
        const currentMax = chart.options.scales.x.max;
        
        if (currentMin && currentMax) {
            const range = currentMax - currentMin;
            const shift = range * 0.1 * delta;
            
            let newMin = new Date(currentMin.getTime() + shift);
            let newMax = new Date(currentMax.getTime() + shift);
            
            const constrained = this.chartCore.constrainPan(newMin, newMax);
            
            chart.options.scales.x.min = constrained.min;
            chart.options.scales.x.max = constrained.max;
            chart.update('none');
            
            this.updateWeekIndicator();
        }
    }
    
    handleHorizontalScroll(e) {
        if (!this.chartCore || !this.chartCore.chart) return;
        
        const delta = e.originalEvent.deltaX || e.originalEvent.deltaY;
        const chart = this.chartCore.chart;
        const currentMin = chart.options.scales.x.min;
        const currentMax = chart.options.scales.x.max;
        
        if (currentMin && currentMax) {
            const range = currentMax - currentMin;
            const shift = range * 0.1 * (delta > 0 ? 1 : -1);
            
            let newMin = new Date(currentMin.getTime() + shift);
            let newMax = new Date(currentMax.getTime() + shift);
            
            const constrained = this.chartCore.constrainPan(newMin, newMax);
            
            chart.options.scales.x.min = constrained.min;
            chart.options.scales.x.max = constrained.max;
            chart.update('none');
            
            this.updateWeekIndicator();
        }
    }
    
    updateWeekIndicator() {
        if (!this.weekIndicator || !this.chartCore || !this.chartCore.chart) return;
        
        const chart = this.chartCore.chart;
        const currentMin = chart.options.scales.x.min;
        const currentMax = chart.options.scales.x.max;
        
        if (currentMin && currentMax && this.chartCore.allDates && this.chartCore.allDates.length > 0) {
            try {
                const firstDataDate = new Date(this.chartCore.allDates[0]);
                const lastDataDate = new Date(this.chartCore.allDates[this.chartCore.allDates.length - 1]);
                
                // Ensure we're not showing dates beyond the data range
                if (currentMin < firstDataDate || currentMax > lastDataDate) {
                    console.warn('Chart view is outside data boundaries, resetting...');
                    chart.options.scales.x.min = firstDataDate;
                    chart.options.scales.x.max = new Date(firstDataDate.getTime() + (this.chartCore.visibleWeeks * 7 * 24 * 60 * 60 * 1000));
                    chart.update('none');
                    return;
                }
                
                // Calculate which weeks these represent in the actual data
                const startWeek = this.chartCore.allDates.findIndex(date => {
                    const dateObj = new Date(date);
                    return Math.abs(dateObj.getTime() - currentMin.getTime()) < (24 * 60 * 60 * 1000);
                });
                
                const endWeek = this.chartCore.allDates.findIndex(date => {
                    const dateObj = new Date(date);
                    return Math.abs(dateObj.getTime() - currentMax.getTime()) < (24 * 60 * 60 * 1000);
                });
                
                if (startWeek !== -1 && endWeek !== -1 && startWeek <= endWeek) {
                    const weekText = `Weeks ${startWeek + 1}-${endWeek + 1} of ${this.chartCore.allDates.length}`;
                    this.weekIndicator.find('.week-range').text(weekText);
                    
                    if (this.scrollbar) {
                        this.updateScrollbarPosition(startWeek, this.chartCore.allDates.length);
                    }
                } else {
                    // Fallback: calculate weeks based on date differences
                    const startDiff = Math.floor((currentMin - firstDataDate) / (7 * 24 * 60 * 60 * 1000));
                    const endDiff = Math.floor((currentMax - firstDataDate) / (7 * 24 * 60 * 60 * 1000));
                    
                    if (startDiff >= 0 && endDiff >= startDiff) {
                        const weekText = `Weeks ${startDiff + 1}-${endDiff + 1} of ${this.chartCore.allDates.length}`;
                        this.weekIndicator.find('.week-range').text(weekText);
                    }
                }
            } catch (error) {
                console.error('Error updating week indicator:', error);
            }
        }
    }
    
    updateScrollbarPosition(startWeek, totalWeeks) {
        if (!this.scrollbar) return;
        
        const visibleWeeks = this.chartCore.visibleWeeks;
        const maxStartWeek = Math.max(0, totalWeeks - visibleWeeks);
        
        if (maxStartWeek > 0) {
            const percentage = (startWeek / maxStartWeek) * 100;
            this.scrollbar.updateThumbPosition(percentage);
        }
    }
    
    addScrollbarAndIndicator() {
        const chartContainer = this.container.find('#chart-container');
        
        // Add week indicator above chart
        this.weekIndicator = $(`
            <div class="week-indicator">
                <span class="week-range">Loading...</span>
            </div>
        `);
        chartContainer.before(this.weekIndicator);
        
        // Initialize scrollbar if available
        if (typeof ChartScrollbar !== 'undefined') {
            this.scrollbar = new ChartScrollbar(this.container, this);
        } else {
            console.warn('ArtistCharts: ChartScrollbar class not available, scrollbar disabled');
        }
        
        // Add zoom hint
        const zoomHint = $(`
            <div class="zoom-hint-subtle">
                Scroll to zoom • Shift+Scroll to pan
            </div>
        `);
        chartContainer.after(zoomHint);
    }
    
    updateStats() {
        if (!this.chartData) return;
        
        this.container.find('#song-count').text(`${this.chartData.totalSongs} Songs`);
        
        let numberOnes = 0;
        this.chartData.songs.forEach(song => {
            const peakPosition = Math.min(...song.chartHistory.map(e => e.position));
            if (peakPosition === 1) {
                numberOnes++;
            }
        });
        
        this.container.find('#week-count').text(`${numberOnes} Number Ones`);
    }
    
    showLoading() {
        this.container.html(`
            <div class="artist-charts-loading">
                Loading chart data...
            </div>
        `);
    }
    
    hideLoading() {
        this.container.find('.artist-charts-loading').remove();
    }
    
    showContent() {
        this.container.html(`
            <div class="artist-charts-header">
                <h1 class="artist-charts-title">${this.artist.toUpperCase()}</h1>
                <p class="artist-charts-subtitle">Billboard Hot 100 Chart History</p>
                <div class="artist-charts-stats">
                    <div class="stat-button" id="song-count"></div>
                    <div class="stat-button" id="week-count"></div>
                </div>
            </div>
            <div class="chart-area">
                <div id="chart-container"></div>
            </div>
            <div class="artist-songs-content">
                <h3>Songs</h3>
                <div class="song-legend">
                    ${this.chartData.songs.map((song, index) => `
                        <div class="song-legend-item" style="border-left-color: ${this.getSongColor(index)};">
                            <div class="song-legend-name">${song.song}</div>
                            <div class="song-legend-details">
                                Peak Rank: #${Math.min(...song.chartHistory.map(e => e.position))}<br>
                                Weeks On Chart: ${song.chartHistory.length}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `);
    }
    
    getSongColor(index) {
        const colors = [
            '#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336',
            '#00BCD4', '#FF5722', '#795548', '#607D8B', '#E91E63'
        ];
        return colors[index % colors.length];
    }
    
    showError(message) {
        this.container.html(`
            <div class="artist-charts-error">
                <p>Error: ${message}</p>
                <button class="error-retry" onclick="location.reload()">Retry</button>
            </div>
        `);
    }
}

// Make ArtistCharts available globally
window.ArtistCharts = ArtistCharts;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ArtistCharts;
}

})(jQuery);
