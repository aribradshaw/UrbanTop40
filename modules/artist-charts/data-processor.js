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
        const allChartPoints = new Set();
        const gapLabels = [];
        const colors = [
            '#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336',
            '#00BCD4', '#FF5722', '#795548', '#607D8B', '#E91E63'
        ];
        
        // Process each song to create datasets and collect data points
        chartData.songs.forEach((song, songIndex) => {
            const songData = this.createSongDataWithBreaks(song, visibleDates);
            const color = colors[songIndex % colors.length];
            
            songData.forEach((dataset, datasetIndex) => {
                if (dataset.isLabel) {
                    // This is a gap label, add it to our gap labels collection
                    gapLabels.push(dataset);
                    return;
                }
                
                // Add all data points to our collection
                dataset.forEach(point => {
                    allChartPoints.add(point.x.getTime());
                });
                
                datasets.push({
                    label: song.song,
                    data: dataset,
                    borderColor: color,
                    backgroundColor: color,
                    borderWidth: 2,
                    fill: false,
                    tension: 0.1
                });
            });
        });
        
        // Create condensed X-axis with only actual data points and gap labels
        const xAxisData = [];
        
        // Add all actual chart data points
        allChartPoints.forEach(timestamp => {
            xAxisData.push(new Date(timestamp));
        });
        
        // Add gap labels at appropriate positions
        gapLabels.forEach(gapLabel => {
            xAxisData.push(gapLabel.x);
        });
        
        // Sort the X-axis data chronologically
        xAxisData.sort((a, b) => a - b);
        
        return { datasets, xAxis: xAxisData };
    }
    
    /**
     * Create song data with proper line breaks at gaps
     */
    static createSongDataWithBreaks(song, visibleDates) {
        const data = [];
        let lastEntry = null;
        let currentDataset = [];
        let gapAdded = false;
        
        for (let i = 0; i < visibleDates.length; i++) {
            const currentDate = visibleDates[i];
            const entry = song.chartHistory.find(e => e.date === currentDate);
            
            if (entry) {
                // Add the actual chart entry
                currentDataset.push({
                    x: new Date(currentDate),
                    y: entry.position
                });
                lastEntry = entry;
                gapAdded = false;
            } else if (lastEntry && !gapAdded) {
                // Check if this is a significant gap (more than 2 weeks)
                const lastDate = new Date(lastEntry.date);
                const currentDateObj = new Date(currentDate);
                const weekDiff = Math.round((currentDateObj - lastDate) / (7 * 24 * 60 * 60 * 1000));
                
                if (weekDiff > 2) {
                    // End the current dataset and start a new one
                    if (currentDataset.length > 0) {
                        data.push(currentDataset);
                        currentDataset = [];
                    }
                    
                    // Add a gap label point for the X-axis (only once per gap period)
                    data.push({
                        x: new Date(currentDate),
                        y: null,
                        isGap: true,
                        gapWeeks: weekDiff,
                        isLabel: true
                    });
                    
                    lastEntry = null;
                    gapAdded = true;
                }
            }
        }
        
        // Add the final dataset if it has data
        if (currentDataset.length > 0) {
            data.push(currentDataset);
        }
        
        return data;
    }
    
    /**
     * Find significant gaps in the data and condense them
     */
    static condenseVisibleDates(allDates, chartData) {
        if (!chartData || !chartData.songs) return allDates;
        
        // Get all dates that have actual chart data
        const dataDates = new Set();
        chartData.songs.forEach(song => {
            song.chartHistory.forEach(entry => {
                dataDates.add(entry.date);
            });
        });
        
        // Find significant gaps and condense them
        const condensedDates = [];
        let lastDataDate = null;
        
        for (let i = 0; i < allDates.length; i++) {
            const currentDate = allDates[i];
            
            if (dataDates.has(currentDate)) {
                // This date has chart data, include it
                condensedDates.push(currentDate);
                lastDataDate = currentDate;
            } else if (lastDataDate) {
                // Check if this is a significant gap
                const lastDate = new Date(lastDataDate);
                const currentDateObj = new Date(currentDate);
                const weekDiff = Math.round((currentDateObj - lastDate) / (7 * 24 * 60 * 60 * 1000));
                
                if (weekDiff > 2) {
                    // Add a gap label date (only once per gap period)
                    if (!condensedDates.includes(currentDate)) {
                        condensedDates.push(currentDate);
                    }
                }
            }
        }
        
        return condensedDates;
    }
}

// Make ChartDataProcessor available globally
window.ChartDataProcessor = ChartDataProcessor;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChartDataProcessor;
}
