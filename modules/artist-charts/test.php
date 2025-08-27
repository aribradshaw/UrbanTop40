<?php
/**
 * Test file for Artist Charts Module
 * 
 * This file can be used to test the module functionality
 * Run this in a WordPress environment or standalone
 */

// Simulate WordPress environment for testing
if (!defined('ABSPATH')) {
    // Mock WordPress functions for testing
    function wp_enqueue_script($handle, $src, $deps = array(), $ver = false, $in_footer = false) {
        echo "<!-- Enqueued script: $handle from $src -->\n";
    }
    
    function wp_enqueue_style($handle, $src, $deps = array(), $ver = false) {
        echo "<!-- Enqueued style: $handle from $src -->\n";
    }
    
    function plugin_dir_url($file) {
        return './';
    }
    
    function plugin_dir_path($file) {
        return './';
    }
    
    function admin_url($path = '') {
        return './admin-ajax.php';
    }
    
    function wp_create_nonce($action) {
        return 'test-nonce';
    }
    
    function wp_localize_script($handle, $object_name, $l10n) {
        echo "<!-- Localized script: $handle for $object_name -->\n";
    }
    
    function add_action($hook, $callback, $priority = 10, $accepted_args = 1) {
        // Mock action registration
    }
    
    function add_shortcode($tag, $callback) {
        // Mock shortcode registration
    }
    
    function add_ajax_action($action, $callback) {
        // Mock AJAX action registration
    }
    
    // Mock AJAX functions
    function wp_ajax_get_artist_charts() {
        // This would be called by the AJAX handler
        echo "AJAX handler called\n";
    }
    
    function wp_ajax_nopriv_get_artist_charts() {
        // This would be called by the AJAX handler
        echo "AJAX handler called (no priv)\n";
    }
}

// Include the module
require_once 'artist-charts.php';

echo "<!DOCTYPE html>\n";
echo "<html lang='en'>\n";
echo "<head>\n";
echo "    <meta charset='UTF-8'>\n";
echo "    <title>Artist Charts Module Test</title>\n";
echo "    <style>\n";
echo "        body { font-family: Arial, sans-serif; margin: 20px; }\n";
echo "        .test-section { margin: 20px 0; padding: 20px; border: 1px solid #ccc; }\n";
echo "        .success { background: #d4edda; border-color: #c3e6cb; }\n";
echo "        .error { background: #f8d7da; border-color: #f5c6cb; }\n";
echo "        .info { background: #d1ecf1; border-color: #bee5eb; }\n";
echo "    </style>\n";
echo "</head>\n";
echo "<body>\n";

echo "<h1>Artist Charts Module Test</h1>\n";

// Test 1: Check if class exists
echo "<div class='test-section info'>\n";
echo "<h3>Test 1: Class Loading</h3>\n";
if (class_exists('UrbanTop40_ArtistCharts')) {
    echo "<p class='success'>✓ UrbanTop40_ArtistCharts class loaded successfully</p>\n";
} else {
    echo "<p class='error'>✗ UrbanTop40_ArtistCharts class failed to load</p>\n";
}
echo "</div>\n";

// Test 2: Check if methods exist
echo "<div class='test-section info'>\n";
echo "<h3>Test 2: Method Availability</h3>\n";
$methods = array('__init__', 'enqueue_scripts', 'render_artist_charts', 'ajax_get_artist_charts');
foreach ($methods as $method) {
    if (method_exists('UrbanTop40_ArtistCharts', $method)) {
        echo "<p class='success'>✓ Method '$method' exists</p>\n";
    } else {
        echo "<p class='error'>✗ Method '$method' missing</p>\n";
    }
}
echo "</div>\n";

