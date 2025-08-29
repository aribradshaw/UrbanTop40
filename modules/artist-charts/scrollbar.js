/**
 * Chart Scrollbar Module
 * 
 * Simple, working scrollbar for chart navigation
 */

(function($) {
    'use strict';

class ChartScrollbar {
    constructor(container, chartInstance) {
        this.container = container;
        this.chartInstance = chartInstance;
        this.scrollbar = null;
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
        
        // Position thumb at start
        this.updateThumbPosition(0);
    }
    
    bindEvents() {
        const thumb = this.scrollbar.find('.scrollbar-thumb');
        const track = this.scrollbar.find('.scrollbar-track');
        
        // Mouse events
        thumb.on('mousedown', (e) => this.startDrag(e));
        $(document).on('mousemove', (e) => this.drag(e));
        $(document).on('mouseup', () => this.stopDrag());
        
        // Touch events
        thumb.on('touchstart', (e) => this.startDrag(e));
        $(document).on('touchmove', (e) => this.drag(e));
        $(document).on('touchend', () => this.stopDrag());
        
        // Click on track to jump
        track.on('click', (e) => this.jumpToPosition(e));
    }
    
    startDrag(e) {
        e.preventDefault();
        this.isDragging = true;
        
        const clientX = e.type === 'mousedown' ? e.clientX : e.touches[0].clientX;
        this.startX = clientX;
        
        const thumb = this.scrollbar.find('.scrollbar-thumb');
        this.startLeft = parseInt(thumb.css('left')) || 0;
        
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
        const track = $(e.currentTarget);
        const trackRect = track[0].getBoundingClientRect();
        const clickX = e.clientX - trackRect.left;
        const percentage = (clickX / trackRect.width) * 100;
        
        this.updateThumbPosition(percentage);
        this.updateChartPosition(percentage);
    }
    
    updateThumbPosition(percentage) {
        const thumb = this.scrollbar.find('.scrollbar-thumb');
        thumb.css('left', percentage + '%');
    }
    
    updateChartPosition(percentage) {
        // Update chart position based on scrollbar position
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
