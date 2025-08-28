<?php
/**
 * Debug file for testing Beatles data parsing
 * 
 * This file can be used to test the data parsing logic independently
 */

// Set error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<!DOCTYPE html>\n";
echo "<html lang='en'>\n";
echo "<head>\n";
echo "    <meta charset='UTF-8'>\n";
echo "    <title>Beatles Data Parsing Debug</title>\n";
echo "    <style>\n";
echo "        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }\n";
echo "        .debug-section { margin: 20px 0; padding: 20px; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }\n";
echo "        .success { border-left: 4px solid #28a745; }\n";
echo "        .error { border-left: 4px solid #dc3545; }\n";
echo "        .info { border-left: 4px solid #17a2b8; }\n";
echo "        pre { background: #f8f9fa; padding: 15px; border-radius: 4px; overflow-x: auto; font-size: 12px; }\n";
echo "        .file-path { background: #e9ecef; padding: 5px; border-radius: 3px; font-family: monospace; }\n";
echo "    </style>\n";
echo "</head>\n";
echo "<body>\n";

echo "<h1>Beatles Data Parsing Debug</h1>\n";

// Test 1: Check if file exists
echo "<div class='debug-section info'>\n";
echo "<h3>Test 1: File Existence</h3>\n";

$beatles_data_path = '../assets/artistcharts/the_beatles_data.ts';
if (file_exists($beatles_data_path)) {
    echo "<p class='success'>✓ Beatles data file found</p>\n";
    echo "<p><strong>Path:</strong> <span class='file-path'>$beatles_data_path</span></p>\n";
    
    $file_size = filesize($beatles_data_path);
    echo "<p><strong>File size:</strong> " . number_format($file_size) . " bytes</p>\n";
    
    if (is_readable($beatles_data_path)) {
        echo "<p class='success'>✓ File is readable</p>\n";
    } else {
        echo "<p class='error'>✗ File is not readable</p>\n";
    }
} else {
    echo "<p class='error'>✗ Beatles data file not found</p>\n";
    echo "<p><strong>Expected path:</strong> <span class='file-path'>$beatles_data_path</span></p>\n";
    echo "<p><strong>Current directory:</strong> <span class='file-path'>" . getcwd() . "</span></p>\n";
}
echo "</div>\n";

// Test 2: Read file content
echo "<div class='debug-section info'>\n";
echo "<h3>Test 2: File Content</h3>\n";

if (file_exists($beatles_data_path)) {
    $file_content = file_get_contents($beatles_data_path);
    
    if ($file_content !== false) {
        echo "<p class='success'>✓ File content read successfully</p>\n";
        echo "<p><strong>Content length:</strong> " . strlen($file_content) . " characters</p>\n";
        
        // Show first 500 characters
        echo "<h4>File Content Preview (first 500 chars):</h4>\n";
        echo "<pre>" . htmlspecialchars(substr($file_content, 0, 500)) . "...</pre>\n";
        
        // Show last 500 characters
        echo "<h4>File Content Preview (last 500 chars):</h4>\n";
        echo "<pre>..." . htmlspecialchars(substr($file_content, -500)) . "</pre>\n";
        
    } else {
        echo "<p class='error'>✗ Failed to read file content</p>\n";
    }
} else {
    echo "<p class='error'>Cannot test file content - file not found</p>\n";
}
echo "</div>\n";

// Test 3: Test regex extraction
echo "<div class='debug-section info'>\n";
echo "<h3>Test 3: Regex Extraction</h3>\n";

if (file_exists($beatles_data_path) && $file_content !== false) {
    $pattern = '/export const the_beatlesData: ExportedArtistData = ({.*});/s';
    
    if (preg_match($pattern, $file_content, $matches)) {
        echo "<p class='success'>✓ Regex pattern matched successfully</p>\n";
        echo "<p><strong>Matches found:</strong> " . count($matches) . "</p>\n";
        
        $json_data = $matches[1];
        echo "<p><strong>Extracted JSON length:</strong> " . strlen($json_data) . " characters</p>\n";
        
        // Show first 500 characters of extracted data
        echo "<h4>Extracted Data Preview (first 500 chars):</h4>\n";
        echo "<pre>" . htmlspecialchars(substr($json_data, 0, 500)) . "...</pre>\n";
        
    } else {
        echo "<p class='error'>✗ Regex pattern did not match</p>\n";
        echo "<p><strong>Pattern used:</strong> <code>$pattern</code></p>\n";
        
        // Try to find what's actually in the file
        if (strpos($file_content, 'export const the_beatlesData') !== false) {
            echo "<p class='info'>Found 'export const the_beatlesData' in file</p>\n";
        } else {
            echo "<p class='error'>Did not find 'export const the_beatlesData' in file</p>\n";
        }
        
        if (strpos($file_content, 'ExportedArtistData') !== false) {
            echo "<p class='info'>Found 'ExportedArtistData' in file</p>\n";
        } else {
            echo "<p class='error'>Did not find 'ExportedArtistData' in file</p>\n";
        }
    }
} else {
    echo "<p class='error'>Cannot test regex extraction - file content not available</p>\n";
}
echo "</div>\n";

