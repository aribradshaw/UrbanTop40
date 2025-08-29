/**
 * ChartScrollbar - Clean Rebuild
 * Simple, working scrollbar for chart navigation
 */

(function($) {
    'use strict';

class ChartScrollbar {
    constructor(container, chartInstance) {
        this.container = container;
        this.chartInstance = chartInstance;
        this.scrollbar = null;
        this.track = null;
        this.thumb = null;
        this.isDragging = false;
        this.startX = 0;
        this.startLeft = 0;
        
        this.init();
    }
    
    init() {
        this.createScrollbar();
        this.bindEvents();
    }
    
    createScrollbar() {
        const chartContainer = this.container.find('#chart-container');
        
        // Add scrollbar below chart
        this.scrollbar = $(`
            <div class="chart-scrollbar">
                <div class="scrollbar-track">
                    <div class="scrollbar-thumb"></div>
                </div>
            </div>
        `);
        
        chartContainer.after(this.scrollbar);
        
        // Store references to elements
        this.track = this.scrollbar.find('.scrollbar-track');
        this.thumb = this.scrollbar.find('.scrollbar-thumb');
        
        // Initialize thumb size and position
        this.updateThumbPosition(0);
    }
    
    bindEvents() {
        // Mouse events
        this.thumb.on('mousedown', (e) => this.startDrag(e));
        $(document).on('mousemove', (e) => this.drag(e));
        $(document).on('mouseup', () => this.stopDrag());
        
        // Touch events
        this.thumb.on('touchstart', (e) => this.startDrag(e));
        $(document).on('touchmove', (e) => this.drag(e));
        $(document).on('touchend', () => this.stopDrag());
        
        // Click on track to jump
        this.track.on('click', (e) => this.jumpToPosition(e));
    }
    
    startDrag(e) {
        e.preventDefault();
        this.isDragging = true;
        
        const clientX = e.type === 'mousedown' ? e.clientX : e.touches[0].clientX;
        this.startX = clientX;
        
        this.startLeft = parseInt(this.thumb.css('left')) || 0;
        
        this.container.addClass('dragging');
    }
    
    drag(e) {
        if (!this.isDragging) return;
        e.preventDefault();
        
        const clientX = e.type === 'mousemove' ? e.clientX : e.touches[0].clientX;
        const deltaX = clientX - this.startX;
        const newLeft = Math.max(0, Math.min(100, this.startLeft + deltaX));
        
        this.updateThumbPosition(newLeft);
        this.updateChartPosition(newLeft);
    }
    
    stopDrag() {
        this.isDragging = false;
        this.container.removeClass('dragging');
    }
    
    jumpToPosition(e) {
        const trackRect = this.track[0].getBoundingClientRect();
        const clickX = e.clientX - trackRect.left;
        const percentage = (clickX / trackRect.width) * 100;
        
        this.updateThumbPosition(percentage);
        this.updateChartPosition(percentage);
    }
    
    updateThumbPosition(percentage) {
        if (!this.thumb) return;
        
        // Calculate thumb size based on visible range vs total range
        if (this.chartInstance && this.chartInstance.chartCore) {
            const chartCore = this.chartInstance.chartCore;
            const totalWeeks = chartCore.allDates.length;
            const visibleWeeks = chartCore.visibleWeeks || 10;
            
            // Calculate thumb width as percentage of visible weeks vs total weeks
            const thumbWidth = Math.max(10, (visibleWeeks / totalWeeks) * 100);
            
            // Ensure thumb doesn't get too small
            const minThumbWidth = 20; // pixels
            const trackWidth = this.track.width();
            const thumbWidthPx = Math.max(minThumbWidth, (thumbWidth / 100) * trackWidth);
            
            // Update thumb size
            this.thumb.css('width', thumbWidthPx + 'px');
            
            // Calculate thumb position
            const maxPosition = trackWidth - thumbWidthPx;
            const position = (percentage / 100) * maxPosition;
            
            // Update thumb position
            this.thumb.css('left', position + 'px');
        }
    }
    
    updateChartPosition(percentage) {
        if (this.chartInstance && this.chartInstance.chartCore) {
            const chartCore = this.chartInstance.chartCore;
            const totalWeeks = chartCore.allDates.length;
            const visibleWeeks = chartCore.visibleWeeks;
            const maxStartWeek = Math.max(0, totalWeeks - visibleWeeks);
            
            // Calculate which week to start from based on scrollbar position
            const startWeek = Math.round((percentage / 100) * maxStartWeek);
            
            // Get the start and end dates for this week range
            const startDate = new Date(chartCore.allDates[startWeek]);
            const endWeek = Math.min(startWeek + visibleWeeks, totalWeeks);
            const endDate = new Date(chartCore.allDates[endWeek - 1]);
            
            // Update the chart to show the new week range
            if (chartCore.chart) {
                chartCore.chart.options.scales.x.min = startDate;
                chartCore.chart.options.scales.x.max = endDate;
                chartCore.chart.update('none');
            }
            
            // Update the week indicator
            if (this.chartInstance.updateWeekIndicator) {
                this.chartInstance.updateWeekIndicator();
            }
        }
    }
    
    destroy() {
        if (this.scrollbar) {
            this.scrollbar.remove();
            this.scrollbar = null;
        }
        
        // Remove event listeners
        $(document).off('mousemove mouseup touchmove touchend');
    }
}

// Make ChartScrollbar available globally
window.ChartScrollbar = ChartScrollbar;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChartScrollbar;
}

})(jQuery);
