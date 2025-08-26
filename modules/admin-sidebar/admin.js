jQuery(document).ready(function($) {
    'use strict';
    
    let selectedPost = null;
    let socialCardCanvas = null;
    let canvasContext = null;
    
    // Initialize the main canvas as single source of truth
    function initializeCanvas() {
        socialCardCanvas = document.createElement('canvas');
        socialCardCanvas.width = 1080;
        socialCardCanvas.height = 1350;
        canvasContext = socialCardCanvas.getContext('2d');
        
        // Set canvas display properties
        socialCardCanvas.style.maxWidth = '100%';
        socialCardCanvas.style.height = 'auto';
        socialCardCanvas.style.borderRadius = '8px';
        socialCardCanvas.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
    }
    
    // Post selector change handler
    $('#post-selector').on('change', function() {
        const postId = $(this).val();
        const option = $(this).find('option:selected');
        
        if (postId) {
            selectedPost = {
                id: postId,
                title: option.data('title'),
                author: option.data('author'),
                date: option.data('date'),
                featuredImage: option.data('featured-image')
            };
            
            renderSocialCard();
            $('#generate-card').prop('disabled', false);
        } else {
            selectedPost = null;
            resetPreview();
            $('#generate-card').prop('disabled', true);
        }
    });
    
    // Generate card button handler
    $('#generate-card').on('click', function() {
        if (!selectedPost || !socialCardCanvas) {
            alert('Please select a post first.');
            return;
        }
        
        downloadSocialCard();
    });
    

    
    /**
     * Render the social card using the single source of truth canvas
     */
    function renderSocialCard() {
        if (!selectedPost || !canvasContext) {
            return;
        }
        
        // Clear canvas
        canvasContext.clearRect(0, 0, 1080, 1350);
        
        // Fill background
        canvasContext.fillStyle = '#E8BE3F';
        canvasContext.fillRect(0, 0, 1080, 1350);
        
        // Load and draw featured image
        if (selectedPost.featuredImage) {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = function() {
                drawFeaturedImage(img);
                drawLogo();
                drawText();
                updatePreview();
            };
            img.onerror = function() {
                // If image fails, just draw logo and text
                console.log('Featured image failed to load, continuing without it');
                drawLogo();
                drawText();
                updatePreview();
            };
            img.src = selectedPost.featuredImage;
        } else {
            // No image - just draw logo and text
            drawLogo();
            drawText();
            updatePreview();
        }
    }
    
    /**
     * Draw featured image with scale and position control
     */
    function drawFeaturedImage(img) {
        const canvasWidth = 1080;
        const canvasHeight = 1350;
        const imageScale = parseInt($('#image-scale-slider').val()) / 100 || 1;
        const imageYOffset = parseInt($('#image-y-position-slider').val()) || 0;
        
        // Calculate image dimensions to maintain aspect ratio
        const imgAspect = img.width / img.height;
        const canvasAspect = canvasWidth / canvasHeight;
        
        let drawWidth, drawHeight, drawX, drawY;
        
        if (imgAspect > canvasAspect) {
            // Image is wider - fit to height
            drawHeight = canvasHeight * imageScale;
            drawWidth = drawHeight * imgAspect;
            drawX = (canvasWidth - drawWidth) / 2;
            drawY = (canvasHeight - drawHeight) / 2 + imageYOffset;
        } else {
            // Image is taller - fit to width
            drawWidth = canvasWidth * imageScale;
            drawHeight = drawWidth / imgAspect;
            drawX = (canvasWidth - drawWidth) / 2;
            drawY = (canvasHeight - drawHeight) / 2 + imageYOffset;
        }
        
        // Draw image
        canvasContext.drawImage(img, drawX, drawY, drawWidth, drawHeight);
    }
    
    /**
     * Draw logo overlay
     */
    function drawLogo() {
        const logo = new Image();
        logo.crossOrigin = 'anonymous';
        logo.onload = function() {
            const logoSize = 120;
            const logoX = 1080 - logoSize - 30;
            const logoY = 30;
            canvasContext.drawImage(logo, logoX, logoY, logoSize, logoSize * (logo.height / logo.width));
        };
        logo.onerror = function() {
            // If logo fails, continue without it
            console.log('Logo failed to load, continuing without it');
        };
        logo.src = urbanTop40Ajax.plugin_url + 'assets/images/logo.png';
    }
    
    /**
     * Draw text with current slider values
     */
    function drawText() {
        const fontSize = parseInt($('#font-size-slider').val()) || 64;
        const yPosition = parseInt($('#y-position-slider').val()) || 950;
        
        // Draw text background overlay
        canvasContext.fillStyle = '#E8BE3F';
        canvasContext.fillRect(0, yPosition, 1080, 1350 - yPosition);
        
        // Draw title
        canvasContext.fillStyle = '#000';
        canvasContext.font = `900 ${fontSize}px Montserrat`;
        canvasContext.textAlign = 'center';
        canvasContext.textBaseline = 'top';
        
        const title = selectedPost.title.toUpperCase();
        const words = title.split(' ');
        let line = '';
        let y = yPosition + 40;
        const maxWidth = 1000;
        
        for (let i = 0; i < words.length; i++) {
            const testLine = line + words[i] + ' ';
            const metrics = canvasContext.measureText(testLine);
            const testWidth = metrics.width;
            
            if (testWidth > maxWidth && i > 0) {
                canvasContext.fillText(line, 540, y);
                line = words[i] + ' ';
                y += fontSize + 10;
            } else {
                line = testLine;
            }
        }
        canvasContext.fillText(line, 540, y);
        
        // Draw author and date
        y += fontSize + 30;
        canvasContext.font = '28px Zilla Slab';
        canvasContext.fillText(`By ${selectedPost.author} • ${selectedPost.date}`, 540, y);
    }
    
    /**
     * Update the preview area with the canvas
     */
    function updatePreview() {
        const preview = $('#social-card-preview');
        if (socialCardCanvas) {
            preview.html(socialCardCanvas);
            $('#generate-card').prop('disabled', false);
        }
    }
    
    /**
     * Reset the preview area
     */
    function resetPreview() {
        const preview = $('#social-card-preview');
        preview.html('<div class="urban-top-40-card-placeholder"><p>Select a post to see preview</p></div>');
        $('#generate-card').prop('disabled', true);
    }
    
    /**
     * Download the social card
     */
    function downloadSocialCard() {
        if (!socialCardCanvas) {
            return;
        }
        
        // Show loading state
        $('#generation-status').show();
        $('#generate-card').prop('disabled', true).text('Downloading...');
        
        // Convert canvas to blob and download
        socialCardCanvas.toBlob(function(blob) {
            // Create download link
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `urban-top-40-social-card-${selectedPost.id}-${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up
            URL.revokeObjectURL(url);
            
            // Hide loading state
            $('#generation-status').hide();
            $('#generate-card').prop('disabled', false).text('Download Social Card');
            
            showNotification('Social card downloaded successfully!', 'success');
        }, 'image/png');
    }
    
    /**
     * Show notification message
     */
    function showNotification(message, type) {
        // Remove existing notifications
        $('.urban-top-40-notification').remove();
        
        const notificationClass = type === 'error' ? 'notice-error' : 'notice-success';
        const notification = $(
            '<div class="urban-top-40-notification notice ' + notificationClass + ' is-dismissible">' +
            '<p>' + message + '</p>' +
            '</div>'
        );
        
        // Insert after the main heading
        $('.wrap h1').after(notification);
        
        // Auto-dismiss after 5 seconds
        setTimeout(function() {
            notification.fadeOut(function() {
                $(this).remove();
            });
        }, 5000);
    }
    
    // Initialize tooltips and other UI enhancements
    $('.urban-top-40-post-select').select2({
        placeholder: 'Choose a post...',
        allowClear: true,
        width: '100%'
    });
    
    // Initialize sliders
    const fontSizeSlider = document.getElementById('font-size-slider');
    const fontSizeValue = document.getElementById('font-size-value');
    const yPositionSlider = document.getElementById('y-position-slider');
    const yPositionValue = document.getElementById('y-position-value');
    const imageScaleSlider = document.getElementById('image-scale-slider');
    const imageScaleValue = document.getElementById('image-scale-value');
    const imageYPositionSlider = document.getElementById('image-y-position-slider');
    const imageYPositionValue = document.getElementById('image-y-position-value');
    
    // Update font size display and preview
    fontSizeSlider.addEventListener('input', function() {
        fontSizeValue.textContent = this.value;
        if (selectedPost) {
            renderSocialCard();
        }
    });
    
    // Update Y position display and preview
    yPositionSlider.addEventListener('input', function() {
        yPositionValue.textContent = this.value;
        if (selectedPost) {
            renderSocialCard();
        }
    });
    
    // Update image scale display and preview
    imageScaleSlider.addEventListener('input', function() {
        imageScaleValue.textContent = this.value;
        if (selectedPost) {
            renderSocialCard();
        }
    });
    
    // Update image Y position display and preview
    imageYPositionSlider.addEventListener('input', function() {
        imageYPositionValue.textContent = this.value;
        if (selectedPost) {
            renderSocialCard();
        }
    });
    
    // Initialize canvas on page load
    initializeCanvas();
});
