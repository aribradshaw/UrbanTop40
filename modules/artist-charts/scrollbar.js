/**
 * Chart Scrollbar Module
 * 
 * Handles all scrollbar functionality for the artist charts
 */

// Wrap in function to ensure jQuery is available
(function($) {
    'use strict';

class ChartScrollbar {
    constructor(container, chartInstance) {
        this.container = container;
        this.chartInstance = chartInstance;
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
        const scrollbar = $(`
            <div class="chart-scrollbar">
                <div class="scrollbar-track">
                    <div class="scrollbar-thumb" style="left: ${this.getScrollbarPosition()}%"></div>
                </div>
            </div>
        `);
        chartContainer.after(scrollbar);
    }
    
    bindEvents() {
        const scrollbar = this.container.find('.chart-scrollbar');
        const track = scrollbar.find('.scrollbar-track');
        const thumb = scrollbar.find('.scrollbar-thumb');
        
        // Mouse events for desktop
        thumb.on('mousedown', (e) => {
            e.preventDefault();
            this.isDragging = true;
            this.startX = e.clientX;
            this.startLeft = parseFloat(thumb.css('left')) || 0;
            
            thumb.css('cursor', 'grabbing');
            thumb.addClass('dragging');
            document.body.style.userSelect = 'none';
        });
        
        track.on('mousedown', (e) => {
            if (e.target === track[0]) {
                e.preventDefault();
                this.handleScrollbarClick(e);
            }
        });
        
        $(document).on('mousemove', (e) => {
            if (this.isDragging) {
                e.preventDefault();
                this.handleScrollbarDrag(e);
            }
        });
        
        $(document).on('mouseup', () => {
            if (this.isDragging) {
                this.isDragging = false;
                thumb.css('cursor', 'grab');
                thumb.removeClass('dragging');
                document.body.style.userSelect = '';
            }
        });
        
        // Touch events for mobile/trackpad
        thumb.on('touchstart', (e) => {
            e.preventDefault();
            this.isDragging = true;
            const touch = e.originalEvent.touches[0];
            this.startX = touch.clientX;
            this.startLeft = parseFloat(thumb.css('left')) || 0;
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
            if (this.isDragging) {
                e.preventDefault();
                const touch = e.originalEvent.touches[0];
                this.handleScrollbarTouchDrag(touch);
            }
        });
        
        $(document).on('touchend', () => {
            if (this.isDragging) {
                this.isDragging = false;
                thumb.removeClass('dragging');
            }
        });
    }
    
    handleScrollbarClick(e) {
        const track = this.container.find('.scrollbar-track');
        const trackRect = track[0].getBoundingClientRect();
        const clickX = e.clientX - trackRect.left;
        const trackWidth = trackRect.width;
        
        const thumbWidth = 60;
        const thumbWidthPercent = (thumbWidth / trackWidth) * 100;
        let percentage = (clickX / trackWidth) * 100;
        
        percentage = Math.max(thumbWidthPercent / 2, Math.min(100 - thumbWidthPercent / 2, percentage));
        this.chartInstance.setScrollbarPosition(percentage);
    }
    
    handleScrollbarDrag(e) {
        const track = this.container.find('.scrollbar-track');
        const trackRect = track[0].getBoundingClientRect();
        const dragX = e.clientX - trackRect.left;
        const trackWidth = trackRect.width;
        
        const percentage = Math.max(0, Math.min(100, (dragX / trackWidth) * 100));
        this.chartInstance.setScrollbarPosition(percentage);
    }
    
    handleScrollbarTouchClick(touch) {
        const track = this.container.find('.scrollbar-track');
        const trackRect = track[0].getBoundingClientRect();
        const clickX = touch.clientX - trackRect.left;
        const trackWidth = trackRect.width;
        
        const thumbWidth = 60;
        const thumbWidthPercent = (thumbWidth / trackWidth) * 100;
        let percentage = (clickX / trackWidth) * 100;
        
        percentage = Math.max(thumbWidthPercent / 2, Math.min(100 - thumbWidthPercent / 2, percentage));
        this.chartInstance.setScrollbarPosition(percentage);
    }
    
    handleScrollbarTouchDrag(touch) {
        const track = this.container.find('.scrollbar-track');
        const trackRect = track[0].getBoundingClientRect();
        const dragX = touch.clientX - trackRect.left;
        const trackWidth = trackRect.width;
        
        const percentage = Math.max(0, Math.min(100, (dragX / trackWidth) * 100));
        this.chartInstance.setScrollbarPosition(percentage);
    }
    
    updatePosition() {
        const scrollbarThumb = this.container.find('.scrollbar-thumb');
        if (scrollbarThumb.length) {
            const position = this.chartInstance.getScrollbarPosition();
            scrollbarThumb.css('left', position + '%');
        }
    }
    
    getScrollbarPosition() {
        return this.chartInstance.getScrollbarPosition();
    }
}

// Make ChartScrollbar available globally
window.ChartScrollbar = ChartScrollbar;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChartScrollbar;
}

})(jQuery);
