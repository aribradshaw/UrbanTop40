/**
 * Artist Charts JavaScript
 * 
 * Handles chart visualization for artist Billboard chart history
 */

(function($) {
    'use strict';
    
    class ArtistCharts {
        constructor(container) {
            this.container = container;
            this.artist = container.data('artist');
            this.chartData = null;
            this.chart = null;
            this.visibleWeeks = 10; // Default to first 10 weeks
            this.startWeek = 0; // Which week to start from (for panning)
            this.allDates = [];
            
            this.init();
        }
        
        init() {
            this.loadArtistData();
            this.bindEvents();
        }
        
        bindEvents() {
            console.log('Binding events for artist charts');
            
            // Combined wheel event handler for zoom and horizontal scrolling
            this.container.on('wheel', '.chart-area', (e) => {
                console.log('Wheel event detected');
                e.preventDefault();
                
                if (e.shiftKey) {
                    // Shift + wheel = horizontal scrolling/panning
                    console.log('Shift+wheel detected - horizontal scroll');
                    this.handleHorizontalScroll(e);
                } else {
                    // Regular wheel = zoom
                    console.log('Regular wheel detected - zoom');
                    this.handleZoom(e);
                }
            });
            
            // Handle horizontal trackpad scrolling (deltaX)
            this.container.on('wheel', '.chart-area', (e) => {
                if (Math.abs(e.originalEvent.deltaX) > Math.abs(e.originalEvent.deltaY)) {
                    console.log('Horizontal trackpad scroll detected');
                    e.preventDefault();
                    this.handleTrackpadHorizontalScroll(e);
                }
            });
            
            // Error retry
            this.container.on('click', '.error-retry', () => {
                this.loadArtistData();
            });
        }
        
        async loadArtistData() {
            this.showLoading();
            this.hideError();
            this.hideContent();
            
            try {
                const response = await $.ajax({
                    url: artistChartsAjax.ajaxurl,
                    type: 'POST',
                    data: {
                        action: 'get_artist_charts',
                        artist: this.artist,
                        nonce: artistChartsAjax.nonce
                    }
                });
                
                if (response.success) {
                    this.chartData = response.data;
                    this.renderChart();
                    this.updateStats();
                    this.showContent();
                } else {
                    throw new Error(response.data);
                }
            } catch (error) {
                console.error('Error loading artist data:', error);
                this.showError(error.message || 'Failed to load artist data');
            } finally {
                this.hideLoading();
            }
        }
        
        renderChart() {
            if (!this.chartData) return;
            
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
                        },
                        customGapRenderer: {
                            id: 'customGapRenderer',
                            afterDraw: (chart) => {
                                const ctx = chart.ctx;
                                
                                chart.data.datasets.forEach((dataset, datasetIndex) => {
                                    const meta = chart.getDatasetMeta(datasetIndex);
                                    if (!meta.data) return;
                                    
                                    meta.data.forEach((point, index) => {
                                        const dataPoint = dataset.data[index];
                                        if (dataPoint && dataPoint.isGap) {
                                            // Draw gap label
                                            ctx.save();
                                            ctx.font = '12px Arial';
                                            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                                            ctx.textAlign = 'center';
                                            ctx.textBaseline = 'middle';
                                            
                                            const x = point.x;
                                            const y = point.y;
                                            
                                            // Draw background for text
                                            const text = `${dataPoint.gapWeeks}w`;
                                            const textMetrics = ctx.measureText(text);
                                            const padding = 4;
                                            
                                            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                                            ctx.fillRect(
                                                x - textMetrics.width/2 - padding,
                                                y - 8 - padding,
                                                textMetrics.width + padding * 2,
                                                16 + padding * 2
                                            );
                                            
                                            // Draw text
                                            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                                            ctx.fillText(text, x, y - 8);
                                            ctx.restore();
                                        }
                                    });
                                });
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
                                maxRotation: 45
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
                                return point && point.isGap ? 0 : 3; // Hide gap points
                            },
                            hoverRadius: (context) => {
                                const point = context.raw;
                                return point && point.isGap ? 0 : 5; // Hide gap points on hover
                            }
                        },
                        line: {
                            tension: 0.1,
                            spanGaps: false // Don't connect lines across gaps
                        }
                    }
                }
            });
            
            // Add scrollbar and week indicator
            this.addScrollbarAndIndicator();
        }
        
        prepareChartData() {
            if (!this.chartData || !this.chartData.songs) return { datasets: [] };
            
            // Get all unique dates and sort them
            this.allDates = new Set();
            this.chartData.songs.forEach(song => {
                song.chartHistory.forEach(entry => {
                    this.allDates.add(entry.date);
                });
            });
            
            this.allDates = Array.from(this.allDates).sort();
            
            // Get the visible date range based on startWeek and visibleWeeks
            const endWeek = Math.min(this.startWeek + this.visibleWeeks, this.allDates.length);
            const visibleDates = this.allDates.slice(this.startWeek, endWeek);
            
            // Create datasets for each song
            const datasets = this.chartData.songs.map((song, index) => {
                const colors = [
                    '#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336',
                    '#00BCD4', '#FF5722', '#795548', '#607D8B', '#E91E63'
                ];
                
                const data = this.createSongDataWithBreaks(song, visibleDates);
                
                return {
                    label: song.song,
                    data: data,
                    borderColor: colors[index % colors.length],
                    backgroundColor: colors[index % colors.length],
                    borderWidth: 2,
                    fill: false,
                    tension: 0.1
                };
            });
            
            return { datasets };
        }
        
        createSongDataWithBreaks(song, visibleDates) {
            const data = [];
            let lastEntry = null;
            
            for (let i = 0; i < visibleDates.length; i++) {
                const currentDate = visibleDates[i];
                const entry = song.chartHistory.find(e => e.date === currentDate);
                
                if (entry) {
                    // Add the actual chart entry
                    data.push({
                        x: new Date(currentDate),
                        y: entry.position
                    });
                    lastEntry = entry;
                } else if (lastEntry) {
                    // Check if this is a significant gap (more than 2 weeks)
                    const lastDate = new Date(lastEntry.date);
                    const currentDateObj = new Date(currentDate);
                    const weekDiff = Math.round((currentDateObj - lastDate) / (7 * 24 * 60 * 60 * 1000));
                    
                    if (weekDiff > 2) {
                        // Add a null point to break the line connection
                        data.push(null);
                        
                        // Add a gap label point
                        data.push({
                            x: new Date(currentDate),
                            y: lastEntry.position,
                            isGap: true,
                            gapWeeks: weekDiff
                        });
                    }
                }
            }
            
            // Remove any trailing gap points to prevent horizontal lines extending beyond data
            while (data.length > 0 && data[data.length - 1] && data[data.length - 1].isGap) {
                data.pop();
            }
            
            return data;
        }
        
        updateStats() {
            if (!this.chartData) return;
            
            this.container.find('#song-count').text(`${this.chartData.totalSongs} Songs`);
            
            // Calculate total weeks
            const totalWeeks = this.allDates.length;
            this.container.find('#week-count').text(`${totalWeeks} Weeks`);
        }
        
        handleZoom(e) {
            console.log('Zoom event:', e.originalEvent.deltaY);
            const delta = e.originalEvent.deltaY > 0 ? 1.1 : 0.9; // Inverted: scroll up = zoom out, scroll down = zoom in
            const newVisibleWeeks = Math.round(this.visibleWeeks * delta);
            
            // Clamp between 5 and total available weeks
            this.visibleWeeks = Math.max(5, Math.min(this.allDates.length, newVisibleWeeks));
            
            console.log(`Zoom: ${this.visibleWeeks} -> ${newVisibleWeeks} weeks`);
            
            // Update the chart with new data
            this.updateChartData();
        }
        
        updateChartData() {
            if (!this.chart || !this.chartData) return;
            
            // Get the visible date range based on startWeek and visibleWeeks
            const endWeek = Math.min(this.startWeek + this.visibleWeeks, this.allDates.length);
            const visibleDates = this.allDates.slice(this.startWeek, endWeek);
            
            // Update each dataset with new data
            this.chart.data.datasets.forEach((dataset, datasetIndex) => {
                const song = this.chartData.songs[datasetIndex];
                if (song) {
                    dataset.data = this.createSongDataWithBreaks(song, visibleDates);
                }
            });
            
            // Update the chart
            this.chart.update('none');
        }
        
        handleHorizontalScroll(e) {
            console.log('Horizontal scroll event:', e.originalEvent.deltaY);
            const delta = e.originalEvent.deltaY > 0 ? 1 : -1;
            const scrollAmount = Math.max(1, Math.floor(this.visibleWeeks / 4)); // Scroll by 1/4 of visible weeks
            
            // Calculate new start week
            let newStartWeek = this.startWeek + (delta * scrollAmount);
            
            // Clamp to valid range
            const maxStartWeek = Math.max(0, this.allDates.length - this.visibleWeeks);
            newStartWeek = Math.max(0, Math.min(maxStartWeek, newStartWeek));
            
            if (newStartWeek !== this.startWeek) {
                console.log(`Horizontal scroll: ${this.startWeek} -> ${newStartWeek}`);
                this.startWeek = newStartWeek;
                this.updateChartData();
                this.updateScrollbarPosition();
            }
        }
        
        handleTrackpadHorizontalScroll(e) {
            console.log('Trackpad horizontal scroll event:', e.originalEvent.deltaX);
            const delta = e.originalEvent.deltaX > 0 ? -1 : 1; // Invert for natural feel
            const scrollAmount = Math.max(1, Math.floor(this.visibleWeeks / 8)); // Smaller increments for trackpad
            
            // Calculate new start week
            let newStartWeek = this.startWeek + (delta * scrollAmount);
            
            // Clamp to valid range
            const maxStartWeek = Math.max(0, this.allDates.length - this.visibleWeeks);
            newStartWeek = Math.max(0, Math.min(maxStartWeek, newStartWeek));
            
            if (newStartWeek !== this.startWeek) {
                console.log(`Trackpad horizontal scroll: ${this.startWeek} -> ${newStartWeek}`);
                this.startWeek = newStartWeek;
                this.updateChartData();
                this.updateScrollbarPosition();
            }
        }
        
        addScrollbarAndIndicator() {
            const chartContainer = this.container.find('#chart-container');
            
            // Add week indicator above chart
            const weekIndicator = $(`
                <div class="week-indicator">
                    <span class="week-range">Weeks ${this.startWeek + 1}-${Math.min(this.startWeek + this.visibleWeeks, this.allDates.length)} of ${this.allDates.length}</span>
                </div>
            `);
            chartContainer.before(weekIndicator);
            
            // Add scrollbar below chart
            const scrollbar = $(`
                <div class="chart-scrollbar">
                    <div class="scrollbar-track">
                        <div class="scrollbar-thumb" style="left: ${this.getScrollbarPosition()}%"></div>
                    </div>
                </div>
            `);
            chartContainer.after(scrollbar);
            
            // Make scrollbar draggable
            this.makeScrollbarDraggable();
        }
        
        updateScrollbarPosition() {
            const weekIndicator = this.container.find('.week-indicator .week-range');
            const scrollbarThumb = this.container.find('.scrollbar-thumb');
            
            if (weekIndicator.length) {
                weekIndicator.text(`Weeks ${this.startWeek + 1}-${Math.min(this.startWeek + this.visibleWeeks, this.allDates.length)} of ${this.allDates.length}`);
            }
            
            if (scrollbarThumb.length) {
                const position = this.getScrollbarPosition();
                console.log(`Scrollbar position: ${position}%, startWeek: ${this.startWeek}, visibleWeeks: ${this.visibleWeeks}, totalWeeks: ${this.allDates.length}`);
                scrollbarThumb.css('left', position + '%');
            }
        }
        
        getScrollbarPosition() {
            if (this.allDates.length <= this.visibleWeeks) return 0;
            const maxStartWeek = this.allDates.length - this.visibleWeeks;
            if (maxStartWeek <= 0) return 0;
            
            // Calculate position as a percentage of the scrollable area
            const position = (this.startWeek / maxStartWeek) * 100;
            
            // Ensure the position is within bounds and accounts for thumb width
            const thumbWidth = 60; // Width of scrollbar thumb in pixels
            const trackWidth = this.container.find('.scrollbar-track').width() || 400; // Fallback width
            const thumbWidthPercent = (thumbWidth / trackWidth) * 100;
            
            // Adjust position so thumb doesn't go beyond track boundaries
            return Math.max(0, Math.min(100 - thumbWidthPercent, position));
        }
        
        makeScrollbarDraggable() {
            const scrollbar = this.container.find('.chart-scrollbar');
            const track = scrollbar.find('.scrollbar-track');
            const thumb = scrollbar.find('.scrollbar-thumb');
            let isDragging = false;
            let startX = 0;
            let startLeft = 0;
            
            // Mouse events for desktop
            thumb.on('mousedown', (e) => {
                e.preventDefault();
                isDragging = true;
                startX = e.clientX;
                startLeft = parseFloat(thumb.css('left')) || 0;
                
                // Add grabbing cursor and dragging class
                thumb.css('cursor', 'grabbing');
                thumb.addClass('dragging');
                
                // Prevent text selection
                document.body.style.userSelect = 'none';
            });
            
            // Track click for jumping to position
            track.on('mousedown', (e) => {
                if (e.target === track[0]) {
                    e.preventDefault();
                    this.handleScrollbarClick(e);
                }
            });
            
            // Global mouse move and up events
            $(document).on('mousemove', (e) => {
                if (isDragging) {
                    e.preventDefault();
                    this.handleScrollbarDrag(e, startX, startLeft);
                }
            });
            
            $(document).on('mouseup', () => {
                if (isDragging) {
                    isDragging = false;
                    thumb.css('cursor', 'grab');
                    thumb.removeClass('dragging');
                    document.body.style.userSelect = '';
                }
            });
            
            // Touch events for mobile/trackpad
            thumb.on('touchstart', (e) => {
                e.preventDefault();
                isDragging = true;
                const touch = e.originalEvent.touches[0];
                startX = touch.clientX;
                startLeft = parseFloat(thumb.css('left')) || 0;
                
                // Add dragging class for visual feedback
                thumb.addClass('dragging');
            });
            
            track.on('touchstart', (e) => {
                if (e.target === track[0]) {
                    e.preventDefault();
                    const touch = e.originalEvent.touches[0];
                    this.handleScrollbarTouchClick(touch);
                }
            });
            
            $(document).on('touchmove', (e) => {
                if (isDragging) {
                    e.preventDefault();
                    const touch = e.originalEvent.touches[0];
                    this.handleScrollbarTouchDrag(touch, startX, startLeft);
                }
            });
            
            $(document).on('touchend', () => {
                if (isDragging) {
                    isDragging = false;
                    thumb.removeClass('dragging');
                }
            });
        }
        
        handleScrollbarClick(e) {
            const track = this.container.find('.scrollbar-track');
            const trackRect = track[0].getBoundingClientRect();
            const clickX = e.clientX - trackRect.left;
            const trackWidth = trackRect.width;
            
            // Calculate percentage and account for thumb width
            const thumbWidth = 60;
            const thumbWidthPercent = (thumbWidth / trackWidth) * 100;
            let percentage = (clickX / trackWidth) * 100;
            
            // Adjust percentage so clicking positions the thumb center at click point
            percentage = Math.max(thumbWidthPercent / 2, Math.min(100 - thumbWidthPercent / 2, percentage));
            
            console.log(`Scrollbar click: clickX=${clickX}, trackWidth=${trackWidth}, percentage=${percentage}`);
            this.setScrollbarPosition(percentage);
        }
        
        handleScrollbarDrag(e, startX, startLeft) {
            const track = this.container.find('.scrollbar-track');
            const trackRect = track[0].getBoundingClientRect();
            const dragX = e.clientX - trackRect.left;
            const trackWidth = trackRect.width;
            
            const percentage = Math.max(0, Math.min(100, (dragX / trackWidth) * 100));
            this.setScrollbarPosition(percentage);
        }

        handleScrollbarTouchClick(touch) {
            const track = this.container.find('.scrollbar-track');
            const trackRect = track[0].getBoundingClientRect();
            const clickX = touch.clientX - trackRect.left;
            const trackWidth = trackRect.width;

            // Calculate percentage and account for thumb width
            const thumbWidth = 60;
            const thumbWidthPercent = (thumbWidth / trackWidth) * 100;
            let percentage = (clickX / trackWidth) * 100;
            
            // Adjust percentage so touching positions the thumb center at touch point
            percentage = Math.max(thumbWidthPercent / 2, Math.min(100 - thumbWidthPercent / 2, percentage));
            
            console.log(`Scrollbar touch click: clickX=${clickX}, trackWidth=${trackWidth}, percentage=${percentage}`);
            this.setScrollbarPosition(percentage);
        }

        handleScrollbarTouchDrag(touch, startX, startLeft) {
            const track = this.container.find('.scrollbar-track');
            const trackRect = track[0].getBoundingClientRect();
            const dragX = touch.clientX - trackRect.left;
            const trackWidth = trackRect.width;

            const percentage = Math.max(0, Math.min(100, (dragX / trackWidth) * 100));
            this.setScrollbarPosition(percentage);
        }
        
        setScrollbarPosition(percentage) {
            if (this.allDates.length <= this.visibleWeeks) return;
            
            const maxStartWeek = this.allDates.length - this.visibleWeeks;
            this.startWeek = Math.round((percentage / 100) * maxStartWeek);
            this.startWeek = Math.max(0, Math.min(maxStartWeek, this.startWeek));
            
            this.updateChartData();
            this.updateScrollbarPosition();
        }
        
        showLoading() {
            this.container.find('.artist-charts-loading').show();
        }
        
        hideLoading() {
            this.container.find('.artist-charts-loading').hide();
        }
        
        showContent() {
            this.container.find('.artist-charts-content').show();
        }
        
        hideContent() {
            this.container.find('.artist-charts-content').hide();
        }
        
        showError(message) {
            this.container.find('.error-message').text(message);
            this.container.find('.artist-charts-error').show();
        }
        
        hideError() {
            this.container.find('.artist-charts-error').hide();
        }
    }
    
    class ArtistSongs {
        constructor(container) {
            this.container = container;
            this.artist = container.data('artist');
            this.chartData = null;
            
            this.init();
        }
        
        init() {
            this.loadArtistData();
            this.bindEvents();
        }
        
        bindEvents() {
            // Error retry
            this.container.on('click', '.error-retry', () => {
                this.loadArtistData();
            });
        }
        
        async loadArtistData() {
            this.showLoading();
            this.hideError();
            this.hideContent();
            
            try {
                const response = await $.ajax({
                    url: artistChartsAjax.ajaxurl,
                    type: 'POST',
                    data: {
                        action: 'get_artist_charts',
                        artist: this.artist,
                        nonce: artistChartsAjax.nonce
                    }
                });
                
                if (response.success) {
                    this.chartData = response.data;
                    this.renderSongLegend();
                    this.showContent();
                } else {
                    throw new Error(response.data);
                }
            } catch (error) {
                console.error('Error loading artist data:', error);
                this.showError(error.message || 'Failed to load artist data');
            } finally {
                this.hideLoading();
            }
        }
        
        renderSongLegend() {
            if (!this.chartData || !this.chartData.songs) return;
            
            const legendContainer = this.container.find('#song-legend');
            legendContainer.empty();
            
            const colors = [
                '#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336',
                '#00BCD4', '#FF5722', '#795548', '#607D8B', '#E91E63'
            ];
            
            this.chartData.songs.forEach((song, index) => {
                const color = colors[index % colors.length];
                const peakPosition = Math.min(...song.chartHistory.map(e => e.position));
                
                const legendItem = $(`
                    <div class="song-legend-item" style="border-left-color: ${color}">
                        <div class="song-legend-name">${song.song}</div>
                        <div class="song-legend-details">
                            Peak Rank: #${peakPosition}
                        </div>
                        <div class="song-legend-details">
                            Weeks On Chart: ${song.chartHistory.length}
                        </div>
                    </div>
                `);
                
                legendContainer.append(legendItem);
            });
        }
        
        showLoading() {
            this.container.find('.artist-songs-loading').show();
        }
        
        hideLoading() {
            this.container.find('.artist-songs-loading').hide();
        }
        
        showContent() {
            this.container.find('.artist-songs-content').show();
        }
        
        hideContent() {
            this.container.find('.artist-songs-content').hide();
        }
        
        showError(message) {
            this.container.find('.error-message').text(message);
            this.container.find('.artist-charts-error').show();
        }
        
        hideError() {
            this.container.find('.artist-charts-error').hide();
        }
    }
    
    // Initialize artist charts when DOM is ready
    $(document).ready(function() {
        console.log('DOM ready, waiting for Chart.js...');
        
        // Wait for Chart.js to be available
        const waitForChartJS = () => {
            if (typeof Chart !== 'undefined') {
                console.log('Chart.js found, initializing...');
                
                // Chart.js is available, initialize charts
                $('.artist-charts-container').each(function() {
                    console.log('Creating ArtistCharts instance');
                    new ArtistCharts($(this));
                });
                
                // Initialize artist songs
                $('.artist-songs-container').each(function() {
                    console.log('Creating ArtistSongs instance');
                    new ArtistSongs($(this));
                });
            } else {
                console.log('Chart.js not found, waiting...');
                // Wait a bit more and try again
                setTimeout(waitForChartJS, 100);
            }
        };
        
        // Start waiting for Chart.js
        waitForChartJS();
    });
    
})(jQuery);
