/**
 * Artist Charts Module JavaScript
 * 
 * Handles chart rendering, data loading, and interactive functionality
 */

(function($) {
    'use strict';

    class ArtistChart {
        constructor(container) {
            this.container = container;
            this.artist = container.data('artist');
            this.height = container.data('height') || 400;
            this.width = container.data('width') || '100%';
            this.showLegend = container.data('show-legend') === 'true';
            this.chartType = container.data('chart-type') || 'line';
            
            this.chartData = null;
            this.tooltip = null;
            
            this.init();
        }
        
        init() {
            this.createTooltip();
            this.loadChartData();
        }
        
        createTooltip() {
            this.tooltip = $('<div class="chart-tooltip"></div>');
            $('body').append(this.tooltip);
        }
        
        loadChartData() {
            const self = this;
            
            console.log('Loading chart data for artist:', this.artist);
            
            $.ajax({
                url: urbanTop40Charts.ajaxurl,
                type: 'POST',
                data: {
                    action: 'get_artist_chart_data',
                    artist: this.artist,
                    nonce: urbanTop40Charts.nonce
                },
                success: function(response) {
                    console.log('AJAX response:', response);
                    if (response.success) {
                        self.chartData = response.data;
                        self.renderChart();
                    } else {
                        self.showError(response.data || 'Failed to load chart data');
                    }
                },
                error: function(xhr, status, error) {
                    console.error('AJAX error:', { xhr, status, error });
                    self.showError('Network error occurred while loading chart data');
                }
            });
        }
        
        renderChart() {
            console.log('Rendering chart with data:', this.chartData);
            
            if (!this.chartData || !this.chartData.songs) {
                this.showError('No chart data available');
                return;
            }
            
            // Hide loading, show chart
            this.container.find('.chart-loading').hide();
            this.container.find('.chart-container').show().addClass('fade-in');
            
            // Set artist name with chart type
            this.container.find('.artist-name').text(`${this.chartData.name} - All Songs Chart History`);
            
            // Render stats
            this.renderStats();
            
            // Render chart
            this.renderChartContent();
            
            // Add event listeners
            this.addEventListeners();
        }
        
        renderStats() {
            const stats = this.container.find('.chart-stats');
            stats.empty();
            
            // Total songs
            stats.append(`
                <div class="stat-item">
                    <span class="stat-value">${this.chartData.totalSongs}</span>
                    <span class="stat-label">Total Songs</span>
                </div>
            `);
            
            // Number ones
            const numberOnes = this.chartData.songs.filter(song => song.peakPosition === 1).length;
            stats.append(`
                <div class="stat-item">
                    <span class="stat-value">${numberOnes}</span>
                    <span class="stat-label">Number Ones</span>
                </div>
            `);
            
            // Calculate total weeks from all chart history
            const allWeeks = new Set();
            this.chartData.songs.forEach(song => {
                song.chartHistory.forEach(entry => {
                    allWeeks.add(entry.date);
                });
            });
            
            stats.append(`
                <div class="stat-item">
                    <span class="stat-value">${allWeeks.size}</span>
                    <span class="stat-label">Total Weeks</span>
                </div>
            `);
        }
        
        renderChartContent() {
            const chartContent = this.container.find('.chart-content');
            chartContent.empty();
            
            console.log('Rendering chart content with songs:', this.chartData.songs);
            
            // Add Y-axis labels (1 at top, 100 at bottom)
            this.addYAxisLabels(chartContent);
            
            // Process chart data to get all unique weeks and song trajectories
            const chartData = this.processChartData();
            
            // Calculate chart dimensions - use a reasonable width instead of massive width
            const chartHeight = parseInt(this.height) || 400;
            const weekCount = chartData.weeks.length;
            // Use a more reasonable width calculation - max 1200px, min 800px
            const chartWidth = Math.min(1200, Math.max(800, weekCount * 15));
            
            console.log('Chart dimensions:', { chartHeight, weekCount, chartWidth });
            
            // Set chart dimensions - account for sidebar
            chartContent.css({
                'min-width': (chartWidth + 270) + 'px',
                'height': chartHeight + 'px',
                'position': 'relative'
            });
            
            // Add grid lines
            this.addGridLines(chartContent, chartHeight, chartWidth);
            
            // Add X-axis labels (weeks)
            this.addXAxisLabels(chartContent, chartData.weeks, chartWidth);
            
            // Draw song lines
            this.drawSongLines(chartContent, chartData, chartHeight, chartWidth);
            
            // Legend is now handled by sidebar
            
            // Add fallback content if no chart was created
            if (chartContent.find('.chart-main-area').length === 0) {
                console.log('No chart area was created, adding fallback content');
                this.addFallbackChartContent(chartContent, chartData, chartHeight, chartWidth);
            }
        }
        
        addYAxisLabels(chartContent) {
            const yAxisLabels = $('<div class="y-axis-labels"></div>');
            
            // Add position labels (1, 25, 50, 75, 100)
            const positions = [1, 25, 50, 75, 100];
            positions.forEach(position => {
                const label = $(`<div class="y-axis-label">${position}</div>`);
                // Fixed: 1 at top (0%), 100 at bottom (100%)
                const yPos = ((100 - position) / 100) * 100;
                label.css('top', yPos + '%');
                yAxisLabels.append(label);
            });
            
            chartContent.append(yAxisLabels);
        }
        
        processChartData() {
            console.log('Processing chart data...');
            console.log('Original songs data:', this.chartData.songs);
            
            const allWeeks = new Set();
            const songTrajectories = [];
            
            // Collect all unique weeks and create song trajectories
            this.chartData.songs.forEach(song => {
                console.log(`Processing song: ${song.song}`);
                console.log(`Chart history:`, song.chartHistory);
                
                const trajectory = {
                    song: song.song,
                    color: this.getSongColor(song.song),
                    data: []
                };
                
                song.chartHistory.forEach(entry => {
                    allWeeks.add(entry.date);
                    trajectory.data.push({
                        date: entry.date,
                        position: entry.position,
                        week: entry.weeksOnChart
                    });
                });
                
                console.log(`Created trajectory for ${song.song}:`, trajectory);
                songTrajectories.push(trajectory);
            });
            
            // Sort weeks chronologically
            const sortedWeeks = Array.from(allWeeks).sort();
            console.log('All unique weeks:', sortedWeeks);
            
            // Smart gap detection and labeling
            const labeledWeeks = this.smartWeekLabeling(sortedWeeks);
            console.log('Labeled weeks:', labeledWeeks);
            
            const result = {
                weeks: labeledWeeks,
                songs: songTrajectories
            };
            
            console.log('Final processed data:', result);
            return result;
        }
        
        getSongColor(songName) {
            // Generate consistent colors for each song
            const colors = [
                '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
                '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
                '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2'
            ];
            
            let hash = 0;
            for (let i = 0; i < songName.length; i++) {
                hash = songName.charCodeAt(i) + ((hash << 5) - hash);
            }
            hash = Math.abs(hash);
            
            return colors[hash % colors.length];
        }
        
        smartWeekLabeling(weeks) {
            // Show every single week on the X-axis
            const labeledWeeks = [];
            
            weeks.forEach((week, index) => {
                let label = '';
                let showLabel = true;
                
                if (index > 0) {
                    // Check for gaps and add gap labels
                    const prevWeek = new Date(weeks[index - 1]);
                    const currentWeek = new Date(week);
                    const weekDiff = this.getWeekDifference(prevWeek, currentWeek);
                    
                    if (weekDiff > 1) {
                        label = `${weekDiff} week gap`;
                        showLabel = true;
                    } else {
                        label = this.formatWeekLabel(week);
                        showLabel = true; // Show label for every week
                    }
                } else {
                    label = this.formatWeekLabel(week);
                    showLabel = true;
                }
                
                labeledWeeks.push({
                    date: week,
                    label: label,
                    showLabel: showLabel
                });
            });
            
            return labeledWeeks;
        }
        
        formatWeekLabel(dateStr) {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
            });
        }
        
        getWeekDifference(date1, date2) {
            const oneWeek = 7 * 24 * 60 * 60 * 1000;
            return Math.round(Math.abs((date2 - date1) / oneWeek));
        }
        
        addGridLines(chartContent, chartHeight, chartWidth) {
            const gridContainer = $('<div class="chart-grid"></div>');
            
            // Horizontal grid lines for chart positions
            const positions = [1, 25, 50, 75, 100];
            positions.forEach(position => {
                // Fixed: 1 at top (0), 100 at bottom (chartHeight)
                const yPos = ((100 - position) / 100) * chartHeight;
                const line = $('<div class="grid-line horizontal"></div>');
                line.css({
                    'position': 'absolute',
                    'top': yPos + 'px',
                    'left': '0',
                    'width': '100%',
                    'height': '1px',
                    'background': 'rgba(255, 255, 255, 0.1)',
                    'z-index': '1'
                });
                gridContainer.append(line);
            });
            
            chartContent.append(gridContainer);
        }
        
        addXAxisLabels(chartContent, weeks, chartWidth) {
            const xAxisContainer = $('<div class="x-axis-labels"></div>');
            
            weeks.forEach((week, index) => {
                if (week.showLabel) {
                    const label = $('<div class="x-axis-label"></div>');
                    const xPos = (index / (weeks.length - 1)) * chartWidth;
                    
                    label.text(week.label);
                    label.css({
                        'position': 'absolute',
                        'bottom': '-30px',
                        'left': xPos + 'px',
                        'transform': 'translateX(-50%) rotate(-45deg)',
                        'font-size': '0.7rem',
                        'color': 'rgba(255, 255, 255, 0.8)',
                        'white-space': 'nowrap',
                        'z-index': '10'
                    });
                    
                    xAxisContainer.append(label);
                }
            });
            
            chartContent.append(xAxisContainer);
        }
        
        drawSongLines(chartContent, chartData, chartHeight, chartWidth) {
            console.log('Drawing song lines with Chart.js approach...');
            console.log('Chart data:', chartData);
            
            // Create sidebar for song list
            const sidebar = $('<div class="chart-sidebar"></div>');
            sidebar.css({
                'width': '250px',
                'float': 'left',
                'padding': '20px',
                'background': 'rgba(0, 0, 0, 0.1)',
                'border-right': '1px solid rgba(255, 255, 255, 0.2)',
                'height': chartHeight + 'px',
                'overflow-y': 'auto'
            });
            
            // Add song list to sidebar
            this.createSongSidebar(sidebar, chartData);
            
            // Create main chart area
            const chartArea = $('<div class="chart-main-area"></div>');
            chartArea.css({
                'margin-left': '20px',
                'width': (chartWidth - 290) + 'px',
                'position': 'relative',
                'overflow': 'hidden'
            });
            
            // Create canvas for Chart.js
            const canvas = $('<canvas></canvas>');
            canvas.attr('width', chartWidth - 270);
            canvas.attr('height', chartHeight);
            canvas.css({
                'width': (chartWidth - 270) + 'px',
                'height': chartHeight + 'px'
            });
            
            chartArea.append(canvas);
            
            // Add zoom instructions
            const zoomInstructions = $('<div class="zoom-instructions">🔍 Scroll to zoom horizontally • Drag to pan left/right</div>');
            chartArea.append(zoomInstructions);
            
            // Prepare data for Chart.js with proper gap handling
            const chartJsData = this.prepareChartJsData(chartData);
            console.log('Chart.js data prepared with gaps:', chartJsData);
            
            // Create the chart
            this.createChartJsChart(canvas[0], chartJsData, chartWidth - 270, chartHeight);
            
            // Add both sidebar and chart area
            chartContent.append(sidebar);
            chartContent.append(chartArea);
            console.log('Finished drawing song lines with Chart.js and sidebar');
        }
        
        createSongSidebar(sidebar, chartData) {
            const title = $('<h3 class="sidebar-title">Songs</h3>');
            title.css({
                'color': 'rgba(255, 255, 255, 0.9)',
                'margin-bottom': '20px',
                'font-size': '18px',
                'border-bottom': '1px solid rgba(255, 255, 255, 0.2)',
                'padding-bottom': '10px'
            });
            
            sidebar.append(title);
            
            chartData.songs.forEach((song, index) => {
                const colors = [
                    '#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336',
                    '#00BCD4', '#FF5722', '#795548', '#607D8B', '#E91E63'
                ];
                
                const songItem = $('<div class="song-item"></div>');
                songItem.css({
                    'padding': '10px',
                    'margin-bottom': '10px',
                    'background': 'rgba(255, 255, 255, 0.05)',
                    'border-radius': '5px',
                    'border-left': '4px solid ' + colors[index % colors.length],
                    'cursor': 'pointer',
                    'transition': 'all 0.2s ease'
                });
                
                songItem.hover(
                    function() {
                        $(this).css('background', 'rgba(255, 255, 255, 0.1)');
                    },
                    function() {
                        $(this).css('background', 'rgba(255, 255, 255, 0.05)');
                    }
                );
                
                const songName = $('<div class="song-name"></div>');
                songName.css({
                    'color': 'rgba(255, 255, 255, 0.9)',
                    'font-weight': 'bold',
                    'margin-bottom': '5px'
                });
                songName.text(song.song);
                
                const songStats = $('<div class="song-stats"></div>');
                songStats.css({
                    'color': 'rgba(255, 255, 255, 0.7)',
                    'font-size': '12px'
                });
                
                const peakPosition = Math.min(...song.data.map(p => p.position));
                const weeksOnChart = song.data.length;
                songStats.html(`Peak: #${peakPosition} | Weeks: ${weeksOnChart}`);
                
                songItem.append(songName);
                songItem.append(songStats);
                sidebar.append(songItem);
            });
        }
        
        createSongSidebar(sidebar, chartData) {
            const title = $('<h3 class="sidebar-title">Songs</h3>');
            title.css({
                'color': 'rgba(255, 255, 255, 0.9)',
                'margin-bottom': '20px',
                'font-size': '18px',
                'border-bottom': '1px solid rgba(255, 255, 255, 0.2)',
                'padding-bottom': '10px'
            });
            
            sidebar.append(title);
            
            chartData.songs.forEach((song, index) => {
                const colors = [
                    '#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336',
                    '#00BCD4', '#FF5722', '#795548', '#607D8B', '#E91E63'
                ];
                
                const songItem = $('<div class="song-item"></div>');
                songItem.css({
                    'padding': '10px',
                    'margin-bottom': '10px',
                    'background': 'rgba(255, 255, 255, 0.05)',
                    'border-radius': '5px',
                    'border-left': '4px solid ' + colors[index % colors.length],
                    'cursor': 'pointer',
                    'transition': 'all 0.2s ease'
                });
                
                songItem.hover(
                    function() {
                        $(this).css('background', 'rgba(255, 255, 255, 0.1)');
                    },
                    function() {
                        $(this).css('background', 'rgba(255, 255, 255, 0.05)');
                    }
                );
                
                const songName = $('<div class="song-name"></div>');
                songName.css({
                    'color': 'rgba(255, 255, 255, 0.9)',
                    'font-weight': 'bold',
                    'margin-bottom': '5px'
                });
                songName.text(song.song);
                
                const songStats = $('<div class="song-stats"></div>');
                songStats.css({
                    'color': 'rgba(255, 255, 255, 0.7)',
                    'font-size': '12px'
                });
                
                // Fix: Use song.data (from trajectory) instead of song.chartHistory
                const peakPosition = Math.min(...song.data.map(p => p.position));
                const weeksOnChart = song.data.length;
                songStats.html(`Peak: #${peakPosition} | Weeks: ${weeksOnChart}`);
                
                songItem.append(songName);
                songItem.append(songStats);
                sidebar.append(songItem);
            });
        }
        
        prepareChartJsData(chartData) {
            // Get all unique dates and sort them
            const allDates = new Set();
            chartData.songs.forEach(song => {
                song.data.forEach(point => {
                    allDates.add(point.date);
                });
            });
            
            const sortedDates = Array.from(allDates).sort();
            console.log('Sorted dates:', sortedDates);
            
            // Create datasets for each song with proper gap handling
            const datasets = chartData.songs.map((song, index) => {
                const colors = [
                    '#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336',
                    '#00BCD4', '#FF5722', '#795548', '#607D8B', '#E91E63'
                ];
                
                // Create data array with null values for gaps
                const data = sortedDates.map(date => {
                    const point = song.data.find(p => p.date === date);
                    return point ? point.position : null;
                });
                
                return {
                    label: song.song,
                    data: data,
                    borderColor: colors[index % colors.length],
                    backgroundColor: colors[index % colors.length],
                    borderWidth: 2,
                    pointRadius: 3,
                    pointHoverRadius: 5,
                    fill: false,
                    tension: 0.1,
                    spanGaps: false // Don't connect across gaps
                };
            });
            
            // Create labels with gap indicators
            const labels = sortedDates.map((date, index) => {
                if (index === 0) return this.formatWeekLabel(date);
                
                const prevDate = new Date(sortedDates[index - 1]);
                const currentDate = new Date(date);
                const daysDiff = (currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
                
                // If gap is more than 7 days, add gap indicator
                if (daysDiff > 7) {
                    const weeksGap = Math.round(daysDiff / 7);
                    return `Gap (${weeksGap} weeks)`;
                }
                
                return this.formatWeekLabel(date);
            });
            
            return {
                labels: labels,
                datasets: datasets
            };
        }
        
        createChartJsChart(canvas, data, width, height) {
            // Check if Chart.js is available
            if (typeof Chart === 'undefined') {
                console.error('Chart.js is not loaded');
                // Fallback to simple HTML display
                this.createSimpleChartFallback(canvas, data);
                return;
            }
            
            try {
                const ctx = canvas.getContext('2d');
                const chart = new Chart(ctx, {
                    type: 'line',
                    data: data,
                    options: {
                        responsive: false,
                        maintainAspectRatio: false,
                        scales: {
                            x: {
                                display: true,
                                title: {
                                    display: true,
                                    text: 'Week',
                                    color: 'rgba(255, 255, 255, 0.8)'
                                },
                                ticks: {
                                    color: 'rgba(255, 255, 255, 0.7)',
                                    maxRotation: 45,
                                    minRotation: 45
                                },
                                grid: {
                                    color: 'rgba(255, 255, 255, 0.1)'
                                }
                            },
                            y: {
                                display: true,
                                title: {
                                    display: true,
                                    text: 'Chart Position',
                                    color: 'rgba(255, 255, 255, 0.8)'
                                },
                                ticks: {
                                    color: 'rgba(255, 255, 255, 0.7)',
                                    reverse: true, // 1 at top, 100 at bottom
                                    callback: function(value) {
                                        return value;
                                    }
                                },
                                grid: {
                                    color: 'rgba(255, 255, 255, 0.1)'
                                },
                                min: 1,
                                max: 100,
                                beginAtZero: false,
                                // Ensure Y-axis stays fixed during zoom
                                afterFit: function(axis) {
                                    axis.min = 1;
                                    axis.max = 100;
                                }
                            }
                        },
                        plugins: {
                            legend: {
                                display: false // Hide legend since we have sidebar
                            },
                            tooltip: {
                                mode: 'index',
                                intersect: false,
                                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                                titleColor: 'rgba(255, 255, 255, 0.9)',
                                bodyColor: 'rgba(255, 255, 255, 0.8)',
                                borderColor: 'rgba(255, 255, 255, 0.2)',
                                borderWidth: 1
                            },
                            zoom: {
                                zoom: {
                                    wheel: {
                                        enabled: true,
                                    },
                                    pinch: {
                                        enabled: true
                                    },
                                    mode: 'x', // Only zoom horizontally
                                },
                                pan: {
                                    enabled: true,
                                    mode: 'x', // Only pan horizontally
                                }
                            }
                        },
                        interaction: {
                            mode: 'nearest',
                            axis: 'x',
                            intersect: false
                        }
                    }
                });
                
                console.log('Chart.js chart created successfully');
                this.chartInstance = chart; // Store the chart instance
                
            } catch (error) {
                console.error('Error creating Chart.js chart:', error);
                this.createSimpleChartFallback(canvas, data);
            }
        }
        
        createSimpleChartFallback(canvas, data) {
            console.log('Creating simple chart fallback');
            
            const container = $(canvas).parent();
            container.empty();
            
            const fallbackDiv = $('<div class="simple-chart-fallback"></div>');
            fallbackDiv.css({
                'padding': '20px',
                'text-align': 'center',
                'color': 'rgba(255, 255, 255, 0.8)'
            });
            
            fallbackDiv.html(`
                <h3>Chart Data</h3>
                <p>${data.datasets.length} songs with chart history</p>
                <p>${data.labels.length} unique weeks</p>
                <p><em>Chart.js not available. Using fallback display.</em></p>
            `);
            
            container.append(fallbackDiv);
        }
        

        
        addFallbackChartContent(chartContent, chartData, chartHeight, chartWidth) {
            console.log('Adding fallback chart content');
            
            const fallbackContainer = $('<div class="fallback-chart"></div>');
            fallbackContainer.css({
                'position': 'absolute',
                'top': '0',
                'left': '0',
                'width': '100%',
                'height': '100%',
                'display': 'flex',
                'align-items': 'center',
                'justify-content': 'center',
                'color': 'rgba(255, 255, 255, 0.7)',
                'font-size': '1.2rem',
                'text-align': 'center',
                'padding': '2rem'
            });
            
            // Show basic song information
            let fallbackHtml = '<div>';
            fallbackHtml += '<h3>Chart Data Loaded</h3>';
            fallbackHtml += `<p>${chartData.songs.length} songs with chart history</p>`;
            fallbackHtml += `<p>${chartData.weeks.length} unique weeks</p>`;
            fallbackHtml += '<p><em>Line chart rendering issue detected. Check console for details.</em></p>';
            fallbackHtml += '</div>';
            
            fallbackContainer.html(fallbackHtml);
            chartContent.append(fallbackContainer);
        }
        
        // Old bar chart methods removed - now using line chart
        
        addEventListeners() {
            const self = this;
            
            // Line chart hover events
            this.container.on('mouseenter', 'circle', function(e) {
                const circle = $(this);
                const song = circle.data('song');
                const position = circle.data('position');
                const date = circle.data('date');
                
                self.showTooltip(e, {
                    song: song,
                    position: position,
                    date: date
                });
            });
            
            this.container.on('mouseleave', 'circle', function() {
                self.hideTooltip();
            });
            
            // Line click events
            this.container.on('click', 'path', function(e) {
                const path = $(this);
                const songName = path.closest('.song-line-container').find('circle').first().data('song');
                
                // Highlight the clicked line
                self.container.find('path').removeClass('active');
                path.addClass('active');
                
                console.log('Selected song:', songName);
            });
            
            // Scroll events for smooth animations
            this.container.find('.chart-scroll-container').on('scroll', function() {
                // Add scroll-based animations if needed
            });
        }
        
        showTooltip(event, data) {
            if (!this.tooltip) return;
            
            const tooltipContent = `
                <div class="tooltip-title">${data.song}</div>
                <div class="tooltip-detail"><strong>Position:</strong> #${data.position}</div>
                <div class="tooltip-detail"><strong>Date:</strong> ${data.date}</div>
            `;
            
            this.tooltip.html(tooltipContent).addClass('show');
            
            // Position tooltip
            const offset = this.container.offset();
            const x = event.pageX - offset.left + 15;
            const y = event.pageY - offset.top - this.tooltip.outerHeight() - 10;
            
            this.tooltip.css({
                'left': offset.left + x + 'px',
                'top': offset.top + y + 'px'
            });
        }
        
        hideTooltip() {
            if (this.tooltip) {
                this.tooltip.removeClass('show');
            }
        }
        
        showError(message) {
            this.container.find('.chart-loading').html(`
                <div style="color: #ff6b6b; padding: 2rem;">
                    <strong>Error:</strong> ${message}
                </div>
            `);
        }
        
        destroy() {
            if (this.tooltip) {
                this.tooltip.remove();
                this.tooltip = null;
            }
            
            this.container.off('mouseenter mouseleave click', 'circle path');
            this.container.find('.chart-scroll-container').off('scroll');
        }
    }
    
    // Initialize charts when DOM is ready
    $(document).ready(function() {
        $('.urban-top-40-artist-chart').each(function() {
            new ArtistChart($(this));
        });
    });
    
    // Re-initialize charts for dynamic content (like AJAX-loaded content)
    $(document).on('urban-top-40-charts-ready', function() {
        $('.urban-top-40-artist-chart:not(.initialized)').each(function() {
            $(this).addClass('initialized');
            new ArtistChart($(this));
        });
    });
    
    // Cleanup on page unload
    $(window).on('beforeunload', function() {
        $('.urban-top-40-artist-chart').each(function() {
            const chart = $(this).data('artist-chart');
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
    });
    
})(jQuery);
