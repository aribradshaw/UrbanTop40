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
        xAxisData.sort((a, b) => {
            if (a instanceof Date && b instanceof Date) {
                return a - b;
            }
            // Handle gap labels - they should be sorted by their date property
            const dateA = a instanceof Date ? a : a.x;
            const dateB = b instanceof Date ? b : b.x;
            return dateA - dateB;
        });
        
        return { datasets, xAxis: xAxisData };
    }
    
    /**
     * Create song data with proper line breaks at gaps
     */
    static createSongDataWithBreaks(song, visibleDates) {
        const data = [];
        let currentDataset = [];
        
        for (let i = 0; i < visibleDates.length; i++) {
            const currentDate = visibleDates[i];
            
            if (typeof currentDate === 'object' && currentDate.isGap) {
                // This is a gap label, end current dataset and add gap
                if (currentDataset.length > 0) {
                    data.push(currentDataset);
                    currentDataset = [];
                }
                
                // Add gap label
                data.push({
                    x: new Date(currentDate.date),
                    y: null,
                    isGap: true,
                    gapWeeks: currentDate.gapWeeks,
                    isLabel: true
                });
            } else {
                // This is a regular date, look for chart entry
                const entry = song.chartHistory.find(e => e.date === currentDate);
                if (entry) {
                    currentDataset.push({
                        x: new Date(currentDate),
                        y: entry.position
                    });
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
        
        // Find significant gaps and condense them - be VERY aggressive
        const condensedDates = [];
        let lastDataDate = null;
        let gapStartDate = null;
        let gapWeeks = 0;
        
        for (let i = 0; i < allDates.length; i++) {
            const currentDate = allDates[i];
            
            if (dataDates.has(currentDate)) {
                // This date has chart data
                if (gapStartDate && gapWeeks > 0) {
                    // Add a single gap label for ANY gap period (even 1 week)
                    condensedDates.push({
                        date: gapStartDate,
                        isGap: true,
                        gapWeeks: gapWeeks
                    });
                    gapStartDate = null;
                    gapWeeks = 0;
                }
                
                condensedDates.push(currentDate);
                lastDataDate = currentDate;
            } else {
                // This is a blank week - count it
                if (!gapStartDate) {
                    gapStartDate = currentDate;
                    gapWeeks = 1;
                } else {
                    gapWeeks++;
                }
            }
        }
        
        // Handle any remaining gap at the end
        if (gapStartDate && gapWeeks > 0) {
            condensedDates.push({
                date: gapStartDate,
                isGap: true,
                gapWeeks: gapWeeks
            });
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
