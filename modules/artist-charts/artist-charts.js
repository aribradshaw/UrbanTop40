/**
 * Artist Charts JavaScript - Modular Version
 * 
 * Main entry point that loads all modules and initializes the system
 */

(function($) {
    'use strict';
    
    // ========================================
    // MODULE LOADER
    // ========================================
    
    // Load all required modules
    const modules = {
        ChartDataProcessor: null,
        ChartScrollbar: null,
        ChartCore: null,
        ArtistCharts: null
    };
    
    // Load modules in dependency order
    function loadModules() {
        // Load data processor first
        if (typeof ChartDataProcessor !== 'undefined') {
            modules.ChartDataProcessor = ChartDataProcessor;
        }
        
        // Load scrollbar module
        if (typeof ChartScrollbar !== 'undefined') {
            modules.ChartScrollbar = ChartScrollbar;
        }
        
        // Load chart core module
        if (typeof ChartCore !== 'undefined') {
            modules.ChartCore = ChartCore;
        }
        
        // Load main artist charts module
        if (typeof ArtistCharts !== 'undefined') {
            modules.ArtistCharts = ArtistCharts;
        }
        
        // Check if all modules are loaded
        const allModulesLoaded = Object.values(modules).every(module => module !== null);
        
        if (allModulesLoaded) {
            console.log('All modules loaded successfully');
            initializeSystem();
        } else {
            console.log('Waiting for modules to load...');
            setTimeout(loadModules, 100);
        }
    }
    
    // ========================================
    // SYSTEM INITIALIZATION
    // ========================================
    
    function initializeSystem() {
        console.log('Initializing artist charts system...');
        
        // Initialize artist charts
        $('.artist-charts-container').each(function() {
            console.log('Creating ArtistCharts instance');
            new modules.ArtistCharts($(this));
        });
        
        // Initialize artist songs
        $('.artist-songs-container').each(function() {
            console.log('Creating ArtistSongs instance');
            new ArtistSongs($(this));
        });
    }
    
    // ========================================
    // ARTIST SONGS CLASS (Legacy - kept for compatibility)
    // ========================================
    
    class ArtistSongs {
        constructor(container) {
            this.container = container;
            this.artist = container.data('artist');
            this.chartData = null;
            
            this.init();
        }
        
        init() {
            this.loadArtistData();
            this.bindEvents();
        }
        
        bindEvents() {
            // Error retry
            this.container.on('click', '.error-retry', () => {
                this.loadArtistData();
            });
        }
        
        async loadArtistData() {
            this.showLoading();
            this.hideError();
            this.hideContent();
            
            try {
                const response = await $.ajax({
                    url: artistChartsAjax.ajaxurl,
                    type: 'POST',
                    data: {
                        action: 'get_artist_charts',
                        artist: this.artist,
                        nonce: artistChartsAjax.nonce
                    }
                });
                
                if (response.success) {
                    this.chartData = response.data;
                    this.renderSongLegend();
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
        
        renderSongLegend() {
            if (!this.chartData || !this.chartData.songs) return;
            
            const legendContainer = this.container.find('#song-legend');
            legendContainer.empty();
            
            const colors = [
                '#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336',
                '#00BCD4', '#FF5722', '#795548', '#607D8B', '#E91E63'
            ];
            
            this.chartData.songs.forEach((song, index) => {
                const color = colors[index % colors.length];
                const peakPosition = Math.min(...song.chartHistory.map(e => e.position));
                
                const legendItem = $(`
                    <div class="song-legend-item" style="border-left-color: ${color}">
                        <div class="song-legend-name">${song.song}</div>
                        <div class="song-legend-details">
                            Peak Rank: #${peakPosition}
                        </div>
                        <div class="song-legend-details">
                            Weeks On Chart: ${song.chartHistory.length}
                        </div>
                    </div>
                `);
                
                legendContainer.append(legendItem);
            });
        }
        
        showLoading() {
            this.container.find('.artist-songs-loading').show();
        }
        
        hideLoading() {
            this.container.find('.artist-songs-loading').hide();
        }
        
        showContent() {
            this.container.find('.artist-songs-content').show();
        }
        
        hideContent() {
            this.container.find('.artist-songs-content').hide();
        }
        
        showError(message) {
            this.container.find('.error-message').text(message);
            this.container.find('.artist-charts-error').show();
        }
        
        hideError() {
            this.container.find('.artist-charts-error').hide();
        }
    }
    
    // ========================================
    // INITIALIZATION
    // ========================================
    
    // Initialize when DOM is ready
    $(document).ready(function() {
        console.log('DOM ready, waiting for Chart.js and modules...');
        
        // Wait for Chart.js to be available
        const waitForChartJS = () => {
            if (typeof Chart !== 'undefined') {
                console.log('Chart.js found, loading modules...');
                
                // Start loading modules
                loadModules();
            } else {
                console.log('Chart.js not found, waiting...');
                // Wait a bit more and try again
                setTimeout(waitForChartJS, 100);
            }
        };
        
        // Start waiting for Chart.js
        waitForChartJS();
    });
    
})(jQuery);
