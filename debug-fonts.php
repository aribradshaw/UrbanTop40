<?php
/**
 * Debug script to check font availability
 * Place this in your WordPress root directory and run it via browser
 */

// Define the plugin directory constant if not already defined
if (!defined('URBAN_TOP_40_PLUGIN_DIR')) {
    define('URBAN_TOP_40_PLUGIN_DIR', __DIR__ . '/wp-content/plugins/urban-top-40/');
}

echo "<h1>Font Debug Information</h1>";

// Check if fonts directory exists
$fonts_dir = URBAN_TOP_40_PLUGIN_DIR . 'assets/fonts/';
echo "<h2>Fonts Directory: " . $fonts_dir . "</h2>";

if (is_dir($fonts_dir)) {
    echo "<p>✅ Fonts directory exists</p>";
    
    // List all files in the directory
    $files = scandir($fonts_dir);
    echo "<h3>Files in fonts directory:</h3>";
    echo "<ul>";
    foreach ($files as $file) {
        if ($file != '.' && $file != '..') {
            $file_path = $fonts_dir . $file;
            $file_size = filesize($file_path);
            echo "<li>$file (Size: " . number_format($file_size) . " bytes)</li>";
        }
    }
    echo "</ul>";
    
    // Check for specific Zilla Slab files
    $zilla_files = array(
        'ZillaSlab-Regular.ttf',
        'ZillaSlab-Medium.ttf',
        'ZillaSlab-Bold.ttf',
        'ZillaSlab-Light.ttf',
        'ZillaSlab-Regular.otf',
        'ZillaSlab-Medium.otf',
        'ZillaSlab-Bold.otf',
        'ZillaSlab-Light.otf'
    );
    
    echo "<h3>Zilla Slab Font Check:</h3>";
    foreach ($zilla_files as $font_file) {
        $font_path = $fonts_dir . $font_file;
        if (file_exists($font_path)) {
            echo "<p>✅ Found: $font_file</p>";
        } else {
            echo "<p>❌ Missing: $font_file</p>";
        }
    }
    
} else {
    echo "<p>❌ Fonts directory does not exist</p>";
}

// Check if GD and FreeType are available
echo "<h2>PHP Extensions:</h2>";
echo "<p>GD Extension: " . (extension_loaded('gd') ? '✅ Loaded' : '❌ Not loaded') . "</p>";
echo "<p>FreeType Support: " . (function_exists('imagettftext') ? '✅ Available' : '❌ Not available') . "</p>";

// Test font loading
if (function_exists('imagettftext')) {
    echo "<h2>Font Loading Test:</h2>";
    
    // Test with a known system font
    $test_fonts = array(
        'C:/Windows/Fonts/arial.ttf',
        '/System/Library/Fonts/Arial.ttf',
        '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
    );
    
    foreach ($test_fonts as $test_font) {
        if (file_exists($test_font)) {
            echo "<p>✅ System font exists: $test_font</p>";
            break;
        }
    }
}

echo "<h2>Next Steps:</h2>";
echo "<ol>";
echo "<li>Download Zilla Slab from <a href='https://fonts.google.com/specimen/Zilla+Slab' target='_blank'>Google Fonts</a></li>";
echo "<li>Extract the TTF files</li>";
echo "<li>Place ZillaSlab-Regular.ttf in the fonts directory</li>";
echo "<li>Check the WordPress error log for debug messages</li>";
echo "</ol>";
?>





