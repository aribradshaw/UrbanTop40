<?php
/**
 * Test file for Artist Charts Module
 * 
 * This file demonstrates how to use both shortcodes:
 * - [artist_charts] - Shows the chart visualization
 * - [artist_songs] - Shows the song list
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    // For testing purposes, we'll include WordPress if not already loaded
    if (!function_exists('wp_enqueue_scripts')) {
        require_once('../../../wp-load.php');
    }
}

// Ensure the plugin is loaded
if (!class_exists('UrbanTop40_ArtistCharts')) {
    require_once('artist-charts.php');
}

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Artist Charts Test</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            background: #f0f0f0;
        }
        .test-section {
            margin-bottom: 40px;
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .test-section h2 {
            color: #333;
            border-bottom: 2px solid #007cba;
            padding-bottom: 10px;
        }
        .shortcode-example {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 4px;
            font-family: monospace;
            margin: 10px 0;
        }
    </style>
</head>
<body>
    <h1>Artist Charts Module Test</h1>
    
            <div class="test-section">
            <h2>Chart Visualization</h2>
            <p>This shows the interactive chart with zoom and panning functionality:</p>
            <ul>
                <li><strong>Vertical Zoom:</strong> Scroll wheel up = zoom in (fewer weeks), Scroll wheel down = zoom out (more weeks)</li>
                <li><strong>Horizontal Panning:</strong> Shift + Scroll wheel to move left/right through weeks</li>
                <li><strong>Scrollbar:</strong> Click and drag the scrollbar below the chart to navigate</li>
                <li><strong>Week Indicator:</strong> Shows current visible week range</li>
                <li><strong>Default View:</strong> Shows first 10 weeks</li>
            </ul>
            <div class="shortcode-example">[artist_charts artist="the beatles"]</div>
            <?php echo do_shortcode('[artist_charts artist="the beatles"]'); ?>
        </div>
    
    <div class="test-section">
        <h2>Song List</h2>
        <p>This shows the list of songs with their chart performance:</p>
        <div class="shortcode-example">[artist_songs artist="the beatles"]</div>
        <?php echo do_shortcode('[artist_songs artist="the beatles"]'); ?>
    </div>
    
    <div class="test-section">
        <h2>Usage Instructions</h2>
        <h3>Chart Shortcode: [artist_charts]</h3>
        <ul>
            <li><strong>artist</strong>: The artist name (default: "the beatles")</li>
            <li><strong>width</strong>: Chart width (default: "100%")</li>
            <li><strong>height</strong>: Chart height (default: "600px")</li>
        </ul>
        <p><strong>Features:</strong></p>
        <ul>
            <li>Interactive line chart showing Billboard chart positions over time</li>
            <li><strong>Vertical Zoom:</strong> Scroll wheel up = zoom in (fewer weeks), Scroll wheel down = zoom out (more weeks)</li>
            <li>Defaults to showing first 10 weeks</li>
            <li>Hover tooltips showing song details</li>
        </ul>
        
        <h3>Songs Shortcode: [artist_songs]</h3>
        <ul>
            <li><strong>artist</strong>: The artist name (default: "the beatles")</li>
            <li><strong>width</strong>: Container width (default: "100%")</li>
        </ul>
        <p><strong>Features:</strong></p>
        <ul>
            <li>Grid layout of all songs with color coding</li>
            <li>Shows peak chart position and weeks on chart</li>
            <li>Color-coded borders matching chart lines</li>
        </ul>
    </div>
    
    <div class="test-section">
        <h2>Example Usage in WordPress</h2>
        <p>You can use these shortcodes in your WordPress posts/pages:</p>
        <div class="shortcode-example">
            &lt;!-- Show just the chart --&gt;
            [artist_charts artist="the beatles" height="500px"]
            
            &lt;!-- Show just the song list --&gt;
            [artist_songs artist="the beatles"]
            
            &lt;!-- Show both side by side --&gt;
            &lt;div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px;"&gt;
                [artist_charts artist="the beatles"]
                [artist_songs artist="the beatles"]
            &lt;/div&gt;
        </div>
    </div>
</body>
</html>
