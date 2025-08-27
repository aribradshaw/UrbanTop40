/**
 * Artist Charts Module JavaScript
 * 
 * Handles chart rendering, data loading, and interactive functionality
 */

(function($) {
    'use strict';

    class ArtistChart {
        constructor(container) {
            this.container = container;
            this.artist = container.data('artist');
            this.height = container.data('height') || 400;
            this.width = container.data('width') || '100%';
            this.showLegend = container.data('show-legend') === 'true';
            this.chartType = container.data('chart-type') || 'line';
            
            this.chartData = null;
            this.tooltip = null;
            
            this.init();
        }
        
        init() {
            this.createTooltip();
            this.loadChartData();
        }
        
        createTooltip() {
            this.tooltip = $('<div class="chart-tooltip"></div>');
            $('body').append(this.tooltip);
        }
        
        loadChartData() {
            const self = this;
            
            console.log('Loading chart data for artist:', this.artist);
            
            $.ajax({
                url: urbanTop40Charts.ajaxurl,
                type: 'POST',
                data: {
                    action: 'get_artist_chart_data',
                    artist: this.artist,
                    nonce: urbanTop40Charts.nonce
                },
                success: function(response) {
                    console.log('AJAX response:', response);
                    if (response.success) {
                        self.chartData = response.data;
                        self.renderChart();
                    } else {
                        self.showError(response.data || 'Failed to load chart data');
                    }
                },
                error: function(xhr, status, error) {
                    console.error('AJAX error:', { xhr, status, error });
                    self.showError('Network error occurred while loading chart data');
                }
            });
        }
        
        renderChart() {
            console.log('Rendering chart with data:', this.chartData);
            
            if (!this.chartData || !this.chartData.songs) {
                this.showError('No chart data available');
                return;
            }
            
            // Hide loading, show chart
            this.container.find('.chart-loading').hide();
            this.container.find('.chart-container').show().addClass('fade-in');
            
            // Set artist name
            this.container.find('.artist-name').text(this.chartData.name);
            
            // Render stats
            this.renderStats();
            
            // Render chart
            this.renderChartContent();
            
            // Add event listeners
            this.addEventListeners();
        }
        
        renderStats() {
            const stats = this.container.find('.chart-stats');
            stats.empty();
            
            // Total songs
            stats.append(`
                <div class="stat-item">
                    <span class="stat-value">${this.chartData.totalSongs}</span>
                    <span class="stat-label">Total Songs</span>
                </div>
            `);
            
            // Number ones
            const numberOnes = this.chartData.songs.filter(song => song.peakPosition === 1).length;
            stats.append(`
                <div class="stat-item">
                    <span class="stat-value">${numberOnes}</span>
                    <span class="stat-label">Number Ones</span>
                </div>
            `);
            
            // Top 10 hits
            const topTens = this.chartData.songs.filter(song => song.peakPosition <= 10).length;
            stats.append(`
                <div class="stat-item">
                    <span class="stat-value">${topTens}</span>
                    <span class="stat-label">Top 10 Hits</span>
                </div>
            `);
        }
        
        renderChartContent() {
            const chartContent = this.container.find('.chart-content');
            chartContent.empty();
            
            console.log('Rendering chart content with songs:', this.chartData.songs);
            
            // Add Y-axis labels (1 at top, 100 at bottom)
            this.addYAxisLabels(chartContent);
            
            // Sort songs by peak position for better visualization
            const sortedSongs = [...this.chartData.songs].sort((a, b) => a.peakPosition - b.peakPosition);
            
            // Calculate chart dimensions
            const chartHeight = parseInt(this.height);
            const songCount = sortedSongs.length;
            const barWidth = Math.max(8, Math.min(20, 800 / songCount)); // Responsive bar width
            
            console.log('Chart dimensions:', { chartHeight, songCount, barWidth });
            
            // Set minimum width for scrollable content
            const minWidth = Math.max(800, songCount * (barWidth + 2));
            chartContent.css('min-width', minWidth + 'px');
            
            // Create chart bars container
            const barsContainer = $('<div class="chart-bars-container"></div>');
            barsContainer.css({
                'display': 'flex',
                'align-items': 'flex-end',
                'gap': '2px',
                'height': '100%',
                'position': 'relative'
            });
            
            // Create chart bars
            sortedSongs.forEach((song, index) => {
                const bar = this.createChartBar(song, index, barWidth, chartHeight);
                barsContainer.append(bar);
            });
            
            chartContent.append(barsContainer);
            
            // Add song labels
            this.addSongLabels(chartContent, sortedSongs, barWidth);
        }
        
        addYAxisLabels(chartContent) {
            const yAxisLabels = $('<div class="y-axis-labels"></div>');
            
            // Add position labels (1, 25, 50, 75, 100)
            const positions = [1, 25, 50, 75, 100];
            positions.forEach(position => {
                const label = $(`<div class="y-axis-label">${position}</div>`);
                const yPos = ((101 - position) / 100) * 100; // Invert so 1 is at top
                label.css('top', yPos + '%');
                yAxisLabels.append(label);
            });
            
            chartContent.append(yAxisLabels);
        }
        
        createChartBar(song, index, barWidth, chartHeight) {
            const bar = $('<div class="chart-bar"></div>');
            
            // Calculate bar height based on peak position
            // Position 1 = 100% height, Position 100 = 0% height
            const heightPercentage = ((101 - song.peakPosition) / 100) * 100;
            const barHeight = (heightPercentage / 100) * chartHeight;
            
            console.log(`Creating bar for ${song.song}: peak=${song.peakPosition}, height=${barHeight}px, width=${barWidth}px`);
            
            bar.css({
                'width': barWidth + 'px',
                'height': barHeight + 'px',
                'min-width': barWidth + 'px'
            });
            
            // Add special classes for peak positions
            if (song.peakPosition === 1) {
                bar.addClass('number-one');
            } else if (song.peakPosition <= 10) {
                bar.addClass('peak');
            }
            
            // Add data attributes for tooltip
            bar.attr({
                'data-song': song.song,
                'data-peak': song.peakPosition,
                'data-weeks': song.totalWeeks,
                'data-featured': song.featuredArtists.join(', ')
            });
            
            // Add position label on top of bar
            if (song.peakPosition <= 20) { // Only show labels for top 20 to avoid clutter
                const positionLabel = $(`<div class="chart-label position">${song.peakPosition}</div>`);
                positionLabel.css({
                    'left': (index * (barWidth + 2) + barWidth / 2) + 'px'
                });
                this.container.find('.chart-content').append(positionLabel);
            }
            
            return bar;
        }
        
        addSongLabels(chartContent, songs, barWidth) {
            const labelsContainer = $('<div class="chart-labels"></div>');
            
            songs.forEach((song, index) => {
                const songLabel = $(`<div class="chart-label song">${song.song}</div>`);
                songLabel.css({
                    'left': (index * (barWidth + 2) + barWidth / 2) + 'px'
                });
                labelsContainer.append(songLabel);
            });
            
            chartContent.append(labelsContainer);
        }
        
        addEventListeners() {
            const self = this;
            
            // Bar hover events
            this.container.on('mouseenter', '.chart-bar', function(e) {
                const bar = $(this);
                const song = bar.data('song');
                const peak = bar.data('peak');
                const weeks = bar.data('weeks');
                const featured = bar.data('featured');
                
                self.showTooltip(e, {
                    song: song,
                    peak: peak,
                    weeks: weeks,
                    featured: featured
                });
            });
            
            this.container.on('mouseleave', '.chart-bar', function() {
                self.hideTooltip();
            });
            
            // Bar click events
            this.container.on('click', '.chart-bar', function() {
                const bar = $(this);
                const song = bar.data('song');
                
                // Highlight the clicked bar
                self.container.find('.chart-bar').removeClass('active');
                bar.addClass('active');
                
                // You could add more functionality here, like showing detailed song info
                console.log('Selected song:', song);
            });
            
            // Scroll events for smooth animations
            this.container.find('.chart-scroll-container').on('scroll', function() {
                // Add scroll-based animations if needed
            });
        }
        
        showTooltip(event, data) {
            if (!this.tooltip) return;
            
            const tooltipContent = `
                <div class="tooltip-title">${data.song}</div>
                <div class="tooltip-detail"><strong>Peak Position:</strong> #${data.peak}</div>
                <div class="tooltip-detail"><strong>Weeks on Chart:</strong> ${data.weeks}</div>
                ${data.featured ? `<div class="tooltip-detail"><strong>Featured:</strong> ${data.featured}</div>` : ''}
            `;
            
            this.tooltip.html(tooltipContent).addClass('show');
            
            // Position tooltip
            const offset = this.container.offset();
            const x = event.pageX - offset.left + 15;
            const y = event.pageY - offset.top - this.tooltip.outerHeight() - 10;
            
            this.tooltip.css({
                'left': offset.left + x + 'px',
                'top': offset.top + y + 'px'
            });
        }
        
        hideTooltip() {
            if (this.tooltip) {
                this.tooltip.removeClass('show');
            }
        }
        
        showError(message) {
            this.container.find('.chart-loading').html(`
                <div style="color: #ff6b6b; padding: 2rem;">
                    <strong>Error:</strong> ${message}
                </div>
            `);
        }
        
        destroy() {
            if (this.tooltip) {
                this.tooltip.remove();
                this.tooltip = null;
            }
            
            this.container.off('mouseenter mouseleave click', '.chart-bar');
            this.container.find('.chart-scroll-container').off('scroll');
        }
    }
    
    // Initialize charts when DOM is ready
    $(document).ready(function() {
        $('.urban-top-40-artist-chart').each(function() {
            new ArtistChart($(this));
        });
    });
    
    // Re-initialize charts for dynamic content (like AJAX-loaded content)
    $(document).on('urban-top-40-charts-ready', function() {
        $('.urban-top-40-artist-chart:not(.initialized)').each(function() {
            $(this).addClass('initialized');
            new ArtistChart($(this));
        });
    });
    
    // Cleanup on page unload
    $(window).on('beforeunload', function() {
        $('.urban-top-40-artist-chart').each(function() {
            const chart = $(this).data('artist-chart');
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
    });
    
})(jQuery);
