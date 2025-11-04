#!/bin/bash

# 1) Create dist directory
mkdir -p dist/css dist/js

# 2) CSS minification
echo "Minifying CSS..."
# Concatenate CSS files listed in css/bundle-order.txt into a temporary file
TMP_CSS="/tmp/gallery.concat.css"
rm -f "$TMP_CSS"
while IFS= read -r cssfile; do
    # skip empty lines
    [ -z "$cssfile" ] && continue
    cat "$cssfile" >> "$TMP_CSS"
    echo "\n" >> "$TMP_CSS"
done < css/bundle-order.txt

# Now run csso on the concatenated file (single input avoids CLI parsing issues)
npx csso "$TMP_CSS" --output dist/css/gallery.min.css
rm -f "$TMP_CSS"

# Minify project override CSS (st.css) separately and append it to the bundle
# This ensures project overrides are applied last even if concatenation/minifier
# has issues with combined files.
if [ -f "css/st.css" ]; then
    echo "Minifying project overrides (st.css) and appending..."
    npx csso css/st.css --output dist/css/st.min.css || true
    if [ -f dist/css/st.min.css ]; then
        cat dist/css/st.min.css >> dist/css/gallery.min.css
        rm -f dist/css/st.min.css
    fi
fi

# 3) JS minification
echo "Minifying JavaScript..."
npx terser $(cat bundle-order.txt) -o dist/js/app.min.js -c -m

# 4) Generate timestamp for cache busting
STAMP=$(date +%Y%m%d%H%M%S)

# 5) Modify and copy index_dev.html
echo "Creating production index.html..."
sed -E '
    # Remove all CSS link tags
    /<link.*rel="stylesheet".*>/d
    # Add our single minified CSS file after meta tags
    /<meta name="color-scheme".*>/a\
    <link rel="stylesheet" href="./css/gallery.min.css?v='$STAMP'">
    # Replace all individual JS scripts with our minified version
    /<script src=".\/js\/.*\.js".*>/d
    /<script src=".\/libs\/js\/.*\.js".*>/d
    # Remove any bootstrap script tag (we include bootstrap in app.min.js)
    /<script src=".\/libs\/bootstrap\/js\/.*\.js".*>/d
    # Add our minified JS before closing body tag
    /<\/body>/i\
    <script src="./js/app.min.js?v='$STAMP'"></script>
' index_dev.html > dist/index.html

# 6) Copy other necessary files
echo "Copying assets..."
cp -r data dist/

# Copy entire libs directory so subfolders (bootstrap/js, etc.) are available
cp -r libs dist/

# Fonts used by concatenated CSS need to be placed where the CSS expects them:
# - bootstrap-icons.css (uses url("./fonts/...") relative to the CSS file), so copy those into dist/css/fonts
# - Font Awesome (all.min.css) references ../webfonts/ ..., so copy those into dist/webfonts
mkdir -p dist/css/fonts
if [ -d "libs/css/fonts" ]; then
    cp -r libs/css/fonts/* dist/css/fonts/ || true
fi

mkdir -p dist/webfonts
if [ -d "libs/webfonts" ]; then
    cp -r libs/webfonts/* dist/webfonts/ || true
fi

# Also keep a copy of libs under dist/libs for any runtime script references
# (e.g. dist/libs/js or other assets)
cp -r libs dist/libs || true

# Ensure worker.js (used via new Worker('./js/worker.js')) is available
cp -f js/worker.js dist/js/worker.js

echo "Build complete! Files are in dist/ directory"
echo "Timestamp: $STAMP"