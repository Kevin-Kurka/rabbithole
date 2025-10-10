const fs = require('fs');
const path = require('path');

/**
 * Test script for local file storage
 * Verifies that the uploads directory is accessible and writable
 */
async function testLocalStorage() {
  const uploadsDir = path.join(__dirname, 'uploads');
  const thumbnailsDir = path.join(uploadsDir, 'thumbnails');

  console.log('=== Testing Local File Storage ===\n');
  console.log('Uploads directory:', uploadsDir);
  console.log('Thumbnails directory:', thumbnailsDir);
  console.log('');

  try {
    // Check if directories exist
    if (!fs.existsSync(uploadsDir)) {
      console.log('Creating uploads directory...');
      fs.mkdirSync(uploadsDir, { recursive: true });
    } else {
      console.log('✓ Uploads directory exists');
    }

    if (!fs.existsSync(thumbnailsDir)) {
      console.log('Creating thumbnails directory...');
      fs.mkdirSync(thumbnailsDir, { recursive: true });
    } else {
      console.log('✓ Thumbnails directory exists');
    }

    console.log('');

    // Test file write
    const testFile = path.join(uploadsDir, 'test_' + Date.now() + '.txt');
    const testContent = 'Test file content - ' + new Date().toISOString();

    console.log('Writing test file:', path.basename(testFile));
    fs.writeFileSync(testFile, testContent);

    // Verify it exists and read it back
    if (fs.existsSync(testFile)) {
      const readContent = fs.readFileSync(testFile, 'utf8');

      if (readContent === testContent) {
        console.log('✓ File write successful!');
        console.log('✓ File read successful!');
        console.log('✓ Content matches!');
      } else {
        console.error('✗ Content mismatch!');
        process.exit(1);
      }

      // Test file deletion
      fs.unlinkSync(testFile);
      console.log('✓ File deletion successful!');

    } else {
      console.error('✗ File write failed - file does not exist');
      process.exit(1);
    }

    console.log('');

    // Test thumbnail directory
    const testThumb = path.join(thumbnailsDir, 'test_thumb_' + Date.now() + '.jpg');
    fs.writeFileSync(testThumb, 'thumbnail test data');

    if (fs.existsSync(testThumb)) {
      console.log('✓ Thumbnail directory is writable');
      fs.unlinkSync(testThumb);
      console.log('✓ Thumbnail cleanup successful');
    }

    console.log('');
    console.log('=== All Tests Passed! ===');
    console.log('');
    console.log('Local storage is configured correctly.');
    console.log('You can now upload files to the Evidence Management System.');
    console.log('');
    console.log('Environment Configuration:');
    console.log('  STORAGE_PROVIDER=local');
    console.log('  LOCAL_STORAGE_PATH=./uploads');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('=== Test Failed! ===');
    console.error('Error:', error.message);
    console.error('');
    console.error('Stack trace:');
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testLocalStorage();
