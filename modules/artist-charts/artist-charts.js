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
            
            // Calculate chart dimensions
            const chartHeight = parseInt(this.height);
            const weekCount = chartData.weeks.length;
            const chartWidth = Math.max(800, weekCount * 20); // 20px per week minimum
            
            console.log('Chart dimensions:', { chartHeight, weekCount, chartWidth });
            
            // Set chart dimensions
            chartContent.css({
                'min-width': chartWidth + 'px',
                'height': chartHeight + 'px',
                'position': 'relative'
            });
            
            // Add grid lines
            this.addGridLines(chartContent, chartHeight, chartWidth);
            
            // Add X-axis labels (weeks)
            this.addXAxisLabels(chartContent, chartData.weeks, chartWidth);
            
            // Draw song lines
            this.drawSongLines(chartContent, chartData, chartHeight, chartWidth);
            
            // Add legend
            if (this.showLegend) {
                this.addLegend(chartContent, chartData.songs);
            }
            
            // Add fallback content if no lines were drawn
            if (chartContent.find('.song-line-container').length === 0) {
                console.log('No song lines were drawn, adding fallback content');
                this.addFallbackChartContent(chartContent, chartData, chartHeight, chartWidth);
            }
        }
        
        addYAxisLabels(chartContent) {
            const yAxisLabels = $('<div class="y-axis-labels"></div>');
            
            // Add position labels (1, 25, 50, 75, 100)
            const positions = [1, 25, 50, 75, 100];
            positions.forEach(position => {
                const label = $(`<div class="y-axis-label">${position}</div>`);
                const yPos = ((101 - position) / 100) * 100; // Invert so 1 is at top
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
            if (weeks.length <= 10) {
                return weeks.map(week => ({ date: week, label: this.formatWeekLabel(week), showLabel: true }));
            }
            
            const labeledWeeks = [];
            const step = Math.ceil(weeks.length / 10);
            
            weeks.forEach((week, index) => {
                const showLabel = index % step === 0 || index === weeks.length - 1;
                let label = '';
                
                if (showLabel) {
                    label = this.formatWeekLabel(week);
                } else if (index > 0) {
                    // Check for gaps and add gap labels
                    const prevWeek = new Date(weeks[index - 1]);
                    const currentWeek = new Date(week);
                    const weekDiff = this.getWeekDifference(prevWeek, currentWeek);
                    
                    if (weekDiff > 2) {
                        label = `${weekDiff} week gap`;
                    }
                }
                
                labeledWeeks.push({
                    date: week,
                    label: label,
                    showLabel: showLabel || label.includes('gap')
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
                const yPos = ((101 - position) / 100) * chartHeight;
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
            console.log('Drawing song lines...');
            console.log('Chart data:', chartData);
            
            const linesContainer = $('<div class="song-lines"></div>');
            
            // Add a test SVG first to see if SVG rendering works
            const testSvg = $('<svg width="100" height="100" style="border: 2px solid red;"></svg>');
            const testRect = $('<rect x="10" y="10" width="80" height="80" fill="blue"></rect>');
            testSvg.append(testRect);
            linesContainer.append(testSvg);
            console.log('Added test SVG:', testSvg[0]);
            
            chartData.songs.forEach(song => {
                console.log(`Processing song: ${song.song} with ${song.data.length} data points`);
                if (song.data.length < 2) {
                    console.log(`Skipping ${song.song} - need at least 2 points for a line`);
                    return;
                }
                
                const line = this.createSongLine(song, chartData.weeks, chartHeight, chartWidth);
                linesContainer.append(line);
            });
            
            chartContent.append(linesContainer);
            console.log('Finished drawing song lines');
            console.log('Lines container HTML:', linesContainer.html());
            console.log('Chart content HTML:', chartContent.html());
        }
        
        createSongLine(song, weeks, chartHeight, chartWidth) {
            console.log(`Creating line for song: ${song.song} with ${song.data.length} data points`);
            
            const lineContainer = $('<div class="song-line-container"></div>');
            const svg = $(`<svg width="${chartWidth}" height="${chartHeight}" style="position: absolute; top: 0; left: 0;"></svg>`);
            
            // Create path for the line
            const path = $('<path></path>');
            let pathData = '';
            let validPoints = 0;
            
            song.data.forEach((point, index) => {
                const weekIndex = weeks.findIndex(w => w.date === point.date);
                if (weekIndex === -1) {
                    console.log(`Week not found for date: ${point.date}`);
                    return;
                }
                
                const x = (weekIndex / (weeks.length - 1)) * chartWidth;
                const y = ((101 - point.position) / 100) * chartHeight;
                
                console.log(`Point ${index}: date=${point.date}, position=${point.position}, x=${x}, y=${y}`);
                
                if (index === 0) {
                    pathData += `M ${x} ${y}`;
                } else {
                    pathData += ` L ${x} ${y}`;
                }
                validPoints++;
                
                // Add data point marker
                const marker = $(`<circle r="3" fill="${song.color}"></circle>`);
                marker.attr({
                    'cx': x,
                    'cy': y,
                    'data-song': song.song,
                    'data-position': point.position,
                    'data-date': point.date
                });
                svg.append(marker);
            });
            
            console.log(`Path data for ${song.song}: ${pathData}`);
            console.log(`Valid points: ${validPoints}`);
            
            if (validPoints > 1) {
                path.attr({
                    'd': pathData,
                    'stroke': song.color,
                    'stroke-width': '2',
                    'fill': 'none',
                    'stroke-dasharray': '5,5'
                });
                
                svg.append(path);
            }
            
            lineContainer.append(svg);
            return lineContainer;
        }
        
        addLegend(chartContent, songs) {
            const legendContainer = $('<div class="chart-legend"></div>');
            
            songs.forEach(song => {
                const legendItem = $(`
                    <div class="legend-item">
                        <span class="legend-color" style="background: ${song.color}"></span>
                        <span class="legend-text">${song.song}</span>
                    </div>
                `);
                legendContainer.append(legendItem);
            });
            
            chartContent.append(legendContainer);
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