// Test 4: Test JSON cleaning
echo "<div class='debug-section info'>\n";
echo "<h3>Test 4: JSON Cleaning</h3>\n";

if (isset($json_data)) {
    // Clean the JSON data
    $cleaned_json = clean_typescript_json($json_data);
    
    echo "<p><strong>Original JSON length:</strong> " . strlen($json_data) . " characters</p>\n";
    echo "<p><strong>Cleaned JSON length:</strong> " . strlen($cleaned_json) . " characters</p>\n";
    
    // Show cleaned data preview
    echo "<h4>Cleaned Data Preview (first 500 chars):</h4>\n";
    echo "<pre>" . htmlspecialchars(substr($cleaned_json, 0, 500)) . "...</pre>\n>";
    
} else {
    echo "<p class='error'>Cannot test JSON cleaning - no extracted data available</p>\n";
}
echo "</div>\n";

// Test 5: Test JSON parsing
echo "<div class='debug-section info'>\n";
echo "<h3>Test 5: JSON Parsing</h3>\n";

if (isset($cleaned_json)) {
    $artist_data = json_decode($cleaned_json, true);
    
    if ($artist_data !== null) {
        echo "<p class='success'>✓ JSON parsed successfully</p>\n";
        echo "<p><strong>Artist name:</strong> " . htmlspecialchars($artist_data['name']) . "</p>\n";
        echo "<p><strong>Total songs:</strong> " . count($artist_data['songs']) . "</p>\n";
        echo "<p><strong>Last updated:</strong> " . htmlspecialchars($artist_data['lastUpdated']) . "</p>\n>";
        
        // Show first song as example
        if (count($artist_data['songs']) > 0) {
            $first_song = $artist_data['songs'][0];
            echo "<h4>First Song Example:</h4>\n";
            echo "<pre>" . htmlspecialchars(json_encode($first_song, JSON_PRETTY_PRINT)) . "</pre>\n";
        }
        
    } else {
        $json_error = json_last_error_msg();
        $json_error_code = json_last_error();
        echo "<p class='error'>✗ JSON parsing failed</p>\n";
        echo "<p><strong>Error:</strong> $json_error (Code: $json_error_code)</p>\n";
        
        // Show the problematic JSON
        echo "<h4>Problematic JSON (first 1000 chars):</h4>\n";
        echo "<pre>" . htmlspecialchars(substr($cleaned_json, 0, 1000)) . "...</pre>\n";
    }
} else {
    echo "<p class='error'>Cannot test JSON parsing - no cleaned data available</p>\n";
}
echo "</div>\n";

echo "</body>\n";
echo "</html>\n";

/**
 * Clean TypeScript JSON data for PHP parsing
 */
function clean_typescript_json($json_string) {
    // Remove single-line comments
    $json_string = preg_replace('/\/\/.*$/m', '', $json_string);
    
    // Remove multi-line comments
    $json_string = preg_replace('/\/\*.*?\*\//s', '', $json_string);
    
    // Remove export statement and type annotation
    $json_string = preg_replace('/export const the_beatlesData: ExportedArtistData = /', '', $json_string);
    
    // Remove trailing semicolon
    $json_string = rtrim($json_string, ';');
    
    // Fix trailing commas before closing brackets/braces
    $json_string = preg_replace('/,(\s*[}\]])/m', '$1', $json_string);
    
    // Handle any remaining TypeScript-specific syntax
    $json_string = preg_replace('/:\s*ExportedArtistData\s*=\s*/', '', $json_string);
    
    // Clean up any extra whitespace
    $json_string = trim($json_string);
    
    return $json_string;
}

