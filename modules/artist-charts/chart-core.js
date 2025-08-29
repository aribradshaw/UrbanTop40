/**
 * ChartCore - Clean Rebuild
 * Handles Chart.js rendering and data management
 */

(function($) {
    'use strict';

class ChartCore {
    constructor(container, chartData) {
        this.container = container;
        this.chartData = chartData;
        this.chart = null;
        this.allDates = [];
        this.visibleWeeks = 10;
        this.startWeek = 0;
        
        this.init();
    }
    
    init() {
        // Get all unique dates and sort them
        this.allDates = new Set();
        this.chartData.songs.forEach(song => {
            song.chartHistory.forEach(entry => {
                this.allDates.add(entry.date);
            });
        });
        this.allDates = Array.from(this.allDates).sort();
        
        this.renderChart();
    }
    
    renderChart() {
        if (!this.allDates || this.allDates.length === 0) {
            console.error('No valid dates found for chart');
            return;
        }
        
        // Calculate initial visible range
        const startDate = new Date(this.allDates[this.startWeek]);
        const endWeek = Math.min(this.startWeek + this.visibleWeeks, this.allDates.length);
        const endDate = new Date(this.allDates[endWeek - 1]);
        
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
                                const tooltipItem = tooltipItems[0];
                                if (tooltipItem.parsed && tooltipItem.parsed.x) {
                                    const date = new Date(tooltipItem.parsed.x);
                                    if (!isNaN(date.getTime())) {
                                        return date.toLocaleDateString('en-US', { 
                                            month: 'long', 
                                            day: 'numeric', 
                                            year: 'numeric' 
                                        });
                                    }
                                }
                                return 'Week';
                            },
                            label: (context) => {
                                const songName = context.dataset.label;
                                const position = context.parsed.y;
                                
                                if (position !== null && !isNaN(position) && position > 0 && position <= 100) {
                                    return `${songName}: #${position}`;
                                }
                                return null;
                            }
                        },
                        filter: (tooltipItem) => {
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
                            }
                        },
                        grid: {
                            color: 'rgba(232, 190, 62, 0.2)'
                        },
                        ticks: {
                            color: '#E8BE3E',
                            maxRotation: 45,
                            minRotation: 45
                        },
                        min: startDate,
                        max: endDate
                    },
                    y: {
                        reverse: true,
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
                        spanGaps: false
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
        
        this.chartData.songs.forEach((song, songIndex) => {
            const color = colors[songIndex % colors.length];
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
        
        const sortedHistory = song.chartHistory.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        sortedHistory.forEach((entry) => {
            const currentDate = new Date(entry.date);
            const currentPosition = entry.position;
            
            if (isNaN(currentDate.getTime()) || isNaN(currentPosition) || currentPosition < 1 || currentPosition > 100) {
                return; // Skip invalid data
            }
            
            if (lastPosition !== null && lastDate !== null) {
                const timeDiff = currentDate.getTime() - lastDate.getTime();
                const weeksDiff = timeDiff / (7 * 24 * 60 * 60 * 1000);
                
                if (lastPosition > 100 || weeksDiff > 26) {
                    data.push({
                        x: currentDate,
                        y: null
                    });
                }
            }
            
            data.push({
                x: currentDate,
                y: currentPosition
            });
            
            lastPosition = currentPosition;
            lastDate = currentDate;
        });
        
        return data;
    }
    
    constrainZoom(newMin, newMax) {
        if (!this.allDates || this.allDates.length === 0) return { min: newMin, max: newMax };
        
        const firstDate = new Date(this.allDates[0]);
        const lastDate = new Date(this.allDates[this.allDates.length - 1]);
        
        if (newMin < firstDate) {
            const range = newMax - newMin;
            newMin = firstDate;
            newMax = new Date(firstDate.getTime() + range);
        }
        
        if (newMax > lastDate) {
            const range = newMax - newMin;
            newMax = lastDate;
            newMin = new Date(lastDate.getTime() - range);
        }
        
        return { min: newMin, max: newMax };
    }
    
    constrainPan(newMin, newMax) {
        if (!this.allDates || this.allDates.length === 0) return { min: newMin, max: newMax };
        
        const firstDate = new Date(this.allDates[0]);
        const lastDate = new Date(this.allDates[this.allDates.length - 1]);
        const range = newMax - newMin;
        
        if (newMin < firstDate) {
            newMin = firstDate;
            newMax = new Date(firstDate.getTime() + range);
        }
        
        if (newMax > lastDate) {
            newMax = lastDate;
            newMin = new Date(lastDate.getTime() - range);
        }
        
        return { min: newMin, max: newMax };
    }
    
    updateChartData(newOptions = {}) {
        if (!this.chart) return;
        
        if (newOptions.startWeek !== undefined || newOptions.visibleWeeks !== undefined) {
            this.startWeek = newOptions.startWeek || this.startWeek;
            this.visibleWeeks = newOptions.visibleWeeks || this.visibleWeeks;
            
            const startDate = new Date(this.allDates[this.startWeek]);
            const endWeek = Math.min(this.startWeek + this.visibleWeeks, this.allDates.length);
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
