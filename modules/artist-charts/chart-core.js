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
                                const position = context.parsed.y;
                                return `${songName}: #${position}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'category',
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)',
                            maxRotation: 45,
                            callback: (value, index, ticks) => {
                                // Simple date formatting
                                const label = this.consolidatedXAxis[index];
                                if (label instanceof Date) {
                                    return label.toLocaleDateString('en-US', { 
                                        month: 'short', 
                                        day: '2-digit', 
                                        year: 'numeric' 
                                    });
                                }
                                return value;
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
                        radius: 3,
                        hoverRadius: 5
                    },
                    line: {
                        tension: 0.1
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
        
        // SIMPLE APPROACH: Get ALL dates with chart data, no filtering
        const allDates = new Set();
        this.chartData.songs.forEach(song => {
            song.chartHistory.forEach(entry => {
                allDates.add(entry.date);
            });
        });
        
        const sortedDates = Array.from(allDates).sort();
        
        // Use ALL dates, not just a subset
        const visibleDates = sortedDates;
        
        // Process the data with all dates
        const processedData = ChartDataProcessor.processChartData(this.chartData, visibleDates);
        
        // Store the consolidated X-axis data
        this.consolidatedXAxis = processedData.xAxis;
        
        return { datasets: processedData.datasets };
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
