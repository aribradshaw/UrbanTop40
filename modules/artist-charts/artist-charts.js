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
            this.updateTimeout = null; // For debouncing chart updates
            
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
            
            // Handle window resize to prevent Chart.js errors
            $(window).on('resize', () => {
                if (this.chart) {
                    this.chart.resize();
                }
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
                                    const point = context.raw;
                                    
                                    if (point && point.isGap) {
                                        return `${songName}: ${point.gapWeeks} week gap`;
                                    } else {
                                        const position = context.parsed.y;
                                        return `${songName}: #${position}`;
                                    }
                                }
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
                                maxRotation: 45,
                                callback: (value, index, ticks) => {
                                    // Check if this tick corresponds to a gap label
                                    const date = new Date(value);
                                    const gapLabel = this.findGapLabel(date);
                                    if (gapLabel) {
                                        return `${gapLabel.gapWeeks}w gap`;
                                    }
                                    // Format the date manually if no gap label
                                    return date.toLocaleDateString('en-US', { 
                                        month: 'short', 
                                        day: '2-digit', 
                                        year: 'numeric' 
                                    });
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
                            radius: (context) => {
                                const point = context.raw;
                                return point && point.skip ? 0 : 3; // Hide gap points
                            },
                            hoverRadius: (context) => {
                                const point = context.raw;
                                return point && point.skip ? 0 : 5; // Hide gap points on hover
                            }
                        },
                        line: {
                            tension: 0.1,
                            spanGaps: true // Connect lines but skip gap points
                        }
                    },
                    parsing: {
                        xAxisKey: 'x',
                        yAxisKey: 'y'
                    }
                }
            });
            
            // Add scrollbar and week indicator
            this.addScrollbarAndIndicator();
        }
        
        // ========================================
        // CHART DATA PREPARATION
        // ========================================
        
        /**
         * Prepare chart data with condensed X-axis
         * @returns {Object} Chart.js data object
         */
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
            
            // Find all significant gaps in the visible range
            const allSongEntries = [];
            this.chartData.songs.forEach(song => {
                allSongEntries.push(...song.chartHistory);
            });
            const gaps = this.findSignificantGaps(visibleDates, allSongEntries);
            
            // Create condensed X-axis that skips blank weeks
            const condensedAxis = this.createCondensedXAxis(visibleDates, gaps);
            
            // Create datasets for each song
            const datasets = [];
            const colors = [
                '#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336',
                '#00BCD4', '#FF5722', '#795548', '#607D8B', '#E91E63'
            ];
            
            this.chartData.songs.forEach((song, songIndex) => {
                const songData = this.createSongDataWithBreaks(song, condensedAxis);
                const color = colors[songIndex % colors.length];
                
                // Each song may have multiple datasets (separated by gaps)
                songData.forEach((dataset, datasetIndex) => {
                    if (dataset.length > 0) { // Only add non-empty datasets
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
            
            // Store the condensed X-axis for use in tick callbacks
            this.consolidatedXAxis = condensedAxis;
            
            return { datasets };
        }
        
        // ========================================
        // GAP DETECTION AND CONDENSATION
        // ========================================
        
        /**
         * Find all significant gaps in the chart data
         * @param {Array} allDates - All available dates
         * @param {Array} songEntries - Song chart entries
         * @returns {Array} Array of gap objects with start, end, and week count
         */
        findSignificantGaps(allDates, songEntries) {
            const gaps = [];
            const songDates = new Set(songEntries.map(e => e.date));
            
            let gapStart = null;
            let gapEnd = null;
            
            for (let i = 0; i < allDates.length; i++) {
                const currentDate = allDates[i];
                
                if (songDates.has(currentDate)) {
                    // We found a song entry, end any current gap
                    if (gapStart && gapEnd) {
                        const weekDiff = Math.round((new Date(gapEnd) - new Date(gapStart)) / (7 * 24 * 60 * 60 * 1000));
                        if (weekDiff > 2) { // Only significant gaps
                            gaps.push({
                                start: gapStart,
                                end: gapEnd,
                                weeks: weekDiff
                            });
                        }
                    }
                    gapStart = null;
                    gapEnd = null;
                } else {
                    // No song entry, start or continue gap
                    if (!gapStart) {
                        gapStart = currentDate;
                    }
                    gapEnd = currentDate;
                }
            }
            
            // Handle gap that extends to the end
            if (gapStart && gapEnd) {
                const weekDiff = Math.round((new Date(gapEnd) - new Date(gapStart)) / (7 * 24 * 60 * 60 * 1000));
                if (weekDiff > 2) {
                    gaps.push({
                        start: gapStart,
                        end: gapEnd,
                        weeks: weekDiff
                    });
                }
            }
            
            return gaps;
        }
        
        /**
         * Create condensed X-axis labels that skip blank weeks
         * @param {Array} allDates - All available dates
         * @param {Array} gaps - Significant gaps to condense
         * @returns {Array} Condensed X-axis with gap labels
         */
        createCondensedXAxis(allDates, gaps) {
            const condensedAxis = [];
            const gapStarts = new Set(gaps.map(g => g.start));
            
            for (let i = 0; i < allDates.length; i++) {
                const currentDate = allDates[i];
                
                if (gapStarts.has(currentDate)) {
                    // This is the start of a gap, add a gap label
                    const gap = gaps.find(g => g.start === currentDate);
                    condensedAxis.push({
                        x: new Date(currentDate),
                        isGap: true,
                        gapWeeks: gap.weeks,
                        label: `${gap.weeks}w gap`
                    });
                } else {
                    // Check if this date has any song data
                    const hasSongData = this.chartData.songs.some(song => 
                        song.chartHistory.some(entry => entry.date === currentDate)
                    );
                    
                    if (hasSongData) {
                        // This date has song data, include it
                        condensedAxis.push({
                            x: new Date(currentDate),
                            isGap: false
                        });
                    }
                    // If no song data and not a gap start, skip it entirely
                }
            }
            
            return condensedAxis;
        }
        
        /**
         * Create song data with proper line breaks at gaps
         * @param {Object} song - Song object
         * @param {Array} condensedAxis - Condensed X-axis data
         * @returns {Array} Array of datasets (one per line segment)
         */
        createSongDataWithBreaks(song, condensedAxis) {
            const datasets = [];
            let currentDataset = [];
            
            for (let i = 0; i < condensedAxis.length; i++) {
                const axisPoint = condensedAxis[i];
                
                if (axisPoint.isGap) {
                    // End current dataset and start fresh
                    if (currentDataset.length > 0) {
                        datasets.push(currentDataset);
                        currentDataset = [];
                    }
                    // Skip gap points entirely
                    continue;
                }
                
                // Check if this date has chart data for this song
                const entry = song.chartHistory.find(e => e.date === axisPoint.x.toISOString().split('T')[0]);
                
                if (entry) {
                    // Add the actual chart entry
                    currentDataset.push({
                        x: axisPoint.x,
                        y: entry.position
                    });
                }
            }
            
            // Add the final dataset if it has data
            if (currentDataset.length > 0) {
                datasets.push(currentDataset);
            }
            
            return datasets;
        }
        
        updateStats() {
            if (!this.chartData) return;
            
            this.container.find('#song-count').text(`${this.chartData.totalSongs} Songs`);
            
            // Calculate number of #1 hits
            let numberOnes = 0;
            this.chartData.songs.forEach(song => {
                const peakPosition = Math.min(...song.chartHistory.map(e => e.position));
                if (peakPosition === 1) {
                    numberOnes++;
                }
            });
            
            this.container.find('#week-count').text(`${numberOnes} Number Ones`);
        }
        
        handleZoom(e) {
            console.log('Zoom event:', e.originalEvent.deltaY);
            const delta = e.originalEvent.deltaY > 0 ? 1.1 : 0.9; // Inverted: scroll up = zoom out, scroll down = zoom in
            const newVisibleWeeks = Math.round(this.visibleWeeks * delta);
            
            // Clamp between 5 and total available weeks
            this.visibleWeeks = Math.max(5, Math.min(this.allDates.length, newVisibleWeeks));
            
            // Adjust startWeek if we're zooming out and would go beyond available data
            const maxStartWeek = Math.max(0, this.allDates.length - this.visibleWeeks);
            if (this.startWeek > maxStartWeek) {
                this.startWeek = maxStartWeek;
            }
            
            console.log(`Zoom: ${this.visibleWeeks} -> ${newVisibleWeeks} weeks, startWeek: ${this.startWeek}`);
            
            // Update the chart with new data
            this.updateChartData();
        }
        
        updateChartData() {
            if (!this.chart || !this.chartData) return;
            
            // Clear any pending update
            if (this.updateTimeout) {
                clearTimeout(this.updateTimeout);
            }
            
            // Debounce the update to prevent rapid changes
            this.updateTimeout = setTimeout(() => {
                this._performChartUpdate();
            }, 50); // 50ms delay
        }
        
        // ========================================
        // CHART UPDATE METHODS
        // ========================================
        
        /**
         * Update chart data when zooming or panning
         */
        _performChartUpdate() {
            try {
                // Get the visible date range based on startWeek and visibleWeeks
                const endWeek = Math.min(this.startWeek + this.visibleWeeks, this.allDates.length);
                const visibleDates = this.allDates.slice(this.startWeek, endWeek);
                
                // Validate that we have valid dates
                if (!visibleDates || visibleDates.length === 0) {
                    console.warn('No visible dates available for chart update');
                    return;
                }
                
                // Find all significant gaps in the visible range
                const allSongEntries = [];
                this.chartData.songs.forEach(song => {
                    allSongEntries.push(...song.chartHistory);
                });
                const gaps = this.findSignificantGaps(visibleDates, allSongEntries);
                
                // Create condensed X-axis that skips blank weeks
                const condensedAxis = this.createCondensedXAxis(visibleDates, gaps);
                
                // Create new datasets with proper data validation
                const newDatasets = [];
                const colors = [
                    '#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336',
                    '#00BCD4', '#FF5722', '#795548', '#607D8B', '#E91E63'
                ];
                
                this.chartData.songs.forEach((song, songIndex) => {
                    const songData = this.createSongDataWithBreaks(song, condensedAxis);
                    const color = colors[songIndex % colors.length];
                    
                    // Each song may have multiple datasets (separated by gaps)
                    songData.forEach((dataset, datasetIndex) => {
                        if (dataset.length > 0) { // Only add non-empty datasets
                            newDatasets.push({
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
                
                // Store the condensed X-axis for use in tick callbacks
                this.consolidatedXAxis = condensedAxis;
                
                // Update the chart with new data
                this.chart.data.datasets = newDatasets;
                this.chart.data.labels = this.consolidatedXAxis;
                
                // Use a more stable update method
                this.chart.update('none');
                
            } catch (error) {
                console.error('Error updating chart data:', error);
                // Fallback: recreate the chart if update fails
                this.renderChart();
            }
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
        
        /**
         * Find gap label for a specific date
         * @param {Date} date - Date to check for gap label
         * @returns {Object|null} Gap label object or null
         */
        findGapLabel(date) {
            if (!this.consolidatedXAxis) return null;
            
            // Find gap label in the condensed X-axis
            const gapLabel = this.consolidatedXAxis.find(label => {
                if (label && label.isGap && label.x) {
                    return Math.abs(label.x - date) < (24 * 60 * 60 * 1000);
                }
                return false;
            });
            
            return gapLabel || null;
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
            
            console.log(`Scrollbar click: clickX=${clickX}, trackWidth=${trackWidth}, percentage=${percentage}, adjusted=${percentage}`);
            this.setScrollbarPosition(percentage);
        }
        
        handleScrollbarDrag(e, startX, startLeft) {
            const track = this.container.find('.scrollbar-track');
            const trackRect = track[0].getBoundingClientRect();
            const dragX = e.clientX - trackRect.left;
            const trackWidth = trackRect.width;
            
            const percentage = Math.max(0, Math.min(100, (dragX / trackWidth) * 100));
            console.log(`Scrollbar drag: dragX=${dragX}, trackWidth=${trackWidth}, percentage=${percentage}`);
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
            const newStartWeek = Math.round((percentage / 100) * maxStartWeek);
            const clampedStartWeek = Math.max(0, Math.min(maxStartWeek, newStartWeek));
            
            if (clampedStartWeek !== this.startWeek) {
                console.log(`Setting scrollbar position: ${percentage}% -> week ${clampedStartWeek}`);
                this.startWeek = clampedStartWeek;
                
                // Update the chart data
                this.updateChartData();
                
                // Update the week indicator and scrollbar position
                this.updateScrollbarPosition();
            }
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
        
        // Cleanup method to prevent memory leaks
        destroy() {
            if (this.updateTimeout) {
                clearTimeout(this.updateTimeout);
                this.updateTimeout = null;
            }
            
            if (this.chart) {
                this.chart.destroy();
                this.chart = null;
            }
            
            // Remove event listeners
            this.container.off();
            $(document).off('mousemove mousemove touchmove touchend');
            $(window).off('resize');
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
