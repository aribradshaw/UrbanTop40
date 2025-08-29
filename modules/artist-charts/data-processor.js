/**
 * Chart Data Processor
 * 
 * Simple data processing for chart display
 */

class ChartDataProcessor {
    /**
     * Process raw chart data to create datasets
     */
    static processChartData(chartData) {
        if (!chartData || !chartData.songs) return { datasets: [] };
        
        const datasets = [];
        const colors = [
            '#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336',
            '#00BCD4', '#FF5722', '#795548', '#607D8B', '#E91E63'
        ];
        
        // Process each song
        chartData.songs.forEach((song, songIndex) => {
            const color = colors[songIndex % colors.length];
            
            // Create data points for this song
            const data = song.chartHistory.map(entry => ({
                x: new Date(entry.date),
                y: entry.position
            }));
            
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
}

// Make ChartDataProcessor available globally
window.ChartDataProcessor = ChartDataProcessor;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChartDataProcessor;
}
