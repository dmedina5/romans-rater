#!/bin/bash

# GitHub Pages Setup Script for Roman's Rater 4.21
# This script helps you quickly set up GitHub Pages

set -e

echo "=============================================="
echo " Roman's Rater 4.21 - GitHub Pages Setup"
echo "=============================================="
echo

# Get GitHub username
read -p "Enter your GitHub username: " GITHUB_USER

if [ -z "$GITHUB_USER" ]; then
    echo "Error: GitHub username is required"
    exit 1
fi

echo
echo "Setting up for user: $GITHUB_USER"
echo

# Update HTML files
echo "Updating HTML files..."
find . -type f -name "*.html" -exec sed -i.bak "s/yourusername/$GITHUB_USER/g" {} \;

# Update _config.yml
echo "Updating _config.yml..."
sed -i.bak "s/yourusername/$GITHUB_USER/g" _config.yml

# Clean up backup files
echo "Cleaning up..."
find . -name "*.bak" -delete

echo
echo "✅ Setup complete!"
echo
echo "Next steps:"
echo "1. Review the changes"
echo "2. Initialize git if not done:"
echo "   git init"
echo "   git add ."
echo "   git commit -m 'Initial commit: Roman's Rater 4.21'"
echo
echo "3. Add remote and push:"
echo "   git remote add origin https://github.com/$GITHUB_USER/romans-rater.git"
echo "   git push -u origin master"
echo
echo "4. Enable GitHub Pages:"
echo "   - Go to https://github.com/$GITHUB_USER/romans-rater/settings/pages"
echo "   - Set Source to: master branch, /docs folder"
echo "   - Click Save"
echo
echo "5. Your site will be live at:"
echo "   https://$GITHUB_USER.github.io/romans-rater/"
echo
echo "=============================================="
