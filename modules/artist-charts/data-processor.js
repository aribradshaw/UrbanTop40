/**
 * Chart Data Processor
 * 
 * Handles the core logic for processing chart data and eliminating blank weeks
 */

class ChartDataProcessor {
    /**
     * Process raw chart data to create condensed X-axis and datasets
     */
    static processChartData(chartData, visibleDates) {
        if (!chartData || !chartData.songs) return { datasets: [], xAxis: [] };
        
        const datasets = [];
        const colors = [
            '#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336',
            '#00BCD4', '#FF5722', '#795548', '#607D8B', '#E91E63'
        ];
        
        // Process each song to create datasets
        chartData.songs.forEach((song, songIndex) => {
            const songData = this.createSongDataWithBreaks(song, visibleDates);
            const color = colors[songIndex % colors.length];
            
            songData.forEach((dataset) => {
                if (dataset.length > 0) { // Only add datasets with data
                    datasets.push({
                        label: song.song,
                        data: dataset,
                        borderColor: color,
                        backgroundColor: color,
                        borderWidth: 2,
                        fill: false,
                        tension: 0.1
                    });
                }
            });
        });
        
        // SIMPLE X-axis: Just use the visible dates (which now only contain dates with data)
        const xAxisData = visibleDates.map(date => new Date(date));
        
        return { datasets, xAxis: xAxisData };
    }
    
    /**
     * Create song data with proper line breaks at gaps
     */
    static createSongDataWithBreaks(song, visibleDates) {
        // SIMPLE APPROACH: Just create one dataset with all the data points
        const dataset = [];
        
        for (let i = 0; i < visibleDates.length; i++) {
            const currentDate = visibleDates[i];
            const entry = song.chartHistory.find(e => e.date === currentDate);
            if (entry) {
                dataset.push({
                    x: new Date(currentDate),
                    y: entry.position
                });
            }
        }
        
        return [dataset]; // Return array with single dataset
    }
    
    /**
     * Find significant gaps in the data and condense them
     */
    static condenseVisibleDates(allDates, chartData) {
        if (!chartData || !chartData.songs) return allDates;
        
        // SIMPLE APPROACH: Just return the dates where we actually have data
        const dataDates = new Set();
        chartData.songs.forEach(song => {
            song.chartHistory.forEach(entry => {
                dataDates.add(entry.date);
            });
        });
        
        // Only include dates that have actual chart data
        return allDates.filter(date => dataDates.has(date));
    }
}

// Make ChartDataProcessor available globally
window.ChartDataProcessor = ChartDataProcessor;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChartDataProcessor;
}
