/**
 * Chart Core Module
 * 
 * Simple, working Chart.js implementation
 */

(function($) {
    'use strict';

class ChartCore {
    constructor(container, chartData) {
        this.container = container;
        this.chartData = chartData;
        this.chart = null;
        
        // Get all unique dates and sort them
        this.allDates = new Set();
        this.chartData.songs.forEach(song => {
            song.chartHistory.forEach(entry => {
                this.allDates.add(entry.date);
            });
        });
        this.allDates = Array.from(this.allDates).sort();
        
        // Calculate initial visible range - start with first 10 weeks
        this.visibleWeeks = 10;
        this.startWeek = 0;
        
        this.renderChart();
    }
    
    init() {
        this.renderChart();
    }
    
    renderChart() {
        if (!this.allDates || this.allDates.length === 0) {
            console.error('No valid dates found for chart');
            return;
        }
        
        const startDate = new Date(this.allDates[this.startWeek]);
        const endWeek = Math.min(this.startWeek + this.visibleWeeks, this.allDates.length);
        const endDate = new Date(this.allDates[endWeek - 1]);
        
        // Ensure we're within data boundaries
        const firstDataDate = new Date(this.allDates[0]);
        const lastDataDate = new Date(this.allDates[this.allDates.length - 1]);
        
        if (startDate < firstDataDate || endDate > lastDataDate) {
            console.warn('Initial chart range outside data boundaries, resetting to first 10 weeks');
            this.startWeek = 0;
            this.visibleWeeks = 10;
            const newStartDate = new Date(this.allDates[0]);
            const newEndDate = new Date(this.allDates[Math.min(9, this.allDates.length - 1)]);
            startDate = newStartDate;
            endDate = newEndDate;
        }

        const chartData = this.prepareChartData();
        
        const chartContainer = this.container.find('#chart-container');
        chartContainer.empty();
        
        // Create canvas for Chart.js
        const canvas = $('<canvas id="artist-chart-canvas"></canvas>');
        chartContainer.append(canvas);
        
        const ctx = canvas[0].getContext('2d');
        
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
                        backgroundColor: 'rgba(17, 17, 17, 0.95)',
                        titleColor: '#E8BE3E',
                        bodyColor: '#ffffff',
                        borderColor: '#E8BE3E',
                        borderWidth: 2,
                        callbacks: {
                            title: (tooltipItems) => {
                                // Get the date from the tooltip item
                                const tooltipItem = tooltipItems[0];
                                let date;
                                
                                // Try to get date from different possible sources
                                if (tooltipItem.parsed && tooltipItem.parsed.x) {
                                    date = new Date(tooltipItem.parsed.x);
                                } else if (tooltipItem.label) {
                                    date = new Date(tooltipItem.label);
                                } else if (tooltipItem.raw && tooltipItem.raw.x) {
                                    date = new Date(tooltipItem.raw.x);
                                }
                                
                                // Validate the date
                                if (!date || isNaN(date.getTime())) {
                                    console.warn('Invalid date in tooltip:', tooltipItem);
                                    return 'Date unavailable';
                                }
                                
                                return date.toLocaleDateString('en-US', { 
                                    month: 'long', 
                                    day: 'numeric', 
                                    year: 'numeric' 
                                });
                            },
                            label: (context) => {
                                const songName = context.dataset.label;
                                const position = context.parsed.y;
                                
                                // Only show songs that have data for this week
                                if (position !== null && !isNaN(position) && position > 0 && position <= 100) {
                                    return `${songName}: #${position}`;
                                }
                                return null; // Don't show songs without data
                            }
                        },
                        filter: (tooltipItem) => {
                            // Only show tooltips for songs with actual data
                            return tooltipItem.parsed.y !== null && !isNaN(tooltipItem.parsed.y) && tooltipItem.parsed.y > 0 && tooltipItem.parsed.y <= 100;
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
                            },
                            parser: {
                                format: 'yyyy-MM-dd'
                            }
                        },
                        grid: {
                            color: 'rgba(232, 190, 62, 0.2)'
                        },
                        ticks: {
                            color: '#E8BE3E',
                            maxRotation: 45,
                            minRotation: 45,
                            callback: function(value, index, values) {
                                const date = new Date(value);
                                if (isNaN(date.getTime())) {
                                    return '';
                                }
                                return date.toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric', 
                                    year: 'numeric' 
                                });
                            }
                        },
                        min: startDate,
                        max: endDate
                    },
                    y: {
                        reverse: true, // #1 at top, #100 at bottom
                        min: 1,
                        max: 100,
                        grid: {
                            color: 'rgba(232, 190, 62, 0.2)'
                        },
                        ticks: {
                            color: '#E8BE3E',
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
        
        // Ensure the chart respects data boundaries
        this.enforceBoundaries();
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
        let lastDate = null;
        
        // Sort chart history by date
        const sortedHistory = song.chartHistory.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        sortedHistory.forEach((entry, index) => {
            // Ensure we have a valid date
            const currentDate = new Date(entry.date);
            if (isNaN(currentDate.getTime())) {
                console.warn('Invalid date found:', entry.date, 'for song:', song.song);
                return; // Skip this entry
            }
            
            const currentPosition = entry.position;
            
            // Validate position
            if (isNaN(currentPosition) || currentPosition < 1 || currentPosition > 100) {
                console.warn('Invalid position found:', currentPosition, 'for song:', song.song, 'on date:', entry.date);
                return; // Skip this entry
            }
            
            // Check if this is a re-entry after falling off chart OR if there's a large time gap
            if (lastPosition !== null && lastDate !== null) {
                const timeDiff = currentDate.getTime() - lastDate.getTime();
                const weeksDiff = timeDiff / (7 * 24 * 60 * 60 * 1000);
                
                // Add break if song fell off chart (>100) OR if there's more than 26 weeks (6 months) gap
                if (lastPosition > 100 || weeksDiff > 26) {
                    // Add a break (null point) to prevent line connection
                    data.push({
                        x: currentDate,
                        y: null
                    });
                }
            }
            
            // Add the current data point
            data.push({
                x: currentDate,
                y: currentPosition
            });
            
            lastPosition = currentPosition;
            lastDate = currentDate;
        });
        
        return data;
    }
    
    // Constrain zoom to stay within data boundaries
    constrainZoom(newMin, newMax) {
        if (!this.allDates || this.allDates.length === 0) return { min: newMin, max: newMax };
        
        const firstDate = new Date(this.allDates[0]);
        const lastDate = new Date(this.allDates[this.allDates.length - 1]);
        
        // Ensure we don't go before the first data point
        if (newMin < firstDate) {
            const range = newMax - newMin;
            newMin = firstDate;
            newMax = new Date(firstDate.getTime() + range);
        }
        
        // Ensure we don't go after the last data point
        if (newMax > lastDate) {
            const range = newMax - newMin;
            newMax = lastDate;
            newMin = new Date(lastDate.getTime() - range);
        }
        
        return { min: newMin, max: newMax };
    }
    
    // Constrain pan to stay within data boundaries
    constrainPan(newMin, newMax) {
        if (!this.allDates || this.allDates.length === 0) return { min: newMin, max: newMax };
        
        const firstDate = new Date(this.allDates[0]);
        const lastDate = new Date(this.allDates[this.allDates.length - 1]);
        const range = newMax - newMin;
        
        // Ensure we don't go before the first data point
        if (newMin < firstDate) {
            newMin = firstDate;
            newMax = new Date(firstDate.getTime() + range);
        }
        
        // Ensure we don't go after the last data point
        if (newMax > lastDate) {
            newMax = lastDate;
            newMin = new Date(lastDate.getTime() - range);
        }
        
        return { min: newMin, max: newMax };
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
    
    // Ensure chart always respects data boundaries
    enforceBoundaries() {
        if (!this.chart) return;
        
        const currentMin = this.chart.options.scales.x.min;
        const currentMax = this.chart.options.scales.x.max;
        
        if (currentMin && currentMax) {
            const constrained = this.constrainPan(currentMin, currentMax);
            if (constrained.min !== currentMin || constrained.max !== currentMax) {
                this.chart.options.scales.x.min = constrained.min;
                this.chart.options.scales.x.max = constrained.max;
                this.chart.update('none');
            }
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