// Test 3: Test shortcode rendering
echo "<div class='test-section info'>\n";
echo "<h3>Test 3: Shortcode Rendering</h3>\n";
try {
    $charts = new UrbanTop40_ArtistCharts();
    $shortcode_output = $charts->render_artist_charts(array('artist' => 'the beatles'));
    if (!empty($shortcode_output)) {
        echo "<p class='success'>✓ Shortcode rendered successfully</p>\n";
        echo "<div style='max-width: 600px; border: 1px solid #ddd; padding: 10px; margin: 10px 0;'>\n";
        echo "<h4>Shortcode Output Preview:</h4>\n";
        echo htmlspecialchars(substr($shortcode_output, 0, 500)) . "...\n";
        echo "</div>\n";
    } else {
        echo "<p class='error'>✗ Shortcode output is empty</p>\n";
    }
} catch (Exception $e) {
    echo "<p class='error'>✗ Error rendering shortcode: " . htmlspecialchars($e->getMessage()) . "</p>\n";
}
echo "</div>\n";

// Test 4: Check Beatles data file
echo "<div class='test-section info'>\n";
echo "<h3>Test 4: Beatles Data File</h3>\n";
$beatles_data_path = '../../assets/artistcharts/the_beatles_data.ts';
if (file_exists($beatles_data_path)) {
    echo "<p class='success'>✓ Beatles data file found at: $beatles_data_path</p>\n";
    
    // Check file size
    $file_size = filesize($beatles_data_path);
    echo "<p class='info'>File size: " . number_format($file_size) . " bytes</p>\n";
    
    // Check if it's readable
    if (is_readable($beatles_data_path)) {
        echo "<p class='success'>✓ File is readable</p>\n";
    } else {
        echo "<p class='error'>✗ File is not readable</p>\n";
    }
} else {
    echo "<p class='error'>✗ Beatles data file not found at: $beatles_data_path</p>\n";
}
echo "</div>\n";

// Test 5: Test AJAX handler
echo "<div class='test-section info'>\n";
echo "<h3>Test 5: AJAX Handler</h3>\n";
try {
    // Mock POST data
    $_POST['artist'] = 'the beatles';
    $_POST['nonce'] = 'test-nonce';
    
    // Test the AJAX handler
    ob_start();
    $charts->ajax_get_artist_charts();
    $ajax_output = ob_get_clean();
    
    if (!empty($ajax_output)) {
        echo "<p class='success'>✓ AJAX handler executed</p>\n";
        echo "<p class='info'>Output: " . htmlspecialchars($ajax_output) . "</p>\n";
    } else {
        echo "<p class='info'>AJAX handler executed but no output (this may be normal)</p>\n";
    }
} catch (Exception $e) {
    echo "<p class='error'>✗ Error in AJAX handler: " . htmlspecialchars($e->getMessage()) . "</p>\n";
}
echo "</div>\n";

// Test 6: Check required files
echo "<div class='test-section info'>\n";
echo "<h3>Test 6: Required Files</h3>\n";
$required_files = array(
    'artist-charts.php' => 'Main PHP module',
    'artist-charts.js' => 'JavaScript functionality',
    'artist-charts.css' => 'CSS styling'
);

foreach ($required_files as $file => $description) {
    if (file_exists($file)) {
        echo "<p class='success'>✓ $description ($file) found</p>\n";
    } else {
        echo "<p class='error'>✗ $description ($file) missing</p>\n";
    }
}
echo "</div>\n";

echo "<div class='test-section info'>\n";
echo "<h3>Test Summary</h3>\n";
echo "<p>This test verifies that the Artist Charts module is properly structured and can be loaded.</p>\n";
echo "<p>To test the full functionality, you'll need to:</p>\n";
echo "<ul>\n";
echo "<li>Run this in a WordPress environment</li>\n";
echo "<li>Ensure Chart.js and jQuery are loaded</li>\n";
echo "<li>Use the shortcode: [artist_charts]</li>\n";
echo "<li>Check the browser console for any JavaScript errors</li>\n";
echo "</ul>\n";
echo "</div>\n";

echo "</body>\n";
echo "</html>\n";
