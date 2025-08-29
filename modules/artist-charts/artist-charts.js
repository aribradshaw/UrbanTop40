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
        console.log('Loading modules...');
        
        // Load data processor first
        if (typeof ChartDataProcessor !== 'undefined') {
            modules.ChartDataProcessor = ChartDataProcessor;
            console.log('✓ ChartDataProcessor loaded');
        } else {
            console.log('✗ ChartDataProcessor not found');
        }
        
        // Load scrollbar module
        if (typeof ChartScrollbar !== 'undefined') {
            modules.ChartScrollbar = ChartScrollbar;
            console.log('✓ ChartScrollbar loaded');
        } else {
            console.log('✗ ChartScrollbar not found');
        }
        
        // Load chart core module
        if (typeof ChartCore !== 'undefined') {
            modules.ChartCore = ChartCore;
            console.log('✓ ChartCore loaded');
        } else {
            console.log('✗ ChartCore not found');
        }
        
        // Load main artist charts module
        if (typeof ArtistCharts !== 'undefined') {
            modules.ArtistCharts = ArtistCharts;
            console.log('✓ ArtistCharts loaded');
        } else {
            console.log('✗ ArtistCharts not found');
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
        
        // Check if we have the required modules
        if (!modules.ArtistCharts) {
            console.error('ArtistCharts module not available!');
            return;
        }
        
        // Initialize artist charts
        $('.artist-charts-container').each(function() {
            console.log('Creating ArtistCharts instance');
            try {
                const artist = $(this).data('artist') || 'the beatles';
                new modules.ArtistCharts($(this), artist);
                console.log('✓ ArtistCharts instance created successfully for artist:', artist);
            } catch (error) {
                console.error('✗ Failed to create ArtistCharts instance:', error);
            }
        });
        
        // Initialize artist songs
        $('.artist-songs-container').each(function() {
            console.log('Creating ArtistSongs instance');
            try {
                new ArtistSongs($(this));
                console.log('✓ ArtistSongs instance created successfully');
            } catch (error) {
                console.error('✗ Failed to create ArtistSongs instance:', error);
            }
        });
    }
    
    function initializeSimpleSystem() {
        console.log('Initializing simple system...');
        
        // Initialize artist songs directly
        $('.artist-songs-container').each(function() {
            console.log('Creating ArtistSongs instance');
            try {
                new ArtistSongs($(this));
                console.log('✓ ArtistSongs instance created successfully');
            } catch (error) {
                console.error('✗ Failed to create ArtistSongs instance:', error);
            }
        });
        
        // Wait for ArtistCharts class to be available, then initialize charts
        const waitForArtistCharts = () => {
            if (typeof ArtistCharts !== 'undefined') {
                console.log('ArtistCharts class found, initializing charts...');
                $('.artist-charts-container').each(function() {
                    console.log('Creating ArtistCharts instance');
                    try {
                        new ArtistCharts($(this));
                        console.log('✓ ArtistCharts instance created successfully');
                    } catch (error) {
                        console.error('✗ Failed to create ArtistCharts instance:', error);
                    }
                });
            } else {
                console.log('ArtistCharts class not available yet, waiting...');
                setTimeout(waitForArtistCharts, 100);
            }
        };
        
        // Start waiting for ArtistCharts
        waitForArtistCharts();
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
                // Check if AJAX data is available
                if (typeof artistChartsAjax === 'undefined') {
                    throw new Error('AJAX configuration not loaded. Please refresh the page.');
                }
                
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
        console.log('DOM ready, checking dependencies...');
        console.log('jQuery available:', typeof $ !== 'undefined');
        console.log('Chart.js available:', typeof Chart !== 'undefined');
        console.log('AJAX data available:', typeof artistChartsAjax !== 'undefined');
        console.log('ArtistCharts class available:', typeof ArtistCharts !== 'undefined');
        
        // Test basic jQuery functionality
        if (typeof $ !== 'undefined') {
            console.log('jQuery is working, testing basic functionality...');
            $('body').append('<div id="jquery-test" style="display:none;">jQuery test</div>');
            if ($('#jquery-test').length > 0) {
                console.log('jQuery DOM manipulation working');
                $('#jquery-test').remove();
            }
        }
        
        // Simple initialization - just wait for Chart.js and AJAX data
        const waitForDependencies = () => {
            if (typeof Chart !== 'undefined' && typeof artistChartsAjax !== 'undefined') {
                console.log('All dependencies found, initializing system...');
                
                // Simple initialization without complex module loading
                initializeSimpleSystem();
            } else {
                console.log('Waiting for dependencies... Chart.js:', typeof Chart !== 'undefined', 'AJAX:', typeof artistChartsAjax !== 'undefined');
                // Wait a bit more and try again
                setTimeout(waitForDependencies, 100);
            }
        };
        
        // Start waiting for dependencies
        waitForDependencies();
    });
    
})(jQuery);
