/**
 * Artist Charts JavaScript
 * 
 * Handles chart visualization for artist Billboard chart history
 */

(function($) {
    'use strict';
    
    class ArtistCharts {
        constructor(container) {
            this.container = container;
            this.artist = container.data('artist');
            this.chartData = null;
            this.chart = null;
            this.zoomLevel = 1;
            
            this.init();
        }
        
        init() {
            this.loadArtistData();
            this.bindEvents();
        }
        
        bindEvents() {
            // Zoom controls
            this.container.on('wheel', '.chart-area', (e) => {
                e.preventDefault();
                this.handleZoom(e);
            });
            
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
            
            const chartContainer = this.container.find('#chart-container');
            chartContainer.empty();
            
            // Create canvas for Chart.js
            const canvas = $('<canvas id="artist-chart-canvas"></canvas>');
            chartContainer.append(canvas);
            
            const ctx = canvas[0].getContext('2d');
            
            // Prepare data for Chart.js
            const chartData = this.prepareChartData();
            
            // Create the chart
            this.chart = new Chart(ctx, {
                type: 'line',
                data: chartData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        intersect: false,
                        mode: 'index'
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: '#fff',
                            bodyColor: '#fff',
                            borderColor: 'rgba(255, 255, 255, 0.2)',
                            borderWidth: 1,
                            callbacks: {
                                title: (tooltipItems) => {
                                    return `Week of ${tooltipItems[0].label}`;
                                },
                                label: (context) => {
                                    const songName = context.dataset.label;
                                    const position = 101 - context.parsed.y;
                                    return `${songName}: #${position}`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            type: 'time',
                            time: {
                                unit: 'week',
                                displayFormats: {
                                    week: 'MMM dd, yyyy'
                                }
                            },
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            },
                            ticks: {
                                color: 'rgba(255, 255, 255, 0.7)',
                                maxRotation: 45
                            }
                        },
                        y: {
                            reverse: true,
                            min: 1,
                            max: 100,
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            },
                            ticks: {
                                color: 'rgba(255, 255, 255, 0.7)',
                                callback: (value) => `#${value}`
                            }
                        }
                    },
                    elements: {
                        point: {
                            radius: 3,
                            hoverRadius: 5
                        },
                        line: {
                            tension: 0.1
                        }
                    }
                }
            });
            
            // Render song legend
            this.renderSongLegend();
        }
        
        prepareChartData() {
            if (!this.chartData || !this.chartData.songs) return { datasets: [] };
            
            // Get all unique dates
            const allDates = new Set();
            this.chartData.songs.forEach(song => {
                song.chartHistory.forEach(entry => {
                    allDates.add(entry.date);
                });
            });
            
            const sortedDates = Array.from(allDates).sort();
            
            // Create datasets for each song
            const datasets = this.chartData.songs.map((song, index) => {
                const colors = [
                    '#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336',
                    '#00BCD4', '#FF5722', '#795548', '#607D8B', '#E91E63'
                ];
                
                const data = sortedDates.map(date => {
                    const entry = song.chartHistory.find(e => e.date === date);
                    return entry ? {
                        x: new Date(date),
                        y: 101 - entry.position
                    } : null;
                }).filter(point => point !== null);
                
                return {
                    label: song.song,
                    data: data,
                    borderColor: colors[index % colors.length],
                    backgroundColor: colors[index % colors.length],
                    borderWidth: 2,
                    fill: false,
                    tension: 0.1
                };
            });
            
            return { datasets };
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
        
        updateStats() {
            if (!this.chartData) return;
            
            this.container.find('#song-count').text(`${this.chartData.totalSongs} Songs`);
            
            // Calculate total weeks
            const allDates = new Set();
            this.chartData.songs.forEach(song => {
                song.chartHistory.forEach(entry => {
                    allDates.add(entry.date);
                });
            });
            const totalWeeks = allDates.size;
            this.container.find('#week-count').text(`${totalWeeks} Weeks`);
        }
        
        handleZoom(e) {
            const delta = e.originalEvent.deltaY > 0 ? 0.9 : 1.1;
            this.zoomLevel = Math.max(0.5, Math.min(3, this.zoomLevel * delta));
            
            this.container.find('#zoom-level').text(`Zoom: ${Math.round(this.zoomLevel * 100)}%`);
            
            // Apply zoom to chart container
            const chartArea = this.container.find('.chart-area');
            chartArea.css('transform', `scale(${this.zoomLevel})`);
            chartArea.css('transform-origin', 'top left');
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
    }
    
    // Initialize artist charts when DOM is ready
    $(document).ready(function() {
        // Check if Chart.js is available
        if (typeof Chart === 'undefined') {
            console.error('Chart.js is required for artist charts to work');
            return;
        }
        
        $('.artist-charts-container').each(function() {
            new ArtistCharts($(this));
        });
    });
    
})(jQuery);
