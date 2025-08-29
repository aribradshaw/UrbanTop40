/**
 * Chart Core Module
 * 
 * Simple, working Chart.js implementation
 */

(function($) {
    'use strict';

class ChartCore {
    constructor(container, chartData, options = {}) {
        this.container = container;
        this.chartData = chartData;
        this.options = options;
        this.chart = null;
        this.allDates = [];
        this.visibleWeeks = options.visibleWeeks || 10;
        this.startWeek = options.startWeek || 0;
        
        this.init();
    }
    
    init() {
        this.renderChart();
    }
    
    renderChart() {
        if (!this.chartData || !this.chartData.songs) return;
        
        // Destroy existing chart if it exists
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
        
        const chartContainer = this.container.find('#chart-container');
        chartContainer.empty();
        
        // Create canvas for Chart.js
        const canvas = $('<canvas id="artist-chart-canvas"></canvas>');
        chartContainer.append(canvas);
        
        const ctx = canvas[0].getContext('2d');
        
        // Prepare data for Chart.js
        const chartData = this.prepareChartData();
        
        // Get all unique dates and sort them
        this.allDates = new Set();
        this.chartData.songs.forEach(song => {
            song.chartHistory.forEach(entry => {
                this.allDates.add(entry.date);
            });
        });
        this.allDates = Array.from(this.allDates).sort();
        
        // Calculate initial visible range
        const totalWeeks = this.allDates.length;
        const endWeek = Math.min(this.startWeek + this.visibleWeeks, totalWeeks);
        const startDate = new Date(this.allDates[this.startWeek]);
        const endDate = new Date(this.allDates[endWeek - 1]);
        
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
                                const position = context.parsed.y;
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
                                week: 'MMM d, yyyy'
                            }
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)',
                            maxRotation: 45
                        },
                        min: startDate,
                        max: endDate
                    },
                    y: {
                        reverse: true, // #1 at top, #100 at bottom
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
                        tension: 0.1,
                        spanGaps: false // Don't connect lines across gaps
                    }
                }
            }
        });
    }
    
    prepareChartData() {
        if (!this.chartData || !this.chartData.songs) return { datasets: [] };
        
        const datasets = [];
        const colors = [
            '#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336',
            '#00BCD4', '#FF5722', '#795548', '#607D8B', '#E91E63'
        ];
        
        // Process each song
        this.chartData.songs.forEach((song, songIndex) => {
            const color = colors[songIndex % colors.length];
            
            // Create data points for this song, but break lines when songs fall off chart
            const data = this.createSongDataWithBreaks(song);
            
            if (data.length > 0) {
                datasets.push({
                    label: song.song,
                    data: data,
                    borderColor: color,
                    backgroundColor: color,
                    borderWidth: 2,
                    fill: false,
                    tension: 0.1
                });
            }
        });
        
        return { datasets };
    }
    
    createSongDataWithBreaks(song) {
        const data = [];
        let lastPosition = null;
        
        // Sort chart history by date
        const sortedHistory = song.chartHistory.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        sortedHistory.forEach((entry, index) => {
            const currentDate = new Date(entry.date);
            const currentPosition = entry.position;
            
            // Check if this is a re-entry after falling off chart
            if (lastPosition !== null && lastPosition > 100) {
                // Song fell off chart, add a break (null point)
                data.push({
                    x: currentDate,
                    y: null
                });
            }
            
            // Add the current data point
            data.push({
                x: currentDate,
                y: currentPosition
            });
            
            lastPosition = currentPosition;
        });
        
        return data;
    }
    
    updateChartData(newOptions = {}) {
        if (!this.chart) return;
        
        // Update options
        Object.assign(this.options, newOptions);
        
        // Update visible range
        if (newOptions.startWeek !== undefined || newOptions.visibleWeeks !== undefined) {
            this.startWeek = newOptions.startWeek || this.startWeek;
            this.visibleWeeks = newOptions.visibleWeeks || this.visibleWeeks;
            
            const totalWeeks = this.allDates.length;
            const endWeek = Math.min(this.startWeek + this.visibleWeeks, totalWeeks);
            const startDate = new Date(this.allDates[this.startWeek]);
            const endDate = new Date(this.allDates[endWeek - 1]);
            
            this.chart.options.scales.x.min = startDate;
            this.chart.options.scales.x.max = endDate;
            this.chart.update('none');
        }
    }
    
    destroy() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    }
}

// Make ChartCore available globally
window.ChartCore = ChartCore;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChartCore;
}

})(jQuery);
