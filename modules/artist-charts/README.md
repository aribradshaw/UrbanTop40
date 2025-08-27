# Artist Charts Module

## Recent Fixes (Latest Update)

### ✅ Fixed Issues
1. **Removed "Last Updated" container** - The useless last updated display has been removed from the stats section
2. **Fixed chart loading** - Corrected regex pattern to properly parse TypeScript data files with underscores in export names
3. **Fixed chart rendering bugs** - Corrected chart bar positioning and label placement
4. **Added debugging** - Enhanced console logging to help troubleshoot any remaining issues

### 🔧 Usage
**Important:** Use the exact filename (without .ts extension) as the artist parameter:

```php
[artist_chart artist="the_beatles_data"]
```

**NOT:**
```php
[artist_chart artist="the_beatles"]  // ❌ This won't work
```

### 🐛 Troubleshooting
If the chart still doesn't load:

1. **Check browser console** for JavaScript errors
2. **Verify the shortcode parameter** matches the exact filename
3. **Use the debug test page** at `debug-test.html` to test functionality
4. **Check WordPress admin** → Urban Top 40 → Artist Charts for available artists
5. **Verify file permissions** on the TypeScript data files

The Artist Charts module for Urban Top 40 provides functionality to display artist chart history using TypeScript data files. It creates horizontally-scrollable charts that show the peak chart positions of an artist's songs, with position 1 at the top and 100 at the bottom.

## Features

- **Horizontally-scrollable charts** - Perfect for artists with many songs
- **Interactive tooltips** - Hover over bars to see song details
- **Responsive design** - Works on all device sizes
- **Multiple chart types** - Line, area, and bar chart options
- **Smart positioning** - Position 1 at top, 100 at bottom
- **TypeScript data integration** - Loads data directly from .ts files
- **WordPress shortcode** - Easy to embed in posts and pages

## Usage

### Basic Shortcode

```
[artist_chart artist="the_beatles"]
```

### Advanced Shortcode with Options

```
[artist_chart artist="the_beatles" height="500" width="100%" show_legend="true" chart_type="line"]
```

### Shortcode Parameters

| Parameter | Description | Default | Required |
|-----------|-------------|---------|----------|
| `artist` | The artist identifier (filename without .ts extension) | - | Yes |
| `height` | Chart height in pixels | 400 | No |
| `width` | Chart width (CSS value) | 100% | No |
| `show_legend` | Show/hide legend | true | No |
| `chart_type` | Chart type: line, area, or bar | line | No |

## Data Format

The module expects TypeScript files in the `assets/artistcharts/` directory with the following structure:

```typescript
export interface ExportedArtistSong {
  song: string;
  featuredArtists: string[];
  chartHistory: {
    date: string;
    position: number;
    weeksOnChart: number;
  }[];
  peakPosition: number;
  totalWeeks: number;
}

export interface ExportedArtistData {
  name: string;
  normalizedName: string;
  songs: ExportedArtistSong[];
  lastUpdated: string;
  totalSongs: number;
}

export const artistNameData: ExportedArtistData = {
  // ... artist data
};
```

## File Naming Convention

- Place your TypeScript files in `assets/artistcharts/`
- Use lowercase with underscores for spaces (e.g., `the_beatles.ts`)
- The filename (without extension) becomes the `artist` parameter in the shortcode

## Examples

### The Beatles Chart
```
[artist_chart artist="the_beatles"]
```

### Custom Height and Width
```
[artist_chart artist="the_beatles" height="600" width="90%"]
```

### Different Chart Type
```
[artist_chart artist="the_beatles" chart_type="area"]
```

## Admin Interface

The module adds an "Artist Charts" submenu under the main Urban Top 40 admin menu, where you can:

- View all available artist data files
- See the corresponding shortcodes for each artist
- Manage chart settings

## Styling

The module includes comprehensive CSS with:

- Modern gradient backgrounds
- Smooth animations and transitions
- Responsive design for mobile devices
- Custom scrollbars
- Hover effects and tooltips

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Dependencies

- jQuery (WordPress bundled)
- WordPress AJAX system
- Modern CSS features (CSS Grid, Flexbox, CSS Variables)

## Customization

You can customize the appearance by overriding CSS classes:

- `.urban-top-40-artist-chart` - Main container
- `.chart-bar` - Individual chart bars
- `.chart-tooltip` - Hover tooltips
- `.chart-stats` - Statistics display

## Troubleshooting

### Chart Not Loading
1. Check that the artist parameter matches the filename (without .ts)
2. Verify the TypeScript file exists in `assets/artistcharts/`
3. Check browser console for JavaScript errors
4. Ensure the data structure matches the expected interface

### Styling Issues
1. Check if the CSS file is loading properly
2. Verify no CSS conflicts with your theme
3. Check browser compatibility for CSS features

### Performance
1. Large datasets (100+ songs) may cause slower rendering
2. Consider using chart_type="line" for better performance with many songs
3. The module only loads assets when shortcodes are present on the page

## Development

The module is built with modular architecture:

- `artist-charts.php` - WordPress integration and shortcode handling
- `artist-charts.css` - Styling and responsive design
- `artist-charts.js` - Chart rendering and interactivity

To extend functionality, modify the JavaScript class `ArtistChart` or add new CSS classes for custom styling.
