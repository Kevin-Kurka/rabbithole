#!/bin/bash

echo "=== Rabbithole Local Storage Setup Verification ==="
echo ""

# Check .env file
if [ -f ".env" ]; then
    echo "✓ .env file exists"
    if grep -q "STORAGE_PROVIDER=local" .env; then
        echo "✓ STORAGE_PROVIDER=local configured"
    else
        echo "✗ STORAGE_PROVIDER not set to local"
    fi
    if grep -q "LOCAL_STORAGE_PATH=./uploads" .env; then
        echo "✓ LOCAL_STORAGE_PATH=./uploads configured"
    else
        echo "✗ LOCAL_STORAGE_PATH not configured"
    fi
else
    echo "✗ .env file not found"
fi

echo ""

# Check .gitignore
if [ -f ".gitignore" ]; then
    echo "✓ .gitignore exists"
    if grep -q "uploads/\*" .gitignore; then
        echo "✓ uploads/* is gitignored"
    fi
    if grep -q "^\.env$" .gitignore; then
        echo "✓ .env is gitignored"
    fi
else
    echo "✗ .gitignore not found"
fi

echo ""

# Check uploads directory
if [ -d "uploads" ]; then
    echo "✓ uploads/ directory exists"
    if [ -d "uploads/thumbnails" ]; then
        echo "✓ uploads/thumbnails/ directory exists"
    else
        echo "✗ uploads/thumbnails/ directory not found"
    fi
    if [ -f "uploads/.gitkeep" ]; then
        echo "✓ uploads/.gitkeep exists"
    else
        echo "✗ uploads/.gitkeep not found"
    fi
else
    echo "✗ uploads/ directory not found"
fi

echo ""

# Check test script
if [ -f "test-file-upload.js" ]; then
    echo "✓ test-file-upload.js exists"
else
    echo "✗ test-file-upload.js not found"
fi

echo ""

# Check FileStorageService
if [ -f "src/services/FileStorageService.ts" ]; then
    echo "✓ FileStorageService.ts exists"
    if grep -q "LocalStorageProvider" src/services/FileStorageService.ts; then
        echo "✓ LocalStorageProvider implemented"
    fi
else
    echo "✗ FileStorageService.ts not found"
fi

echo ""
echo "=== Setup Verification Complete ==="
echo ""
echo "Next steps:"
echo "1. Run: node test-file-upload.js"
echo "2. Start server: npm start"
echo "3. Test file upload via GraphQL"
echo ""
