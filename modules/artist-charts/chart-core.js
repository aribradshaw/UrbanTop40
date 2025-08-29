/**
 * Chart Core Module
 * 
 * Handles the main Chart.js rendering and data management
 */

// Wrap in function to ensure jQuery is available
(function($) {
    'use strict';

class ChartCore {
    constructor(container, chartData, options = {}) {
        this.container = container;
        this.chartData = chartData;
        this.options = options;
        this.chart = null;
        this.consolidatedXAxis = [];
        
        this.init();
    }
    
    init() {
        this.renderChart();
    }
    
    renderChart() {
        if (!this.chartData) return;
        
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
        
        // Create the chart
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                ...chartData,
                labels: this.consolidatedXAxis || []
            },
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
                                const point = context.raw;
                                
                                if (point && point.isGap) {
                                    return `${songName}: ${point.gapWeeks} week gap`;
                                } else {
                                    const position = context.parsed.y;
                                    return `${songName}: #${position}`;
                                }
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
                            maxRotation: 45,
                            callback: (value, index, ticks) => {
                                // Check if this tick corresponds to a gap label
                                const date = new Date(value);
                                const gapLabel = this.findGapLabel(date);
                                if (gapLabel) {
                                    return `${gapLabel.gapWeeks}w gap`;
                                }
                                // Format the date manually if no gap label
                                return date.toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: '2-digit', 
                                    year: 'numeric' 
                                });
                            }
                        }
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
                        radius: (context) => {
                            const point = context.raw;
                            return point && point.skip ? 0 : 3; // Hide gap points
                        },
                        hoverRadius: (context) => {
                            const point = context.raw;
                            return point && point.skip ? 0 : 5; // Hide gap points on hover
                        }
                    },
                    line: {
                        tension: 0.1,
                        spanGaps: true // Connect lines but skip gap points
                    }
                },
                parsing: {
                    xAxisKey: 'x',
                    yAxisKey: 'y'
                }
            }
        });
    }
    
    prepareChartData() {
        if (!this.chartData || !this.chartData.songs) return { datasets: [] };
        
        // Get all unique dates and sort them
        const allDates = new Set();
        this.chartData.songs.forEach(song => {
            song.chartHistory.forEach(entry => {
                allDates.add(entry.date);
            });
        });
        
        const sortedDates = Array.from(allDates).sort();
        
        // Get the visible date range based on startWeek and visibleWeeks
        const startWeek = this.options.startWeek || 0;
        const visibleWeeks = this.options.visibleWeeks || sortedDates.length;
        const endWeek = Math.min(startWeek + visibleWeeks, sortedDates.length);
        const visibleDates = sortedDates.slice(startWeek, endWeek);
        
        // Condense the visible dates to eliminate blank weeks
        const condensedDates = ChartDataProcessor.condenseVisibleDates(visibleDates, this.chartData);
        
        // Process the condensed data
        const processedData = ChartDataProcessor.processChartData(this.chartData, condensedDates);
        
        // Store the consolidated X-axis data
        this.consolidatedXAxis = processedData.xAxis;
        
        return { datasets: processedData.datasets };
    }
    
    findGapLabel(date) {
        // Find gap labels from the consolidated X-axis data
        if (!this.consolidatedXAxis) return null;
        
        return this.consolidatedXAxis.find(label => {
            if (label && label.isGap && label.x) {
                return Math.abs(label.x - date) < (24 * 60 * 60 * 1000);
            }
            return false;
        });
    }
    
    updateChartData(newOptions = {}) {
        if (!this.chart) return;
        
        // Update options
        Object.assign(this.options, newOptions);
        
        // Re-render with new data
        this.renderChart();
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
